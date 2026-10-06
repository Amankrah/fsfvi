"""
Calibrate FSFSI stress-classification thresholds from the stored assessment record.

    python manage.py calibrate_stress_thresholds            # calibrate + relabel everything
    python manage.py calibrate_stress_thresholds --dry-run  # show what would change
    python manage.py calibrate_stress_thresholds --show     # print active thresholds only

Method: Fisher–Jenks natural breaks (optimal 1-D classification) on the pooled
indicator / component / system stress values, one assessment per fiscal year.
Thresholds are frozen until this command is run again, so year-to-year labels
stay comparable. See apps/assessments/classification.py for details.
"""

from django.core.management.base import BaseCommand

from apps.assessments import classification as cls


class Command(BaseCommand):
    help = "Calibrate stress-level thresholds (Jenks natural breaks) from stored assessments and relabel results."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Compute breaks but do not persist or relabel.")
        parser.add_argument("--show", action="store_true", help="Print the active thresholds and exit.")
        parser.add_argument(
            "--scenario", default="normal_operations",
            help="Scenario to pool (default normal_operations). Use '' for all scenarios.",
        )
        parser.add_argument(
            "--min-indicators", type=int, default=cls.MIN_INDICATORS_PER_YEAR,
            help="Ignore fiscal-year assessments with fewer indicators than this.",
        )
        parser.add_argument(
            "--point-only", action="store_true",
            help="Pool point-in-time stress only (exclude cumulative values from the sample).",
        )
        parser.add_argument("--no-relabel", action="store_true", help="Persist thresholds but skip relabelling stored rows.")

    def handle(self, *args, **opts):
        if opts["show"]:
            self._print_active()
            return

        sample = cls.collect_sample(
            scenario=opts["scenario"] or None,
            min_indicators_per_year=opts["min_indicators"],
            include_cumulative=not opts["point_only"],
        )
        self.stdout.write(
            f"Sample: years={sample.years}  indicator n={len(sample.indicator_stress)}  "
            f"component n={len(sample.component_stress)}  system n={len(sample.system_stress)}  "
            f"coverage n={len(sample.coverage)}"
        )
        if not sample.years:
            self.stderr.write(self.style.ERROR("No qualifying assessments found; nothing calibrated."))
            return

        results = cls.calibrate(sample, dry_run=opts["dry_run"])
        for r in results:
            flag = self.style.SUCCESS("APPLIED") if r.applied else self.style.WARNING("SKIPPED")
            gvf = f" GVF={r.gvf:.3f}" if r.gvf is not None else ""
            self.stdout.write(
                f"  {r.level:10s} {flag}  breaks={[round(b, 4) for b in r.breaks]}  n={r.n}  method={r.method}{gvf}"
                + (f"  ({r.reason})" if r.reason else "")
            )

        if opts["dry_run"]:
            self.stdout.write(self.style.NOTICE("Dry run: nothing persisted."))
            return

        if not opts["no_relabel"]:
            counts = cls.reclassify_all()
            self.stdout.write(self.style.SUCCESS(f"Relabelled: {counts}"))

        self._print_active()

    def _print_active(self):
        self.stdout.write("Active thresholds:")
        for level, t in cls.get_all_thresholds().items():
            hi = f" high<={t['high_max']}" if t["high_max"] is not None else ""
            self.stdout.write(
                f"  {level:10s} low<={t['low_max']} medium<={t['medium_max']}{hi}  "
                f"[{t['method']}, n={t['n_observations']}, gvf={t['gvf']}, years={t['calibration_years']}]"
            )
