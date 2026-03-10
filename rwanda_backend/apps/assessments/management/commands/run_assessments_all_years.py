"""
Compute and store FSFI assessments for all fiscal years that have indicator data.

The dashboard shows "No Assessment Data" because it reads from assessment_results,
not from indicator_data. Indicator data (budget, observed, benchmark) exists per year;
the assessment is the *computed* FSFSI run (Rust engine) whose result is stored in
AssessmentResult. This command runs that computation and saves it for each year.

Usage:
  python manage.py run_assessments_all_years
  python manage.py run_assessments_all_years --years 2018,2020,2024
  python manage.py run_assessments_all_years --dry-run
"""
from django.core.management.base import BaseCommand

from apps.assessments.services import AssessmentService
from apps.fsfvi_data.models import IndicatorData


class Command(BaseCommand):
    help = "Run FSFI assessment and save results for specified fiscal years (default: all years with indicator data)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--years",
            type=str,
            default=None,
            help="Comma-separated fiscal years, e.g. 2018,2020,2024. Default: all years that have IndicatorData.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Only list years and indicator counts; do not run or save.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        years_arg = options["years"]

        if years_arg:
            try:
                years = [int(y.strip()) for y in years_arg.split(",") if y.strip()]
            except ValueError:
                self.stdout.write(self.style.ERROR("--years must be comma-separated integers (e.g. 2018,2020,2024)."))
                return
        else:
            years = list(
                IndicatorData.objects.values_list("fiscal_year", flat=True)
                .distinct()
                .order_by("fiscal_year")
            )

        if not years:
            self.stdout.write(self.style.WARNING("No fiscal years found. Import indicator data first (e.g. import_budget_mapping, import_indicator_parameters)."))
            return

        self.stdout.write(f"Fiscal years to assess: {years}")
        if dry_run:
            service = AssessmentService()
            for fy in years:
                indicators = service.load_indicators_from_db(fy)
                self.stdout.write(f"  FY{fy}: {len(indicators)} indicators")
            self.stdout.write(self.style.WARNING("Dry run — no assessments run or saved."))
            return

        service = AssessmentService()
        saved = 0
        for fy in years:
            indicators = service.load_indicators_from_db(fy)
            if not indicators:
                self.stdout.write(self.style.WARNING(f"  FY{fy}: no indicator data, skipping."))
                continue
            try:
                result = service.run_and_save_assessment(
                    indicators=indicators,
                    fiscal_year=fy,
                    assessment_name=f"FY{fy} assessment",
                    weighting_method="hybrid",
                    scenario="normal_operations",
                    user=None,
                )
                aid = result.get("assessment_id", "")
                self.stdout.write(self.style.SUCCESS(f"  FY{fy}: saved assessment {aid} (FSFSI={result.get('overall_fsfsi', 0):.4f})"))
                saved += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  FY{fy}: {e}"))
        self.stdout.write(self.style.SUCCESS(f"Done. Saved {saved} assessment(s)."))
