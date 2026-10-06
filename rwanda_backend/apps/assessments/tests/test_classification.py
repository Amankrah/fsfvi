"""Empirical stress classification: Jenks breaks, calibration, relabelling, API."""

import math
import random
from decimal import Decimal

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.assessments import classification as cls
from apps.assessments.models import (
    AssessmentHistory,
    AssessmentResult,
    ComponentResult,
    IndicatorResult,
    StressThresholdConfig,
)
from apps.authentication.models import GovernmentUser

COMPONENTS = [
    "markets", "crop_production", "nutrition", "research",
    "post_harvest", "environment", "animal_systems", "finance",
]


# ---------------------------------------------------------------------------
# Pure functions
# ---------------------------------------------------------------------------

class JenksBreaksTests(TestCase):
    def test_three_clear_clusters(self):
        data = [1, 2, 3, 10, 11, 12, 20, 21, 22]
        breaks, gvf = cls.jenks_breaks(data, 3)
        self.assertEqual(breaks, [3.0, 12.0])
        self.assertGreater(gvf, 0.98)

    def test_four_clusters_with_zeros_and_ties(self):
        data = [0, 0, 0, 0, 0.1, 0.1, 0.2, 0.45, 0.5, 0.5, 0.5, 0.55, 0.9, 0.95, 1.0]
        breaks, gvf = cls.jenks_breaks(data, 4)
        self.assertEqual(len(breaks), 3)
        self.assertTrue(all(breaks[i] < breaks[i + 1] for i in range(2)))
        # every break must be an observed value (Jenks puts class bounds on data points)
        for b in breaks:
            self.assertIn(b, data)
        self.assertGreater(gvf, 0.9)

    def test_constant_data_has_gvf_one(self):
        breaks, gvf = cls.jenks_breaks([0.3] * 10, 4)
        self.assertEqual(gvf, 1.0)
        self.assertEqual(len(breaks), 3)

    def test_rejects_too_few_points(self):
        with self.assertRaises(ValueError):
            cls.jenks_breaks([0.1, 0.2], 4)
        with self.assertRaises(ValueError):
            cls.jenks_breaks([0.1, 0.2, 0.3], 1)

    def test_breaks_minimise_within_class_variance_vs_quantiles(self):
        """Jenks must never do worse than equal-count quantile cuts."""
        rng = random.Random(7)
        data = [rng.betavariate(2, 3) for _ in range(150)] + [0.0] * 20
        breaks, gvf = cls.jenks_breaks(data, 4)
        xs = sorted(data)
        q = [xs[len(xs) // 4 - 1], xs[len(xs) // 2 - 1], xs[3 * len(xs) // 4 - 1]]

        def sdcm(bounds):
            groups = [[] for _ in range(len(bounds) + 1)]
            for v in data:
                groups[cls.LABELS.index(cls._classify_with_breaks(v, bounds))].append(v)
            tot = 0.0
            for g in groups:
                if g:
                    m = sum(g) / len(g)
                    tot += sum((v - m) ** 2 for v in g)
            return tot

        self.assertLessEqual(sdcm(breaks), sdcm(q) + 1e-9)
        self.assertGreater(gvf, 0.8)


class ClassifyAndDiagnoseTests(TestCase):
    def setUp(self):
        cls.clear_cache()

    def test_engine_defaults_when_uncalibrated(self):
        self.assertEqual(StressThresholdConfig.objects.count(), 0)
        t = cls.get_thresholds(cls.LEVEL_SYSTEM)
        self.assertEqual(t.breaks, list(cls.ENGINE_DEFAULT_BREAKS))
        self.assertFalse(t.as_dict()["is_calibrated"])
        self.assertEqual(cls.classify(0.04, cls.LEVEL_SYSTEM), "low")
        self.assertEqual(cls.classify(0.05, cls.LEVEL_SYSTEM), "low")   # inclusive upper bound
        self.assertEqual(cls.classify(0.10, cls.LEVEL_SYSTEM), "medium")
        self.assertEqual(cls.classify(0.30, cls.LEVEL_SYSTEM), "high")
        self.assertEqual(cls.classify(0.31, cls.LEVEL_SYSTEM), "critical")
        self.assertEqual(cls.classify(float("nan"), cls.LEVEL_SYSTEM), "medium")

    def test_db_thresholds_override_defaults_and_cache_clears(self):
        StressThresholdConfig.objects.create(
            level="component", low_max=Decimal("0.2"), medium_max=Decimal("0.34"), high_max=Decimal("0.46"),
            method="jenks_natural_breaks", n_observations=100,
        )
        cls.clear_cache()
        self.assertEqual(cls.classify(0.25, cls.LEVEL_COMPONENT), "medium")
        self.assertEqual(cls.classify(0.45, cls.LEVEL_COMPONENT), "high")
        self.assertEqual(cls.classify(0.47, cls.LEVEL_COMPONENT), "critical")
        self.assertAlmostEqual(cls.critical_threshold(cls.LEVEL_COMPONENT), 0.46)
        # other levels still default
        self.assertEqual(cls.classify(0.25, cls.LEVEL_SYSTEM), "high")

    def test_unknown_level_rejected(self):
        with self.assertRaises(ValueError):
            cls.get_thresholds("galaxy")

    def test_financing_coverage_identity(self):
        # Ï… = Î´Â·e^(âˆ’Î±f) â†’ coverage = 1 âˆ’ e^(âˆ’Î±f)
        gap, alpha, f = 0.6, 0.05, 20.0
        stress = gap * math.exp(-alpha * f)
        self.assertAlmostEqual(cls.financing_coverage(gap, stress), 1 - math.exp(-alpha * f))
        self.assertIsNone(cls.financing_coverage(0.0, 0.0))
        self.assertEqual(cls.financing_coverage(0.5, 0.5), 0.0)     # unfunded
        self.assertEqual(cls.financing_coverage(0.5, 0.0), 1.0)     # fully absorbed
        self.assertEqual(cls.financing_coverage(0.5, 0.9), 0.0)     # clamped

    def test_diagnosis_separates_unfunded_from_funded_gap(self):
        # Same large gap, opposite funding situations (defaults: coverage breaks 0.25 / 0.50)
        self.assertEqual(cls.diagnose(gap=0.72, stress=0.68), cls.DIAG_UNFUNDED_GAP)          # finance-like
        self.assertEqual(cls.diagnose(gap=0.60, stress=0.004), cls.DIAG_FUNDED_GAP)           # nutrition-like
        self.assertEqual(cls.diagnose(gap=0.50, stress=0.30), cls.DIAG_PARTIALLY_FUNDED_GAP)  # coverage 0.4
        self.assertEqual(cls.diagnose(gap=0.02, stress=0.02), cls.DIAG_AT_BENCHMARK)
        self.assertEqual(cls.diagnose(gap=0.0, stress=0.0), cls.DIAG_AT_BENCHMARK)


class EngineRelabelTests(TestCase):
    """Rust labels (fixed 0.05/0.15/0.30) must be rewritten with calibrated thresholds."""

    def setUp(self):
        cls.clear_cache()
        for level, breaks in (("system", (0.2, 0.34, 0.46)), ("component", (0.2, 0.34, 0.46)), ("indicator", (0.18, 0.4, 0.65))):
            StressThresholdConfig.objects.create(
                level=level, low_max=Decimal(str(breaks[0])), medium_max=Decimal(str(breaks[1])),
                high_max=Decimal(str(breaks[2])), method="jenks_natural_breaks", n_observations=50,
            )
        cls.clear_cache()

    def test_relabels_all_known_label_fields(self):
        from apps.assessments.services import _relabel_engine_result

        result = {
            "overall_fsfsi": 0.29, "risk_level": "high",                 # Rust: high → calibrated: medium
            "indicator_results": [{"stress": 0.70, "risk_level": "critical"}, {"stress": 0.30, "risk_level": "critical"}],
            "component_aggregations": [{"average_stress": 0.45, "average_performance_gap": 0.6, "priority_level": "critical"}],
        }
        out = _relabel_engine_result(result)
        self.assertEqual(out["risk_level"], "medium")
        self.assertEqual(out["indicator_results"][0]["risk_level"], "critical")
        self.assertEqual(out["indicator_results"][1]["risk_level"], "medium")
        self.assertEqual(out["component_aggregations"][0]["priority_level"], "high")

        scen = {"baseline_fsfsi": 0.5, "baseline_risk_level": "critical", "scenario_fsfsi": 0.33, "scenario_risk_level": "critical"}
        out = _relabel_engine_result(scen)
        self.assertEqual(out["baseline_risk_level"], "critical")
        self.assertEqual(out["scenario_risk_level"], "medium")

        quick = {"fsfi_score": 0.1, "risk_level": "medium"}
        self.assertEqual(_relabel_engine_result(quick)["risk_level"], "low")

    def test_non_dict_passthrough(self):
        from apps.assessments.services import _relabel_engine_result

        self.assertEqual(_relabel_engine_result([1, 2]), [1, 2])


# ---------------------------------------------------------------------------
# Calibration against stored assessments
# ---------------------------------------------------------------------------

def _seed_year(fy: int, scale: float, rng: random.Random, n_ind: int = 24, cumulative_bump: float = 0.03):
    """Create one assessment with 8 components Ã— 3 indicators whose stress sits around `scale`."""
    a = AssessmentResult.objects.create(
        fiscal_year=fy,
        fsfsi_score=Decimal(str(round(scale, 6))),
        stress_level="medium",
        cumulative_fsfsi=Decimal(str(round(scale + cumulative_bump, 6))),
        cumulative_stress_level="medium",
        indicators_count=n_ind,
        components_count=8,
        result_json={"risk_level": "medium", "component_aggregations": []},
    )
    per_comp = n_ind // 8
    for ci, comp in enumerate(COMPONENTS):
        stresses, gaps = [], []
        for k in range(per_comp):
            gap = min(0.95, max(0.0, rng.gauss(0.5, 0.15)))
            cov = min(1.0, max(0.0, rng.gauss((ci + 1) / 9, 0.1)))  # finance low coverage â†’ high stress etc.
            stress = round(gap * (1 - cov) * (scale / 0.35), 6)
            stress = min(0.999, max(0.0, stress))
            IndicatorResult.objects.create(
                assessment=a, indicator_code=f"IND-{ci:02d}{k}", indicator_name="x", component=comp,
                performance_gap=Decimal(str(round(gap, 6))), stress_value=Decimal(str(stress)),
                cumulative_stress=Decimal(str(round(min(0.999, stress + cumulative_bump), 6))),
                weighted_lcu_bn=Decimal("1.0"), share_weighted_percent=Decimal("3.0"),
            )
            stresses.append(stress)
            gaps.append(gap)
        cs = sum(stresses) / len(stresses)
        ComponentResult.objects.create(
            assessment=a, component=comp, weight=Decimal("0.125"),
            avg_performance_gap=Decimal(str(round(sum(gaps) / len(gaps), 6))),
            component_stress=Decimal(str(round(cs, 6))),
            weighted_stress=Decimal(str(round(cs * 0.125, 6))),
            priority_level="medium",
            cumulative_stress=Decimal(str(round(cs + cumulative_bump, 6))),
            indicators_count=per_comp,
        )
    AssessmentHistory.objects.update_or_create(
        fiscal_year=fy, defaults={"fsfsi_score": a.fsfsi_score, "stress_level": "medium"},
    )
    return a


class CalibrationTests(TestCase):
    def setUp(self):
        cls.clear_cache()
        rng = random.Random(42)
        for fy, scale in [(2019, 0.38), (2020, 0.36), (2021, 0.35), (2022, 0.34), (2023, 0.28), (2024, 0.29)]:
            _seed_year(fy, scale, rng)
        # a degenerate 1-indicator run that must be excluded from the sample
        AssessmentResult.objects.create(
            fiscal_year=2015, fsfsi_score=Decimal("0.26"), stress_level="high", indicators_count=1, result_json={},
        )

    def test_sample_excludes_degenerate_years_and_pools_cumulative(self):
        s = cls.collect_sample()
        self.assertEqual(s.years, [2019, 2020, 2021, 2022, 2023, 2024])
        self.assertEqual(len(s.indicator_stress), 6 * 24 * 2)   # point + cumulative
        self.assertEqual(len(s.component_stress), 6 * 8 * 2)
        self.assertEqual(len(s.system_stress), 6 * 2)
        s_pt = cls.collect_sample(include_cumulative=False)
        self.assertEqual(len(s_pt.indicator_stress), 6 * 24)

    def test_calibrate_persists_per_level_and_system_inherits_component_scale(self):
        s = cls.collect_sample()
        results = cls.calibrate(s)
        by_level = {r.level: r for r in results}
        self.assertTrue(all(r.applied for r in results), results)
        self.assertEqual(by_level["indicator"].method, "jenks_natural_breaks")
        self.assertEqual(by_level["component"].method, "jenks_natural_breaks")
        self.assertEqual(by_level["system"].method, "inherited_component_scale")
        self.assertEqual(by_level["system"].breaks, by_level["component"].breaks)
        self.assertEqual(len(by_level["coverage"].breaks), 2)

        self.assertEqual(StressThresholdConfig.objects.count(), 4)
        row = StressThresholdConfig.objects.get(level="component")
        self.assertEqual(row.calibration_years, [2019, 2020, 2021, 2022, 2023, 2024])
        self.assertGreater(float(row.gvf), 0.7)
        self.assertIsNone(StressThresholdConfig.objects.get(level="coverage").high_max)

        # active thresholds now come from the DB
        t = cls.get_thresholds(cls.LEVEL_COMPONENT)
        self.assertTrue(t.as_dict()["is_calibrated"])
        self.assertEqual(t.breaks, [round(b, 6) for b in by_level["component"].breaks])

        # breaks are strictly increasing and inside (0, 1)
        for lvl in ("indicator", "component", "system"):
            b = by_level[lvl].breaks
            self.assertTrue(0 <= b[0] < b[1] < b[2] <= 1, (lvl, b))

    def test_calibrate_dry_run_persists_nothing(self):
        cls.calibrate(cls.collect_sample(), dry_run=True)
        self.assertEqual(StressThresholdConfig.objects.count(), 0)
        self.assertFalse(cls.get_thresholds(cls.LEVEL_SYSTEM).as_dict()["is_calibrated"])

    def test_small_sample_keeps_defaults(self):
        AssessmentResult.objects.all().delete()
        rng = random.Random(1)
        _seed_year(2024, 0.3, rng, n_ind=24)   # only one year â†’ 48 indicator obs OK, 16 component obs OK, but
        # force below minimums by trimming
        IndicatorResult.objects.filter(indicator_code__endswith="2").delete()
        s = cls.collect_sample()
        self.assertLess(len(s.indicator_stress), cls.MIN_INDICATOR_OBS)
        results = {r.level: r for r in cls.calibrate(s)}
        self.assertFalse(results["indicator"].applied)
        self.assertEqual(results["indicator"].breaks, list(cls.ENGINE_DEFAULT_BREAKS))

    def test_reclassify_all_relabels_every_table_consistently(self):
        cls.calibrate(cls.collect_sample())
        counts = cls.reclassify_all()
        self.assertEqual(counts["assessments"], AssessmentResult.objects.count())
        self.assertEqual(counts["components"], ComponentResult.objects.count())
        self.assertEqual(counts["indicators"], IndicatorResult.objects.count())
        self.assertEqual(counts["history"], AssessmentHistory.objects.count())

        for a in AssessmentResult.objects.exclude(fiscal_year=2015):
            self.assertEqual(a.stress_level, cls.classify(float(a.fsfsi_score), cls.LEVEL_SYSTEM))
            self.assertEqual(a.cumulative_stress_level, cls.classify(float(a.cumulative_fsfsi), cls.LEVEL_SYSTEM))
            self.assertEqual(a.result_json["risk_level"], a.stress_level)
            h = AssessmentHistory.objects.get(fiscal_year=a.fiscal_year)
            self.assertEqual(h.stress_level, a.stress_level)

        for c in ComponentResult.objects.all():
            self.assertEqual(c.priority_level, cls.classify(float(c.component_stress), cls.LEVEL_COMPONENT))
            self.assertEqual(c.cumulative_priority_level, cls.classify(float(c.cumulative_stress), cls.LEVEL_COMPONENT))
            self.assertIsNotNone(c.diagnosis)
            self.assertIsNotNone(c.financing_coverage)
            self.assertAlmostEqual(
                float(c.financing_coverage),
                1 - float(c.component_stress) / float(c.avg_performance_gap), places=5,
            )

        for i in IndicatorResult.objects.all():
            self.assertEqual(i.stress_level, cls.classify(float(i.stress_value), cls.LEVEL_INDICATOR))
            self.assertIn(i.diagnosis, cls.DIAGNOSES)

    def test_calibrated_labels_discriminate(self):
        """With calibrated breaks the component labels must use more than one class per year."""
        cls.calibrate(cls.collect_sample())
        cls.reclassify_all()
        for a in AssessmentResult.objects.exclude(fiscal_year=2015):
            levels = {c.priority_level for c in a.component_results.all()}
            self.assertGreaterEqual(len(levels), 2, (a.fiscal_year, levels))

    def test_calibration_is_stable_under_leave_one_year_out(self):
        """Dropping any single year must not move the indicator breaks materially.

        (On Rwanda's real record the max shift is ~0.02; the synthetic sample here
        is smaller and noisier, so the tolerance is wider.)
        """
        full = {r.level: r.breaks for r in cls.calibrate(cls.collect_sample(), dry_run=True)}
        for fy in [2019, 2020, 2021, 2022, 2023, 2024]:
            kept = AssessmentResult.objects.exclude(fiscal_year__in=[fy, 2015])
            sample = cls.CalibrationSample([], [], [], [], [])
            for a in kept:
                sample.years.append(a.fiscal_year)
                for c in a.component_results.all():
                    sample.component_stress.append(float(c.component_stress))
                    sample.component_stress.append(float(c.cumulative_stress))
                for i in a.indicator_results.all():
                    sample.indicator_stress.append(float(i.stress_value))
                    sample.indicator_stress.append(float(i.cumulative_stress))
            res = {r.level: r.breaks for r in cls.calibrate(sample, dry_run=True)}
            for b_full, b_loo in zip(full["indicator"], res["indicator"]):
                self.assertLess(abs(b_full - b_loo), 0.05, (fy, full["indicator"], res["indicator"]))
            # class order must survive at every level
            for lvl in ("indicator", "component"):
                self.assertTrue(res[lvl][0] < res[lvl][1] < res[lvl][2])


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

class StressThresholdApiTests(TestCase):
    def setUp(self):
        cls.clear_cache()
        self.client = APIClient()
        self.viewer = GovernmentUser.objects.create_user(
            username="viewer", email="viewer@gov.rw", password="Viewer@SecureZq8x",
        )
        self.admin = GovernmentUser.objects.create_user(
            username="admin1", email="admin1@gov.rw", password="Admin@SecureZq8x", role="admin",
        )
        rng = random.Random(3)
        for fy, scale in [(2022, 0.34), (2023, 0.28), (2024, 0.29)]:
            _seed_year(fy, scale, rng)

    def test_get_thresholds_lists_all_levels_with_provenance(self):
        self.client.force_authenticate(self.viewer)
        r = self.client.get("/api/assessments/stress-thresholds/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(set(r.data.keys()), set(cls.LEVELS))
        for lvl in ("indicator", "component", "system"):
            self.assertIn("high_max", r.data[lvl])
            self.assertFalse(r.data[lvl]["is_calibrated"])

    def test_stress_level_endpoint_accepts_level(self):
        self.client.force_authenticate(self.viewer)
        r = self.client.get("/api/assessments/stress-level/?score=0.25&level=component")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["level"], "component")
        self.assertEqual(r.data["stress_level"], "high")   # defaults until calibrated
        self.assertEqual(self.client.get("/api/assessments/stress-level/?score=0.25&level=bogus").status_code, 400)
        self.assertEqual(self.client.get("/api/assessments/stress-level/?score=abc").status_code, 400)

    def test_calibrate_requires_admin(self):
        self.client.force_authenticate(self.viewer)
        r = self.client.post("/api/assessments/stress-thresholds/calibrate/", {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(StressThresholdConfig.objects.count(), 0)

    def test_admin_calibrate_persists_and_relabels(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post("/api/assessments/stress-thresholds/calibrate/", {}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertFalse(r.data["dry_run"])
        self.assertEqual(r.data["sample"]["years"], [2022, 2023, 2024])
        self.assertEqual(StressThresholdConfig.objects.count(), 4)
        self.assertTrue(r.data["active"]["component"]["is_calibrated"])
        self.assertIsNotNone(r.data["relabelled"])
        # the stored labels now match the calibrated thresholds
        for c in ComponentResult.objects.all():
            self.assertEqual(c.priority_level, cls.classify(float(c.component_stress), cls.LEVEL_COMPONENT))

    def test_admin_dry_run_changes_nothing(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post("/api/assessments/stress-thresholds/calibrate/", {"dry_run": True}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["dry_run"])
        self.assertIsNone(r.data["relabelled"])
        self.assertEqual(StressThresholdConfig.objects.count(), 0)

    def test_dashboard_exposes_thresholds_and_component_diagnosis(self):
        cls.calibrate(cls.collect_sample())
        cls.reclassify_all()
        self.client.force_authenticate(self.viewer)
        r = self.client.get("/api/assessments/dashboard/?fiscal_year=2024")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertIn("stress_thresholds", r.data)
        self.assertTrue(r.data["stress_thresholds"]["system"]["is_calibrated"])
        comp = r.data["components"][0]
        for key in ("priority_level", "cumulative_priority_level", "financing_coverage", "diagnosis", "avg_performance_gap"):
            self.assertIn(key, comp)
        self.assertIn(comp["diagnosis"], cls.DIAGNOSES)

    def test_config_endpoint_reports_calibrated_thresholds(self):
        self.client.force_authenticate(self.viewer)
        r = self.client.get("/api/assessments/config/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("stress_thresholds", r.data["config"])
        self.assertIn("system", r.data["config"]["stress_thresholds"])
        self.assertIn("engine_default_stress_thresholds", r.data["config"])
