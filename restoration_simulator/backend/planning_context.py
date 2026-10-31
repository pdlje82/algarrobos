"""Read-only parcel and transferred-design context for demonstrator planning."""
from .engine import require
from .designer import digest
import unicodedata


def describe(project, draft, library):
    identity = draft["inputs"]["parcel_id"]
    parcel = None
    # The existing planning form represents an unchosen parcel as an empty string.
    if identity not in {None, ""}:
        item = next((p for p in project["parcels"] if p["id"] == identity), None)
        require(item is not None, "The planning parcel is missing. Review the site design and transfer again.")
        parties = {p["id"]: p["name"] for p in project["parties"]}
        agreements = [a for a in project["agreements"] if a["parcel_id"] == identity]
        active = [a for a in agreements if a["status"] == "active"]
        agreement = active[-1] if active else agreements[-1] if agreements else None
        routes = {r["id"]: r["title"] for r in project["scenario"]["land_routes"]}
        access = None if agreement is None else {
            "id": agreement["id"], "status": agreement["status"], "route": routes[agreement["route_id"]],
            "operator": parties[agreement["operator_id"]],
            "start": agreement["start"], "end": agreement["end"],
        }
        parcel = {"id": item["id"], "name": item["name"], "municipality": item["location"], "area": item["area"], "owner": parties[item["owner_id"]], "access": access}
    source = draft["source"]
    design = None
    if source is not None:
        record = None if library is None else next((r for r in library["designs"] if r["id"] == source["origin"]["id"]), None)
        design = {"id": source["origin"]["id"], "name": source["origin"]["name"],
                  "status": "missing" if record is None else "changed" if digest(record["draft"]) != digest(source["draft"]) else "current",
                  "current_name": None if record is None else record["name"]}
    def name(value):
        return "".join(ch for ch in unicodedata.normalize("NFKD", value).casefold() if not unicodedata.combining(ch)).strip()
    conflict = parcel is not None and name(draft["inputs"]["municipality"]) != name(parcel["municipality"])
    return {"parcel": parcel, "design": design, "planning_municipality": draft["inputs"]["municipality"], "municipality_conflict": conflict,
            "notice": "Recorded in the project simulation; land rights and permissions have not been independently verified."}
