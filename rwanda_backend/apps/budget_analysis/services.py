"""
Budget analysis — financial view of mapped public budgets (IndicatorData).

Purpose: multi-year trends, allocation shifts, and metrics that speak to economists
and policymakers (growth, concentration, volatility, composition). This app does **not**
compute FSFSI, stress indices, or optimal reallocation; use Assessment + Optimization + Planning
for those.

Data source: pipeline `IndicatorData` (weighted / gross LCU billions, mapping line counts).
"""

from __future__ import annotations

import logging
import math
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

logger = logging.getLogger(__name__)

# Align with Rwanda FSFI dashboard / assessments: do not surface pre-2018 fiscal years here.
BUDGET_ANALYSIS_MIN_FISCAL_YEAR = 2018


def _f(d: Decimal | None) -> float:
    if d is None:
        return 0.0
    return float(d)


def _stdev(xs: list[float]) -> float:
    if len(xs) < 2:
        return 0.0
    m = sum(xs) / len(xs)
    v = sum((x - m) ** 2 for x in xs) / (len(xs) - 1)
    return math.sqrt(v)


def _cagr_pct(v0: float, vn: float, n_periods: float) -> float | None:
    """Geometric growth over n_periods (e.g. years between endpoints)."""
    if n_periods <= 0 or v0 <= 0 or vn <= 0:
        return None
    return round((math.pow(vn / v0, 1.0 / n_periods) - 1.0) * 100.0, 2)


def _hhi_from_shares_pct(shares: list[float]) -> float:
    if not shares:
        return 0.0
    return round(sum((p / 100.0) ** 2 for p in shares) * 10_000.0, 2)


def _available_fiscal_years() -> list[int]:
    """
    Fiscal years that have at least some mapped budget in LCU (weighted or gross).

    Excludes years that only exist as empty placeholder rows (e.g. parameter imports
    or stale keys) so the default window starts at the first year with real amounts.
    """
    from django.db.models import Q, Sum

    from apps.fsfvi_data.models import IndicatorData

    rows = (
        IndicatorData.objects.filter(fiscal_year__gte=BUDGET_ANALYSIS_MIN_FISCAL_YEAR)
        .values("fiscal_year")
        .annotate(
            wsum=Sum("weighted_lcu_bn"),
            gsum=Sum("gross_lcu_bn"),
        )
        .filter(Q(wsum__gt=0) | Q(gsum__gt=0))
        .order_by("fiscal_year")
    )
    return [int(r["fiscal_year"]) for r in rows]


def build_budget_snapshot(fiscal_year: int) -> dict[str, Any] | None:
    """
    Single-year composition: indicators + component shares (no index / optimization).
    """
    from apps.fsfvi_data.models import IndicatorData
    from django.db.models import Sum

    if fiscal_year < BUDGET_ANALYSIS_MIN_FISCAL_YEAR:
        return None

    agg = IndicatorData.objects.filter(fiscal_year=fiscal_year).aggregate(
        wsum=Sum("weighted_lcu_bn"),
        gsum=Sum("gross_lcu_bn"),
    )
    if not (agg["wsum"] and agg["wsum"] > 0) and not (agg["gsum"] and agg["gsum"] > 0):
        return None

    rows = (
        IndicatorData.objects.filter(fiscal_year=fiscal_year)
        .select_related("indicator")
        .order_by("indicator__component", "indicator__display_order", "indicator__code")
    )

    indicators: list[dict[str, Any]] = []
    total_w = Decimal("0")
    for row in rows:
        w = row.weighted_lcu_bn or Decimal("0")
        total_w += w
        indicators.append(
            {
                "code": row.indicator.code,
                "name": row.indicator.name,
                "component": row.indicator.component,
                "weighted_lcu_bn": _f(w),
                "gross_lcu_bn": _f(row.gross_lcu_bn),
                "share_weighted_percent": _f(row.share_weighted_percent),
                "records_count": row.records_count,
                "fallback_records": row.fallback_records,
            }
        )

    total_f = float(total_w) if total_w > 0 else 0.0
    comp_qs = (
        IndicatorData.objects.filter(fiscal_year=fiscal_year)
        .values("indicator__component")
        .annotate(weight_sum=Sum("weighted_lcu_bn"))
        .order_by("-weight_sum")
    )
    by_component: list[dict[str, Any]] = []
    for row in comp_qs:
        comp = row["indicator__component"] or ""
        wf = _f(row["weight_sum"])
        share = (wf / total_f * 100.0) if total_f > 0 else 0.0
        by_component.append(
            {
                "component": comp,
                "weighted_lcu_bn": wf,
                "share_of_weighted_budget_pct": round(share, 2),
            }
        )

    return {
        "fiscal_year": fiscal_year,
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "currency_note": "Amounts in billions LCU (national mapped agriculture-related budget).",
        "total_weighted_lcu_bn": round(total_f, 4),
        "indicator_rows": len(indicators),
        "by_component": by_component,
        "indicator_breakdown": indicators,
    }


def build_budget_history_analysis(
    start_year: int | None = None,
    end_year: int | None = None,
    *,
    top_indicator_movers: int = 25,
) -> dict[str, Any] | None:
    """
    Multi-year financial analysis from IndicatorData only.

    Returns None if there is no budget data in the database.
    """
    from apps.fsfvi_data.models import IndicatorData

    all_years = _available_fiscal_years()
    if not all_years:
        return None

    y_min, y_max = all_years[0], all_years[-1]
    sy = start_year if start_year is not None else y_min
    ey = end_year if end_year is not None else y_max
    sy = max(sy, y_min, BUDGET_ANALYSIS_MIN_FISCAL_YEAR)
    ey = min(ey, y_max)
    if sy > ey:
        sy, ey = ey, sy

    year_list = [y for y in all_years if sy <= y <= ey]
    if not year_list:
        return None

    rows = IndicatorData.objects.filter(
        fiscal_year__gte=sy,
        fiscal_year__lte=ey,
    ).values(
        "fiscal_year",
        "weighted_lcu_bn",
        "gross_lcu_bn",
        "records_count",
        "fallback_records",
        "indicator_id",
        "indicator__code",
        "indicator__name",
        "indicator__component",
    )

    # --- aggregates ---
    totals: dict[int, dict[str, float]] = defaultdict(
        lambda: {"weighted_lcu_bn": 0.0, "gross_lcu_bn": 0.0, "records_count": 0.0, "fallback_records": 0.0}
    )
    comp_year: dict[tuple[str, int], float] = defaultdict(float)
    ind_meta: dict[Any, dict[str, str]] = {}
    ind_year: dict[tuple[Any, int], dict[str, float]] = defaultdict(
        lambda: {"weighted_lcu_bn": 0.0, "gross_lcu_bn": 0.0, "records_count": 0.0, "fallback_records": 0.0}
    )

    for r in rows:
        fy = int(r["fiscal_year"])
        w = _f(r["weighted_lcu_bn"])
        g = _f(r["gross_lcu_bn"])
        rc = float(r["records_count"] or 0)
        fb = float(r["fallback_records"] or 0)
        iid = r["indicator_id"]
        comp = r["indicator__component"] or ""

        totals[fy]["weighted_lcu_bn"] += w
        totals[fy]["gross_lcu_bn"] += g
        totals[fy]["records_count"] += rc
        totals[fy]["fallback_records"] += fb

        comp_year[(comp, fy)] += w

        ind_meta[iid] = {
            "code": r["indicator__code"] or "",
            "name": r["indicator__name"] or "",
            "component": comp,
        }
        ind_year[(iid, fy)]["weighted_lcu_bn"] += w
        ind_year[(iid, fy)]["gross_lcu_bn"] += g
        ind_year[(iid, fy)]["records_count"] += rc
        ind_year[(iid, fy)]["fallback_records"] += fb

    # National trend with YoY %
    national_trend: list[dict[str, Any]] = []
    prev_w: float | None = None
    for y in year_list:
        tw = totals[y]["weighted_lcu_bn"]
        yoy = None
        if prev_w is not None and prev_w > 0:
            yoy = round((tw - prev_w) / prev_w * 100.0, 2)
        national_trend.append({"year": y, "weighted_lcu_bn": round(tw, 4), "yoy_weighted_pct": yoy})
        prev_w = tw

    yoy_values = [p["yoy_weighted_pct"] for p in national_trend if p["yoy_weighted_pct"] is not None]
    vol_yoy = round(_stdev([float(x) for x in yoy_values]), 2) if yoy_values else 0.0
    avg_abs_yoy = (
        round(sum(abs(float(x)) for x in yoy_values) / len(yoy_values), 2) if yoy_values else 0.0
    )

    w_first = totals[year_list[0]]["weighted_lcu_bn"]
    w_last = totals[year_list[-1]]["weighted_lcu_bn"]
    n_span = float(year_list[-1] - year_list[0])
    cagr_w = _cagr_pct(w_first, w_last, n_span) if n_span > 0 else None

    # Component series + HHI by year
    components_set = sorted({c for (c, _) in comp_year.keys() if c})
    component_trends: list[dict[str, Any]] = []
    hhi_by_year: dict[int, float] = {}

    for c in components_set:
        series = []
        for y in year_list:
            w = comp_year.get((c, y), 0.0)
            tot = totals[y]["weighted_lcu_bn"]
            share = (w / tot * 100.0) if tot > 0 else 0.0
            series.append(
                {
                    "year": y,
                    "weighted_lcu_bn": round(w, 4),
                    "share_of_national_weighted_pct": round(share, 2),
                }
            )
        component_trends.append({"component": c, "series": series})

    for y in year_list:
        tot = totals[y]["weighted_lcu_bn"]
        shares = []
        for c in components_set:
            w = comp_year.get((c, y), 0.0)
            if tot > 0:
                shares.append(w / tot * 100.0)
        hhi_by_year[y] = _hhi_from_shares_pct(shares)

    # Share drift (first vs last year) — policy-relevant
    share_drift: list[dict[str, Any]] = []
    for c in components_set:
        tot_a = totals[year_list[0]]["weighted_lcu_bn"]
        tot_b = totals[year_list[-1]]["weighted_lcu_bn"]
        wa = comp_year.get((c, year_list[0]), 0.0)
        wb = comp_year.get((c, year_list[-1]), 0.0)
        sa = (wa / tot_a * 100.0) if tot_a > 0 else 0.0
        sb = (wb / tot_b * 100.0) if tot_b > 0 else 0.0
        share_drift.append(
            {
                "component": c,
                "share_first_year_pct": round(sa, 2),
                "share_last_year_pct": round(sb, 2),
                "ppt_change": round(sb - sa, 2),
            }
        )
    share_drift.sort(key=lambda x: abs(x["ppt_change"]), reverse=True)

    # Ranks per year for each indicator (by weighted)
    ranks_by_year: dict[int, list[tuple[Any, float]]] = {}
    for y in year_list:
        pairs: list[tuple[Any, float]] = []
        for iid in ind_meta:
            w = ind_year.get((iid, y), {}).get("weighted_lcu_bn", 0.0)
            pairs.append((iid, w))
        pairs.sort(key=lambda x: -x[1])
        ranks_by_year[y] = pairs

    rank_maps: dict[int, dict[Any, int]] = {}
    for y, pairs in ranks_by_year.items():
        rank_maps[y] = {iid: idx + 1 for idx, (iid, _) in enumerate(pairs)}

    # Indicator movers
    tot_first = totals[year_list[0]]["weighted_lcu_bn"]
    tot_last = totals[year_list[-1]]["weighted_lcu_bn"]

    indicator_movers: list[dict[str, Any]] = []
    for iid, meta in ind_meta.items():
        series = []
        for y in year_list:
            cell = ind_year.get((iid, y), {})
            series.append(
                {
                    "year": y,
                    "weighted_lcu_bn": round(cell.get("weighted_lcu_bn", 0.0), 4),
                }
            )
        vals = [s["weighted_lcu_bn"] for s in series]
        v0 = vals[0]
        vn = vals[-1]
        chg_pct = None
        if v0 > 0:
            chg_pct = round((vn - v0) / v0 * 100.0, 2)
        n_y = float(year_list[-1] - year_list[0])
        # CAGR needs strictly positive endpoints; log growth is undefined from a zero base.
        cagr_i = _cagr_pct(v0, vn, n_y) if n_y > 0 and v0 > 0 and vn > 0 else None

        share_first = (v0 / tot_first * 100.0) if tot_first > 0 else 0.0
        share_last = (vn / tot_last * 100.0) if tot_last > 0 else 0.0
        share_change_ppt = round(share_last - share_first, 2)

        yoy_list = []
        for i in range(1, len(vals)):
            if vals[i - 1] > 0:
                yoy_list.append((vals[i] - vals[i - 1]) / vals[i - 1] * 100.0)
        vol_i = round(_stdev(yoy_list), 2) if len(yoy_list) > 1 else 0.0

        r0 = rank_maps[year_list[0]].get(iid)
        rn = rank_maps[year_list[-1]].get(iid)

        indicator_movers.append(
            {
                "indicator_id": str(iid),
                "code": meta["code"],
                "name": meta["name"],
                "component": meta["component"],
                "weighted_first_bn": round(v0, 4),
                "weighted_last_bn": round(vn, 4),
                "share_of_national_first_pct": round(share_first, 2),
                "share_of_national_last_pct": round(share_last, 2),
                "share_change_ppt": share_change_ppt,
                "total_change_pct": chg_pct,
                "cagr_pct": cagr_i,
                "yoy_volatility": vol_i,
                "rank_first_year": r0,
                "rank_last_year": rn,
                "rank_delta": (rn - r0) if r0 and rn else None,
                "series": series,
            }
        )

    indicator_movers.sort(
        key=lambda x: abs(x["total_change_pct"] or 0.0)
        + abs(x["cagr_pct"] or 0.0)
        + abs(x["share_change_ppt"]),
        reverse=True,
    )
    top_movers = indicator_movers[: max(5, top_indicator_movers)]

    # Data quality: fallback intensity
    quality_by_year: list[dict[str, Any]] = []
    for y in year_list:
        t = totals[y]
        rc = t["records_count"]
        fb = t["fallback_records"]
        fb_pct = round(fb / rc * 100.0, 2) if rc > 0 else 0.0
        quality_by_year.append(
            {
                "year": y,
                "mapping_lines": int(rc),
                "fallback_lines": int(fb),
                "fallback_share_pct": fb_pct,
            }
        )

    insights = _build_policy_insights(
        year_list=year_list,
        national_trend=national_trend,
        totals=totals,
        share_drift=share_drift,
        indicator_movers=indicator_movers,
        quality_by_year=quality_by_year,
        hhi_by_year=hhi_by_year,
        cagr_weighted_pct=cagr_w,
        vol_yoy=vol_yoy,
    )

    return {
        "scope": {
            "start_year": year_list[0],
            "end_year": year_list[-1],
            "years": year_list,
            "available_range": {"min": y_min, "max": y_max},
        },
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "currency_note": "Amounts in billions LCU (weighted mapped budget, national).",
        "national_trend": national_trend,
        "totals_by_year": {y: {k: round(v, 4) if isinstance(v, float) else v for k, v in totals[y].items()} for y in year_list},
        "metrics": {
            "cagr_weighted_pct": cagr_w,
            "volatility_yoy_weighted_pp": vol_yoy,
            "mean_abs_yoy_weighted_pct": avg_abs_yoy,
            "hhi_first_year": hhi_by_year.get(year_list[0]),
            "hhi_last_year": hhi_by_year.get(year_list[-1]),
        },
        "hhi_by_year": hhi_by_year,
        "component_trends": component_trends,
        "component_share_drift": share_drift,
        "indicator_movers": top_movers,
        "data_quality_by_year": quality_by_year,
        "insights": insights,
    }


def _insight_short_name(name: str, max_len: int = 52) -> str:
    n = (name or "").strip()
    if len(n) <= max_len:
        return n
    return f"{n[: max_len - 1]}…"


def _cagr_is_unreliable_headline(m: dict[str, Any]) -> bool:
    """Match dashboard UI: extreme % or near-zero starting allocation."""
    cagr = m.get("cagr_pct")
    if cagr is None:
        return False
    v0 = float(m.get("weighted_first_bn") or 0.0)
    return abs(float(cagr)) >= 200.0 or (v0 >= 0.0 and v0 < 0.02)


def _build_policy_insights(
    *,
    year_list: list[int],
    national_trend: list[dict[str, Any]],
    totals: dict[int, dict[str, float]],
    share_drift: list[dict[str, Any]],
    indicator_movers: list[dict[str, Any]],
    quality_by_year: list[dict[str, Any]],
    hhi_by_year: dict[int, float],
    cagr_weighted_pct: float | None,
    vol_yoy: float,
) -> list[str]:
    """Implication-first lines for ministry / IFI audiences; facts support the lead clause."""
    out: list[str] = []
    y0, y1 = year_list[0], year_list[-1]
    w0 = totals[y0]["weighted_lcu_bn"]
    w1 = totals[y1]["weighted_lcu_bn"]

    if cagr_weighted_pct is not None:
        out.append(
            f"For multi-year ceilings and partner dialogue, anchor on roughly {cagr_weighted_pct:+.1f}% "
            f"annual growth in the mapped national total (CAGR FY{y0}–FY{y1}; {w0:.2f}→{w1:.2f} bn LCU). "
            f"Step-changes in the series should be validated against mapping methodology—not attributed to outturn alone."
        )
    else:
        out.append(
            f"The mapped national envelope moves from {w0:.2f} bn (FY{y0}) to {w1:.2f} bn (FY{y1})—"
            f"use the fiscal-year chart to see which jumps need a mapping vs execution explanation before briefing."
        )

    if vol_yoy > 8:
        out.append(
            f"Planning and contingency buffers should reflect high noise: YoY changes in the mapped total swing "
            f"widely (typical scale ≈ {vol_yoy:.1f} pp). Outer-year MTEF lines remain sensitive until mapping stabilises."
        )
    elif vol_yoy > 0:
        out.append(
            f"Expect moderate year-to-year variability in the national mapped total (≈{vol_yoy:.1f} pp typical YoY scale)—"
            f"usually workable if programmes are steady, but still reconcile spikes with execution data."
        )

    # Largest composition shifts — lead with reallocation / PSTA implication
    drift_sorted = [x for x in share_drift if abs(x["ppt_change"]) >= 1.0][:4]
    for d in drift_sorted:
        c = d["component"].replace("_", " ").title() or "Unknown"
        ppt = d["ppt_change"]
        direction = "gaining" if ppt > 0 else "losing"
        out.append(
            f"Reallocation narratives for {c} need explicit review: its share of the mapped total is {direction} "
            f"by {ppt:+.1f} pp ({d['share_first_year_pct']:.1f}%→{d['share_last_year_pct']:.1f}%). "
            f"Do not assume continuity—align PSTA/PSTA storylines and ministerial briefings with this shift."
        )

    # Steepest YoY drop — credibility / benchmark caveat
    worst = None
    for p in national_trend:
        yv = p.get("yoy_weighted_pct")
        if yv is None:
            continue
        if worst is None or yv < worst[0]:
            worst = (yv, p["year"])
    if worst and worst[0] < -5:
        out.append(
            f"Treat FY{worst[1]} as a credibility checkpoint before using it as a benchmark: the mapped total fell "
            f"about {worst[0]:.1f}% YoY—disentangle in-year cuts, reclassification, and mapping updates before "
            f"drawing policy conclusions."
        )

    # Indicators — credible CAGR vs small-base / extreme % (misleading headline)
    big_growers = [m for m in indicator_movers if (m.get("cagr_pct") or 0) > 8][:3]
    for m in big_growers:
        label = _insight_short_name(m.get("name") or "")
        v0m = float(m.get("weighted_first_bn") or 0.0)
        cgr = float(m["cagr_pct"])
        if _cagr_is_unreliable_headline(m):
            out.append(
                f"Do not prioritise on headline CAGR alone for {m['code']} ({label}): the rate is ~{cgr:.0f}% but "
                f"opened from a very small weighted base ({v0m:.3f} bn). For trade-offs, lean on share change (ppt), "
                f"programme delivery, and field verification—not this percentage alone."
            )
        else:
            out.append(
                f"Stress-test continued protection or expansion of {m['code']} ({label}): weighted allocation "
                f"compounded near {cgr:.1f}% per year—decide explicitly whether MTEF space here should trade off against "
                f"other components and FSFI risk hotspots."
            )

    fallers = [m for m in indicator_movers if (m.get("total_change_pct") or 0) < -25][:2]
    for m in fallers:
        nm = _insight_short_name(m.get("name") or "")
        out.append(
            f"Before interpreting ~{abs(m['total_change_pct']):.0f}% lower weighted spend on {m['code']} ({nm}) as "
            f"efficiency or de-prioritisation, confirm policy intent versus reclassification and data continuity—"
            f"otherwise briefing lines may mis-state ministry direction."
        )

    h0 = hhi_by_year.get(y0)
    h1 = hhi_by_year.get(y1)
    if h0 is not None and h1 is not None:
        dh = h1 - h0
        if abs(dh) > 300:
            if dh > 0:
                out.append(
                    f"Risk posture tightens: the budget mix became more concentrated (HHI ~{h0:.0f}→{h1:.0f}). "
                    f"If leading components underperform, shocks propagate faster—diversify mitigation in plans and "
                    f"donor conversations."
                )
            else:
                out.append(
                    f"Spread improves oversight burden: the portfolio became less concentrated "
                    f"(HHI ~{h0:.0f}→{h1:.0f}). More components move the needle—coordinate prioritisation so "
                    f"messaging stays coherent across sectors."
                )

    fb0 = quality_by_year[0]["fallback_share_pct"] if quality_by_year else 0
    fb1 = quality_by_year[-1]["fallback_share_pct"] if quality_by_year else 0
    if fb1 - fb0 > 3:
        out.append(
            f"Transparency to Parliament and IFIs weakens unless addressed: fallback (estimated) mapping rose "
            f"(~{fb0:.1f}%→~{fb1:.1f}% of lines). Prioritise firmer programme-to-indicator linkage so "
            f"directly mapped confidence improves in future briefings."
        )

    return out
