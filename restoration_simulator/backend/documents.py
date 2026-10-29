"""Read-only document catalogue and verified library files; no project storage."""
from copy import deepcopy
import hashlib
from pathlib import Path
import re

from fastapi import HTTPException
from .configuration import keys, read_json
from .engine import Invalid, require

CATALOGUE = Path(__file__).resolve().parents[1] / "scenarios" / "documents.json"
LIBRARY = Path(__file__).resolve().parents[2] / "doc_library"


def validate_catalogue(value):
    keys(value, {"version", "viewer", "documents"}, "document catalogue")
    require(type(value["version"]) is int and value["version"] == 1, "Unsupported document catalogue version.")
    v = value["viewer"]
    keys(v, set("initial_page initial_scale zoom_factor min_scale max_scale desktop_width_vw desktop_height_dvh mobile_breakpoint_px".split()), "PDF viewer defaults")
    require(v["initial_page"] == 1 and v["initial_scale"] == "page-width", "Unsupported PDF starting view.")
    require(all(type(v[k]) in (int,float) and v[k] > 0 for k in v if k != "initial_scale"), "Invalid PDF viewer defaults.")
    require(v["zoom_factor"] > 1 and v["min_scale"] < v["max_scale"] and v["desktop_width_vw"] <= 100 and v["desktop_height_dvh"] <= 100, "Invalid PDF zoom or dialog dimensions.")
    require(isinstance(value["documents"], list) and value["documents"], "Missing registered PDFs.")
    ids, aliases = set(), set()
    for d in value["documents"]:
        keys(d, set("id title filename pages sha256 aliases printed_pages mapping_note".split()), "registered PDF")
        require(isinstance(d["id"],str) and re.fullmatch(r"[A-Z]+-\d{3}",d["id"]) and d["id"] not in ids, "Invalid or duplicate document ID.")
        ids.add(d["id"])
        require(all(isinstance(d[k],str) and d[k].strip() for k in ("title","filename","mapping_note")), "Missing document description.")
        require(Path(d["filename"]).name == d["filename"] and not any(c in d["filename"] for c in ("/","\\",":")) and d["filename"].endswith(".pdf"), "Document filename must name a PDF within doc_library.")
        require(type(d["pages"]) is int and d["pages"] > 0 and isinstance(d["sha256"],str) and re.fullmatch(r"[0-9a-f]{64}",d["sha256"]), "Invalid PDF page count or checksum.")
        require(isinstance(d["aliases"],list), "Missing document aliases.")
        for alias in d["aliases"]:
            require(isinstance(alias,str) and (alias.startswith("/api/") or alias.startswith("https://")) and "#" not in alias and alias not in aliases, "Invalid or duplicate document URL alias.")
            aliases.add(alias)
        require(isinstance(d["printed_pages"],dict), "Missing explicit printed-page mapping.")
        require(all(isinstance(label,str) and label.strip() and type(n) is int and 1 <= n <= d["pages"] for label,n in d["printed_pages"].items()), "Invalid printed-page mapping.")
        require(len(set(d["printed_pages"].values())) == len(d["printed_pages"]), "Ambiguous printed-page mapping.")
    return value


def catalogue():
    try:
        return validate_catalogue(read_json(CATALOGUE))
    except Invalid as exc:
        raise HTTPException(500, f"Document catalogue unavailable: {exc}") from exc


def record(ident):
    found = next((d for d in catalogue()["documents"] if d["id"] == ident), None)
    if found is None: raise HTTPException(404, "Unknown library document.")
    return found


def alias_id(url):
    found = next((d for d in catalogue()["documents"] if url in d["aliases"]), None)
    return None if found is None else found["id"]


def verified_file(ident, expected_sha256=None):
    d = record(ident)
    if expected_sha256 is not None and expected_sha256 != d["sha256"]:
        raise HTTPException(409, "This reference requires a different document edition. Its registered checksum does not match; no replacement document was opened.")
    path = (LIBRARY / d["filename"]).resolve()
    if path.parent != LIBRARY.resolve(): raise HTTPException(500, "Document path leaves the registered library.")
    try:
        content = path.read_bytes()
    except FileNotFoundError as exc:
        raise HTTPException(404, "Library PDF is unavailable: " + d["filename"]) from exc
    except OSError as exc:
        raise HTTPException(503, "Cannot read library PDF: " + str(exc)) from exc
    if not content.startswith(b"%PDF-"): raise HTTPException(409, "Registered document is not a readable PDF.")
    if hashlib.sha256(content).hexdigest() != d["sha256"]:
        raise HTTPException(409, "Library PDF has changed. Verify and register its new edition before opening this reference.")
    return d, path


def metadata(ident, expected_sha256=None):
    d, _ = verified_file(ident, expected_sha256)
    return {"version":1, **deepcopy(d), "media_type":"application/pdf", "file_url":f"/api/documents/{ident}/file"}
