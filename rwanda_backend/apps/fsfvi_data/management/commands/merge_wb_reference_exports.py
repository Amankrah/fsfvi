"""
Merge rwanda_backend/wb_new_data.json and wb_additional_data.json into
apps/fsfvi_data/data/reference_distributions.json.

Both exports are pooled numeric samples (not Rwanda year series). They feed
compute_benchmark_sample and any tooling that reads reference_distributions.json.
"""
import json
import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.fsfvi_data.management.commands.fetch_rwanda_observed import WB_INDICATOR_MAP


def _float_values(raw) -> list[float]:
    out = []
    for x in raw or []:
        if x is None:
            continue
        try:
            out.append(float(x))
        except (TypeError, ValueError):
            continue
    return out


class Command(BaseCommand):
    help = (
        "Merge wb_new_data.json and wb_additional_data.json into "
        "reference_distributions.json (reference pools for benchmarks)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Write reference_distributions.json (otherwise preview only).",
        )
        parser.add_argument(
            "--wb-new",
            type=str,
            default="",
            help="Path to wb_new_data.json (default: BASE_DIR/wb_new_data.json).",
        )
        parser.add_argument(
            "--wb-additional",
            type=str,
            default="",
            help="Path to wb_additional_data.json (default: BASE_DIR/wb_additional_data.json).",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        base = Path(settings.BASE_DIR)
        data_dir = Path(__file__).resolve().parent.parent.parent / "data"
        ref_path = data_dir / "reference_distributions.json"

        p_new = Path(options["wb_new"] or (base / "wb_new_data.json"))
        p_add = Path(options["wb_additional"] or (base / "wb_additional_data.json"))

        if not p_new.is_file():
            self.stderr.write(self.style.ERROR(f"Missing {p_new}"))
            return
        if not p_add.is_file():
            self.stderr.write(self.style.ERROR(f"Missing {p_add}"))
            return
        if not ref_path.is_file():
            self.stderr.write(self.style.ERROR(f"Missing {ref_path}"))
            return

        with open(ref_path, encoding="utf-8") as f:
            data = json.load(f)
        indicators = data.setdefault("indicators", {})

        wb_to_ind = {m["wb_code"]: code for code, m in WB_INDICATOR_MAP.items()}

        from_wb_new: set[str] = set()
        with open(p_new, encoding="utf-8") as f:
            wb_new = json.load(f)

        for code, entry in wb_new.items():
            if not isinstance(entry, dict) or "values" not in entry:
                continue
            if not str(code).startswith("IND-"):
                continue
            vals = _float_values(entry.get("values"))
            if len(vals) < 5:
                self.stdout.write(self.style.WARNING(f"  Skip {code}: too few values ({len(vals)})"))
                continue
            prev = indicators.get(code, {})
            indicators[code] = {
                "name": entry.get("name") or prev.get("name", code),
                "unit": entry.get("unit") or prev.get("unit", ""),
                "wb_indicator": entry.get("wb_indicator") or prev.get("wb_indicator", ""),
                "values": vals,
            }
            from_wb_new.add(code)
            self.stdout.write(self.style.SUCCESS(f"  wb_new_data: {code} ({len(vals)} values)"))

        with open(p_add, encoding="utf-8") as f:
            wb_add = json.load(f)

        for wb_key, entry in wb_add.items():
            if not isinstance(entry, dict) or "values" not in entry:
                continue
            ind_code = wb_to_ind.get(wb_key)
            if not ind_code:
                continue
            if ind_code in from_wb_new:
                self.stdout.write(f"  wb_additional: skip {wb_key} -> {ind_code} (wb_new_data wins)")
                continue
            vals = _float_values(entry.get("values"))
            if len(vals) < 5:
                continue
            if wb_key == "AG.YLD.CREL.KG":
                vals = [v / 1000.0 for v in vals]
            prev = indicators.get(ind_code, {})
            indicators[ind_code] = {
                "name": entry.get("name") or prev.get("name", ind_code),
                "unit": prev.get("unit", ""),
                "wb_indicator": wb_key,
                "values": vals,
            }
            self.stdout.write(self.style.SUCCESS(f"  wb_additional: {wb_key} -> {ind_code} ({len(vals)} values)"))

        data["source"] = (
            str(data.get("source", "World Bank API + FAOSTAT"))
            + " + merged wb_new_data.json + wb_additional_data.json"
        )

        if apply:
            bak = ref_path.with_suffix(".json.bak")
            shutil.copy2(ref_path, bak)
            self.stdout.write(f"Backup: {bak}")
            with open(ref_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            self.stdout.write(self.style.SUCCESS(f"Wrote {ref_path}"))
        else:
            self.stdout.write(self.style.WARNING("Dry run. Pass --apply to write reference_distributions.json."))
