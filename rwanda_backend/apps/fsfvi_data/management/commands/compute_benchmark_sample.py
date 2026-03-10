"""
Compute Global_10/90pct benchmarks from reference distributions.

- higher_is_better → 90th percentile of reference distribution = benchmark
- lower_is_better  → 10th percentile = benchmark

Loads real country-level data from apps/fsfvi_data/data/reference_distributions.json
(World Bank API, etc.). Falls back to illustrative distributions for indicators not
yet in the data file.
"""
import json
import statistics
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.fsfvi_data.models import IndicatorData, Indicator

# Path to production reference data (World Bank / FAO country-level)
_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
_REFERENCE_DATA_FILE = _DATA_DIR / "reference_distributions.json"

# Fallback: illustrative distributions when real data not in reference_distributions.json
_FALLBACK_DISTRIBUTIONS = {
    "IND-02": [0.3, 0.8, 1.2, 1.8, 2.5, 3.2, 4.0, 5.5, 7.0, 8.5, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0, 22.0, 24.0, 26.0, 28.0, 30.0, 32.0, 35.0, 38.0, 40.0, 45.0, 50.0],
    "IND-04": [5, 8, 12, 15, 18, 22, 28, 32, 38, 42, 48, 52, 58, 62, 68, 72, 78, 82, 88],
    "IND-05": [0.25, 0.32, 0.38, 0.42, 0.48, 0.52, 0.58, 0.62, 0.68, 0.72, 0.78, 0.82, 0.88, 0.92],
    "IND-06": [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1800, 2200, 2600, 3000],
    "IND-07": [25, 35, 45, 55, 65, 75, 85, 95, 110, 125, 140, 160, 180, 200, 220, 250],
    "IND-08": [5, 8, 12, 18, 22, 28, 35, 42, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95],
    "IND-09": [2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 14.0, 16.0, 18.0, 20.0],
    "IND-10": [45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130],
    "IND-11": [4.0, 5.0, 6.0, 7.0, 8.0, 10.0, 12.0, 14.0, 16.0, 18.0, 20.0, 22.0, 25.0, 28.0, 30.0],
    "IND-12": [2, 4, 6, 8, 10, 12, 15, 18, 22, 26, 30, 35, 40, 45, 50, 55, 60, 65, 70],
    "IND-13": [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 12.0, 15.0, 18.0, 22.0],
    "IND-14": [15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95],
    "IND-15": [5, 8, 12, 16, 20, 24, 28, 32, 36, 40, 45, 50, 55, 60, 65, 70, 75, 80],
    "IND-16": [20, 28, 35, 42, 48, 55, 60, 65, 70, 75, 80, 85, 88, 92, 95],
    "IND-17": [0.3, 0.5, 0.8, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 15.0],
    "IND-18": [8, 12, 16, 20, 24, 28, 32, 36, 40, 45, 50, 55, 60, 65, 70, 75, 80],
    "IND-19": [2, 4, 6, 8, 10, 12, 15, 18, 22, 26, 30, 35, 40, 45, 50, 55, 60],
    "IND-22": [40, 45, 50, 55, 60, 65, 70, 75, 78, 82, 85, 88, 90, 92, 95, 98],
    "IND-25": [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 15.0, 18.0, 22.0, 26.0],
    "IND-27": [5, 8, 12, 16, 20, 24, 28, 32, 36, 40, 45, 50, 55, 60, 65, 70, 75],
    "IND-29": [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90],
    "IND-30": [2, 4, 6, 8, 10, 12, 15, 18, 22, 26, 30, 35, 40, 45, 50, 55, 60],
    "IND-31": [15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90],
    "IND-32": [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0],
    "IND-33": [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
    "IND-34": [8, 12, 16, 20, 24, 28, 32, 36, 40, 45, 50, 55, 60, 65, 70, 75],
    "IND-35": [3, 5, 8, 10, 12, 15, 18, 22, 26, 30, 35, 40, 45, 50, 55, 60],
    "IND-36": [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
    "IND-37": [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 15.0, 18.0, 22.0],
}


def _load_reference_data():
    """Load reference distributions: real data from JSON, then merge fallbacks for missing codes."""
    merged = {}
    source_by_code = {}
    if _REFERENCE_DATA_FILE.exists():
        try:
            with open(_REFERENCE_DATA_FILE, encoding="utf-8") as f:
                data = json.load(f)
            meta = {"source": data.get("source", "unknown"), "year": data.get("year", "")}
            for code, obj in data.get("indicators", {}).items():
                vals = obj.get("values")
                if vals and len(vals) >= 5:
                    merged[code] = [float(v) for v in vals]
                    source_by_code[code] = f"{meta['source']} {meta['year']}"
        except (json.JSONDecodeError, TypeError) as e:
            pass
    for code, vals in _FALLBACK_DISTRIBUTIONS.items():
        if code not in merged:
            merged[code] = vals
            source_by_code[code] = "illustrative (fallback)"
    return merged, source_by_code


def percentile_90(values):
    """90th percentile (higher is better → use as benchmark)."""
    return statistics.quantiles(values, n=100)[89] if len(values) >= 10 else statistics.quantiles(values, n=10)[8]


def percentile_10(values):
    """10th percentile (lower is better → use as benchmark)."""
    return statistics.quantiles(values, n=100)[9] if len(values) >= 10 else statistics.quantiles(values, n=10)[0]


class Command(BaseCommand):
    help = "Compute sample Global_10/90pct benchmarks and compare to Rwanda observed values"

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Update benchmark_value in DB with computed value (for sample indicators only).",
        )
        parser.add_argument(
            "--fiscal-year",
            type=int,
            default=2024,
            help="Fiscal year to use (default 2024).",
        )
        parser.add_argument(
            "--fill-missing",
            action="store_true",
            help="When using --apply, also write benchmark_value for rows with no observed_value (so benchmarks are ready when observed is added later).",
        )
        parser.add_argument(
            "--any-year",
            action="store_true",
            help="Include IndicatorData for the fiscal year even if benchmark_used_type is not set (e.g. rows from budget import only). Use to fill benchmarks for FY2018 etc.",
        )

    def handle(self, *args, **options):
        fiscal_year = options["fiscal_year"]
        apply = options["apply"]
        fill_missing = options.get("fill_missing", False)
        any_year = options.get("any_year", False)

        ref_distributions, ref_sources = _load_reference_data()

        # Get IndicatorData for this fiscal year (with or without 10/90 benchmark type)
        if any_year:
            rows = (
                IndicatorData.objects.filter(fiscal_year=fiscal_year)
                .select_related("indicator")
                .order_by("indicator__code")
            )
        else:
            rows = (
                IndicatorData.objects.filter(
                    fiscal_year=fiscal_year,
                    benchmark_used_type__icontains="10/90",
                )
                .select_related("indicator")
                .order_by("indicator__code")
            )

        # Restrict to indicators we have a reference distribution for
        available_codes = set(ref_distributions.keys())
        sample = [r for r in rows if r.indicator.code in available_codes]

        if not sample:
            self.stdout.write(
                self.style.WARNING(
                    f"No IndicatorData for FY{fiscal_year} with a reference distribution. "
                    + ("Try --any-year to include rows without benchmark_used_type. " if not any_year else "")
                    + "Available sample codes: " + ", ".join(sorted(available_codes))
                )
            )
            return

        self.stdout.write(
            f"Sample: 10/90 percentile benchmark computation (FY{fiscal_year}, {len(sample)} indicators)\n"
        )
        self.stdout.write(
            f"  Reference data: {_REFERENCE_DATA_FILE} (real country-level where available)\n"
        )
        self.stdout.write("-" * 90)
        to_update = []

        for rec in sample:
            ind = rec.indicator
            code = ind.code
            dist = ref_distributions.get(code)
            if not dist:
                continue
            source_label = ref_sources.get(code, "—")
            higher = ind.higher_is_better

            if higher:
                computed_bench = percentile_90(dist)
                pct_label = "90th"
            else:
                computed_bench = percentile_10(dist)
                pct_label = "10th"

            obs = float(rec.observed_value) if rec.observed_value is not None else None
            if obs is not None and computed_bench is not None:
                gap_raw = obs - computed_bench
                gap_note = f"Gap (obs - bench): {gap_raw:+.4f}. {'Above benchmark (good)' if higher and gap_raw >= 0 else 'Below benchmark' if higher else 'Below benchmark (good)' if not higher and gap_raw <= 0 else 'Above benchmark (worse)'}"
            else:
                gap_note = "—"

            direction = "higher=better" if higher else "lower=better"
            stored = f"{float(rec.benchmark_value):.4f}" if rec.benchmark_value is not None else "—"
            self.stdout.write(
                f"  {code} ({ind.name[:40]})\n"
                f"    Source: {source_label}\n"
                f"    Direction: {direction} → benchmark = {pct_label} percentile of reference distribution\n"
                f"    Reference: n={len(dist)} countries, min={min(dist):.2f}, max={max(dist):.2f}\n"
                f"    Computed benchmark: {computed_bench:.4f} {ind.unit or ''}\n"
                f"    Stored benchmark:   {stored} (from sheet/DB)\n"
                f"    Rwanda observed:    {obs if obs is not None else '—'}\n"
                f"    {gap_note}\n"
            )

            if apply and (obs is not None or fill_missing):
                rec.benchmark_value = Decimal(str(round(computed_bench, 4)))
                to_update.append(rec)

        self.stdout.write("-" * 90)
        if to_update:
            if apply:
                IndicatorData.objects.bulk_update(to_update, ["benchmark_value"], batch_size=50)
                self.stdout.write(self.style.SUCCESS(f"Updated benchmark_value for {len(to_update)} records (--apply)."))
            else:
                self.stdout.write("Run with --apply to write these computed benchmarks to the database.")
        else:
            self.stdout.write(
                "No records to update. Use --apply (and optionally --fill-missing to write benchmarks even when observed_value is empty)."
            )
