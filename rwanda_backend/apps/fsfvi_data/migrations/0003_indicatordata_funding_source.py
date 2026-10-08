"""
Add IndicatorData.funding_source and backfill it from what we can prove about
existing rows:

  * a fiscal year that has BudgetLineMapping rows → "budget_mapping"
  * a fiscal year with no mapping rows but IndicatorData funding > 0 →
    "parameters_sheet" (the only other writer of gross/weighted_lcu_bn)
  * rows with zero funding stay blank
"""
from django.db import migrations, models
from django.db.models import Q


def backfill_funding_source(apps, schema_editor):
    IndicatorData = apps.get_model("fsfvi_data", "IndicatorData")
    BudgetLineMapping = apps.get_model("fsfvi_data", "BudgetLineMapping")

    mapped_years = set(
        BudgetLineMapping.objects.values_list("fiscal_year", flat=True).distinct()
    )
    funded = IndicatorData.objects.filter(
        Q(gross_lcu_bn__gt=0) | Q(weighted_lcu_bn__gt=0)
    )
    if mapped_years:
        funded.filter(fiscal_year__in=mapped_years).update(funding_source="budget_mapping")
    funded.exclude(fiscal_year__in=mapped_years).update(funding_source="parameters_sheet")


class Migration(migrations.Migration):

    dependencies = [
        ("fsfvi_data", "0002_benchmark_precision_provenance"),
    ]

    operations = [
        migrations.AddField(
            model_name="indicatordata",
            name="funding_source",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Provenance of gross/weighted_lcu_bn (budget_mapping | carried_forward:FY<yyyy> | parameters_sheet)",
                max_length=50,
            ),
        ),
        migrations.RunPython(backfill_funding_source, migrations.RunPython.noop),
    ]
