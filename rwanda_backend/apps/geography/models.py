"""
Rwanda Geographic Models (Optional).

Note: Current FSFSI implementation uses indicator-based structure
(8 components, 37 indicators) without geographic granularity.

These models are available for future expansion if geographic
breakdown becomes available (e.g., district-level assessments).
"""

# Geographic models are not currently used in the indicator-based
# FSFSI implementation. The data structure is:
#
# - 8 IndicatorComponents (Markets, Crop Production, etc.)
# - 37 Indicators (IND-01 through IND-37)
# - Budget data at indicator level (gross_lcu_bn, weighted_lcu_bn)
#
# If geographic granularity is added in the future, uncomment
# and update these models.

# from django.db import models
# import uuid
#
# class Province(models.Model):
#     """Rwanda Province (Intara) - 5 total."""
#     id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
#     name = models.CharField(max_length=100, unique=True)
#     code = models.CharField(max_length=20, unique=True)
#     ...
#
# class District(models.Model):
#     """Rwanda District (Akarere) - 30 total."""
#     ...
