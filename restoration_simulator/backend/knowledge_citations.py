"""Shared citation metadata and checked feature mirrors; no project or file writes."""

import argparse
from datetime import date
import json
from pathlib import Path
import re
import sys

from fastapi import HTTPException

from .configuration import keys as configuration_keys, read_json
from . import documents
from .engine_v3 import Invalid, require


DIRECTORY = Path(__file__).resolve().parents[1]
REGISTRY_PATH = DIRECTORY / "knowledge" / "citations-v1.json"
# These are supported integrations, not paths or handlers supplied by input data.
CONSUMER_PATHS = {
    "selection_guidance": DIRECTORY / "scenarios" / "funding-selection-guidance-v1.json",
    "project_concept": DIRECTORY / "scenarios" / "funding-project-concept-v1.json",
    "delivery_plan": DIRECTORY / "scenarios" / "funding-delivery-plan-v1.json",
    "knowledge_pilot": DIRECTORY / "knowledge" / "connected-pilot-v1.json",
}
SOURCE_FIELDS = {"document_id", "page", "label", "role", "sha256", "verified_on"}


def _require(condition, context, message):
    require(condition, f"{context}: {message} Check the shared registry and its declared mirrors; no replacement was used.")


def _text(value, context):
    _require(isinstance(value, str) and bool(value.strip()), context, "Expected nonempty text.")


def _keys(value, expected, context):
    _require(isinstance(value, dict), context, "Expected an object.")
    _require(all(isinstance(key, str) for key in value), context, "Object keys must be strings.")
    configuration_keys(value, expected, context)


def _mapping(value, context):
    _require(isinstance(value, dict) and bool(value), context, "Expected a nonempty object.")
    for ident in value:
        _text(ident, context)
        _require(ident.strip() == ident, context, f"Identity {ident!r} must not have surrounding whitespace.")


def validate_registry(data):
    """Validate all records and references without rewriting or inferring anything."""
    at = str(REGISTRY_PATH)
    _keys(data, {"version", "editions", "passages", "citations", "consumers"}, at)
    _require(type(data["version"]) is int and data["version"] == 1, at, "Unsupported citation registry version; install schema 1.")
    for name in ("editions", "passages", "citations", "consumers"):
        _mapping(data[name], f"{at}.{name}")
    _keys(data["consumers"], set(CONSUMER_PATHS), f"{at}.consumers")

    records = {record["id"]: record for record in documents.catalogue()["documents"]}
    for ident, edition in data["editions"].items():
        context = f"{at}.editions[{ident}]"
        _keys(edition, {"document_id", "sha256"}, context)
        _text(edition["document_id"], context + ".document_id")
        sha = edition["sha256"]
        _require(isinstance(sha, str) and re.fullmatch(r"[0-9a-f]{64}", sha), context, "sha256 must be 64 lowercase hexadecimal characters.")
        _require(ident == edition["document_id"] + "@" + sha, context, "Edition identity must be document_id@sha256.")
        _require(edition["document_id"] in records, context, "document_id is not registered in documents.json.")
        _require(sha == records[edition["document_id"]]["sha256"], context, "sha256 does not match the registered document edition.")

    used_editions = set()
    for ident, passage in data["passages"].items():
        context = f"{at}.passages[{ident}]"
        _keys(passage, {"edition_id", "page_basis", "page"}, context)
        _text(passage["edition_id"], context + ".edition_id")
        _require(passage["edition_id"] in data["editions"], context, "edition_id is unresolved.")
        _require(passage["page_basis"] == "pdf", context, "page_basis must explicitly be pdf.")
        document_id = data["editions"][passage["edition_id"]]["document_id"]
        page = passage["page"]
        _require(type(page) is int and 1 <= page <= records[document_id]["pages"], context, "page must be an integer within the registered PDF page limits.")
        _require(ident == f"{passage['edition_id']}:pdf:{page}", context, "Passage identity must be edition_id:pdf:page.")
        used_editions.add(passage["edition_id"])
    _require(used_editions == set(data["editions"]), at, "Unreferenced editions must be explicitly removed or assigned.")

    used_passages = set()
    for ident, citation in data["citations"].items():
        context = f"{at}.citations[{ident}]"
        _keys(citation, {"passage_id", "role", "verified_on"}, context)
        _text(citation["passage_id"], context + ".passage_id")
        _require(citation["passage_id"] in data["passages"], context, "passage_id is unresolved.")
        _text(citation["role"], context + ".role")
        verified = citation["verified_on"]
        _text(verified, context + ".verified_on")
        try:
            parsed = date.fromisoformat(verified)
        except ValueError as exc:
            raise Invalid(f"{context}.verified_on: use a real ISO YYYY-MM-DD review date.") from exc
        _require(parsed.isoformat() == verified, context + ".verified_on", "Use the ISO YYYY-MM-DD review date without conversion.")
        used_passages.add(citation["passage_id"])
    _require(used_passages == set(data["passages"]), at, "Unreferenced passages must be explicitly removed or assigned.")

    used_citations = set()
    for ident, consumer in data["consumers"].items():
        context = f"{at}.consumers[{ident}]"
        _keys(consumer, {"citation_ids"}, context)
        ids = consumer["citation_ids"]
        _require(isinstance(ids, list) and bool(ids), context, "citation_ids must be a nonempty ordered list.")
        for cid in ids:
            _text(cid, context + ".citation_ids")
            _require(cid in data["citations"], context, f"citation_ids contains unresolved identity {cid!r}.")
        _require(len(ids) == len(set(ids)), context, "citation_ids contains duplicate memberships.")
        pages = [data["passages"][data["citations"][cid]["passage_id"]]["page"] for cid in ids]
        _require(pages == sorted(pages), context, "citation_ids must follow ascending PDF-page order.")
        used_citations.update(ids)
    _require(used_citations == set(data["citations"]), at, "Unreferenced citations must be explicitly removed or assigned.")
    return data


def load_registry():
    """Always read the required registry; a prior success is never recovery data."""
    return validate_registry(read_json(REGISTRY_PATH))


def _consumer_ids(registry, consumer_id):
    _require(isinstance(consumer_id, str) and consumer_id in CONSUMER_PATHS, str(REGISTRY_PATH), f"Unsupported consumer {consumer_id!r}.")
    return registry["consumers"][consumer_id]["citation_ids"]


def _project(registry, consumer_id, labels):
    ids = _consumer_ids(registry, consumer_id)
    context = f"{CONSUMER_PATHS[consumer_id]}.labels"
    _keys(labels, set(ids), context)
    projected = {}
    for cid in ids:
        _text(labels[cid], f"{context}[{cid}]")
        citation = registry["citations"][cid]
        passage = registry["passages"][citation["passage_id"]]
        edition = registry["editions"][passage["edition_id"]]
        projected[cid] = {
            "document_id": edition["document_id"], "page": passage["page"],
            "label": labels[cid], "role": citation["role"],
            "sha256": edition["sha256"], "verified_on": citation["verified_on"],
        }
    return projected


def project_sources(consumer_id, labels):
    """Return canonical source metadata with exactly the caller's explicit labels."""
    return _project(load_registry(), consumer_id, labels)


def _labels(registry, consumer_id, sources):
    ids = _consumer_ids(registry, consumer_id)
    context = f"{CONSUMER_PATHS[consumer_id]}.sources"
    _mapping(sources, context)
    present = set(sources) & set(registry["citations"])
    _require(present == set(ids), context, f"Shared citation membership differs: missing {sorted(set(ids) - present)}, unexpected {sorted(present - set(ids))}.")
    labels = {}
    for cid in ids:
        _keys(sources[cid], SOURCE_FIELDS, f"{context}[{cid}]")
        _text(sources[cid]["label"], f"{context}[{cid}].label")
        labels[cid] = sources[cid]["label"]
    return labels


def _validate_sources(registry, consumer_id, sources):
    projected = _project(registry, consumer_id, _labels(registry, consumer_id, sources))
    for cid, expected in projected.items():
        for field in SOURCE_FIELDS - {"label"}:
            actual = sources[cid][field]
            _require(type(actual) is type(expected[field]) and actual == expected[field],
                     f"{CONSUMER_PATHS[consumer_id]}.sources[{cid}].{field}",
                     "Mirror differs from canonical metadata. Review --project output and explicitly regenerate the affected mirrors.")


def validate_consumer_sources(consumer_id, sources):
    """Reject drift without mutating, repairing or replacing the feature source map."""
    _validate_sources(load_registry(), consumer_id, sources)


def _read_sources(consumer_id):
    path = CONSUMER_PATHS[consumer_id]
    library = read_json(path)
    _require(isinstance(library, dict) and "sources" in library, str(path), "Library requires an explicit sources object.")
    return library["sources"]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    operation = parser.add_mutually_exclusive_group(required=True)
    operation.add_argument("--check", action="store_true", help="Validate all shared mirrors and their original PDF editions.")
    operation.add_argument("--project", choices=tuple(CONSUMER_PATHS), metavar="CONSUMER_ID", help="Preview projected metadata as JSON; never write library files.")
    args = parser.parse_args(argv)
    try:
        registry = load_registry()
        if args.check:
            for consumer_id in CONSUMER_PATHS:
                _validate_sources(registry, consumer_id, _read_sources(consumer_id))
            for edition in registry["editions"].values():
                documents.verified_file(edition["document_id"], expected_sha256=edition["sha256"])
            mirrors = sum(len(c["citation_ids"]) for c in registry["consumers"].values())
            output = f"Validated {len(registry['citations'])} shared citations across {len(CONSUMER_PATHS)} consumers ({mirrors} mirrors); PDF editions verified."
        else:
            sources = _read_sources(args.project)
            # This explicitly requested preview can regenerate stale metadata;
            # normal consumer loads always require equality instead.
            labels = _labels(registry, args.project, sources)
            output = json.dumps(_project(registry, args.project, labels), ensure_ascii=False, allow_nan=False, indent=2)
    except (Invalid, HTTPException) as exc:
        detail = exc.detail if isinstance(exc, HTTPException) else str(exc)
        print(f"Shared citations ({REGISTRY_PATH}): {detail}", file=sys.stderr)
        return 1
    print(output)
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
