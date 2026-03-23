"""
Seed all 37 food system indicators.

Pre-populates the Indicator table with all indicator definitions so that
data entry works without needing to import an Excel file first.

Usage:
    python manage.py seed_indicators
    python manage.py seed_indicators --force  # Replace existing indicators
"""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.fsfvi_data.models import Indicator, IndicatorComponent


# Complete list of 37 food system indicators
# Structure: (code, name, component, unit, higher_is_better, description)
INDICATORS = [
    # =====================================================================
    # CROP PRODUCTION (IND-01 to IND-05)
    # =====================================================================
    (
        "IND-01",
        "Cereal yield",
        IndicatorComponent.CROP_PRODUCTION,
        "t/ha",
        True,
        "Average cereal yield per hectare. Higher yields indicate better productivity.",
    ),
    (
        "IND-02",
        "Irrigated land",
        IndicatorComponent.CROP_PRODUCTION,
        "%",
        True,
        "Percentage of agricultural land that is irrigated. Higher irrigation coverage improves resilience.",
    ),
    (
        "IND-03",
        "Fertilizer use",
        IndicatorComponent.CROP_PRODUCTION,
        "kg/ha",
        True,
        "Fertilizer consumption per hectare of arable land. Higher use (within limits) indicates intensification.",
    ),
    (
        "IND-04",
        "Improved seed adoption",
        IndicatorComponent.CROP_PRODUCTION,
        "%",
        True,
        "Percentage of farmers using improved/certified seed varieties.",
    ),
    (
        "IND-05",
        "Crop diversification index",
        IndicatorComponent.CROP_PRODUCTION,
        "index",
        True,
        "Simpson diversity index for crop production. Higher values indicate more diverse cropping systems.",
    ),

    # =====================================================================
    # ANIMAL SYSTEMS (IND-06 to IND-09)
    # =====================================================================
    (
        "IND-06",
        "Livestock production index",
        IndicatorComponent.ANIMAL_SYSTEMS,
        "index",
        True,
        "Index of livestock production volume (2014-2016=100). Higher values indicate increased production.",
    ),
    (
        "IND-07",
        "Meat productivity",
        IndicatorComponent.ANIMAL_SYSTEMS,
        "kg/head",
        True,
        "Average meat yield per animal. Higher productivity indicates better animal husbandry.",
    ),
    (
        "IND-08",
        "Improved breed share",
        IndicatorComponent.ANIMAL_SYSTEMS,
        "%",
        True,
        "Percentage of livestock that are improved/cross breeds.",
    ),
    (
        "IND-09",
        "Animal mortality rate",
        IndicatorComponent.ANIMAL_SYSTEMS,
        "%",
        False,  # Lower is better
        "Annual livestock mortality rate. Lower rates indicate better animal health.",
    ),

    # =====================================================================
    # NUTRITION (IND-10)
    # =====================================================================
    (
        "IND-10",
        "Depth of hunger",
        IndicatorComponent.NUTRITION,
        "kcal/person/day",
        False,  # Lower is better
        "Average caloric deficit below minimum dietary energy requirement. Lower values are better.",
    ),

    # =====================================================================
    # POST-HARVEST (IND-11 to IND-15)
    # =====================================================================
    (
        "IND-11",
        "Post-harvest loss",
        IndicatorComponent.POST_HARVEST,
        "%",
        False,  # Lower is better
        "Percentage of production lost post-harvest. Lower losses are better.",
    ),
    (
        "IND-12",
        "Storage capacity",
        IndicatorComponent.POST_HARVEST,
        "kg/capita",
        True,
        "Per capita storage capacity for food commodities.",
    ),
    (
        "IND-13",
        "Cold chain coverage",
        IndicatorComponent.POST_HARVEST,
        "%",
        True,
        "Percentage of perishable products with cold chain access.",
    ),
    (
        "IND-14",
        "Share processed exports",
        IndicatorComponent.POST_HARVEST,
        "%",
        True,
        "Percentage of agricultural exports that are processed/value-added.",
    ),
    (
        "IND-15",
        "Food safety certification",
        IndicatorComponent.POST_HARVEST,
        "%",
        True,
        "Percentage of food processors with recognized safety certifications.",
    ),

    # =====================================================================
    # MARKETS (IND-16 to IND-19)
    # =====================================================================
    (
        "IND-16",
        "Share of production marketed",
        IndicatorComponent.MARKETS,
        "%",
        True,
        "Percentage of agricultural production that is sold commercially.",
    ),
    (
        "IND-17",
        "Agricultural exports",
        IndicatorComponent.MARKETS,
        "% of GDP",
        True,
        "Agricultural exports as percentage of GDP. Proxy for export revenue.",
    ),
    (
        "IND-18",
        "Price volatility index",
        IndicatorComponent.MARKETS,
        "index",
        False,  # Lower is better
        "Food price volatility coefficient. Lower volatility is better for stability.",
    ),
    (
        "IND-19",
        "Cooperative membership",
        IndicatorComponent.MARKETS,
        "%",
        True,
        "Percentage of rural population in agricultural cooperatives. Proxy using rural population.",
    ),

    # =====================================================================
    # NUTRITION (IND-20 to IND-24)
    # =====================================================================
    (
        "IND-20",
        "Stunting rate",
        IndicatorComponent.NUTRITION,
        "%",
        False,  # Lower is better
        "Prevalence of stunting in children under 5. Lower rates indicate better nutrition.",
    ),
    (
        "IND-21",
        "Food insecurity",
        IndicatorComponent.NUTRITION,
        "%",
        False,  # Lower is better
        "Prevalence of moderate or severe food insecurity (FIES). Lower is better.",
    ),
    (
        "IND-22",
        "Undernourishment",
        IndicatorComponent.NUTRITION,
        "%",
        False,  # Lower is better
        "Prevalence of undernourishment in the population. Lower rates are better.",
    ),
    (
        "IND-23",
        "Anemia prevalence",
        IndicatorComponent.NUTRITION,
        "%",
        False,  # Lower is better
        "Prevalence of anemia in women of reproductive age. Proxy for protein adequacy.",
    ),
    (
        "IND-24",
        "Food production index",
        IndicatorComponent.NUTRITION,
        "index",
        True,
        "Index of food production per capita (2014-2016=100). Higher values indicate increased production.",
    ),

    # =====================================================================
    # FINANCE (IND-25 to IND-27)
    # =====================================================================
    (
        "IND-25",
        "Financial account ownership",
        IndicatorComponent.FINANCE,
        "%",
        True,
        "Percentage of adults with a financial account. Proxy for financial inclusion.",
    ),
    (
        "IND-26",
        "Bank branch density",
        IndicatorComponent.FINANCE,
        "per 100k",
        True,
        "Commercial bank branches per 100,000 adults. Indicator of agricultural credit access.",
    ),
    (
        "IND-27",
        "Poverty headcount",
        IndicatorComponent.FINANCE,
        "%",
        False,  # Lower is better
        "Percentage of population below national poverty line. Lower is better; proxy for insurance need.",
    ),

    # =====================================================================
    # RESEARCH (IND-28 to IND-30)
    # =====================================================================
    (
        "IND-28",
        "Mobile subscriptions",
        IndicatorComponent.RESEARCH,
        "per 100",
        True,
        "Mobile cellular subscriptions per 100 people. Enables extension services.",
    ),
    (
        "IND-29",
        "Employment in agriculture",
        IndicatorComponent.RESEARCH,
        "%",
        True,
        "Percentage of total employment in agriculture. Proxy for extension service reach.",
    ),
    (
        "IND-30",
        "R&D expenditure",
        IndicatorComponent.RESEARCH,
        "% of GDP",
        True,
        "Research and development expenditure as percentage of GDP.",
    ),

    # =====================================================================
    # ENVIRONMENT (IND-31 to IND-35)
    # =====================================================================
    (
        "IND-31",
        "Mechanization rate",
        IndicatorComponent.ENVIRONMENT,
        "%",
        True,
        "Percentage of agricultural land under mechanized farming.",
    ),
    (
        "IND-32",
        "CSA adoption",
        IndicatorComponent.ENVIRONMENT,
        "%",
        True,
        "Percentage of farmers practicing Climate-Smart Agriculture.",
    ),
    (
        "IND-33",
        "Protected areas",
        IndicatorComponent.ENVIRONMENT,
        "%",
        True,
        "Percentage of terrestrial and marine areas that are protected.",
    ),
    (
        "IND-34",
        "Soil erosion risk",
        IndicatorComponent.ENVIRONMENT,
        "%",
        False,  # Lower is better
        "Percentage of agricultural land at high risk of soil erosion. Lower is better.",
    ),
    (
        "IND-35",
        "GHG intensity",
        IndicatorComponent.ENVIRONMENT,
        "kg CO2eq/kg",
        False,  # Lower is better
        "Greenhouse gas emissions per kg of agricultural output. Lower is better.",
    ),

    # =====================================================================
    # POST-HARVEST (IND-36 to IND-37)
    # =====================================================================
    (
        "IND-36",
        "Access to electricity",
        IndicatorComponent.POST_HARVEST,
        "%",
        True,
        "Percentage of rural population with access to electricity. Enables processing and cold storage.",
    ),
    (
        "IND-37",
        "Disaster-affected land",
        IndicatorComponent.ENVIRONMENT,
        "%",
        False,  # Lower is better
        "Percentage of agricultural land affected by natural disasters annually. Lower is better.",
    ),
]

# Default sensitivity parameters (alpha) for each indicator
# Based on empirical analysis of budget-to-outcome responsiveness
DEFAULT_SENSITIVITIES = {
    "IND-01": Decimal("0.000250"),  # Yield responds moderately to funding
    "IND-02": Decimal("0.000150"),  # Irrigation is capital-intensive, slower response
    "IND-03": Decimal("0.000350"),  # Fertilizer use responds well to subsidies
    "IND-04": Decimal("0.000300"),  # Seed adoption responds to extension & subsidies
    "IND-05": Decimal("0.000200"),  # Diversification takes time
    "IND-06": Decimal("0.000180"),  # Livestock production index
    "IND-07": Decimal("0.000220"),  # Meat productivity
    "IND-08": Decimal("0.000200"),  # Improved breed adoption
    "IND-09": Decimal("0.000280"),  # Animal mortality responds to vet services
    "IND-10": Decimal("0.000150"),  # Depth of hunger - systemic issue
    "IND-11": Decimal("0.000350"),  # Post-harvest loss responds to infrastructure
    "IND-12": Decimal("0.000180"),  # Storage capacity - capital intensive
    "IND-13": Decimal("0.000120"),  # Cold chain - very capital intensive
    "IND-14": Decimal("0.000200"),  # Processing capacity
    "IND-15": Decimal("0.000250"),  # Food safety certification
    "IND-16": Decimal("0.000280"),  # Market participation
    "IND-17": Decimal("0.000200"),  # Export revenue
    "IND-18": Decimal("0.000180"),  # Price volatility - policy dependent
    "IND-19": Decimal("0.000300"),  # Cooperative membership
    "IND-20": Decimal("0.000100"),  # Stunting - very slow to change
    "IND-21": Decimal("0.000120"),  # Food insecurity
    "IND-22": Decimal("0.000110"),  # Undernourishment
    "IND-23": Decimal("0.000100"),  # Anemia - nutrition intervention
    "IND-24": Decimal("0.000200"),  # Food production index
    "IND-25": Decimal("0.000250"),  # Financial inclusion
    "IND-26": Decimal("0.000150"),  # Bank branches - infrastructure
    "IND-27": Decimal("0.000080"),  # Poverty - systemic, slow
    "IND-28": Decimal("0.000400"),  # Mobile subscriptions - fast adoption
    "IND-29": Decimal("0.000100"),  # Agricultural employment - structural
    "IND-30": Decimal("0.000300"),  # R&D expenditure
    "IND-31": Decimal("0.000180"),  # Mechanization
    "IND-32": Decimal("0.000250"),  # CSA adoption
    "IND-33": Decimal("0.000100"),  # Protected areas - policy dependent
    "IND-34": Decimal("0.000200"),  # Soil erosion risk
    "IND-35": Decimal("0.000150"),  # GHG intensity
    "IND-36": Decimal("0.000220"),  # Electricity access
    "IND-37": Decimal("0.000080"),  # Disaster-affected land - climate dependent
}


class Command(BaseCommand):
    help = "Seed all 37 food system indicator definitions"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Replace existing indicators (update all fields)",
        )

    def handle(self, *args, **options):
        force = options["force"]

        with transaction.atomic():
            created = 0
            updated = 0

            for idx, (code, name, component, unit, higher_is_better, description) in enumerate(INDICATORS, start=1):
                sensitivity = DEFAULT_SENSITIVITIES.get(code, Decimal("0.000200"))

                existing = Indicator.objects.filter(code=code).first()

                if existing:
                    if force:
                        existing.name = name
                        existing.component = component.value if hasattr(component, 'value') else component
                        existing.unit = unit
                        existing.higher_is_better = higher_is_better
                        existing.description = description
                        existing.default_sensitivity = sensitivity
                        existing.display_order = idx
                        existing.is_active = True
                        existing.save()
                        updated += 1
                        self.stdout.write(f"  Updated: {code} - {name}")
                    else:
                        self.stdout.write(f"  Skipped (exists): {code}")
                else:
                    Indicator.objects.create(
                        code=code,
                        name=name,
                        component=component.value if hasattr(component, 'value') else component,
                        unit=unit,
                        higher_is_better=higher_is_better,
                        description=description,
                        default_sensitivity=sensitivity,
                        display_order=idx,
                        is_active=True,
                    )
                    created += 1
                    self.stdout.write(f"  Created: {code} - {name}")

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"Seed completed: {created} created, {updated} updated, "
            f"{37 - created - updated} skipped"
        ))

        # Print component summary
        self.stdout.write("")
        self.stdout.write("Indicators by component:")
        for comp in IndicatorComponent:
            count = Indicator.objects.filter(component=comp.value, is_active=True).count()
            self.stdout.write(f"  {comp.label}: {count}")
