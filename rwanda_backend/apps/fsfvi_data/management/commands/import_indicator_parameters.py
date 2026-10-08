"""
Import benchmark and observed values from FSFSI_indicator_level_parameters.xlsx.

Reads only the Indicator_Parameters sheet. Updates:
- Indicator: unit, higher_is_better (from Direction), default_sensitivity (from alpha_per_bnLCU)
- IndicatorData: observed_value (Obs_value), benchmark_value (Benchmark_used), sensitivity_parameter,
  plus provenance: benchmark_used_type, fsci_indicator_used, delta_imputed, data_note;
  creates IndicatorData for (indicator, Obs_year) if missing, with ZERO budget.

Budget (gross/weighted_lcu_bn) is deliberately not taken from this sheet: its
Funding_* columns are the sum of weighted spend across every mapping year
(2018–2023 = 2,239.78 bn), not one fiscal year. Budget comes from
import_budget_mapping, or carry_forward_funding when no mapping exists for a year.
--with-funding overrides this and is refused when the sheet total looks pooled.

With --propagate, the benchmark and its provenance (not the observed value) are also
copied to every other fiscal year of the same indicator. Benchmarks in this pipeline
are time-invariant, so this replaces the manual "Step 4" shell snippet.

Usage:
    python manage.py import_indicator_parameters /path/to/FSFSI_indicator_level_parameters.xlsx \
        --default-fiscal-year 2024 --propagate
"""
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.fsfvi_data.models import Indicator, IndicatorData, IndicatorComponent, DataStatus


# Column indices (0-based) for Indicator_Parameters sheet
COL_INDICATOR_CODE = 0   # A
COL_INDICATOR_NAME = 1   # B
COL_COMPONENT = 2        # C
COL_FUNDING_WEIGHTED_BN = 3   # D
COL_FUNDING_GROSS_BN = 4     # E
COL_RECORDS = 5          # F
COL_FALLBACK_RECORDS = 6 # G
COL_FSCI_INDICATOR_USED = 7  # H
COL_OBS_VALUE = 8        # I
COL_OBS_YEAR = 9         # J
COL_OBS_UNIT = 10        # K
COL_BENCHMARK_USED = 11  # L (numeric benchmark value)
COL_BENCHMARK_TYPE = 12  # M
COL_DIRECTION = 13       # N  "higher" | "lower"
COL_DELTA = 14           # O
COL_DELTA_IMPUTED = 15   # P
COL_ALPHA_PER_BN_LCU = 16   # Q → default_sensitivity / sensitivity_parameter
COL_DATA_NOTE = 25       # Z

# Fields copied to all fiscal years of an indicator when --propagate is used
PROPAGATED_FIELDS = [
    "benchmark_value",
    "benchmark_used_type",
    "fsci_indicator_used",
    "delta_imputed",
    "data_note",
    "sensitivity_parameter",
]


def _safe_bool(value):
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ("true", "1", "yes", "y")


def _safe_decimal(value, default=None):
    if value is None:
        return default
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError):
        return default


def _safe_int(value, default=0):
    if value is None:
        return default
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return default


def _safe_str(value, max_len=None):
    s = "" if value is None else str(value).strip()
    if max_len and len(s) > max_len:
        return s[:max_len]
    return s


def _direction_to_higher_is_better(direction):
    if not direction:
        return True
    return str(direction).strip().lower() == "higher"


def _component_label_to_value(label):
    if not label:
        return ""
    label = str(label).strip()
    for choice in IndicatorComponent:
        if choice.label == label:
            return choice.value
    normalized = label.lower().replace(" ", "_").replace("-", "_")
    if normalized in [c.value for c in IndicatorComponent]:
        return normalized
    return label.lower().replace(" ", "_").replace("-", "_")[:30]


class Command(BaseCommand):
    help = "Import benchmark and observed values from FSFSI_indicator_level_parameters.xlsx (Indicator_Parameters sheet)"

    def add_arguments(self, parser):
        parser.add_argument(
            "excel_path",
            type=str,
            help="Path to FSFSI_indicator_level_parameters.xlsx",
        )
        parser.add_argument(
            "--default-fiscal-year",
            type=int,
            default=None,
            help="If Obs_year is blank in the sheet, use this year for IndicatorData (e.g. 2024).",
        )
        parser.add_argument(
            "--propagate",
            action="store_true",
            help=(
                "Copy benchmark_value, benchmark provenance and sensitivity from the sheet "
                "to every fiscal year of each indicator (observed values are not propagated)."
            ),
        )
        parser.add_argument(
            "--with-funding",
            action="store_true",
            help=(
                "Also write Funding_weighted/gross_bn_LCU and Records into newly created "
                "IndicatorData rows. Off by default: the parameters sheet's funding columns are "
                "normally a multi-year pool, not a single fiscal year. Budget should come from "
                "import_budget_mapping (or carry_forward_funding). Refused if the sheet total "
                "looks pooled across the mapping years already in the database."
            ),
        )

    def handle(self, *args, **options):
        path = Path(options["excel_path"])
        if not path.is_file():
            raise CommandError(f"File not found: {path}")

        try:
            import openpyxl
        except ImportError:
            raise CommandError("openpyxl is required. Install with: pip install openpyxl")

        self.stdout.write(f"Loading workbook (read_only): {path}")
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)

        if "Indicator_Parameters" not in wb.sheetnames:
            wb.close()
            raise CommandError("Sheet 'Indicator_Parameters' not found")

        ws = wb["Indicator_Parameters"]
        default_fy = options.get("default_fiscal_year")
        propagate = options.get("propagate", False)
        with_funding = options.get("with_funding", False)
        try:
            with transaction.atomic():
                self._load_indicator_parameters(
                    ws, default_fiscal_year=default_fy, propagate=propagate,
                    with_funding=with_funding,
                )
        finally:
            wb.close()

        self.stdout.write(self.style.SUCCESS("Import completed successfully."))

    def _check_funding_not_pooled(self, rows):
        """
        Refuse to write the sheet's Funding_* columns as a single-year budget when they
        look like a pool of the mapping years already in the database.

        The FSFSI_indicator_level_parameters workbook sums weighted spend across every
        year of budget_lines_to_food_system_indicators_mapping.xlsx (its Assumptions tab
        calls it "Total budget B"). Filed under one Obs_year it inflates that year's
        funding several-fold.
        """
        from django.db.models import Sum
        from apps.fsfvi_data.models import BudgetLineMapping

        sheet_total = sum(float(r["funding_weighted_bn"] or 0) for r in rows)
        per_year = {
            r["fiscal_year"]: float(r["w"] or 0) / 1e9
            for r in BudgetLineMapping.objects.values("fiscal_year").annotate(w=Sum("amount_weighted_lcu"))
        }
        if not per_year or sheet_total <= 0:
            return
        pooled_total = sum(per_year.values())
        max_year_total = max(per_year.values())
        years = sorted(per_year)
        self.stdout.write(
            f"  Funding check: sheet weighted total {sheet_total:,.1f} bn; "
            f"mapping FY{years[0]}–FY{years[-1]} sum {pooled_total:,.1f} bn, largest single year {max_year_total:,.1f} bn"
        )
        looks_pooled = (
            abs(sheet_total - pooled_total) / pooled_total < 0.05
            and sheet_total > 1.5 * max_year_total
        )
        if looks_pooled:
            raise CommandError(
                "Refusing --with-funding: the sheet's Funding_weighted_bn_LCU total "
                f"({sheet_total:,.1f} bn) matches the SUM of all mapping years "
                f"({pooled_total:,.1f} bn across FY{years[0]}–FY{years[-1]}), i.e. it is pooled, "
                "not a single fiscal year. Import a budget mapping for the target year "
                "(import_budget_mapping --fiscal-year N) or run carry_forward_funding instead."
            )
        if sheet_total > 1.5 * max_year_total:
            self.stdout.write(self.style.WARNING(
                f"  Funding check: sheet total is {sheet_total / max_year_total:.1f}x the largest "
                "single mapping year. Verify it is a one-year figure before trusting FSFSI results."
            ))

    def _propagate_benchmarks(self, rows, indicators):
        """Copy benchmark + provenance (+ alpha) from the sheet row to all fiscal years."""
        updated = 0
        for r in rows:
            ind = indicators.get(r["code"])
            if ind is None or r["benchmark_value"] is None:
                continue
            targets = []
            for rec in IndicatorData.objects.filter(indicator=ind):
                rec.benchmark_value = r["benchmark_value"]
                rec.benchmark_used_type = r["benchmark_used_type"]
                rec.fsci_indicator_used = r["fsci_indicator_used"]
                rec.delta_imputed = r["delta_imputed"]
                rec.data_note = r["data_note"]
                if r["default_sensitivity"] is not None:
                    rec.sensitivity_parameter = r["default_sensitivity"]
                rec.updated_at = timezone.now()
                targets.append(rec)
            if targets:
                IndicatorData.objects.bulk_update(
                    targets, PROPAGATED_FIELDS + ["updated_at"], batch_size=500
                )
                updated += len(targets)
        self.stdout.write(f"  Benchmarks propagated to {updated} IndicatorData rows (all fiscal years)")

    def _load_indicator_parameters(self, ws, default_fiscal_year=None, propagate=False, with_funding=False):
        """Read Indicator_Parameters rows and update Indicator + IndicatorData."""
        rows = []
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or len(row) <= COL_BENCHMARK_USED:
                continue
            code = _safe_str(row[COL_INDICATOR_CODE], 20)
            if not code or not code.upper().startswith("IND-"):
                continue

            obs_year = _safe_int(row[COL_OBS_YEAR])
            if not obs_year or obs_year < 2000 or obs_year > 2100:
                obs_year = default_fiscal_year

            obs_value = _safe_decimal(row[COL_OBS_VALUE])
            benchmark_raw = row[COL_BENCHMARK_USED] if len(row) > COL_BENCHMARK_USED else None
            # Benchmark_used can be numeric or string (e.g. "SSA_10/90pct"); store numeric for benchmark_value
            benchmark_value = _safe_decimal(benchmark_raw)
            # When benchmark_value is empty, Benchmark_used_type (e.g. Global_10/90pct) tells us the reference
            benchmark_used_type = _safe_str(row[COL_BENCHMARK_TYPE], 100) if len(row) > COL_BENCHMARK_TYPE else ""
            direction = _safe_str(row[COL_DIRECTION]) if len(row) > COL_DIRECTION else ""
            obs_unit = _safe_str(row[COL_OBS_UNIT], 50) if len(row) > COL_OBS_UNIT else ""
            alpha = _safe_decimal(row[COL_ALPHA_PER_BN_LCU]) if len(row) > COL_ALPHA_PER_BN_LCU else None
            fsci_used = _safe_str(row[COL_FSCI_INDICATOR_USED], 255) if len(row) > COL_FSCI_INDICATOR_USED else ""
            delta_imputed = _safe_bool(row[COL_DELTA_IMPUTED]) if len(row) > COL_DELTA_IMPUTED else False
            data_note = _safe_str(row[COL_DATA_NOTE]) if len(row) > COL_DATA_NOTE else ""

            funding_weighted = _safe_decimal(row[COL_FUNDING_WEIGHTED_BN], Decimal("0")) if len(row) > COL_FUNDING_WEIGHTED_BN else Decimal("0")
            funding_gross = _safe_decimal(row[COL_FUNDING_GROSS_BN], Decimal("0")) if len(row) > COL_FUNDING_GROSS_BN else Decimal("0")
            records = _safe_int(row[COL_RECORDS]) if len(row) > COL_RECORDS else 0
            fallback = _safe_int(row[COL_FALLBACK_RECORDS]) if len(row) > COL_FALLBACK_RECORDS else 0
            component_label = _safe_str(row[COL_COMPONENT]) if len(row) > COL_COMPONENT else ""
            component_value = _component_label_to_value(component_label)

            rows.append({
                "code": code,
                "obs_year": obs_year,
                "observed_value": obs_value,
                "benchmark_value": benchmark_value,
                "benchmark_used_type": benchmark_used_type,
                "fsci_indicator_used": fsci_used,
                "delta_imputed": delta_imputed,
                "data_note": data_note,
                "higher_is_better": _direction_to_higher_is_better(direction),
                "unit": obs_unit,
                "default_sensitivity": alpha,
                "funding_weighted_bn": funding_weighted,
                "funding_gross_bn": funding_gross,
                "records_count": records,
                "fallback_records": fallback,
                "component": component_value,
            })

        if not rows:
            self.stdout.write(self.style.WARNING("No data rows found in Indicator_Parameters."))
            return

        if with_funding:
            self._check_funding_not_pooled(rows)

        codes = list({r["code"] for r in rows})
        indicators = {ind.code: ind for ind in Indicator.objects.filter(code__in=codes).only("id", "code", "unit", "higher_is_better", "default_sensitivity")}
        if not indicators:
            self.stdout.write(self.style.WARNING("No matching indicators in DB. Run import_budget_mapping first to create indicators."))
            return

        # Build (indicator_id, fiscal_year) -> row for updates/creates
        by_key = {}
        for r in rows:
            if r["code"] not in indicators:
                continue
            key = (indicators[r["code"]].id, r["obs_year"] or 0)
            if key not in by_key:
                by_key[key] = r
            else:
                # Keep row with obs_year set; prefer one with observed_value/benchmark
                existing = by_key[key]
                if (r["observed_value"] is not None or r["benchmark_value"] is not None) and (existing["observed_value"] is None and existing["benchmark_value"] is None):
                    by_key[key] = r

        # Update Indicator: unit, higher_is_better, default_sensitivity (per code, last row wins per code)
        indicator_updates = {}
        for r in rows:
            if r["code"] not in indicators:
                continue
            ind = indicators[r["code"]]
            indicator_updates[ind.id] = {
                "unit": r["unit"] or ind.unit,
                "higher_is_better": r["higher_is_better"],
                "default_sensitivity": r["default_sensitivity"] if r["default_sensitivity"] is not None else ind.default_sensitivity,
            }

        for ind in indicators.values():
            if ind.id in indicator_updates:
                u = indicator_updates[ind.id]
                ind.unit = u["unit"]
                ind.higher_is_better = u["higher_is_better"]
                ind.default_sensitivity = u["default_sensitivity"]
        Indicator.objects.bulk_update(
            [indicators[c] for c in codes if c in indicators],
            ["unit", "higher_is_better", "default_sensitivity"],
        )
        self.stdout.write(f"  Indicators updated: {len(indicator_updates)}")

        # IndicatorData: existing (indicator_id, fiscal_year) -> update; else create
        existing_data = {}
        for ind_id, fy in by_key:
            if fy <= 0:
                continue
            existing_data[(ind_id, fy)] = None  # placeholder
        if existing_data:
            keys = list(existing_data.keys())
            q = Q()
            for (ind_id, fy) in keys:
                q |= Q(indicator_id=ind_id, fiscal_year=fy)
            for rec in IndicatorData.objects.filter(q).select_related("indicator"):
                existing_data[(rec.indicator_id, rec.fiscal_year)] = rec

        to_update = []
        to_create = []
        for (ind_id, fiscal_year), r in by_key.items():
            if fiscal_year <= 0:
                continue
            rec = existing_data.get((ind_id, fiscal_year))
            if rec:
                rec.observed_value = r["observed_value"]
                rec.benchmark_value = r["benchmark_value"]
                rec.benchmark_used_type = r.get("benchmark_used_type") or ""
                rec.fsci_indicator_used = r["fsci_indicator_used"]
                rec.delta_imputed = r["delta_imputed"]
                rec.data_note = r["data_note"]
                if r["default_sensitivity"] is not None:
                    rec.sensitivity_parameter = r["default_sensitivity"]
                rec.updated_at = timezone.now()
                to_update.append(rec)
            else:
                to_create.append(
                    IndicatorData(
                        indicator_id=ind_id,
                        fiscal_year=fiscal_year,
                        records_count=r["records_count"] if with_funding else 0,
                        fallback_records=r["fallback_records"] if with_funding else 0,
                        gross_lcu_bn=r["funding_gross_bn"] if with_funding else Decimal("0"),
                        weighted_lcu_bn=r["funding_weighted_bn"] if with_funding else Decimal("0"),
                        share_weighted_percent=Decimal("0"),
                        funding_source="parameters_sheet" if with_funding else "",
                        observed_value=r["observed_value"],
                        benchmark_value=r["benchmark_value"],
                        benchmark_used_type=r.get("benchmark_used_type") or "",
                        fsci_indicator_used=r["fsci_indicator_used"],
                        delta_imputed=r["delta_imputed"],
                        data_note=r["data_note"],
                        sensitivity_parameter=r["default_sensitivity"],
                        status=DataStatus.VALIDATED,
                    )
                )

        if to_update:
            IndicatorData.objects.bulk_update(
                to_update,
                [
                    "observed_value", "benchmark_value", "benchmark_used_type",
                    "fsci_indicator_used", "delta_imputed", "data_note",
                    "sensitivity_parameter", "updated_at",
                ],
                batch_size=500,
            )
            self.stdout.write(f"  IndicatorData updated: {len(to_update)}")
        if to_create:
            IndicatorData.objects.bulk_create(to_create)
            self.stdout.write(f"  IndicatorData created: {len(to_create)}")
            if not with_funding:
                years = sorted({rec.fiscal_year for rec in to_create})
                self.stdout.write(self.style.WARNING(
                    f"  Created rows have zero budget (funding not taken from the parameters sheet). "
                    f"Run import_budget_mapping --fiscal-year N or carry_forward_funding for FY{years}."
                ))
        if not to_update and not to_create:
            self.stdout.write(self.style.WARNING("  No IndicatorData rows updated or created (fiscal years may not match existing data)."))

        if propagate:
            # One sheet row per indicator code (last wins) drives propagation
            per_code = {r["code"]: r for r in rows if r["code"] in indicators}
            self._propagate_benchmarks(list(per_code.values()), indicators)
