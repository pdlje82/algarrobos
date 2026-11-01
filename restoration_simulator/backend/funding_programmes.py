"""Current navigation/reference metadata; never an eligibility or saved-rules source."""
from copy import deepcopy
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

from .configuration import keys, read_json
from .engine import require
from .funding import checked, digest, catalogue
from . import funding_guides

LIBRARY = Path(__file__).resolve().parents[1] / "scenarios" / "funding-programmes-v1.json"
KINDS = funding_guides.KINDS


@checked
def validate(data, catalog, guides):
    keys(data, {"version", "checked_on", "defaults", "extra_sources", "programmes"}, "funding programmes")
    require(type(data["version"]) is int and data["version"] == 1, "Unsupported funding programme registry. Install the matching reference library.")
    date.fromisoformat(data["checked_on"])
    keys(data["defaults"], {"compare", "show_met", "show_amount", "show_other_routes"}, "programme display defaults")
    require(all(type(v) is bool for v in data["defaults"].values()), "Programme display defaults must be explicit booleans.")
    require(isinstance(data["extra_sources"], dict), "Programme source definitions are missing.")
    sources = deepcopy(guides["sources"])
    for sid, source in data["extra_sources"].items():
        require(sid not in sources, "Programme source ID duplicates the route guide library: " + sid)
        keys(source, {"title", "issuer", "date", "url", "checked_on", "note", "document_id", "page", "sha256"}, "programme source " + sid)
        require(all(isinstance(source[k], str) and source[k].strip() for k in ["title", "issuer", "note"]), "Incomplete programme source: " + sid)
        require(isinstance(source["url"], str) and urlparse(source["url"]).scheme == "https" and bool(urlparse(source["url"]).netloc), "Invalid programme source URL: " + sid)
        require(all(source[k] is None for k in ["document_id", "page", "sha256"]), "Additional programme sources must be explicit web references; register PDF editions in the route source library first.")
        date.fromisoformat(source["checked_on"])
        if source["date"] is not None: date.fromisoformat(source["date"])
        require(source["checked_on"] <= data["checked_on"], "Programme source check exceeds the registry date.")
        sources[sid] = source
    entries = {e["id"]: e for e in catalog["entries"]}
    require(isinstance(data["programmes"], list) and data["programmes"], "The funding programme list is missing.")
    seen, members, resolved = set(), set(), []
    for p in data["programmes"]:
        keys(p, {"id", "title", "kind", "family", "entry_ids", "summary", "guide_id", "introduction"}, "funding programme")
        require(all(isinstance(p[k], str) and p[k].strip() for k in ["id", "title", "summary"]), "A programme identity or overview is missing.")
        require(p["id"] not in seen and p["kind"] in KINDS and p["family"] in catalog["groups"], "Duplicate or invalid programme: " + p["id"])
        seen.add(p["id"])
        ids = p["entry_ids"]
        require(isinstance(ids, list) and ids and all(isinstance(id, str) for id in ids) and len(set(ids)) == len(ids) and set(ids) <= set(entries), "Unknown/duplicate programme route: " + p["id"])
        require(not members.intersection(ids), "A route has multiple primary programme memberships: " + p["id"])
        require(all(entries[id]["group"] == p["family"] for id in ids), "Programme routes belong to a different funding family.")
        members.update(ids)
        if p["guide_id"] is not None:
            require(p["introduction"] is None and p["guide_id"] in guides["guides"] and ids == [p["guide_id"]], "A reused programme introduction must identify its sole route.")
            guide = deepcopy(guides["guides"][p["guide_id"]])
        else:
            guide = deepcopy(p["introduction"])
            keys(guide, set(funding_guides.SECTIONS) | {"title", "kind", "availability", "checked_on", "source_ids", "unresolved", "related"}, "programme introduction " + p["id"])
        require(all(isinstance(guide[k], str) and guide[k].strip() for k in [*funding_guides.SECTIONS, "title", "availability"]), "Incomplete programme introduction: " + p["id"])
        require(guide["kind"] == p["kind"], "Programme introduction kind mismatch.")
        date.fromisoformat(guide["checked_on"])
        require(guide["checked_on"] <= data["checked_on"], "Programme introduction date exceeds the registry date.")
        for key in ["source_ids", "unresolved", "related"]:
            require(isinstance(guide[key], list) and all(isinstance(v, str) and v.strip() for v in guide[key]) and len(set(guide[key])) == len(guide[key]), "Invalid programme reference list: " + p["id"])
        require(guide["source_ids"] and set(guide["source_ids"]) <= set(sources) and set(guide["related"]) <= set(entries), "Missing or unknown programme source/related route: " + p["id"])
        guide["sources"] = [deepcopy(sources[id]) for id in guide.pop("source_ids")]
        resolved.append({**{k: deepcopy(p[k]) for k in ["id", "title", "kind", "family", "entry_ids", "summary"]}, "guide": guide})
    require(members == set(entries), "Every catalogue route needs an explicit programme membership. Review funding-programmes-v1.json.")
    return {"version": 1, "checked_on": data["checked_on"], "defaults": deepcopy(data["defaults"]), "families": deepcopy(catalog["groups"]), "programmes": resolved}


def describe():
    catalog = catalogue()
    guides = funding_guides.validate(read_json(funding_guides.LIBRARY), catalog)
    library = validate(read_json(LIBRARY), catalog, guides)
    return {"version": 1, "library_hash": digest(library), "library": library}
