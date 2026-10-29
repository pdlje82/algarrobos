"""Current presentation names; never rewrite catalogue/replay or saved evidence."""
from pathlib import Path
from .configuration import keys, read_json
from .engine_v3 import require

PATH = Path(__file__).resolve().parents[1] / "scenarios" / "plant-names.json"


def validate(value):
    from .planting import catalogue
    keys(value, {"version", "reviewed", "plants", "downloadable_documents"}, "plant names")
    require(type(value["version"]) is int and value["version"] == 1, "Unsupported plant-name reference version.")
    require(isinstance(value["reviewed"], str) and bool(value["reviewed"]), "Plant-name review date is required.")
    require(isinstance(value["plants"], list), "Plant names must be a list.")
    ids = set()
    for row in value["plants"]:
        keys(row, {"id", "spanish", "spanish_aliases", "german", "scientific", "german_status", "note", "references"}, "plant name")
        require(all(isinstance(row[k], str) and row[k].strip() for k in ("id", "spanish", "scientific", "note")), "Plant identity fields must be non-empty.")
        require(row["id"] not in ids, "Duplicate plant-name identity: " + row["id"])
        ids.add(row["id"])
        require(isinstance(row["spanish_aliases"], list) and all(isinstance(a, str) and a.strip() for a in row["spanish_aliases"]), "Invalid Spanish name aliases.")
        require(row["german_status"] in {"verified", "not_established"}, "Invalid German name evidence status.")
        require((row["german_status"] == "not_established" and row["german"] is None) or (row["german_status"] == "verified" and isinstance(row["german"], str) and row["german"].strip()), "German names need evidence or an explicit null research gap.")
        require(isinstance(row["references"], list) and row["references"] and all(isinstance(url, str) and url.startswith("https://") for url in row["references"]), "Plant names need HTTPS source references.")
    require(ids == {p["id"] for p in catalogue()["plants"]}, "Plant-name reference must cover the complete catalogue exactly.")
    require(isinstance(value["downloadable_documents"], list), "Missing downloadable name-reference documents.")
    for document in value["downloadable_documents"]:
        keys(document, {"title", "url", "library_status"}, "name-reference download")
        require(isinstance(document["title"], str) and document["title"] and isinstance(document["url"], str) and document["url"].startswith("https://") and document["library_status"] in {"suggested", "in_library"}, "Invalid name-reference download.")
    return value


def load():
    return {row["id"]: row for row in validate(read_json(PATH))["plants"]}
