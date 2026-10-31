"""Immutable, source-cited AL20 strategy content and optional supporting references.

Content selections never change scoring answers. Missing row.edl_evidence means
no recorded strategy references (the explicit historical/manual contract).
An opted-in row stores the library edition/hash and selected stable item IDs.
New source editions need a new retained library file and an explicit adapter;
never replace the contents of an edition used by saved evidence.
"""
from pathlib import Path
from .configuration import keys, read_json
from .engine import require
from .funding import checked, digest

LIBRARY = Path(__file__).resolve().parents[1] / "scenarios" / "funding-edl-v1.json"


@checked
def validate(data):
    keys(data, {"version", "id", "title", "edition", "intro", "source", "topics", "items", "bindings"}, "AL20 EDL library")
    require(type(data["version"]) is int and data["version"] == 1 and data["id"] == "al20-edl-v1-2024-11-19", "Unsupported AL20 EDL library edition.")
    require(all(isinstance(data[k], str) and data[k].strip() for k in ["title", "edition", "intro"]), "AL20 strategy description is missing.")
    source = data["source"]
    keys(source, {"document_id", "sha256", "pages", "publication_url", "download_url"}, "EDL document edition")
    from .documents import record
    document = record(source["document_id"])
    require(source["document_id"] == "FUND-013" and source["sha256"] == document["sha256"] and source["pages"] == document["pages"], "The AL20 strategy library does not match its registered PDF edition.")
    require(all(isinstance(source[k], str) and source[k].startswith("https://") for k in ["publication_url", "download_url"]), "AL20 strategy publication links are missing.")
    require(isinstance(data["items"], list) and data["items"] and isinstance(data["topics"], list) and data["topics"], "AL20 EDL content is missing.")
    ids = set()
    for item in data["items"]:
        keys(item, {"id", "code", "label", "label_es", "summary", "page", "section", "classification"}, "EDL reference item")
        require(all(isinstance(item[k], str) and item[k].strip() for k in ["id", "code", "label", "label_es", "summary", "section"]), "Incomplete EDL reference text.")
        require(item["id"] not in ids, "Duplicate EDL reference ID: " + item["id"])
        ids.add(item["id"])
        require(type(item["page"]) is int and 1 <= item["page"] <= source["pages"], "Invalid EDL source page: " + item["id"])
        require(item["classification"] in {"prioritised_need", "innovative_theme", "innovative_aspect", "consultation_priority", "heritage_reference", "cross_cutting_objective"}, "Unsupported EDL reference classification.")
    topics = set()
    for topic in data["topics"]:
        keys(topic, {"id", "title", "summary", "item_ids", "pages", "section", "status"}, "EDL topic")
        require(all(isinstance(topic[k], str) and topic[k].strip() for k in ["id", "title", "summary", "section"]) and topic["id"] not in topics, "Duplicate or incomplete EDL topic.")
        topics.add(topic["id"])
        require(topic["status"] in {"documented", "context", "not_designated"}, "Unknown EDL topic status.")
        require(isinstance(topic["item_ids"], list) and len(set(topic["item_ids"])) == len(topic["item_ids"]) and set(topic["item_ids"]) <= ids, "Unknown or duplicate item in EDL topic: " + topic["id"])
        require((topic["status"] == "not_designated") == (len(topic["item_ids"]) == 0), "An empty EDL list requires an explicit not-designated explanation.")
        require(isinstance(topic["pages"], list) and topic["pages"] and all(type(p) is int and 1 <= p <= source["pages"] for p in topic["pages"]), "Missing/invalid EDL topic citations.")
    require(isinstance(data["bindings"], dict) and data["bindings"], "EDL node bindings are missing.")
    for binding in data["bindings"].values():
        keys(binding, {"topic_ids", "note"}, "EDL node binding")
        require(isinstance(binding["note"], str) and binding["note"].strip() and isinstance(binding["topic_ids"], list) and binding["topic_ids"] and set(binding["topic_ids"]) <= topics, "An EDL node refers to missing strategy content.")
    require([i for i in data["items"] if i["classification"] == "innovative_theme"] and len([i for i in data["items"] if i["classification"] == "innovative_theme"]) == 5, "The EDL must preserve its five innovative themes.")
    require(len([i for i in data["items"] if i["classification"] == "innovative_aspect"]) == 12, "The EDL must preserve its twelve innovative aspects.")
    require({f'NPL{i}' for i in range(1, 51)} <= ids, "The EDL library must preserve all 50 prioritised LEADER needs.")
    return data


def library():
    return validate(read_json(LIBRARY))


def describe():
    data = library()
    return {"version": 1, "library": data, "library_hash": digest(data)}


def allowed_ids(data, binding_id):
    require(binding_id in data["bindings"], "No EDL reference list is registered for " + binding_id)
    topics = {t["id"]: t for t in data["topics"]}
    return {id for tid in data["bindings"][binding_id]["topic_ids"] for id in topics[tid]["item_ids"]}


@checked
def validate_evidence(row, criterion, route):
    if "edl_evidence" not in row:
        return
    evidence = row["edl_evidence"]
    keys(evidence, {"version", "library_id", "library_hash", "selections"}, "EDL supporting references")
    require(type(evidence["version"]) is int and evidence["version"] == 1, "Unsupported saved EDL evidence. Keep this save and install its matching evaluator.")
    data = library()
    require(evidence["library_id"] == data["id"] and evidence["library_hash"] == digest(data), "Saved EDL evidence needs a different strategy-library edition. Restore its immutable edition; existing answers have not been replaced.")
    selections = evidence["selections"]
    choices = {c["id"] for c in criterion["choices"] if route in c["routes"]}
    require(isinstance(selections, dict) and set(selections) <= choices & set(data["bindings"]), "Unknown or inapplicable EDL evidence subcriterion.")
    for binding, selected in selections.items():
        require(isinstance(selected, list) and all(isinstance(id, str) for id in selected) and len(set(selected)) == len(selected) and set(selected) <= allowed_ids(data, binding), "Unknown, duplicated or unrelated EDL reference for " + binding)


def has_evidence(row):
    return "edl_evidence" in row and any(row["edl_evidence"]["selections"].values())
