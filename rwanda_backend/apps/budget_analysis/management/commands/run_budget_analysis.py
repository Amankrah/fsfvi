"""
Pipeline / ops: print multi-year budget history summary (stdout).

Example:
  python manage.py run_budget_analysis
  python manage.py run_budget_analysis --start-year 2018 --end-year 2024 --json
"""

import json

from django.core.management.base import BaseCommand, CommandError

from apps.budget_analysis.services import build_budget_history_analysis


class Command(BaseCommand):
    help = "Summarise mapped budget history from IndicatorData (financial view, not FSFSI)."

    def add_arguments(self, parser):
        parser.add_argument("--start-year", type=int, default=None)
        parser.add_argument("--end-year", type=int, default=None)
        parser.add_argument("--json", action="store_true", help="Print full JSON payload")

    def handle(self, *args, **options):
        payload = build_budget_history_analysis(
            options.get("start_year"),
            options.get("end_year"),
        )
        if not payload:
            raise CommandError("No IndicatorData — run import_budget_mapping first.")

        if options["json"]:
            self.stdout.write(json.dumps(payload, default=str, indent=2))
            return

        sc = payload["scope"]
        self.stdout.write(self.style.SUCCESS(f"Budget history FY{sc['start_year']}–FY{sc['end_year']}"))
        m = payload["metrics"]
        self.stdout.write(f"  CAGR (weighted): {m.get('cagr_weighted_pct')}%")
        self.stdout.write(f"  YoY volatility (σ): {m.get('volatility_yoy_weighted_pp')} pp")
        for line in payload.get("insights", [])[:6]:
            self.stdout.write(f"  • {line}")
