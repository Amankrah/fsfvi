"""
Copy per-indicator budget (gross/weighted bn LCU, record counts) from one fiscal
year to another when the target year has no budget-mapping import of its own.

Why this exists
---------------
FY2024 IndicatorData was created by import_indicator_parameters from the
FSFSI_indicator_level_parameters workbook, whose Funding_* columns pool weighted
spend across every mapping year (2018–2023 = 2,239.78 bn). Filed as a single year
that inflated FY2024 funding ~4x, understated FY2024 stress and anchored the
PSTA-5 plan to a RWF 2.2T "budget". Until a FY2024/25 budget mapping is
imported, the most defensible single-year figure is the latest real one carried
forward, flagged as such in IndicatorData.funding_source.

Observed values, benchmarks, sensitivities and provenance are NOT touched.

Usage:
    python manage.py carry_forward_funding --from-year 2023 --to-year 2024          # dry run
    python manage.py carry_forward_funding --from-year 2023 --to-year 2024 --apply
    python manage.py carry_forward_funding --from-year 2023 --to-year 2024 --apply --force
        (--force also overwrites target rows whose funding_source is 'budget_mapping')
"""
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.fsfvi_data.models import IndicatorData


FUNDING_FIELDS = ["gross_lcu_bn", "weighted_lcu_bn", "records_count", "fallback_records"]


class Command(BaseCommand):
    help = "Carry per-indicator budget forward from one fiscal year to another (dry run unless --apply)."

    def add_arguments(self, parser):
        parser.add_argument("--from-year", type=int, required=True, help="Source fiscal year, e.g. 2023")
        parser.add_argument("--to-year", type=int, required=True, help="Target fiscal year, e.g. 2024")
        parser.add_argument("--apply", action="store_true", help="Write changes (default is a dry run)")
        parser.add_argument(
            "--force",
            action="store_true",
            help="Overwrite target rows even if their funding_source is 'budget_mapping'.",
        )

    def handle(self, *args, **options):
        src_year = options["from_year"]
        dst_year = options["to_year"]
        apply = options["apply"]
        force = options["force"]
        if src_year == dst_year:
            raise CommandError("--from-year and --to-year must differ.")

        src = {
            d.indicator_id: d
            for d in IndicatorData.objects.filter(fiscal_year=src_year).select_related("indicator")
        }
        dst = list(IndicatorData.objects.filter(fiscal_year=dst_year).select_related("indicator").order_by("indicator__code"))
        if not src:
            raise CommandError(f"No IndicatorData for FY{src_year}.")
        if not dst:
            raise CommandError(f"No IndicatorData for FY{dst_year}. Create the year first (import_indicator_parameters).")

        protected = [d for d in dst if d.funding_source == "budget_mapping"]
        if protected and not force:
            raise CommandError(
                f"{len(protected)} FY{dst_year} rows already carry a real budget mapping "
                "(funding_source='budget_mapping'). Re-run with --force to overwrite them."
            )

        before_w = sum(d.weighted_lcu_bn for d in dst)
        before_g = sum(d.gross_lcu_bn for d in dst)

        self.stdout.write(f"Carry forward budget FY{src_year} -> FY{dst_year}  ({'APPLY' if apply else 'dry run'})")
        self.stdout.write("%-7s %-34s %10s %10s   %10s %10s   %s" % (
            "code", "indicator", "w_before", "w_after", "g_before", "g_after", "source"))

        changed = []
        missing = []
        after_w = Decimal("0")
        for d in dst:
            s = src.get(d.indicator_id)
            if s is None:
                missing.append(d)
                new_w, new_g, new_r, new_f = Decimal("0"), Decimal("0"), 0, 0
            else:
                new_w, new_g, new_r, new_f = s.weighted_lcu_bn, s.gross_lcu_bn, s.records_count, s.fallback_records
            self.stdout.write("%-7s %-34s %10.2f %10.2f   %10.2f %10.2f   %s" % (
                d.indicator.code, d.indicator.name[:34], d.weighted_lcu_bn, new_w, d.gross_lcu_bn, new_g,
                d.funding_source or "-"))
            d.gross_lcu_bn = new_g
            d.weighted_lcu_bn = new_w
            d.records_count = new_r
            d.fallback_records = new_f
            d.funding_source = f"carried_forward:FY{src_year}"
            after_w += new_w
            changed.append(d)

        for d in changed:
            d.share_weighted_percent = (d.weighted_lcu_bn / after_w * 100) if after_w > 0 else Decimal("0")
            d.updated_at = timezone.now()

        self.stdout.write("")
        self.stdout.write(
            f"FY{dst_year} weighted total: {before_w:,.2f} -> {after_w:,.2f} bn LCU "
            f"(gross {before_g:,.2f} -> {sum(d.gross_lcu_bn for d in changed):,.2f})"
        )
        if missing:
            self.stdout.write(self.style.WARNING(
                f"{len(missing)} indicator(s) have no FY{src_year} row and get zero budget: "
                + ", ".join(d.indicator.code for d in missing)
            ))

        if not apply:
            self.stdout.write(self.style.WARNING("Dry run. Re-run with --apply to write."))
            return

        with transaction.atomic():
            IndicatorData.objects.bulk_update(
                changed, FUNDING_FIELDS + ["share_weighted_percent", "funding_source", "updated_at"], batch_size=500
            )
        self.stdout.write(self.style.SUCCESS(
            f"Updated {len(changed)} FY{dst_year} rows (funding_source='carried_forward:FY{src_year}'). "
            f"Now re-run: python manage.py run_assessments_all_years --years {dst_year}"
        ))
