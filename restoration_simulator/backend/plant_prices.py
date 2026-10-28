"""Editable catalogue prices; saved plans carry their own explicit unit costs."""

from copy import deepcopy
from decimal import Decimal
import hashlib
import json
import os
from pathlib import Path
import tempfile
from threading import RLock

from .configuration import keys, read_json
from .engine_v3 import Invalid, number, require

PRICES_PATH = Path(__file__).resolve().parents[1] / "scenarios" / "plant-prices.json"
LOCK = RLock()


class PriceConflict(Invalid):
    pass


def price(value):
    require(
        number(value, 0, 1000000)
        and Decimal(str(value)) == Decimal(str(value)).quantize(Decimal("0.01")),
        "Plant unit prices must be finite numbers from €0 to €1,000,000, using whole cents.",
    )
    return value


def path():
    if "RESTORATION_PLANT_PRICES_PATH" in os.environ:
        value = os.environ["RESTORATION_PLANT_PRICES_PATH"]
        require(bool(value.strip()), "The plant prices path is empty.")
        return Path(value)
    return PRICES_PATH


def validate(data):
    from .planting import catalogue

    keys(
        data, {"version", "currency", "unit_costs", "custom_unit_costs"}, "plant prices"
    )
    require(
        type(data["version"]) is int and data["version"] == 1,
        "Unsupported plant prices version.",
    )
    require(data["currency"] == "EUR", "Plant prices must use EUR.")
    keys(
        data["unit_costs"],
        {p["id"] for p in catalogue()["plants"]},
        "plant prices.unit_costs",
    )
    keys(
        data["custom_unit_costs"],
        {"tree", "shrub", "grass"},
        "plant prices.custom_unit_costs",
    )
    for value in [*data["unit_costs"].values(), *data["custom_unit_costs"].values()]:
        price(value)
    return data


def snapshot():
    with LOCK:
        source = path()
        data = validate(read_json(source))
        # Hash validated content, so harmless formatting changes do not conflict.
        revision = hashlib.sha256(
            json.dumps(data, sort_keys=True, allow_nan=False).encode()
        ).hexdigest()
        return {**deepcopy(data), "revision": revision}


def update(unit_costs, expected_revision):
    with LOCK:
        current = snapshot()
        require(
            isinstance(unit_costs, dict)
            and 1 <= len(unit_costs) <= len(current["unit_costs"]),
            "Select at least one catalogue plant price to save.",
        )
        require(
            set(unit_costs) <= set(current["unit_costs"]),
            "Only known catalogue plant prices can be saved as defaults; custom plants stay in the project.",
        )
        for value in unit_costs.values():
            price(value)
        require(
            isinstance(expected_revision, str)
            and len(expected_revision) == 64
            and all(character in "0123456789abcdef" for character in expected_revision),
            "Missing default-price revision. Reload default prices and retry.",
        )
        same = all(
            current["unit_costs"][id] == value for id, value in unit_costs.items()
        )
        if current["revision"] != expected_revision and not same:
            raise PriceConflict(
                "Default prices changed elsewhere. Reload default prices, review your draft and save again."
            )
        if same:
            return current  # An explicit retry after a lost response is idempotent.
        candidate = {k: deepcopy(v) for k, v in current.items() if k != "revision"}
        candidate["unit_costs"].update(unit_costs)
        validate(candidate)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=path().parent,
                prefix=".plant-prices-",
                suffix=".tmp",
                delete=False,
            ) as output:
                temporary = output.name
                json.dump(
                    candidate, output, ensure_ascii=False, allow_nan=False, indent=2
                )
                output.write("\n")
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, path())
        except OSError as exc:
            raise Invalid(
                f"Cannot save default plant prices: {exc}. Previous defaults and your project are unchanged. Retry after fixing file access."
            ) from exc
        finally:
            if temporary is not None and os.path.exists(temporary):
                os.unlink(temporary)
        revision = hashlib.sha256(
            json.dumps(candidate, sort_keys=True, allow_nan=False).encode()
        ).hexdigest()
        return {**candidate, "revision": revision}
