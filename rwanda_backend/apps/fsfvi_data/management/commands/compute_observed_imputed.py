"""
Compute imputed observed_value using the same rules as the FSFI engine.

observed_value in the DB is normally from external data (e.g. Excel Obs_value).
When it is NULL, the engine uses an imputation rule. This command applies
that rule so you can manually compute / fill sample observed values from the table.

Formulas (same as engine in assessment.rs):

  1. If observed_value is not NULL:
       → use it (no computation).

  2. If observed_value is NULL and benchmark_value is not NULL:
       → imputed_observed = benchmark_value
       (neutral gap: gap = 0 so the indicator does not distort the score).

  3. If both observed_value and benchmark_value are NULL:
       → imputed_observed = share_weighted_percent * 100
       (engine's synthetic scale; benchmark is then 10000/n in the engine).

Usage:
  python manage.py compute_observed_imputed --fiscal-year 2018
  python manage.py compute_observed_imputed --fiscal-year 2018 --apply
"""
from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.fsfvi_data.models import IndicatorData


def imputed_observed(rec, n_indicators: int):
    """
    Return (imputed_observed, formula_used).
    rec: IndicatorData with share_weighted_percent, observed_value, benchmark_value.
    """
    if rec.observed_value is not None:
        return float(rec.observed_value), "actual"
    share = float(rec.share_weighted_percent or 0)
    bench = rec.benchmark_value
    if bench is not None:
        return float(bench), "benchmark (neutral gap)"
    # Both null: synthetic
    return share * 100.0, "share_weighted_percent * 100"


class Command(BaseCommand):
    help = "Compute imputed observed_value from table columns using engine formulas (for sample/manual computation)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--fiscal-year",
            type=int,
            required=True,
            help="Fiscal year (e.g. 2018).",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Write imputed value to observed_value for rows where it is currently NULL.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=20,
            help="Max rows to print in the sample table (default 20). Use 0 for all.",
        )

    def handle(self, *args, **options):
        fiscal_year = options["fiscal_year"]
        apply = options["apply"]
        limit = options["limit"]

        rows = (
            IndicatorData.objects.filter(fiscal_year=fiscal_year)
            .select_related("indicator")
            .order_by("indicator__code")
        )
        n = rows.count()
        if n == 0:
            self.stdout.write(self.style.WARNING(f"No IndicatorData for FY{fiscal_year}."))
            return

        self.stdout.write(
            f"Imputed observed_value (FY{fiscal_year}, n={n})\n"
            "Formula: if observed NULL and benchmark set → imputed = benchmark; "
            "if both NULL → imputed = share_weighted_percent * 100.\n"
            + "-" * 100
        )

        to_update = []
        for i, rec in enumerate(rows):
            val, formula = imputed_observed(rec, n)
            obs_display = str(rec.observed_value) if rec.observed_value is not None else "NULL"
            if rec.observed_value is None:
                to_update.append((rec, val))
                if apply:
                    rec.observed_value = Decimal(str(round(val, 6)))
            if limit == 0 or i < limit:
                self.stdout.write(
                    f"  {rec.indicator.code:8} | "
                    f"share_w={float(rec.share_weighted_percent or 0):6.2f} | "
                    f"benchmark={float(rec.benchmark_value) if rec.benchmark_value else 0:8.2f} | "
                    f"observed(DB)={obs_display:>10} | "
                    f"imputed={val:10.4f} | {formula}"
                )

        self.stdout.write("-" * 100)
        if to_update:
            if apply:
                records_to_save = [rec for rec, _ in to_update]
                IndicatorData.objects.bulk_update(records_to_save, ["observed_value"], batch_size=50)
                self.stdout.write(
                    self.style.SUCCESS(f"Updated observed_value for {len(to_update)} rows (--apply).")
                )
            else:
                self.stdout.write(
                    f"Would update {len(to_update)} rows with NULL observed_value. Run with --apply to write."
                )
        else:
            self.stdout.write("No rows with NULL observed_value to update.")
