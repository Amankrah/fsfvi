"""
Empirical stress classification for the FSFSI.

Why this module exists
----------------------
The Rust engine ships fixed cut-points (0.05 / 0.15 / 0.30) that were never
derived from data. On Rwanda's own record those cut-points (a) bisect the
historical operating range of the headline index, so the label flips on noise,
(b) are applied unchanged to indicator, component and system scores even though
averaging compresses the variance at each aggregation step, and (c) lump
~70% of indicator-years into "critical". This module replaces them with
thresholds *calibrated from the stored assessment record* using Fisher–Jenks
natural breaks, which is the standard optimal 1-D classification
(minimises within-class variance / maximises goodness-of-variance fit).

Three levels are calibrated separately because they live on different
distributions:

* ``indicator`` – raw υᵢ = δᵢ·e^(−αᵢfᵢ), pooled over fiscal years.
* ``component`` – unweighted mean of indicator stress within a component.
* ``system``    – FSFSI = Σ ω_c·υ_c, i.e. a weighted mean of component
  stresses. It therefore lives on the component scale; with few system-year
  observations it inherits the component breaks, and switches to its own
  Jenks breaks once ≥ ``MIN_SYSTEM_OBS`` years exist.

A fourth row, ``coverage``, holds Jenks breaks for the *financing coverage*
ratio 1 − υ/δ = 1 − e^(−αf): the share of the performance gap that current
funding has absorbed. Together with the gap it yields a two-axis *diagnosis*
that separates "large gap, unfunded" from "large gap, heavily funded but
outcome not yet moved" — two situations the one-dimensional label cannot
tell apart.

Calibrated thresholds are frozen in ``StressThresholdConfig`` until the
calibration command is run again, so labels stay comparable across years.
If no calibration exists the engine defaults are used.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from decimal import Decimal
from typing import Iterable, Sequence

logger = logging.getLogger(__name__)

# Engine defaults (fsfi_engine config.rs) — fallback only.
ENGINE_DEFAULT_BREAKS: tuple[float, float, float] = (0.05, 0.15, 0.30)

# Engine-default breaks for financing coverage have no Rust counterpart;
# the half-life anchor (funding has absorbed 50% of the gap) is the model's
# intrinsic reference point, used until coverage is calibrated.
DEFAULT_COVERAGE_BREAKS: tuple[float, float] = (0.25, 0.50)

LEVEL_INDICATOR = "indicator"
LEVEL_COMPONENT = "component"
LEVEL_SYSTEM = "system"
LEVEL_COVERAGE = "coverage"
LEVELS = (LEVEL_INDICATOR, LEVEL_COMPONENT, LEVEL_SYSTEM, LEVEL_COVERAGE)

LABELS = ("low", "medium", "high", "critical")

# Diagnosis labels (two-axis: gap × financing coverage)
DIAG_AT_BENCHMARK = "at_benchmark"
DIAG_UNFUNDED_GAP = "unfunded_gap"
DIAG_PARTIALLY_FUNDED_GAP = "partially_funded_gap"
DIAG_FUNDED_GAP = "funded_gap"
DIAGNOSES = (DIAG_AT_BENCHMARK, DIAG_UNFUNDED_GAP, DIAG_PARTIALLY_FUNDED_GAP, DIAG_FUNDED_GAP)

# Minimum sample sizes before a level is allowed to replace the defaults.
MIN_INDICATOR_OBS = 40     # ≈ 2 fiscal years × 20+ indicators
MIN_COMPONENT_OBS = 16     # 2 fiscal years × 8 components
MIN_SYSTEM_OBS = 30        # system uses component scale until this many years exist
MIN_COVERAGE_OBS = 40
# A fiscal-year assessment must have at least this many indicators to count.
MIN_INDICATORS_PER_YEAR = 20
# Gap below which an indicator is considered at benchmark for coverage purposes.
GAP_EPS = 1e-6

_METHOD_JENKS = "jenks_natural_breaks"
_METHOD_INHERITED = "inherited_component_scale"
_METHOD_ENGINE_DEFAULT = "engine_default"


# ---------------------------------------------------------------------------
# Fisher–Jenks natural breaks (exact dynamic programme, O(k·n²))
# ---------------------------------------------------------------------------

def jenks_breaks(values: Iterable[float], k: int) -> tuple[list[float], float]:
    """Optimal partition of ``values`` into ``k`` contiguous classes.

    Returns ``(breaks, gvf)`` where ``breaks`` are the *upper bounds* of the
    first ``k-1`` classes (so a score ``v`` is in class ``i`` iff
    ``breaks[i-1] < v <= breaks[i]``) and ``gvf`` is the goodness-of-variance
    fit in [0, 1] (1 = classes explain all variance).

    Sample sizes here are small (hundreds), so the exact DP is fine.
    """
    x = sorted(float(v) for v in values)
    n = len(x)
    if k < 2:
        raise ValueError("k must be >= 2")
    if n < k:
        raise ValueError(f"need at least k={k} observations, got {n}")

    prefix = [0.0] * (n + 1)
    prefix_sq = [0.0] * (n + 1)
    for i, v in enumerate(x):
        prefix[i + 1] = prefix[i] + v
        prefix_sq[i + 1] = prefix_sq[i] + v * v

    def ssd(i: int, j: int) -> float:
        """Sum of squared deviations of x[i:j]."""
        m = j - i
        if m <= 0:
            return 0.0
        s = prefix[j] - prefix[i]
        return (prefix_sq[j] - prefix_sq[i]) - s * s / m

    inf = float("inf")
    dp = [[inf] * (n + 1) for _ in range(k + 1)]
    cut = [[0] * (n + 1) for _ in range(k + 1)]
    dp[0][0] = 0.0
    for c in range(1, k + 1):
        for j in range(c, n + 1):
            best, best_i = inf, 0
            for i in range(c - 1, j):
                v = dp[c - 1][i] + ssd(i, j)
                if v < best:
                    best, best_i = v, i
            dp[c][j] = best
            cut[c][j] = best_i

    breaks: list[float] = []
    j = n
    for c in range(k, 1, -1):
        i = cut[c][j]
        breaks.append(x[i - 1])
        j = i
    breaks.reverse()

    total = ssd(0, n)
    gvf = 1.0 - dp[k][n] / total if total > 0 else 1.0
    return breaks, gvf


# ---------------------------------------------------------------------------
# Threshold access
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Thresholds:
    """Upper bounds of the low / medium / high classes for one level."""
    level: str
    low_max: float
    medium_max: float
    high_max: float | None  # None for 3-class levels (coverage)
    method: str
    n_observations: int = 0
    gvf: float | None = None
    calibration_years: tuple[int, ...] = ()
    calibrated_at: str | None = None

    @property
    def breaks(self) -> list[float]:
        b = [self.low_max, self.medium_max]
        if self.high_max is not None:
            b.append(self.high_max)
        return b

    def classify(self, score: float) -> str:
        return _classify_with_breaks(score, self.breaks)

    def as_dict(self) -> dict:
        return {
            "level": self.level,
            "low_max": round(self.low_max, 6),
            "medium_max": round(self.medium_max, 6),
            "high_max": round(self.high_max, 6) if self.high_max is not None else None,
            "method": self.method,
            "n_observations": self.n_observations,
            "gvf": round(self.gvf, 4) if self.gvf is not None else None,
            "calibration_years": list(self.calibration_years),
            "calibrated_at": self.calibrated_at,
            "is_calibrated": self.method != _METHOD_ENGINE_DEFAULT,
        }


def _classify_with_breaks(score: float, breaks: Sequence[float]) -> str:
    s = float(score)
    if math.isnan(s):
        return LABELS[1]
    for i, b in enumerate(breaks):
        if s <= b:
            return LABELS[i]
    return LABELS[len(breaks)]


_cache: dict[str, Thresholds] = {}


def clear_cache() -> None:
    _cache.clear()


def _default_thresholds(level: str) -> Thresholds:
    if level == LEVEL_COVERAGE:
        lo, mid = DEFAULT_COVERAGE_BREAKS
        return Thresholds(level, lo, mid, None, _METHOD_ENGINE_DEFAULT)
    lo, mid, hi = ENGINE_DEFAULT_BREAKS
    return Thresholds(level, lo, mid, hi, _METHOD_ENGINE_DEFAULT)


def get_thresholds(level: str) -> Thresholds:
    """Active thresholds for ``level`` (DB-calibrated, else engine default)."""
    if level not in LEVELS:
        raise ValueError(f"unknown level {level!r}")
    cached = _cache.get(level)
    if cached is not None:
        return cached

    thresholds = _default_thresholds(level)
    try:
        from .models import StressThresholdConfig

        row = StressThresholdConfig.objects.filter(level=level).first()
        if row is not None:
            thresholds = Thresholds(
                level=level,
                low_max=float(row.low_max),
                medium_max=float(row.medium_max),
                high_max=float(row.high_max) if row.high_max is not None else None,
                method=row.method,
                n_observations=row.n_observations,
                gvf=float(row.gvf) if row.gvf is not None else None,
                calibration_years=tuple(row.calibration_years or ()),
                calibrated_at=row.calibrated_at.isoformat() if row.calibrated_at else None,
            )
    except Exception:  # pragma: no cover — DB not ready (e.g. during migrate)
        logger.debug("StressThresholdConfig unavailable; using engine defaults", exc_info=True)

    _cache[level] = thresholds
    return thresholds


def get_all_thresholds() -> dict[str, dict]:
    return {level: get_thresholds(level).as_dict() for level in LEVELS}


def classify(score: float, level: str) -> str:
    """Classify ``score`` at ``level`` → 'low' | 'medium' | 'high' | 'critical'."""
    return get_thresholds(level).classify(score)


def critical_threshold(level: str = LEVEL_COMPONENT) -> float:
    """Upper bound of 'high' — anything above is 'critical'."""
    t = get_thresholds(level)
    return t.high_max if t.high_max is not None else t.medium_max


# ---------------------------------------------------------------------------
# Two-axis diagnosis: performance gap × financing coverage
# ---------------------------------------------------------------------------

def financing_coverage(gap: float, stress: float) -> float | None:
    """Share of the performance gap absorbed by current financing.

    Since υ = δ·e^(−αf), coverage = 1 − υ/δ = 1 − e^(−αf) ∈ [0, 1].
    0 → funding has not dented the gap; 1 → funding has eliminated the stress.
    ``None`` when there is no gap to cover.
    """
    g = float(gap)
    if g <= GAP_EPS:
        return None
    c = 1.0 - float(stress) / g
    return min(1.0, max(0.0, c))


def diagnose(gap: float, stress: float) -> str:
    """Classify an indicator/component by *why* its stress is what it is.

    * ``at_benchmark``          – gap small enough that the item would be 'low'
                                  even with zero funding.
    * ``unfunded_gap``          – gap present, financing has absorbed little of it.
    * ``partially_funded_gap``  – financing is working but has not caught up.
    * ``funded_gap``            – financing has absorbed most of the gap; the
                                  residual stress is low but the outcome has
                                  not yet closed (outcome lag, not under-funding).
    """
    g = float(gap)
    if g <= get_thresholds(LEVEL_INDICATOR).low_max:
        return DIAG_AT_BENCHMARK
    cov = financing_coverage(g, stress)
    if cov is None:
        return DIAG_AT_BENCHMARK
    t = get_thresholds(LEVEL_COVERAGE)
    if cov <= t.low_max:
        return DIAG_UNFUNDED_GAP
    if cov <= t.medium_max:
        return DIAG_PARTIALLY_FUNDED_GAP
    return DIAG_FUNDED_GAP


# ---------------------------------------------------------------------------
# Calibration
# ---------------------------------------------------------------------------

@dataclass
class CalibrationSample:
    """Observations pooled from the stored assessment record."""
    years: list[int]
    indicator_stress: list[float]
    component_stress: list[float]
    system_stress: list[float]
    coverage: list[float]


def collect_sample(
    *,
    scenario: str | None = "normal_operations",
    min_indicators_per_year: int = MIN_INDICATORS_PER_YEAR,
    include_cumulative: bool = True,
) -> CalibrationSample:
    """Pool one assessment per fiscal year (latest saved) into calibration vectors.

    Indicator and component stress do not depend on the weighting method
    (υ = δ·e^(−αf) has no ω), so any method is acceptable; the latest run per
    fiscal year is taken to avoid over-weighting years that were re-run often.
    Cumulative stress is pooled alongside point-in-time stress by default
    because the same thresholds are applied to both.
    """
    from .models import AssessmentResult

    qs = AssessmentResult.objects.all()
    if scenario:
        qs = qs.filter(scenario=scenario)
    qs = qs.filter(indicators_count__gte=min_indicators_per_year)

    latest_by_year: dict[int, AssessmentResult] = {}
    for a in qs.order_by("fiscal_year", "computed_at"):
        latest_by_year[a.fiscal_year] = a

    sample = CalibrationSample([], [], [], [], [])
    for fy in sorted(latest_by_year):
        a = latest_by_year[fy]
        sample.years.append(fy)
        sample.system_stress.append(float(a.fsfsi_score))
        if include_cumulative and a.cumulative_fsfsi is not None:
            sample.system_stress.append(float(a.cumulative_fsfsi))
        for c in a.component_results.all():
            sample.component_stress.append(float(c.component_stress))
            if include_cumulative and c.cumulative_stress is not None:
                sample.component_stress.append(float(c.cumulative_stress))
        for i in a.indicator_results.all():
            s = float(i.stress_value)
            g = float(i.performance_gap)
            sample.indicator_stress.append(s)
            if include_cumulative and i.cumulative_stress is not None:
                sample.indicator_stress.append(float(i.cumulative_stress))
            cov = financing_coverage(g, s)
            if cov is not None:
                sample.coverage.append(cov)
    return sample


@dataclass
class CalibrationResult:
    level: str
    breaks: list[float]
    gvf: float | None
    n: int
    method: str
    applied: bool
    reason: str = ""


def calibrate(
    sample: CalibrationSample,
    *,
    dry_run: bool = False,
) -> list[CalibrationResult]:
    """Compute Jenks breaks per level from ``sample`` and (unless dry_run) persist them.

    Levels whose sample is below the minimum size keep their current thresholds
    and are reported with ``applied=False``.
    """
    from django.utils import timezone

    from .models import StressThresholdConfig

    results: list[CalibrationResult] = []
    now = timezone.now()

    def _persist(level: str, breaks: list[float], gvf: float | None, n: int, method: str) -> None:
        if dry_run:
            return
        StressThresholdConfig.objects.update_or_create(
            level=level,
            defaults={
                "low_max": Decimal(str(round(breaks[0], 6))),
                "medium_max": Decimal(str(round(breaks[1], 6))),
                "high_max": Decimal(str(round(breaks[2], 6))) if len(breaks) > 2 else None,
                "method": method,
                "n_observations": n,
                "gvf": Decimal(str(round(gvf, 6))) if gvf is not None else None,
                "calibration_years": list(sample.years),
                "calibrated_at": now,
            },
        )

    # --- indicator ---
    n_ind = len(sample.indicator_stress)
    if n_ind >= MIN_INDICATOR_OBS:
        b, g = jenks_breaks(sample.indicator_stress, 4)
        _persist(LEVEL_INDICATOR, b, g, n_ind, _METHOD_JENKS)
        results.append(CalibrationResult(LEVEL_INDICATOR, b, g, n_ind, _METHOD_JENKS, True))
    else:
        results.append(CalibrationResult(
            LEVEL_INDICATOR, list(get_thresholds(LEVEL_INDICATOR).breaks), None, n_ind,
            get_thresholds(LEVEL_INDICATOR).method, False,
            f"need ≥ {MIN_INDICATOR_OBS} indicator observations, have {n_ind}",
        ))

    # --- component ---
    n_comp = len(sample.component_stress)
    comp_breaks: list[float] | None = None
    comp_gvf: float | None = None
    if n_comp >= MIN_COMPONENT_OBS:
        comp_breaks, comp_gvf = jenks_breaks(sample.component_stress, 4)
        _persist(LEVEL_COMPONENT, comp_breaks, comp_gvf, n_comp, _METHOD_JENKS)
        results.append(CalibrationResult(LEVEL_COMPONENT, comp_breaks, comp_gvf, n_comp, _METHOD_JENKS, True))
    else:
        results.append(CalibrationResult(
            LEVEL_COMPONENT, list(get_thresholds(LEVEL_COMPONENT).breaks), None, n_comp,
            get_thresholds(LEVEL_COMPONENT).method, False,
            f"need ≥ {MIN_COMPONENT_OBS} component observations, have {n_comp}",
        ))

    # --- system ---
    n_sys = len(sample.system_stress)
    if n_sys >= MIN_SYSTEM_OBS:
        b, g = jenks_breaks(sample.system_stress, 4)
        _persist(LEVEL_SYSTEM, b, g, n_sys, _METHOD_JENKS)
        results.append(CalibrationResult(LEVEL_SYSTEM, b, g, n_sys, _METHOD_JENKS, True))
    elif comp_breaks is not None:
        # FSFSI = Σ ω_c υ_c is a weighted mean of component stresses → component scale.
        _persist(LEVEL_SYSTEM, comp_breaks, comp_gvf, n_comp, _METHOD_INHERITED)
        results.append(CalibrationResult(
            LEVEL_SYSTEM, comp_breaks, comp_gvf, n_comp, _METHOD_INHERITED, True,
            f"only {n_sys} system observations (< {MIN_SYSTEM_OBS}); using component-scale breaks",
        ))
    else:
        results.append(CalibrationResult(
            LEVEL_SYSTEM, list(get_thresholds(LEVEL_SYSTEM).breaks), None, n_sys,
            get_thresholds(LEVEL_SYSTEM).method, False,
            "insufficient component and system observations",
        ))

    # --- coverage (3 classes) ---
    n_cov = len(sample.coverage)
    if n_cov >= MIN_COVERAGE_OBS:
        b, g = jenks_breaks(sample.coverage, 3)
        _persist(LEVEL_COVERAGE, b, g, n_cov, _METHOD_JENKS)
        results.append(CalibrationResult(LEVEL_COVERAGE, b, g, n_cov, _METHOD_JENKS, True))
    else:
        results.append(CalibrationResult(
            LEVEL_COVERAGE, list(get_thresholds(LEVEL_COVERAGE).breaks), None, n_cov,
            get_thresholds(LEVEL_COVERAGE).method, False,
            f"need ≥ {MIN_COVERAGE_OBS} coverage observations, have {n_cov}",
        ))

    if not dry_run:
        clear_cache()
    return results


# ---------------------------------------------------------------------------
# Re-labelling stored results with the active thresholds
# ---------------------------------------------------------------------------

def reclassify_all() -> dict[str, int]:
    """Re-label every stored assessment, component, indicator and history row.

    Returns counts of rows updated per model. Safe to run repeatedly.
    """
    from .models import AssessmentHistory, AssessmentResult, ComponentResult, IndicatorResult

    counts = {"assessments": 0, "components": 0, "indicators": 0, "history": 0}

    for a in AssessmentResult.objects.all().iterator():
        a.stress_level = classify(float(a.fsfsi_score), LEVEL_SYSTEM)
        a.cumulative_stress_level = (
            classify(float(a.cumulative_fsfsi), LEVEL_SYSTEM) if a.cumulative_fsfsi is not None else None
        )
        rj = a.result_json if isinstance(a.result_json, dict) else None
        update_fields = ["stress_level", "cumulative_stress_level"]
        if rj is not None and "risk_level" in rj:
            rj["risk_level"] = a.stress_level
            update_fields.append("result_json")
        a.save(update_fields=update_fields)
        counts["assessments"] += 1

    for c in ComponentResult.objects.all().iterator():
        apply_component_labels(c)
        c.save(update_fields=[
            "priority_level", "cumulative_priority_level", "financing_coverage", "diagnosis",
        ])
        counts["components"] += 1

    for i in IndicatorResult.objects.all().iterator():
        apply_indicator_labels(i)
        i.save(update_fields=["stress_level", "financing_coverage", "diagnosis"])
        counts["indicators"] += 1

    for h in AssessmentHistory.objects.all().iterator():
        h.stress_level = classify(float(h.fsfsi_score), LEVEL_SYSTEM)
        h.save(update_fields=["stress_level"])
        counts["history"] += 1

    return counts


def apply_component_labels(c) -> None:
    """Set classification fields on a ComponentResult (does not save)."""
    stress = float(c.component_stress)
    gap = float(c.avg_performance_gap)
    c.priority_level = classify(stress, LEVEL_COMPONENT)
    c.cumulative_priority_level = (
        classify(float(c.cumulative_stress), LEVEL_COMPONENT) if c.cumulative_stress is not None else None
    )
    cov = financing_coverage(gap, stress)
    c.financing_coverage = Decimal(str(round(cov, 6))) if cov is not None else None
    c.diagnosis = diagnose(gap, stress)


def apply_indicator_labels(i) -> None:
    """Set classification fields on an IndicatorResult (does not save)."""
    stress = float(i.stress_value)
    gap = float(i.performance_gap)
    i.stress_level = classify(stress, LEVEL_INDICATOR)
    cov = financing_coverage(gap, stress)
    i.financing_coverage = Decimal(str(round(cov, 6))) if cov is not None else None
    i.diagnosis = diagnose(gap, stress)
