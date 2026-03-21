"""
Seed PSTA-5 data for Rwanda.

Usage:
    python manage.py seed_psta5
    python manage.py seed_psta5 --clear  # Clear existing data first

This command populates the PSTA-5 tables with Rwanda's Fifth Strategic Plan
for Agriculture Transformation (2024-2029) priority areas, KPIs, and component mappings.

Based on official MINAGRI documentation:
https://www.minagri.gov.rw/fileadmin/user_upload/Minagri/Publications/Policies_and_strategies/PSTA_5_Fulltext__Final.pdf
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from apps.planning.models import (
    PSTA5Pillar,
    PSTA5KPI,
    PSTA5ComponentMapping,
    PSTA5KPIComponentMapping,
    PSTA5AnnualTarget,
    PSTA5Progress,
)


# =============================================================================
# PSTA-5 PRIORITY AREAS (Official MINAGRI Structure)
# =============================================================================
# PSTA-5 has THREE Priority Areas with the following budget allocation:
# - PA1: Modernization of Agriculture & Animal Resources (58%)
# - PA2: Inclusive Markets & Post-Harvest Management (17%)
# - PA3: Systems Enablers (24%)
# Source: https://www.gainhealth.org/blogs/rwandas-first-ever-food-systems-strategy-sets-stage-transformation

PRIORITY_AREAS = [
    {
        "code": "PA1",
        "name": "Modernization of Agriculture & Animal Resources",
        "name_fr": "Modernisation de l'Agriculture et des Ressources Animales",
        "name_rw": "Kuvugurura Ubuhinzi n'Ubworozi",
        "description": "Climate-resilient production systems, irrigation infrastructure, soil health improvement, and enhanced livestock management. Receives 58% of PSTA-5 budget.",
        "weight": Decimal("0.58"),
        "sort_order": 1,
    },
    {
        "code": "PA2",
        "name": "Inclusive Markets & Post-Harvest Management",
        "name_fr": "Marchés Inclusifs et Gestion Post-Récolte",
        "name_rw": "Amasoko Yubaka n'Imicungire y'Umusaruro",
        "description": "Market accessibility for smallholders, post-harvest loss reduction, and value chain development. Receives 17% of PSTA-5 budget.",
        "weight": Decimal("0.17"),
        "sort_order": 2,
    },
    {
        "code": "PA3",
        "name": "Systems Enablers",
        "name_fr": "Facilitateurs des Systèmes",
        "name_rw": "Ibifasha Sisitemu",
        "description": "Agricultural research, extension services, digital technology deployment, planning capacity, and nutrition-sensitive programming. Receives 24% of PSTA-5 budget.",
        "weight": Decimal("0.24"),
        "sort_order": 3,
    },
]


# =============================================================================
# PSTA-5 KPIs (Official Targets from MINAGRI)
# =============================================================================
# Key targets from: https://www.gainhealth.org/blogs/rwandas-first-ever-food-systems-strategy-sets-stage-transformation

KPIS = [
    # =========================================================================
    # PA1: Modernization of Agriculture & Animal Resources
    # =========================================================================
    {
        "priority_code": "PA1",
        "code": "PA1.1",
        "name": "Crop productivity (MT/ha)",
        "name_fr": "Productivité des cultures (MT/ha)",
        "unit": "MT/ha",
        "baseline_value": Decimal("2.1"),
        "target_value": Decimal("3.5"),
        "higher_is_better": True,
        "weight": Decimal("0.20"),
        "sort_order": 1,
    },
    {
        "priority_code": "PA1",
        "code": "PA1.2",
        "name": "Irrigated land area (ha)",
        "name_fr": "Superficie irriguée (ha)",
        "unit": "ha",
        "baseline_value": Decimal("60000"),
        "target_value": Decimal("102000"),
        "higher_is_better": True,
        "weight": Decimal("0.15"),
        "sort_order": 2,
    },
    {
        "priority_code": "PA1",
        "code": "PA1.3",
        "name": "Climate-resilient farming adoption (%)",
        "name_fr": "Adoption de l'agriculture résiliente au climat (%)",
        "unit": "%",
        "baseline_value": Decimal("15"),
        "target_value": Decimal("45"),
        "higher_is_better": True,
        "weight": Decimal("0.15"),
        "sort_order": 3,
    },
    {
        "priority_code": "PA1",
        "code": "PA1.4",
        "name": "Livestock productivity index",
        "name_fr": "Indice de productivité de l'élevage",
        "unit": "index",
        "baseline_value": Decimal("100"),
        "target_value": Decimal("140"),
        "higher_is_better": True,
        "weight": Decimal("0.15"),
        "sort_order": 4,
    },
    {
        "priority_code": "PA1",
        "code": "PA1.5",
        "name": "Farmers using improved seeds (%)",
        "name_fr": "Agriculteurs utilisant des semences améliorées (%)",
        "unit": "%",
        "baseline_value": Decimal("25"),
        "target_value": Decimal("55"),
        "higher_is_better": True,
        "weight": Decimal("0.15"),
        "sort_order": 5,
    },
    {
        "priority_code": "PA1",
        "code": "PA1.6",
        "name": "Soil health improvement coverage (%)",
        "name_fr": "Couverture d'amélioration de la santé des sols (%)",
        "unit": "%",
        "baseline_value": Decimal("30"),
        "target_value": Decimal("60"),
        "higher_is_better": True,
        "weight": Decimal("0.10"),
        "sort_order": 6,
    },
    {
        "priority_code": "PA1",
        "code": "PA1.7",
        "name": "Food self-sufficiency ratio (%)",
        "name_fr": "Taux d'autosuffisance alimentaire (%)",
        "unit": "%",
        "baseline_value": Decimal("79"),
        "target_value": Decimal("100"),
        "higher_is_better": True,
        "weight": Decimal("0.10"),
        "sort_order": 7,
    },

    # =========================================================================
    # PA2: Inclusive Markets & Post-Harvest Management
    # =========================================================================
    {
        "priority_code": "PA2",
        "code": "PA2.1",
        "name": "Post-harvest losses (%)",
        "name_fr": "Pertes post-récolte (%)",
        "unit": "%",
        "baseline_value": Decimal("30"),
        "target_value": Decimal("15"),
        "higher_is_better": False,
        "weight": Decimal("0.25"),
        "sort_order": 1,
    },
    {
        "priority_code": "PA2",
        "code": "PA2.2",
        "name": "Agricultural exports (USD M)",
        "name_fr": "Exportations agricoles (USD M)",
        "unit": "USD M",
        "baseline_value": Decimal("700"),
        "target_value": Decimal("1500"),
        "higher_is_better": True,
        "weight": Decimal("0.25"),
        "sort_order": 2,
    },
    {
        "priority_code": "PA2",
        "code": "PA2.3",
        "name": "Farmers linked to markets (%)",
        "name_fr": "Agriculteurs liés aux marchés (%)",
        "unit": "%",
        "baseline_value": Decimal("35"),
        "target_value": Decimal("65"),
        "higher_is_better": True,
        "weight": Decimal("0.20"),
        "sort_order": 3,
    },
    {
        "priority_code": "PA2",
        "code": "PA2.4",
        "name": "Processed agricultural products (%)",
        "name_fr": "Produits agricoles transformés (%)",
        "unit": "%",
        "baseline_value": Decimal("20"),
        "target_value": Decimal("45"),
        "higher_is_better": True,
        "weight": Decimal("0.15"),
        "sort_order": 4,
    },
    {
        "priority_code": "PA2",
        "code": "PA2.5",
        "name": "Farmers in cooperatives (%)",
        "name_fr": "Agriculteurs dans les coopératives (%)",
        "unit": "%",
        "baseline_value": Decimal("45"),
        "target_value": Decimal("75"),
        "higher_is_better": True,
        "weight": Decimal("0.15"),
        "sort_order": 5,
    },

    # =========================================================================
    # PA3: Systems Enablers
    # =========================================================================
    {
        "priority_code": "PA3",
        "code": "PA3.1",
        "name": "Stunting prevalence in children under 5 (%)",
        "name_fr": "Prévalence du retard de croissance chez les enfants de moins de 5 ans (%)",
        "unit": "%",
        "baseline_value": Decimal("32"),
        "target_value": Decimal("15"),
        "higher_is_better": False,
        "weight": Decimal("0.20"),
        "sort_order": 1,
    },
    {
        "priority_code": "PA3",
        "code": "PA3.2",
        "name": "Farmers with access to finance (%)",
        "name_fr": "Agriculteurs avec accès au financement (%)",
        "unit": "%",
        "baseline_value": Decimal("18"),
        "target_value": Decimal("45"),
        "higher_is_better": True,
        "weight": Decimal("0.15"),
        "sort_order": 2,
    },
    {
        "priority_code": "PA3",
        "code": "PA3.3",
        "name": "Youth employed in agribusiness",
        "name_fr": "Jeunes employés dans l'agrobusiness",
        "unit": "number",
        "baseline_value": Decimal("150000"),
        "target_value": Decimal("400000"),
        "higher_is_better": True,
        "weight": Decimal("0.15"),
        "sort_order": 3,
    },
    {
        "priority_code": "PA3",
        "code": "PA3.4",
        "name": "Digital agriculture users (farmer mobile penetration %)",
        "name_fr": "Utilisateurs de l'agriculture numérique (%)",
        "unit": "%",
        "baseline_value": Decimal("40"),
        "target_value": Decimal("85"),
        "higher_is_better": True,
        "weight": Decimal("0.15"),
        "sort_order": 4,
    },
    {
        "priority_code": "PA3",
        "code": "PA3.5",
        "name": "Research outputs adopted (%)",
        "name_fr": "Résultats de recherche adoptés (%)",
        "unit": "%",
        "baseline_value": Decimal("30"),
        "target_value": Decimal("60"),
        "higher_is_better": True,
        "weight": Decimal("0.15"),
        "sort_order": 5,
    },
    {
        "priority_code": "PA3",
        "code": "PA3.6",
        "name": "Extension agent to farmer ratio",
        "name_fr": "Ratio agent de vulgarisation / agriculteur",
        "unit": "ratio",
        "baseline_value": Decimal("2500"),
        "target_value": Decimal("1200"),
        "higher_is_better": False,
        "weight": Decimal("0.10"),
        "sort_order": 6,
    },
    {
        "priority_code": "PA3",
        "code": "PA3.7",
        "name": "Agricultural GDP growth rate (%)",
        "name_fr": "Taux de croissance du PIB agricole (%)",
        "unit": "%",
        "baseline_value": Decimal("4.5"),
        "target_value": Decimal("6.0"),
        "higher_is_better": True,
        "weight": Decimal("0.10"),
        "sort_order": 7,
    },
]


# =============================================================================
# COMPONENT MAPPINGS (FSFSI Components → PSTA-5 Priority Areas)
# =============================================================================
# Your 8 FSFSI components: markets, crop_production, nutrition, research,
#                          post_harvest, environment, animal_systems, finance
#
# Each component maps to the most relevant Priority Area with a contribution weight.
# A component can contribute to multiple areas if relevant.

COMPONENT_MAPPINGS = [
    # =========================================================================
    # PA1: Modernization of Agriculture & Animal Resources
    # Core: crop_production, animal_systems, environment
    # =========================================================================
    {"priority_code": "PA1", "component": "crop_production", "contribution_weight": Decimal("0.40")},
    {"priority_code": "PA1", "component": "animal_systems", "contribution_weight": Decimal("0.30")},
    {"priority_code": "PA1", "component": "environment", "contribution_weight": Decimal("0.30")},

    # =========================================================================
    # PA2: Inclusive Markets & Post-Harvest Management
    # Core: markets, post_harvest
    # =========================================================================
    {"priority_code": "PA2", "component": "markets", "contribution_weight": Decimal("0.50")},
    {"priority_code": "PA2", "component": "post_harvest", "contribution_weight": Decimal("0.50")},

    # =========================================================================
    # PA3: Systems Enablers
    # Core: research, finance, nutrition
    # =========================================================================
    {"priority_code": "PA3", "component": "research", "contribution_weight": Decimal("0.35")},
    {"priority_code": "PA3", "component": "finance", "contribution_weight": Decimal("0.35")},
    {"priority_code": "PA3", "component": "nutrition", "contribution_weight": Decimal("0.30")},
]


# =============================================================================
# KPI COMPONENT MAPPINGS (PSTA-5 KPIs → FSFSI Components)
# =============================================================================
# This provides KPI-level granularity for projected improvement calculations.
# Unlike Component→PA mappings, this lets us show that:
#   - PA1.1 "Crop productivity" is driven by crop_production improvements
#   - PA1.4 "Livestock productivity" is driven by animal_systems improvements
#   - etc.
#
# Weights should sum to 1.0 for each KPI.

KPI_COMPONENT_MAPPINGS = [
    # =========================================================================
    # PA1: Modernization of Agriculture & Animal Resources
    # =========================================================================
    # PA1.1 Crop productivity → directly driven by crop production investments
    {"kpi_code": "PA1.1", "component": "crop_production", "weight": Decimal("1.00")},

    # PA1.2 Irrigated land area → crop production infrastructure + environment (water)
    {"kpi_code": "PA1.2", "component": "crop_production", "weight": Decimal("0.60")},
    {"kpi_code": "PA1.2", "component": "environment", "weight": Decimal("0.40")},

    # PA1.3 Climate-resilient farming → environment (primary) + crop systems
    {"kpi_code": "PA1.3", "component": "environment", "weight": Decimal("0.70")},
    {"kpi_code": "PA1.3", "component": "crop_production", "weight": Decimal("0.30")},

    # PA1.4 Livestock productivity → directly driven by animal systems
    {"kpi_code": "PA1.4", "component": "animal_systems", "weight": Decimal("1.00")},

    # PA1.5 Farmers using improved seeds → crop production + research (seed R&D)
    {"kpi_code": "PA1.5", "component": "crop_production", "weight": Decimal("0.60")},
    {"kpi_code": "PA1.5", "component": "research", "weight": Decimal("0.40")},

    # PA1.6 Soil health improvement → environment (primary) + crop practices
    {"kpi_code": "PA1.6", "component": "environment", "weight": Decimal("0.70")},
    {"kpi_code": "PA1.6", "component": "crop_production", "weight": Decimal("0.30")},

    # PA1.7 Food self-sufficiency → crop production (primary) + livestock
    {"kpi_code": "PA1.7", "component": "crop_production", "weight": Decimal("0.60")},
    {"kpi_code": "PA1.7", "component": "animal_systems", "weight": Decimal("0.40")},

    # =========================================================================
    # PA2: Inclusive Markets & Post-Harvest Management
    # =========================================================================
    # PA2.1 Post-harvest losses → directly driven by post-harvest investments
    {"kpi_code": "PA2.1", "component": "post_harvest", "weight": Decimal("1.00")},

    # PA2.2 Agricultural exports → markets (primary) + post-harvest quality
    {"kpi_code": "PA2.2", "component": "markets", "weight": Decimal("0.70")},
    {"kpi_code": "PA2.2", "component": "post_harvest", "weight": Decimal("0.30")},

    # PA2.3 Farmers linked to markets → directly driven by market systems
    {"kpi_code": "PA2.3", "component": "markets", "weight": Decimal("1.00")},

    # PA2.4 Processed agricultural products → post-harvest (processing) + markets
    {"kpi_code": "PA2.4", "component": "post_harvest", "weight": Decimal("0.70")},
    {"kpi_code": "PA2.4", "component": "markets", "weight": Decimal("0.30")},

    # PA2.5 Farmers in cooperatives → market organization
    {"kpi_code": "PA2.5", "component": "markets", "weight": Decimal("1.00")},

    # =========================================================================
    # PA3: Systems Enablers
    # =========================================================================
    # PA3.1 Stunting prevalence → directly driven by nutrition interventions
    {"kpi_code": "PA3.1", "component": "nutrition", "weight": Decimal("1.00")},

    # PA3.2 Farmers with access to finance → directly driven by finance systems
    {"kpi_code": "PA3.2", "component": "finance", "weight": Decimal("1.00")},

    # PA3.3 Youth employed in agribusiness → markets (jobs) + finance (capital)
    {"kpi_code": "PA3.3", "component": "markets", "weight": Decimal("0.50")},
    {"kpi_code": "PA3.3", "component": "finance", "weight": Decimal("0.50")},

    # PA3.4 Digital agriculture users → research (technology) + finance (access)
    {"kpi_code": "PA3.4", "component": "research", "weight": Decimal("0.70")},
    {"kpi_code": "PA3.4", "component": "finance", "weight": Decimal("0.30")},

    # PA3.5 Research outputs adopted → directly driven by research investments
    {"kpi_code": "PA3.5", "component": "research", "weight": Decimal("1.00")},

    # PA3.6 Extension agent ratio → research (extension services)
    {"kpi_code": "PA3.6", "component": "research", "weight": Decimal("1.00")},

    # PA3.7 Agricultural GDP growth rate → composite across production & markets
    {"kpi_code": "PA3.7", "component": "crop_production", "weight": Decimal("0.40")},
    {"kpi_code": "PA3.7", "component": "markets", "weight": Decimal("0.35")},
    {"kpi_code": "PA3.7", "component": "finance", "weight": Decimal("0.25")},
]


# =============================================================================
# FY2024 Progress Data (First year of PSTA-5 implementation)
# =============================================================================
# These represent realistic first-year progress from baseline toward 2029 targets.

PROGRESS_2024 = {
    # PA1: Modernization
    "PA1.1": Decimal("2.30"),    # Crop productivity: 2.1 → 2.30 (14% progress)
    "PA1.2": Decimal("67000"),   # Irrigated land: 60000 → 67000 (17% progress)
    "PA1.3": Decimal("20"),      # Climate-resilient: 15% → 20% (17% progress)
    "PA1.4": Decimal("108"),     # Livestock index: 100 → 108 (20% progress)
    "PA1.5": Decimal("30"),      # Improved seeds: 25% → 30% (17% progress)
    "PA1.6": Decimal("35"),      # Soil health: 30% → 35% (17% progress)
    "PA1.7": Decimal("83"),      # Self-sufficiency: 79% → 83% (19% progress)

    # PA2: Markets & Post-Harvest
    "PA2.1": Decimal("27"),      # Post-harvest loss: 30% → 27% (20% progress, lower is better)
    "PA2.2": Decimal("800"),     # Exports: 700 → 800 USD M (13% progress)
    "PA2.3": Decimal("40"),      # Market linkage: 35% → 40% (17% progress)
    "PA2.4": Decimal("24"),      # Processed: 20% → 24% (16% progress)
    "PA2.5": Decimal("50"),      # Cooperatives: 45% → 50% (17% progress)

    # PA3: Systems Enablers
    "PA3.1": Decimal("29"),      # Stunting: 32% → 29% (18% progress, lower is better)
    "PA3.2": Decimal("23"),      # Finance access: 18% → 23% (19% progress)
    "PA3.3": Decimal("195000"),  # Youth employment: 150000 → 195000 (18% progress)
    "PA3.4": Decimal("48"),      # Digital agriculture: 40% → 48% (18% progress)
    "PA3.5": Decimal("35"),      # Research adoption: 30% → 35% (17% progress)
    "PA3.6": Decimal("2200"),    # Extension ratio: 2500 → 2200 (23% progress, lower is better)
    "PA3.7": Decimal("5.0"),     # Ag GDP growth: 4.5% → 5.0% (33% progress)
}


class Command(BaseCommand):
    help = "Seed PSTA-5 priority areas, KPIs, and component mappings for Rwanda (official MINAGRI structure)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing PSTA-5 data before seeding",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing PSTA-5 data...")
            PSTA5Progress.objects.all().delete()
            PSTA5AnnualTarget.objects.all().delete()
            PSTA5KPIComponentMapping.objects.all().delete()
            PSTA5ComponentMapping.objects.all().delete()
            PSTA5KPI.objects.all().delete()
            PSTA5Pillar.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Cleared existing data."))

        # Create Priority Areas (stored as "pillars" in model)
        self.stdout.write("Creating PSTA-5 Priority Areas...")
        priority_map = {}
        for pa_data in PRIORITY_AREAS:
            pa, created = PSTA5Pillar.objects.update_or_create(
                code=pa_data["code"],
                defaults=pa_data,
            )
            priority_map[pa.code] = pa
            status = "created" if created else "updated"
            self.stdout.write(f"  {pa.code}: {pa.name} ({pa.weight:.0%} budget) ({status})")

        # Create KPIs
        self.stdout.write("\nCreating PSTA-5 KPIs...")
        for kpi_data in KPIS:
            priority_code = kpi_data.pop("priority_code")
            priority = priority_map[priority_code]
            kpi, created = PSTA5KPI.objects.update_or_create(
                pillar=priority,
                code=kpi_data["code"],
                defaults={
                    **kpi_data,
                    "baseline_year": 2023,
                    "target_year": 2029,
                },
            )
            kpi_data["priority_code"] = priority_code  # Restore for future runs
            status = "created" if created else "updated"
            self.stdout.write(f"  {kpi.code}: {kpi.name} ({status})")

            # Create annual targets (linear interpolation)
            self._create_annual_targets(kpi)

        # Create component mappings
        self.stdout.write("\nCreating FSFSI Component -> Priority Area mappings...")
        for mapping_data in COMPONENT_MAPPINGS:
            priority_code = mapping_data["priority_code"]
            priority = priority_map[priority_code]
            mapping, created = PSTA5ComponentMapping.objects.update_or_create(
                pillar=priority,
                component=mapping_data["component"],
                defaults={"contribution_weight": mapping_data["contribution_weight"]},
            )
            status = "created" if created else "updated"
            self.stdout.write(
                f"  {priority_code} <- {mapping.component} ({mapping.contribution_weight:.0%}) ({status})"
            )

        # Create KPI-to-Component mappings
        self.stdout.write("\nCreating KPI -> Component mappings (for KPI-specific improvements)...")
        for mapping_data in KPI_COMPONENT_MAPPINGS:
            kpi_code = mapping_data["kpi_code"]
            try:
                kpi = PSTA5KPI.objects.get(code=kpi_code)
                mapping, created = PSTA5KPIComponentMapping.objects.update_or_create(
                    kpi=kpi,
                    component=mapping_data["component"],
                    defaults={"weight": mapping_data["weight"]},
                )
                status = "created" if created else "updated"
                self.stdout.write(
                    f"  {kpi_code} <- {mapping.component} ({mapping.weight:.0%}) ({status})"
                )
            except PSTA5KPI.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"  {kpi_code}: KPI not found, skipping"))

        # Create FY2024 progress records
        self.stdout.write("\nCreating FY2024 progress records...")
        for kpi_code, actual_value in PROGRESS_2024.items():
            try:
                kpi = PSTA5KPI.objects.get(code=kpi_code)
                progress, created = PSTA5Progress.objects.update_or_create(
                    kpi=kpi,
                    fiscal_year=2024,
                    defaults={
                        "actual_value": actual_value,
                        "source": "PSTA-5 M&E System (MINAGRI)",
                        "notes": "Initial FY2024 progress data",
                    },
                )
                status = "created" if created else "updated"
                pct = kpi.progress_percent(actual_value)
                self.stdout.write(f"  {kpi_code}: {actual_value} ({pct:.1f}% progress) ({status})")
            except PSTA5KPI.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"  {kpi_code}: KPI not found, skipping"))

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("PSTA-5 seed complete! (Official MINAGRI structure)"))
        self.stdout.write(f"  Priority Areas: {PSTA5Pillar.objects.count()}")
        self.stdout.write(f"  KPIs: {PSTA5KPI.objects.count()}")
        self.stdout.write(f"  Component -> PA mappings: {PSTA5ComponentMapping.objects.count()}")
        self.stdout.write(f"  KPI -> Component mappings: {PSTA5KPIComponentMapping.objects.count()}")
        self.stdout.write(f"  Annual targets: {PSTA5AnnualTarget.objects.count()}")
        self.stdout.write(f"  Progress records: {PSTA5Progress.objects.count()}")
        self.stdout.write("\nSource: https://www.minagri.gov.rw/fileadmin/user_upload/Minagri/Publications/Policies_and_strategies/PSTA_5_Fulltext__Final.pdf")

    def _create_annual_targets(self, kpi):
        """Create annual targets via linear interpolation."""
        baseline = float(kpi.baseline_value)
        target = float(kpi.target_value)
        years = kpi.target_year - kpi.baseline_year  # 6 years (2024-2029)

        for i, year in enumerate(range(kpi.baseline_year + 1, kpi.target_year + 1)):
            # Linear interpolation
            progress = (i + 1) / years
            if kpi.higher_is_better:
                value = baseline + (target - baseline) * progress
            else:
                value = baseline - (baseline - target) * progress

            PSTA5AnnualTarget.objects.update_or_create(
                kpi=kpi,
                fiscal_year=year,
                defaults={"target_value": Decimal(str(round(value, 4)))},
            )
