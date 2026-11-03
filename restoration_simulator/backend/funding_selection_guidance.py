"""Dated selection advice, independent of saved scoring rules and answers."""
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

from .configuration import keys, read_json
from .engine import require
from .funding import checked, digest
from . import documents, funding

LIBRARY = Path(__file__).resolve().parents[1] / "scenarios" / "funding-selection-guidance-v1.json"
ROUTES = {"LEADER-AL20-3.4", "LEADER-AL20-3.5"}
BLOCKS = {"official", "restoration", "application", "payment", "follow_up"}


@checked
def validate(data, catalogue):
    keys(data, {"version", "title", "checked_on", "routes", "publications", "sources", "route_contexts", "recommendations", "nodes"}, "AL20 selection guidance")
    require(type(data["version"]) is int and data["version"] == 1, "Unsupported AL20 selection guidance version.")
    require(isinstance(data["title"], str) and data["title"].strip(), "Missing AL20 selection guidance title.")
    date.fromisoformat(data["checked_on"])
    require(isinstance(data["routes"], list) and len(data["routes"]) == 2 and set(data["routes"]) == ROUTES, "Selection guidance must explicitly cover routes 3.4 and 3.5.")
    records = {d["id"]: d for d in documents.catalogue()["documents"]}
    require(isinstance(data["publications"], dict) and set(data["publications"]) == {"FUND-004", "FUND-008", "FUND-009", "FUND-010", "FUND-013"}, "Selection guidance requires all five reviewed official publications.")
    for ident, publication in data["publications"].items():
        keys(publication, {"title", "edition", "publication_url", "download_url", "review_note", "sha256"}, "selection guidance publication " + ident)
        require(all(isinstance(publication[k], str) and publication[k].strip() for k in publication), "Incomplete selection guidance publication: " + ident)
        require(publication["sha256"] == records[ident]["sha256"], "Selection guidance publication edition mismatch: " + ident)
        for field in ("publication_url", "download_url"):
            url = urlparse(publication[field])
            require(url.scheme == "https" and bool(url.netloc), "Invalid official publication URL: " + ident)
    require(isinstance(data["sources"], dict) and data["sources"], "Selection guidance sources are missing.")
    for sid, ref in data["sources"].items():
        require(isinstance(sid, str) and sid.strip(), "Selection guidance source IDs must be nonempty.")
        from .funding_selection import source
        source(ref)
        require(all(isinstance(ref[k], str) and ref[k].strip() for k in ("label", "role")), "Incomplete selection guidance source description: " + sid)
        require(ref["document_id"] in data["publications"] and ref["verified_on"] <= data["checked_on"], "Unreviewed selection guidance source: " + sid)
        record = records[ref["document_id"]]
        require(ref["sha256"] == record["sha256"] and ref["page"] <= record["pages"], "Selection guidance source page or edition mismatch: " + sid)

    def refs(value, context):
        require(isinstance(value, list) and value and all(isinstance(s, str) for s in value) and len(set(value)) == len(value) and set(value) <= set(data["sources"]), "Missing or unknown source for " + context)

    def block(value, context):
        keys(value, {"text", "sources"}, context)
        require(isinstance(value["text"], str) and value["text"].strip(), "Missing explanation for " + context)
        refs(value["sources"], context)

    keys(data["route_contexts"], ROUTES, "selection guidance route contexts")
    for route, context in data["route_contexts"].items():
        keys(context, {"official", "follow_up"}, "selection guidance route " + route)
        for field in context: block(context[field], route + " " + field)
    require(isinstance(data["recommendations"], dict) and data["recommendations"], "Selection recommendations are missing.")
    for ident, rec in data["recommendations"].items():
        require(isinstance(ident, str) and ident.strip(), "Selection recommendation IDs must be nonempty.")
        keys(rec, {"routes", "text", "sources"}, "selection recommendation " + ident)
        require(isinstance(rec["text"], str) and rec["text"].strip(), "Empty selection recommendation: " + ident)
        require(isinstance(rec["routes"], list) and rec["routes"] and len(set(rec["routes"])) == len(rec["routes"]) and set(rec["routes"]) <= ROUTES, "Invalid recommendation routes: " + ident)
        refs(rec["sources"], ident)
    expected = {c["id"] for p in catalogue["selection"]["profiles"].values() for criterion in p["criteria"] for c in criterion["choices"] if set(c["routes"]) & ROUTES}
    keys(data["nodes"], expected, "selection guidance must cover every 3.4/3.5 subcriterion")
    used = set()
    for ident, node in data["nodes"].items():
        keys(node, BLOCKS | {"recommendations", "unresolved"}, "selection guidance node " + ident)
        for field in BLOCKS: block(node[field], ident + " " + field)
        recs = node["recommendations"]
        require(isinstance(recs, list) and recs and all(isinstance(r, str) for r in recs) and len(set(recs)) == len(recs) and set(recs) <= set(data["recommendations"]), "Missing/unknown node recommendations: " + ident)
        for route in ROUTES:
            require(any(route in data["recommendations"][r]["routes"] for r in recs), "No applicable recommendation for " + ident + " / " + route)
        used.update(recs)
        require(isinstance(node["unresolved"], list), "Missing explicit unresolved-question list: " + ident)
        for question in node["unresolved"]: block(question, ident + " unresolved question")
    require(used == set(data["recommendations"]), "Unbound selection recommendations must be explicitly removed or assigned.")
    return data


def describe():
    data = validate(read_json(LIBRARY), funding.catalogue())
    from .knowledge_citations import validate_consumer_sources
    validate_consumer_sources("selection_guidance", data["sources"])
    return {"version": 1, "library_hash": digest(data), "library": data}
