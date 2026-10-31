"""Current editorial references, independent of frozen funding assessments."""
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

from .configuration import keys, read_json
from .engine import require
from .funding import checked, digest
from . import documents, funding

LIBRARY = Path(__file__).resolve().parents[1] / "scenarios" / "funding-guides-v1.json"
SECTIONS = ("what", "fit", "advantages", "limitations", "next_steps")
KINDS = {"programme", "programme_family", "legal_framework", "historical", "mechanism", "emerging", "advisory"}


def research_ids(catalogue):
    # Use authoritative assessment coverage, including its existing-cash exception.
    from .funding_visual import describe as coverage
    facts = {q["id"]: None for q in catalogue["questions"]}
    from .funding_selection import empty
    answers = empty(catalogue)
    results = [funding.assess(e, facts, catalogue, answers) for e in catalogue["entries"]]
    assessment = {"draft": {"version": 4, "bundle": catalogue}, "facts": facts, "results": results}
    return {row["option_id"] for row in coverage(assessment)["coverage"] if row["requirements"] == "research_only"}


@checked
def validate(data, catalogue):
    keys(data, {"version", "checked_on", "sources", "guides"}, "funding guides")
    require(type(data["version"]) is int and data["version"] == 1, "Unsupported funding guide version.")
    date.fromisoformat(data["checked_on"])
    require(isinstance(data["sources"], dict) and data["sources"], "Funding guide sources are missing.")
    records = {d["id"]: d for d in documents.catalogue()["documents"]}
    for sid, ref in data["sources"].items():
        keys(ref, {"title", "issuer", "date", "url", "checked_on", "note", "document_id", "page", "sha256"}, "funding guide source " + sid)
        require(all(isinstance(ref[k], str) and ref[k].strip() for k in ("title", "issuer", "note")), "Incomplete funding guide source: " + sid)
        require(ref["url"] is None and ref["document_id"] is not None or isinstance(ref["url"], str) and urlparse(ref["url"]).scheme == "https" and bool(urlparse(ref["url"]).netloc), "Invalid funding source URL: " + sid)
        date.fromisoformat(ref["checked_on"])
        require(ref["checked_on"] <= data["checked_on"], "Guide source verification date exceeds the library date.")
        if ref["date"] is not None: date.fromisoformat(ref["date"])
        if ref["document_id"] is None:
            require(ref["page"] is None and ref["sha256"] is None, "An external source cannot claim a local PDF edition.")
        else:
            require(isinstance(ref["document_id"], str) and ref["document_id"] in records, "Unregistered funding guide PDF: " + sid)
            record = records[ref["document_id"]]
            require(type(ref["page"]) is int and 1 <= ref["page"] <= record["pages"] and ref["sha256"] == record["sha256"], "Funding guide PDF page or edition mismatch: " + sid)
    keys(data["guides"], research_ids(catalogue), "research-only funding guides")
    all_ids = {e["id"] for e in catalogue["entries"]}
    for ident, guide in data["guides"].items():
        keys(guide, set(SECTIONS) | {"title", "kind", "availability", "checked_on", "source_ids", "unresolved", "related"}, "funding guide " + ident)
        require(guide["kind"] in KINDS, "Unknown funding guide kind: " + ident)
        require(all(isinstance(guide[k], str) and guide[k].strip() for k in (*SECTIONS, "title", "availability")), "Incomplete funding introduction: " + ident)
        date.fromisoformat(guide["checked_on"])
        require(guide["checked_on"] <= data["checked_on"], "Guide verification date exceeds the library date.")
        for key in ("source_ids", "unresolved", "related"):
            require(isinstance(guide[key], list) and all(isinstance(v, str) and v.strip() for v in guide[key]) and len(set(guide[key])) == len(guide[key]), "Invalid guide " + key + ": " + ident)
        require(guide["source_ids"] and set(guide["source_ids"]) <= set(data["sources"]), "Missing/unregistered funding guide source: " + ident)
        require(set(guide["related"]) <= all_ids and ident not in guide["related"], "Unresolved related funding option: " + ident)
    return data


def describe():
    library = validate(read_json(LIBRARY), funding.catalogue())
    return {"version": 1, "library_hash": digest(library), "library": library}
