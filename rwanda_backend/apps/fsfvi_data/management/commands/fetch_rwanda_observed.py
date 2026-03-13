"""
Fetch Rwanda observed values from World Bank API for multiple fiscal years.

This command fetches actual country-level data for Rwanda (country code: RWA)
and updates IndicatorData.observed_value for indicators with World Bank mappings.

For indicators without World Bank data, uses LINEAR INTERPOLATION between
FY2018 (start) and FY2024 (end) endpoint values for more realistic trends.
"""
import time
from decimal import Decimal

import requests
from django.core.management.base import BaseCommand

from apps.fsfvi_data.models import IndicatorData, Indicator

# World Bank indicator mappings (from REFERENCE_DATA_MAPPING.md)
WB_INDICATOR_MAP = {
    "IND-01": {"wb_code": "AG.YLD.CREL.KG", "name": "Cereal yield", "transform": lambda x: x / 1000},  # kg/ha -> t/ha
    "IND-02": {"wb_code": "AG.LND.IRIG.AG.ZS", "name": "Irrigated land (%)"},
    "IND-03": {"wb_code": "AG.CON.FERT.ZS", "name": "Fertilizer use (kg/ha)"},
    "IND-06": {"wb_code": "AG.PRD.LVSK.XD", "name": "Livestock production index"},
    "IND-10": {"wb_code": "SN.ITK.DPTH", "name": "Depth of hunger (kcal)"},
    "IND-17": {"wb_code": "NE.EXP.GNFS.ZS", "name": "Exports (% of GDP)"},
    "IND-19": {"wb_code": "SP.RUR.TOTL.ZS", "name": "Rural population (%)"},
    "IND-20": {"wb_code": "SH.STA.STNT.ZS", "name": "Stunting rate (%)"},
    "IND-21": {"wb_code": "SN.ITK.MSFI.ZS", "name": "Food insecurity (%)"},
    "IND-22": {"wb_code": "SN.ITK.DEFC.ZS", "name": "Undernourishment (%)"},
    "IND-23": {"wb_code": "SH.ANM.ALLW.ZS", "name": "Anemia prevalence (%)"},
    "IND-24": {"wb_code": "AG.PRD.FOOD.XD", "name": "Food production index"},
    "IND-25": {"wb_code": "FX.OWN.TOTL.ZS", "name": "Account ownership (%)"},
    "IND-26": {"wb_code": "FB.CBK.BRCH.P5", "name": "Bank branches per 100k"},
    "IND-27": {"wb_code": "SI.POV.NAHC", "name": "Poverty headcount (%)"},
    "IND-28": {"wb_code": "IT.CEL.SETS.P2", "name": "Mobile subscriptions per 100"},
    "IND-29": {"wb_code": "SL.AGR.EMPL.ZS", "name": "Employment in agriculture (%)"},
    "IND-30": {"wb_code": "GB.XPD.RSDV.GD.ZS", "name": "R&D expenditure (% GDP)"},
    "IND-33": {"wb_code": "ER.LND.PTLD.ZS", "name": "Protected areas (%)"},
    "IND-36": {"wb_code": "EG.ELC.ACCS.ZS", "name": "Access to electricity (%)"},
}

COUNTRY_CODE = "RWA"  # Rwanda


def fetch_wb_indicator(wb_code: str, years: list[int], timeout: int = 30) -> dict:
    """
    Fetch World Bank indicator data for Rwanda.
    Returns dict of {year: value} for years with data.
    """
    year_range = f"{min(years)}:{max(years)}"
    url = f"https://api.worldbank.org/v2/country/{COUNTRY_CODE}/indicator/{wb_code}"
    params = {
        "format": "json",
        "date": year_range,
        "per_page": 100,
    }

    try:
        response = requests.get(url, params=params, timeout=timeout)
        response.raise_for_status()
        data = response.json()

        if len(data) < 2 or not data[1]:
            return {}

        result = {}
        for entry in data[1]:
            year = int(entry.get("date", 0))
            value = entry.get("value")
            if year in years and value is not None:
                result[year] = float(value)

        return result
    except Exception:
        return {}


def linear_interpolate(start_val: float, end_val: float, start_year: int, end_year: int, target_year: int) -> float:
    """
    Linear interpolation between two endpoint values.

    Formula: value = start + (end - start) * (target - start_year) / (end_year - start_year)
    """
    if end_year == start_year:
        return start_val
    t = (target_year - start_year) / (end_year - start_year)
    return start_val + (end_val - start_val) * t


class Command(BaseCommand):
    help = "Fetch Rwanda observed values from World Bank API and interpolate missing values between FY2018-FY2024"

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Write observed_value to database (otherwise preview only).",
        )
        parser.add_argument(
            "--fiscal-years",
            type=str,
            default="2019,2020,2021,2022,2023",
            help="Comma-separated fiscal years to update (default: 2019,2020,2021,2022,2023).",
        )
        parser.add_argument(
            "--start-year",
            type=int,
            default=2018,
            help="Start year for interpolation (default: 2018).",
        )
        parser.add_argument(
            "--end-year",
            type=int,
            default=2024,
            help="End year for interpolation (default: 2024).",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        fiscal_years = [int(y.strip()) for y in options["fiscal_years"].split(",")]
        start_year = options["start_year"]
        end_year = options["end_year"]

        self.stdout.write(f"\nFetching Rwanda observed values for FY{fiscal_years}")
        self.stdout.write(f"Interpolation: FY{start_year} -> FY{end_year}")
        self.stdout.write("=" * 80)

        # Load start year (FY2018) observed values
        start_data = {}
        start_records = IndicatorData.objects.filter(
            fiscal_year=start_year
        ).exclude(observed_value__isnull=True).select_related("indicator")

        for rec in start_records:
            start_data[rec.indicator.code] = float(rec.observed_value)

        self.stdout.write(f"\nLoaded {len(start_data)} indicators from FY{start_year} (start)")

        # Load end year (FY2024) observed values
        end_data = {}
        end_records = IndicatorData.objects.filter(
            fiscal_year=end_year
        ).exclude(observed_value__isnull=True).select_related("indicator")

        for rec in end_records:
            end_data[rec.indicator.code] = float(rec.observed_value)

        self.stdout.write(f"Loaded {len(end_data)} indicators from FY{end_year} (end)")

        # Show interpolation endpoints for key indicators
        self.stdout.write("\nInterpolation endpoints (sample):")
        for code in sorted(start_data.keys())[:5]:
            s = start_data.get(code, 0)
            e = end_data.get(code, s)  # Use start if end not available
            trend = "+" if e > s else "-" if e < s else "="
            self.stdout.write(f"  {code}: {s:.2f} -> {e:.2f} ({trend})")

        # Fetch World Bank data for all mapped indicators
        self.stdout.write("\nFetching from World Bank API...")
        wb_data = {}  # {indicator_code: {year: value}}

        for ind_code, mapping in WB_INDICATOR_MAP.items():
            wb_code = mapping["wb_code"]
            name = mapping["name"]
            transform = mapping.get("transform", lambda x: x)

            self.stdout.write(f"  {ind_code} ({name}): ", ending="")
            values = fetch_wb_indicator(wb_code, fiscal_years)

            if values:
                # Apply any transformation (e.g., kg/ha -> t/ha)
                wb_data[ind_code] = {y: transform(v) for y, v in values.items()}
                years_str = ", ".join(f"{y}={wb_data[ind_code][y]:.2f}" for y in sorted(wb_data[ind_code].keys()))
                self.stdout.write(self.style.SUCCESS(f"OK ({years_str})"))
            else:
                self.stdout.write(self.style.WARNING("No data"))

            time.sleep(0.3)  # Rate limiting

        # Process each fiscal year
        to_update = []
        stats = {"wb_filled": 0, "interpolated": 0, "already_set": 0, "no_data": 0}

        for fy in fiscal_years:
            self.stdout.write(f"\n--- FY{fy} ---")
            records = IndicatorData.objects.filter(
                fiscal_year=fy
            ).select_related("indicator").order_by("indicator__code")

            for rec in records:
                code = rec.indicator.code

                # Skip if already has observed value
                if rec.observed_value is not None:
                    stats["already_set"] += 1
                    continue

                # Try World Bank data first
                if code in wb_data and fy in wb_data[code]:
                    new_value = wb_data[code][fy]
                    source = "World Bank"
                    stats["wb_filled"] += 1
                # Use linear interpolation between start and end years
                elif code in start_data:
                    start_val = start_data[code]
                    end_val = end_data.get(code, start_val)  # Use start if end not available
                    new_value = linear_interpolate(start_val, end_val, start_year, end_year, fy)
                    if abs(end_val - start_val) < 0.001:
                        source = f"FY{start_year} (constant)"
                    else:
                        source = f"interpolated ({start_val:.1f}->{end_val:.1f})"
                    stats["interpolated"] += 1
                else:
                    stats["no_data"] += 1
                    self.stdout.write(f"  {code}: No data available")
                    continue

                self.stdout.write(f"  {code}: {new_value:.4f} ({source})")

                if apply:
                    rec.observed_value = Decimal(str(round(new_value, 6)))
                    to_update.append(rec)

        # Summary
        self.stdout.write("\n" + "=" * 80)
        self.stdout.write("Summary:")
        self.stdout.write(f"  World Bank data filled: {stats['wb_filled']}")
        self.stdout.write(f"  Interpolated (FY{start_year}->FY{end_year}): {stats['interpolated']}")
        self.stdout.write(f"  Already had data: {stats['already_set']}")
        self.stdout.write(f"  No data available: {stats['no_data']}")

        if to_update:
            if apply:
                IndicatorData.objects.bulk_update(to_update, ["observed_value"], batch_size=50)
                self.stdout.write(self.style.SUCCESS(f"\nUpdated {len(to_update)} records."))
            else:
                self.stdout.write(f"\nWould update {len(to_update)} records. Run with --apply to save.")
        else:
            self.stdout.write("\nNo records to update.")
