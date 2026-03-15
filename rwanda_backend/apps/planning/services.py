"""
Planning Service – multi-year strategic plan and MTEF.

Thin wrapper around Rust fsfi_engine planning functions.
All logic in engine; this module only passes JSON and returns parsed result.
"""

import json
import logging

import fsfi_engine

logger = logging.getLogger(__name__)


def _to_json(data):
    return json.dumps(data)


def _from_json(s):
    return json.loads(s)


def generate_multi_year_plan(request_payload: dict) -> dict:
    """
    Generate multi-year strategic plan to achieve target FSFSI.

    Args:
        request_payload: dict with current_components (list of component dicts),
                         planning_years, target_fsfvi, optional yearly_budget_constraints.

    Returns:
        MultiYearStrategicPlan as dict (from engine).
    """
    raw = fsfi_engine.py_generate_multi_year_plan(_to_json(request_payload))
    return _from_json(raw)


def generate_mtef(
    components: list[dict],
    target_fsfvi_improvement_percent: float,
    yearly_budget_growth_rate: float,
) -> dict:
    """
    Generate 3-year MTEF (Medium-Term Expenditure Framework).

    Args:
        components: List of component dicts (component_type, observed_value,
                    benchmark_value, financial_allocation_usd, optional weight/sensitivity).
        target_fsfvi_improvement_percent: e.g. 20 for 20% FSFSI reduction over 3 years.
        yearly_budget_growth_rate: e.g. 0.05 for 5% annual budget growth.

    Returns:
        MtefPlan as dict (from engine).
    """
    raw = fsfi_engine.py_generate_mtef(
        _to_json(components),
        target_fsfvi_improvement_percent,
        yearly_budget_growth_rate,
    )
    return _from_json(raw)
