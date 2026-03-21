# Generated migration for PSTA5KPIComponentMapping

import uuid
from decimal import Decimal
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("planning", "0005_psta5_alignment_tracking"),
    ]

    operations = [
        migrations.CreateModel(
            name="PSTA5KPIComponentMapping",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("component", models.CharField(max_length=50)),
                (
                    "weight",
                    models.DecimalField(
                        decimal_places=4,
                        default=Decimal("1.0000"),
                        max_digits=5,
                    ),
                ),
                (
                    "kpi",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="component_mappings",
                        to="planning.psta5kpi",
                    ),
                ),
            ],
            options={
                "verbose_name": "PSTA-5 KPI Component Mapping",
                "verbose_name_plural": "PSTA-5 KPI Component Mappings",
                "db_table": "psta5_kpi_component_mappings",
                "ordering": ["kpi__pillar__sort_order", "kpi__sort_order", "-weight"],
            },
        ),
        migrations.AddConstraint(
            model_name="psta5kpicomponentmapping",
            constraint=models.UniqueConstraint(
                "kpi", "component", name="uniq_kpi_component_mapping"
            ),
        ),
    ]
