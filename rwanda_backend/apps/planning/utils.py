"""Helpers for saved strategic plans."""

from django.db.models.functions import Lower

from .models import SavedStrategicPlan


def normalize_plan_name(name: str) -> str:
    return (name or "").strip()


def plan_name_exists(
    fiscal_year: int,
    name: str,
    *,
    exclude_plan_id=None,
) -> bool:
    """Case-insensitive uniqueness within a fiscal year."""
    n = normalize_plan_name(name)
    if not n:
        return False
    key = n.lower()
    qs = (
        SavedStrategicPlan.objects.filter(fiscal_year=fiscal_year)
        .annotate(_ln=Lower("plan_name"))
        .filter(_ln=key)
    )
    if exclude_plan_id is not None:
        qs = qs.exclude(pk=exclude_plan_id)
    return qs.exists()
