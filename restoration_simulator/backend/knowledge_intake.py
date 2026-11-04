"""Read-only review of isolated knowledge candidates; never publishes or opens projects."""
import argparse
from datetime import date
import hashlib
import json
from pathlib import Path
import re
import sys

from fastapi import HTTPException
from .engine_v3 import Invalid, require
from . import documents, knowledge_citations as citations, knowledge_graph as graph

DIRECTORY = graph.DIRECTORY
CANDIDATES = ("citations-v1.json", "connected-pilot-v1.json")
MAPS = {
    "knowledge": ("sources", "entities", "claims", "relations", "issues", "bindings"),
    "citations": ("editions", "passages", "citations", "consumers"),
}


def _require(condition, at, message):
    require(condition, f"Knowledge intake {at}: {message} No application file was written.")


def _keys(value, names, at):
    _require(isinstance(value, dict) and set(value) == set(names), at, "Required fields differ from the supported schema: " + ", ".join(sorted(names)))


def _text(value, at):
    _require(isinstance(value, str) and bool(value.strip()), at, "Nonempty text is required.")


def _hash(value, at):
    _require(isinstance(value, str) and re.fullmatch(r"[a-f0-9]{64}", value) is not None, at, "A complete lowercase SHA-256 is required.")


def _sha(raw):
    return hashlib.sha256(raw).hexdigest()


def _bytes(path):
    try:
        return Path(path).read_bytes()
    except OSError as exc:
        raise Invalid(f"Knowledge intake cannot read required file {path}: {exc}. Retry after restoring access; no replacement was used.") from exc


def _json(raw, path):
    # Parse the exact bytes fingerprinted for this review, including duplicate-key
    # rejection. A separate read could hash one edition and validate another.
    def unique(pairs):
        result = {}
        for key, value in pairs:
            _require(key not in result, str(path), f"Duplicate configuration key {key}.")
            result[key] = value
        return result
    def constant(value):
        raise Invalid(f"Knowledge intake {path}: nonfinite JSON constant {value} is unsupported.")
    try:
        return json.loads(raw.decode("utf-8"), object_pairs_hook=unique, parse_constant=constant)
    except (UnicodeError, ValueError) as exc:
        raise Invalid(f"Knowledge intake cannot parse {path}: {exc}.") from exc


def _input_paths():
    # Fixed authority directories, never executable paths supplied by a manifest.
    paths = [DIRECTORY / "knowledge" / n for n in (*CANDIDATES, "feature-consumers-v1.json")]
    for folder in ("scenarios", "design_rules", "frontend/src"):
        paths.extend((DIRECTORY / folder).glob("*.json"))
    return sorted(paths)


def _inputs():
    return {p.relative_to(DIRECTORY).as_posix(): _bytes(p) for p in _input_paths()}


def _fingerprints(inputs):
    return {name: _sha(raw) for name, raw in inputs.items()}


def _snapshot(data, registry, registration, inputs):
    citations.validate_registry(registry)
    ctx = graph._build(data, registry)
    for consumer, path in citations.CONSUMER_PATHS.items():
        sources = data["sources"] if consumer == "knowledge_pilot" else _json(inputs[path.relative_to(DIRECTORY).as_posix()], path)["sources"]
        citations._validate_sources(registry, consumer, sources)
    graph.validate_feature_consumers(registration, ctx)
    projection = graph._explorer_graph(ctx, registration)
    features = {c: graph._feature_evidence(ctx, registration, c) for c in graph.FEATURE_CONTEXTS}
    return {"ctx": ctx, "registration": registration, "graph": projection, "features": features}


def _current_snapshot():
    inputs = _inputs()
    result = _snapshot(_json(inputs["knowledge/connected-pilot-v1.json"], graph.LIBRARY_PATH),
                       _json(inputs["knowledge/citations-v1.json"], citations.REGISTRY_PATH),
                       _json(inputs["knowledge/feature-consumers-v1.json"], graph.FEATURE_CONSUMERS_PATH), inputs)
    result["inputs"] = inputs
    result["baseline"] = {"dataset_id": result["ctx"]["data"]["id"], "dataset_hash": result["ctx"]["hash"],
                          "consumer_registry_hash": graph._digest(result["registration"]), "files": _fingerprints(inputs)}
    _require(_fingerprints(_inputs()) == result["baseline"]["files"], "baseline", "An authority changed during loading. Capture a new baseline and review again.")
    return result


def baseline_fingerprints():
    """Capture a valid current baseline for a manifest, without writing a file."""
    return _current_snapshot()["baseline"]


def candidate_authorities(data, registry):
    """Resolve candidate bindings for a manifest; this helper is not publication approval."""
    return {bid: binding["authority"] for bid, binding in graph._build(data, citations.validate_registry(registry))["bindings"].items()}


def project_candidate_sources(registry, labels):
    """Generate candidate mirrors from an explicit registry and explicit labels."""
    return citations._project(citations.validate_registry(registry), "knowledge_pilot", labels)


def _changes(before, after):
    result = []
    for domain, field in (("knowledge", "data"), ("citations", "registry")):
        for collection in MAPS[domain]:
            a, b = before[field][collection], after[field][collection]
            for ident in sorted(set(a) | set(b)):
                if ident in a and ident in b and a[ident] == b[ident]: continue
                operation = "add" if ident not in a else "remove" if ident not in b else "replace"
                result.append({"key": f"{domain}.{collection}/{ident}", "domain": domain, "collection": collection,
                               "id": ident, "operation": operation, "before": a[ident] if ident in a else None, "after": b[ident] if ident in b else None})
    for name in ("reviewed_on", "coverage"):
        if before["data"][name] != after["data"][name]:
            result.append({"key": "knowledge.metadata/" + name, "domain": "knowledge", "collection": "metadata", "id": name,
                           "operation": "replace", "before": before["data"][name], "after": after["data"][name]})
    return result


def _affected_claims(changes, before, after):
    """Follow explicit references even when only a binding/issue/entity changed."""
    claims = set()
    for change in changes:
        if change["domain"] != "knowledge": continue
        ident, collection = change["id"], change["collection"]
        for ctx, record in ((before, change["before"]), (after, change["after"])):
            if record is None: continue
            if collection == "claims": claims.add(ident)
            if collection in {"issues", "relations"}: claims.update(record["claim_ids"])
            subjects = {ident} if collection == "entities" else {eid for eid, e in ctx["data"]["entities"].items() if collection == "bindings" and e["binding_id"] == ident}
            for cid, claim in ctx["data"]["claims"].items():
                if subjects & set(claim["subject_ids"]) or (collection == "bindings" and ident in claim["configuration_ids"] + claim["review_targets"]): claims.add(cid)
    return claims


def _affected_refs(changes, before, after):
    refs = set()
    for change in changes:
        for ctx, record in ((before, change["before"]), (after, change["after"])):
            if record is None: continue  # Explicit absence in this side of a diff.
            if change["domain"] == "knowledge":
                if change["collection"] in {"claims", "entities", "relations"}: refs.update(record["citation_ids"])
                if change["collection"] == "sources": refs.add(change["id"])
                if change["collection"] == "issues":
                    for cid in record["claim_ids"]: refs.update(ctx["data"]["claims"][cid]["citation_ids"])
            else:
                registry = ctx["registry"]
                if change["collection"] == "citations": refs.add(change["id"])
                if change["collection"] in {"passages", "editions"}:
                    for cid, citation in registry["citations"].items():
                        passage = registry["passages"][citation["passage_id"]]
                        if (change["collection"] == "passages" and citation["passage_id"] == change["id"]) or (change["collection"] == "editions" and passage["edition_id"] == change["id"]): refs.add(cid)
    for ctx in (before, after):
        for cid in _affected_claims(changes, before, after) & set(ctx["data"]["claims"]): refs.update(ctx["data"]["claims"][cid]["citation_ids"])
    return refs


def _counts(snapshot):
    return {**{name: len(snapshot["ctx"]["data"][name]) for name in MAPS["knowledge"]},
            "nodes": len(snapshot["graph"]["nodes"]), "edges": len(snapshot["graph"]["edges"])}


def _review(batch_dir, include_changes):
    _require(isinstance(batch_dir, (str, Path)) and bool(str(batch_dir).strip()), "batch directory", "Supply an explicit candidate directory.")
    directory = Path(batch_dir)
    manifest_bytes = _bytes(directory / "batch.json")
    manifest = _json(manifest_bytes, directory / "batch.json")
    _keys(manifest, {"version", "id", "title", "reviewed_on", "adoption", "baseline", "candidate_files", "candidate_authorities", "source_review", "reasons"}, "manifest")
    _require(type(manifest["version"]) is int and manifest["version"] == 1, "manifest.version", "Only schema 1 is supported.")
    for name in ("id", "title", "reviewed_on"): _text(manifest[name], "manifest." + name)
    _require(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", manifest["id"]) is not None, "manifest.id", "Use a stable lowercase batch ID.")
    reviewed = graph._date(manifest["reviewed_on"], "manifest.reviewed_on")
    _require(reviewed <= date.today(), "manifest.reviewed_on", "Review dates cannot be in the future.")
    _require(manifest["adoption"] == "explorer_only", "manifest.adoption", "Only explicit explorer_only adoption is supported; feature adoption needs a separately reviewed change.")
    current = _current_snapshot()
    _keys(manifest["baseline"], current["baseline"], "manifest.baseline")
    _require(manifest["baseline"] == current["baseline"], "baseline", "The candidate is stale or an authority changed. Retain it, capture a new baseline and review the differences; do not overwrite concurrent work.")
    _keys(manifest["candidate_files"], CANDIDATES, "manifest.candidate_files")
    raw = {name: _bytes(directory / name) for name in CANDIDATES}
    for name in CANDIDATES:
        _hash(manifest["candidate_files"][name], "manifest.candidate_files." + name)
        _require(_sha(raw[name]) == manifest["candidate_files"][name], name, "Candidate fingerprint differs from its manifest. Review the edit and update the manifest explicitly.")
    data, registry = (_json(raw[name], directory / name) for name in ("connected-pilot-v1.json", "citations-v1.json"))
    _require(isinstance(data, dict) and data.get("id") == current["ctx"]["data"]["id"], "dataset identity", "Keep the current dataset identity; this tool does not migrate query contracts.")
    proposed = _snapshot(data, registry, current["registration"], current["inputs"])
    _require(data["reviewed_on"] == manifest["reviewed_on"], "review date", "The candidate and manifest review dates must agree.")
    authorities = {bid: b["authority"] for bid, b in proposed["ctx"]["bindings"].items()}
    _require(manifest["candidate_authorities"] == authorities, "candidate authorities", "Native bindings changed or fingerprints are incomplete. Review the current native records and regenerate their explicit fingerprints.")
    changed_contexts = [c + "/" + k for c, old in current["features"].items() for k, context in old["contexts"].items() if context != proposed["features"][c]["contexts"][k]]
    _require(not changed_contexts, "Explorer-only compatibility", "Existing feature contexts changed: " + ", ".join(changed_contexts) + ". Retain their records or prepare an explicit feature-adoption change.")
    changes = _changes(current["ctx"], proposed["ctx"])
    _require(bool(changes), "candidate", "No knowledge or citation change is proposed.")
    needed_reasons = {c["key"] for c in changes if c["operation"] != "add" and c["key"] != "knowledge.metadata/reviewed_on"}
    _keys(manifest["reasons"], needed_reasons, "manifest.reasons")
    for key, reason in manifest["reasons"].items(): _text(reason, "reason " + key)
    refs = _affected_refs(changes, current["ctx"], proposed["ctx"])
    passages, required_pages = set(), {}
    for ctx in (current["ctx"], proposed["ctx"]):
        for cid in sorted(refs & set(ctx["data"]["sources"])):
            ref = ctx["data"]["sources"][cid]
            _require(graph._date(ref["verified_on"], "source verification") <= reviewed, "source verification", "A citation verification date exceeds this batch's review date.")
            required_pages.setdefault((ref["document_id"], ref["sha256"]), set()).add(ref["page"])
            passages.add(ctx["registry"]["citations"][cid]["passage_id"])
    _require(isinstance(manifest["source_review"], list), "source review", "An explicit source-review ledger is required.")
    actual_pages = {}
    for row in manifest["source_review"]:
        _keys(row, {"document_id", "sha256", "pages", "publication_context", "review_notes"}, "source review entry")
        for field in ("document_id", "publication_context", "review_notes"): _text(row[field], "source review " + field)
        _hash(row["sha256"], "source review checksum")
        _require(isinstance(row["pages"], list) and bool(row["pages"]) and all(type(p) is int and p >= 1 for p in row["pages"]) and row["pages"] == sorted(set(row["pages"])), "source review pages", "Use ordered, unique positive PDF pages.")
        key = (row["document_id"], row["sha256"])
        _require(key not in actual_pages, "source review", "Duplicate document edition in the review ledger.")
        actual_pages[key] = set(row["pages"])
    _require(actual_pages == required_pages, "source review", "The ledger must identify exactly the changed records' source editions and passages. Inspect each passage and record its context.")
    editions = {**current["ctx"]["registry"]["editions"], **registry["editions"]}
    for eid, edition in sorted(editions.items()): documents.verified_file(edition["document_id"], expected_sha256=edition["sha256"])
    result = {"version": 1, "operation": "review" if include_changes else "check", "batch_id": manifest["id"], "adoption": manifest["adoption"],
              "baseline": current["baseline"], "candidate": {"dataset_id": data["id"], "dataset_hash": proposed["ctx"]["hash"],
              "consumer_registry_hash": graph._digest(current["registration"]), "files": manifest["candidate_files"], "coverage": data["coverage"]},
              "counts": {"before": _counts(current), "after": _counts(proposed)}, "source_review": manifest["source_review"],
              "compatibility": {"feature_contexts_unchanged": True, "feature_registration_unchanged": True, "publication": "explicit repository edit after fingerprint recheck"},
              "verified_editions": sorted(editions)}
    if include_changes:
        targets = [("claim", cid) for cid in _affected_claims(changes, current["ctx"], proposed["ctx"])] + [("passage", p) for p in sorted(passages)]
        impacts = []
        for kind, ident in sorted(set(targets)):
            sides = {}
            for name, snap in (("before", current), ("after", proposed)):
                exists = ident in snap["ctx"]["data"]["claims"] if kind == "claim" else any(n["id"] == ident and n["kind"] == "passage" for n in snap["graph"]["nodes"])
                sides[name] = graph._impact(snap["ctx"], kind, ident, snap["registration"]) if exists else None
            impacts.append({"kind": kind, "id": ident, **sides})
        result.update(changes=changes, reasons=manifest["reasons"], impacts=impacts,
                      impact_scope="Registered dependencies using affected claims/passages; review targets are not automatic feature changes.")
    _require(_fingerprints(_inputs()) == current["baseline"]["files"], "review inputs", "A canonical authority changed during review. Capture a new baseline and retry.")
    _require(_bytes(directory / "batch.json") == manifest_bytes and all(_bytes(directory / n) == raw[n] for n in CANDIDATES), "candidate inputs", "Candidate files changed during review. Review their fingerprints and retry.")
    return result


def check_batch(batch_dir):
    return _review(batch_dir, False)


def review_batch(batch_dir):
    return _review(batch_dir, True)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    operation = parser.add_mutually_exclusive_group(required=True)
    operation.add_argument("--check", metavar="BATCH_DIR")
    operation.add_argument("--review", metavar="BATCH_DIR")
    args = parser.parse_args(argv)
    try:
        result = check_batch(args.check) if args.check is not None else review_batch(args.review)
        output = json.dumps(result, sort_keys=True, ensure_ascii=False, allow_nan=False, indent=2)
    except (Invalid, HTTPException) as exc:
        print(exc.detail if isinstance(exc, HTTPException) else str(exc), file=sys.stderr)
        return 1
    print(output)
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
