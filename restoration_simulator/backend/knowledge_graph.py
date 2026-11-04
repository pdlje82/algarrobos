"""Validated, read-only knowledge pilot. No eligibility, placement or project mutations."""

import argparse
from copy import deepcopy
from datetime import date
import hashlib
import json
from pathlib import Path
import sys
import unicodedata

from fastapi import HTTPException

from .configuration import keys as configuration_keys, read_json
from .engine_v3 import Invalid, require
from . import documents, knowledge_citations as citations


DIRECTORY = Path(__file__).resolve().parents[1]
LIBRARY_PATH = DIRECTORY / "knowledge" / "connected-pilot-v1.json"
FEATURE_CONSUMERS_PATH = DIRECTORY / "knowledge" / "feature-consumers-v1.json"
# Widget identities are registered in code; content memberships belong to JSON.
FEATURE_CONTEXTS = {
    "selection_guidance": {"route-34": "guide-34"},
    "project_concept": {"restoration-34": "concept-restoration"},
    "delivery_plan": {"novelty-34": "delivery-novelty", "publication-34": "delivery-publication"},
    "designer": {"mr2": "approach-mr2", "carob": "plant-carob"},
}
FEATURE_BINDINGS = {
    "guide-34": ("route_guidance", "LEADER-AL20-3.4"),
    "concept-restoration": ("concept_template", "restoration"),
    "delivery-novelty": ("delivery_topic", "novelty"),
    "delivery-publication": ("delivery_topic", "publication"),
    "approach-mr2": ("restoration_approach", "mr2"),
    "plant-carob": ("species", "carob"),
}
ENTITY_TYPES = {
    "programme": "programme", "funding_route": "route", "funding_call": "call",
    "species": "species", "restoration_approach": "approach", "planting_palette": "palette",
    "vegetation_series": "series", "treatment": "treatment", "strategy_need": "need",
    "designer_rule": "rule", "example_activity": "example_activity",
    "irrigation_profile": "irrigation_profile", "reservoir_system": "reservoir_system",
    "drone_platform": "drone_platform", "drone_base": "drone_base",
    "research_topic": "research_topic", "research_scenario": "research_scenario",
    "cluster_template": "cluster_template",
}
RELATION_TYPES = {
    "programme_contains_route": ("programme", "funding_route"),
    "call_context_for": ("funding_call", "programme"),
    "approach_has_palette": ("restoration_approach", "planting_palette"),
    "palette_starter_species": ("planting_palette", "species"),
    "palette_optional_species": ("planting_palette", "species"),
    "approach_treatment_guidance": ("restoration_approach", "treatment"),
    "example_uses_approach": ("example_activity", "restoration_approach"),
    "example_mentions_species": ("example_activity", "species"),
    "example_considers_route": ("example_activity", "funding_route"),
    "example_may_address_need": ("example_activity", "strategy_need"),
    "irrigation_profile_for_species": ("irrigation_profile", "species"),
}
EVIDENCE_KINDS = {"official_requirement", "official_strategy", "guidance", "project_assumption", "research_gap"}
CONFIGURATION_ADAPTERS = {"carob_density", "mr2_geometry", "research_scenario", "cluster_template"}
ADAPTERS = set(ENTITY_TYPES) - {"example_activity"} | CONFIGURATION_ADAPTERS | {
    "illustration", "reference_model", "route_guidance", "delivery_topic", "concept_template", "research_guide",
}


def _require(condition, at, message):
    require(condition, f"{at}: {message} Review the pilot record or its authoritative binding; no substitute was used.")


def _text(value, at):
    _require(isinstance(value, str) and bool(value.strip()), at, "Nonempty text is required.")


def _keys(value, expected, at):
    _require(isinstance(value, dict) and all(isinstance(k, str) for k in value), at, "Expected an object with string keys.")
    configuration_keys(value, expected, at)


def _mapping(value, at):
    _require(isinstance(value, dict) and bool(value), at, "Expected a nonempty record map.")
    for key in value:
        _text(key, at)
        _require(key == key.strip(), at, "Identities cannot have surrounding whitespace.")


def _strings(value, at):
    _require(isinstance(value, list), at, "Expected an explicit list; an empty list means none.")
    for item in value: _text(item, at)
    _require(len(value) == len(set(value)), at, "Duplicate references are unsupported.")


def _refs(value, records, at):
    _strings(value, at)
    _require(set(value) <= set(records), at, "Unresolved reference IDs: " + ", ".join(sorted(set(value) - set(records))))


def _date(value, at):
    _text(value, at)
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise Invalid(f"{at}: use a real ISO YYYY-MM-DD review date.") from exc
    _require(parsed.isoformat() == value, at, "Review dates must use YYYY-MM-DD.")
    return parsed


def _digest(value):
    try:
        return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False).encode()).hexdigest()
    except (ValueError, TypeError, RecursionError) as exc:
        raise Invalid(f"{LIBRARY_PATH}: bound knowledge must be finite valid JSON: {exc}") from exc


def _select(rows, native_id, at):
    _require(isinstance(rows, list), at, "Expected authoritative records as a list.")
    ids = []
    for row in rows:
        _require(isinstance(row, dict) and "id" in row, at, "A source record is missing its identity.")
        _text(row["id"], at + ".id"); ids.append(row["id"])
    _require(len(ids) == len(set(ids)), at, "Authoritative record IDs are duplicated.")
    _require(native_id in ids, at, f"Native identity {native_id!r} is unavailable.")
    return rows[ids.index(native_id)]


class _Resolver:
    """One load's validated authority snapshots; never a cross-request recovery cache."""

    def __init__(self, registry):
        self.owners = {}
        self.registry = registry

    def owner(self, name):
        if name not in self.owners:
            if name == "funding":
                from .funding import catalogue
                value = catalogue(); path = "scenarios/funding.json"
            elif name == "programmes":
                from .funding_programmes import describe
                value = describe()["library"]; path = "scenarios/funding-programmes-v1.json"
            elif name == "plants":
                from .planting import catalogue
                value = catalogue(); path = "scenarios/planting-catalog-v2.json"
            elif name == "names":
                from .plant_names import load
                value = load(); path = "scenarios/plant-names.json"
            elif name == "designer":
                from .designer import load_bundle
                value = load_bundle(); path = "design_rules/"
            elif name == "edl":
                from .funding_edl import library
                value = library(); path = "scenarios/funding-edl-v1.json"
            elif name == "guidance":
                from .funding_selection_guidance import describe
                value = describe()["library"]; path = "scenarios/funding-selection-guidance-v1.json"
            elif name == "research_guides":
                from .funding_guides import describe
                value = describe()["library"]; path = "scenarios/funding-guides-v1.json"
            elif name == "delivery":
                from .delivery_plans import library
                value = library(); path = "scenarios/funding-delivery-plan-v1.json"
            elif name == "concepts":
                from .project_concepts import guide
                value = guide(); path = "scenarios/funding-project-concept-v1.json"
            elif name == "documents":
                value = documents.catalogue(); path = "scenarios/documents.json"
            elif name == "models":
                path = "frontend/src/restoration-models.json"
                value = read_json(DIRECTORY / path)
                _require(isinstance(value, dict) and "version" in value and type(value["version"]) is int and value["version"] == 1 and "models" in value,
                         path, "Unsupported reference-model source; restore its version-1 projection contract.")
            elif name == "irrigation_research":
                from .irrigation_research import load
                value = load(self.registry); path = "scenarios/drone-irrigator-research-v1.json"
            else:
                raise Invalid(f"Unsupported knowledge authority {name!r}; register its adapter explicitly.")
            self.owners[name] = (value, path)
        return self.owners[name]

    def resolve(self, bid, binding):
        adapter, native = binding["adapter"], binding["native_id"]
        aliases = [native]
        if adapter == "illustration":
            value = {k: deepcopy(binding[k]) for k in ("label", "aliases", "description")}
            label = binding["label"]; aliases += binding["aliases"]; path = "knowledge/connected-pilot-v1.json"
        elif adapter in {"irrigation_profile", "reservoir_system", "drone_platform", "drone_base", "research_topic", "research_scenario", "cluster_template"}:
            from .irrigation_research import COLLECTIONS
            (research, rules), path = self.owner("irrigation_research")
            if adapter == "cluster_template":
                source = rules; path = "design_rules/drone_irrigator_v1.json"
            else:
                source = research
            collection = source[COLLECTIONS[adapter]]
            _require(native in collection, path, f"Missing registered research identity {native!r}.")
            value = collection[native]; label = value["title"]
        elif adapter in {"programme", "funding_route", "species", "funding_call", "strategy_need", "reference_model"}:
            owner, collection, label_key = {
                "programme": ("programmes", "programmes", "title"), "funding_route": ("funding", "entries", "title"),
                "species": ("plants", "plants", "label"), "funding_call": ("documents", "documents", "title"),
                "strategy_need": ("edl", "items", "label"), "reference_model": ("models", "models", "title"),
            }[adapter]
            source, path = self.owner(owner)
            _require(collection in source, path, f"Missing source collection {collection}.")
            value = _select(source[collection], native, path)
            _require(label_key in value, path, f"Missing label for {native}.")
            label = value[label_key]
            if adapter == "programme":
                _require(value["kind"] in ("programme", "programme_family"), path, "A mechanism or legal framework must not be retyped as a funding programme.")
            if adapter == "funding_call":
                funding_source, _ = self.owner("funding")
                _require(any(ref["document_id"] == native and ref["role"] == "call"
                             for entry in funding_source["entries"] for ref in entry["sources"]),
                         path, "This document is not registered as a call source by the funding catalogue.")
            if adapter == "species":
                names, names_path = self.owner("names")
                _require(native in names, names_path, f"Names for {native} are unavailable.")
                row = names[native]
                aliases += [row["spanish"], row["scientific"], *row["spanish_aliases"]]
                # The names schema explicitly uses null for an unestablished German name.
                if row["german"] is not None: aliases.append(row["german"])
                label = row["spanish"]; value = {"catalogue": value, "names": row}
                path += " + " + names_path
            if adapter == "strategy_need":
                _require(value["classification"] == "prioritised_need", path, "A strategy need must not be retyped from another EDL category.")
                aliases.append(value["label_es"])
        elif adapter in {"restoration_approach", "designer_rule", "planting_palette", "vegetation_series", "treatment", "carob_density", "mr2_geometry"}:
            source, path = self.owner("designer")
            if adapter in {"restoration_approach", "designer_rule"}:
                value = _select(source["rules"], native, path); label = value["title"]
                if adapter == "restoration_approach":
                    _require(value["condition"] == "approach", path, "The native rule is not an approach.")
            elif adapter in {"planting_palette", "vegetation_series"}:
                value = _select(source["vegetation_combinations"], native, path); label = value["title"]
                series_ids = {"lentisk_series", "coscoja_series"}
                allowed = series_ids if adapter == "vegetation_series" else {"mr1_mix", "mr2_mix"}
                _require(native in allowed, path, "Vegetation series, approach palettes and retained poster presets are distinct types; register unsupported types explicitly.")
            elif adapter == "treatment":
                value = _select(source["treatments"], native, path); label = value["label"]
            elif adapter == "carob_density":
                _require(native == "carob", path, "Only the registered carob density binding is supported.")
                value = {"value": source["defaults"]["density_defaults"][native], "unit": "plants_per_hectare", "basis": "project_assumption", "ruleset_id": source["manifest"]["ruleset_id"]}
                label = "Current Designer carob starting density"
            else:
                _require(native == "mr2", path, "Only the registered MR2 geometry binding is supported.")
                value = {"value": {k: source["defaults"][k] for k in ("mr2_centres", "rainfall_capture")}, "unit": "configured fractions and metres", "basis": "project_assumption", "ruleset_id": source["manifest"]["ruleset_id"]}
                label = "Current illustrative MR2 drawing geometry"
        elif adapter in {"route_guidance", "delivery_topic", "concept_template", "research_guide"}:
            owner, collection, label_key = {"route_guidance": ("guidance", "route_contexts", None), "delivery_topic": ("delivery", "topics", "label"), "concept_template": ("concepts", "templates", "title"), "research_guide": ("research_guides", "guides", "title")}[adapter]
            source, path = self.owner(owner)
            _require(native in source[collection], path, f"Native identity {native!r} is unavailable.")
            value = source[collection][native]
            label = "Route guidance " + native if label_key is None else value[label_key]
        else:
            raise Invalid(f"{LIBRARY_PATH}.bindings[{bid}]: unsupported adapter {adapter!r}.")
        _text(label, f"{path}[{native}].label")
        _strings(aliases, f"{path}[{native}].aliases")
        return {"id": bid, "adapter": adapter, "native_id": native, "label": label,
                "aliases": aliases, "value": deepcopy(value),
                "authority": {"file": path, "record_hash": _digest(value)}, "explanation": binding["explanation"]}


def _build(data, registry):
    at = str(LIBRARY_PATH)
    _keys(data, {"version", "id", "reviewed_on", "sources", "entities", "claims", "relations", "issues", "bindings", "coverage"}, at)
    _require(type(data["version"]) is int and data["version"] == 1, at, "Unsupported pilot schema version.")
    _text(data["id"], at + ".id"); reviewed = _date(data["reviewed_on"], at + ".reviewed_on")
    for name in ("sources", "entities", "claims", "relations", "issues", "bindings"): _mapping(data[name], at + "." + name)
    # Reuse the validated registry snapshot for one coherent query, without a reverse import.
    citations._validate_sources(registry, "knowledge_pilot", data["sources"])
    _require(set(data["sources"]) == set(registry["consumers"]["knowledge_pilot"]["citation_ids"]), at, "All pilot sources must be explicitly registered shared citations.")

    resolver, bindings = _Resolver(registry), {}
    for bid, binding in data["bindings"].items():
        context = f"{at}.bindings[{bid}]"
        _require(isinstance(binding, dict) and "adapter" in binding, context, "Missing explicit adapter.")
        _text(binding["adapter"], context + ".adapter")
        _require(binding["adapter"] in ADAPTERS, context, "Unsupported adapter.")
        extra = {"label", "aliases", "description"} if binding["adapter"] == "illustration" else set()
        _keys(binding, {"adapter", "native_id", "explanation"} | extra, context)
        _text(binding["native_id"], context + ".native_id"); _text(binding["explanation"], context + ".explanation")
        if extra:
            _text(binding["label"], context + ".label"); _text(binding["description"], context + ".description"); _strings(binding["aliases"], context + ".aliases")
        bindings[bid] = resolver.resolve(bid, binding)

    entities, used_bindings, used_sources = {}, set(), set()
    for eid, entity in data["entities"].items():
        context = f"{at}.entities[{eid}]"
        _keys(entity, {"type", "native_id", "binding_id", "aliases", "availability", "citation_ids", "limitations"}, context)
        _text(entity["type"], context); _require(entity["type"] in ENTITY_TYPES, context, "Unsupported entity type.")
        _text(entity["native_id"], context); _text(entity["binding_id"], context)
        _require(eid == ENTITY_TYPES[entity["type"]] + ":" + entity["native_id"], context, "Identity must retain its type prefix and native ID.")
        _require(entity["binding_id"] in bindings, context, "Unresolved entity binding.")
        bound = bindings[entity["binding_id"]]
        adapter = "illustration" if entity["type"] == "example_activity" else entity["type"]
        _require(bound["adapter"] == adapter and bound["native_id"] == entity["native_id"], context, "Entity type/native ID disagrees with its registered adapter.")
        availability = "not_assessed" if entity["type"] in {"programme", "funding_route", "funding_call"} else "not_applicable"
        _require(entity["availability"] == availability, context, "Availability must preserve the explicit unassessed/not-applicable contract.")
        _strings(entity["aliases"], context + ".aliases"); _strings(entity["limitations"], context + ".limitations")
        _refs(entity["citation_ids"], data["sources"], context + ".citation_ids")
        if entity["type"] in {"irrigation_profile", "reservoir_system", "drone_platform", "drone_base", "research_topic", "research_scenario", "cluster_template"}:
            _require(set(entity["citation_ids"]) == set(bound["value"]["citation_ids"]), context, "Research entity evidence disagrees with its native record.")
        if entity["type"] == "funding_call": _require(bool(entity["citation_ids"]), context, "A published call needs its source passage.")
        entities[eid] = {"id": eid, **deepcopy(entity), "label": bound["label"],
                         "aliases": sorted(set(entity["aliases"] + bound["aliases"] + [bound["label"]]))}
        used_bindings.add(entity["binding_id"]); used_sources.update(entity["citation_ids"])

    for cid, claim in data["claims"].items():
        context = f"{at}.claims[{cid}]"
        _keys(claim, {"subject_ids", "statement", "evidence_kind", "context", "review_status", "reviewed_on", "limitations", "citation_ids", "configuration_ids", "review_targets"}, context)
        _require(cid.startswith("claim:"), context, "Claim IDs require the claim: prefix.")
        _refs(claim["subject_ids"], entities, context + ".subject_ids"); _require(bool(claim["subject_ids"]), context, "A claim needs subjects.")
        for name in ("statement", "context"): _text(claim[name], context + "." + name)
        _text(claim["evidence_kind"], context); _require(claim["evidence_kind"] in EVIDENCE_KINDS, context, "Unsupported evidence category.")
        _require(claim["review_status"] in ("curated", "unresolved"), context, "Review status must be explicit.")
        _require(_date(claim["reviewed_on"], context + ".reviewed_on") <= reviewed, context, "Claim review date exceeds the dataset review date.")
        _strings(claim["limitations"], context + ".limitations")
        _refs(claim["citation_ids"], data["sources"], context + ".citation_ids")
        for name in ("configuration_ids", "review_targets"): _refs(claim[name], bindings, context + "." + name)
        if claim["evidence_kind"] == "project_assumption":
            _require(bool(claim["configuration_ids"]) and not claim["citation_ids"], context, "Operational assumptions require configuration bindings, not a fabricated scientific citation.")
        else:
            _require(bool(claim["citation_ids"]) and not claim["configuration_ids"], context, "Source claims require cited passages; configuration values must stay separate.")
        for bid in claim["configuration_ids"]:
            _require(bindings[bid]["adapter"] in CONFIGURATION_ADAPTERS, context, "The configuration binding is not a registered current-value adapter.")
        for bid in claim["review_targets"]:
            _require(bindings[bid]["adapter"] not in CONFIGURATION_ADAPTERS | {"illustration"}, context, "A review target must identify an existing feature record.")
        if claim["evidence_kind"] == "research_gap": _require(claim["review_status"] == "unresolved", context, "A research gap cannot be presented as resolved evidence.")
        used_bindings.update(claim["configuration_ids"] + claim["review_targets"]); used_sources.update(claim["citation_ids"])

    for rid, relation in data["relations"].items():
        context = f"{at}.relations[{rid}]"
        _keys(relation, {"type", "source", "target", "claim_ids", "citation_ids", "basis", "context", "limitations"}, context)
        _text(relation["type"], context); _require(relation["type"] in RELATION_TYPES, context, "Unsupported relationship type.")
        for field in ("source", "target"):
            _text(relation[field], context); _require(relation[field] in entities, context, "Relationship endpoint is unresolved.")
        source, target = entities[relation["source"]], entities[relation["target"]]
        _require((source["type"], target["type"]) == RELATION_TYPES[relation["type"]], context, "Relationship endpoint types disagree with the registered relation.")
        _refs(relation["claim_ids"], data["claims"], context + ".claim_ids"); _refs(relation["citation_ids"], data["sources"], context + ".citation_ids")
        _text(relation["context"], context + ".context"); _strings(relation["limitations"], context + ".limitations")
        expected_basis = "project_assumption" if relation["type"].startswith("example_") or relation["type"] in {"palette_starter_species", "palette_optional_species"} else "source_reference"
        _require(relation["basis"] == expected_basis, context, "Relationship basis must distinguish project associations from source evidence.")
        sv, tv = bindings[source["binding_id"]]["value"], bindings[target["binding_id"]]["value"]
        if relation["type"] == "programme_contains_route": _require(target["native_id"] in sv["entry_ids"], context, "Programme membership disagrees with its authority.")
        if relation["type"] == "approach_has_palette": _require(tv["rule"] == source["native_id"], context, "Palette does not name this approach rule.")
        if relation["type"] == "irrigation_profile_for_species": _require(sv["species_id"] == target["native_id"], context, "Irrigation profile linkage disagrees with its native species identity.")
        if relation["type"] == "palette_starter_species": _require(target["native_id"] in sv["starter"], context, "Species is not a starter in this project palette.")
        if relation["type"] == "palette_optional_species": _require(target["native_id"] in sv["optional"], context, "Species is not optional in this project palette.")
        if relation["type"] == "call_context_for":
            _require(any(data["sources"][ref]["document_id"] == source["native_id"] for ref in relation["citation_ids"]), context, "Call context requires the bound call's cited passage.")
        if relation["type"] == "approach_treatment_guidance":
            _require(bool(relation["claim_ids"]), context, "Treatment guidance requires a claim.")
        for cid in relation["claim_ids"]:
            _require({relation["source"], relation["target"]} <= set(data["claims"][cid]["subject_ids"]), context, "The supporting claim does not describe both endpoints.")
        used_sources.update(relation["citation_ids"])

    issue_claims = set()
    for iid, issue in data["issues"].items():
        context = f"{at}.issues[{iid}]"
        _keys(issue, {"type", "claim_ids", "status", "explanation", "limitations"}, context)
        _require(issue["type"] in ("source_tension", "evidence_gap") and issue["status"] == "unresolved", context, "Unsupported issue type/status; no implicit resolution is allowed.")
        _refs(issue["claim_ids"], data["claims"], context + ".claim_ids"); _text(issue["explanation"], context + ".explanation"); _strings(issue["limitations"], context + ".limitations")
        _require(bool(issue["claim_ids"]), context, "An issue needs its affected claims.")
        if issue["type"] == "source_tension": _require(len(issue["claim_ids"]) >= 2, context, "A source tension requires distinct claims.")
        for cid in issue["claim_ids"]:
            _require(data["claims"][cid]["review_status"] == "unresolved", context, "Issue claims must retain unresolved review status.")
            if issue["type"] == "evidence_gap": _require(data["claims"][cid]["evidence_kind"] == "research_gap", context, "An evidence-gap issue must refer to a bounded research gap.")
        issue_claims.update(issue["claim_ids"])
    _require(issue_claims == {cid for cid, c in data["claims"].items() if c["review_status"] == "unresolved"}, at, "Every unresolved claim needs an explicit issue record.")
    _require(used_bindings == set(bindings), at, "Unused bindings must be explicitly removed or assigned.")
    _require(used_sources == set(data["sources"]), at, "Unused source references must be explicitly removed or assigned.")
    coverage = data["coverage"]
    _keys(coverage, {"mode", "root_entities", "excluded"}, at + ".coverage")
    _require(coverage["mode"] == "registered-pilot-only", at, "Coverage must not imply complete application impact analysis.")
    _refs(coverage["root_entities"], entities, at + ".coverage.root_entities"); _require(bool(coverage["root_entities"]), at, "Coverage needs explicit roots.")
    _strings(coverage["excluded"], at + ".coverage.excluded"); _require(bool(coverage["excluded"]), at, "Unindexed coverage must be disclosed.")
    return {"data": deepcopy(data), "registry": registry, "bindings": bindings, "entities": entities,
            "documents": deepcopy(resolver.owner("documents")[0]["documents"]),
            "hash": _digest({"data": data, "registry": registry, "bindings": bindings})}


def validate_library(data):
    _build(data, citations.load_registry())
    return data


def load_library():
    return _build(read_json(LIBRARY_PATH), citations.load_registry())


def _response(ctx, **result):
    return {"version": 1, "dataset_id": ctx["data"]["id"], "dataset_hash": ctx["hash"],
            "reviewed_on": ctx["data"]["reviewed_on"], "coverage": deepcopy(ctx["data"]["coverage"]), **result}


def _evidence(ctx, ids):
    return [{"citation_id": cid, "passage_id": ctx["registry"]["citations"][cid]["passage_id"], **deepcopy(ctx["data"]["sources"][cid])} for cid in sorted(ids)]


def _claim(ctx, cid):
    claim = ctx["data"]["claims"][cid]
    return {"id": cid, **deepcopy(claim), "evidence": _evidence(ctx, claim["citation_ids"]),
            "configuration_values": [deepcopy(ctx["bindings"][bid]) for bid in sorted(claim["configuration_ids"])]}


def _entity_id(ctx, eid):
    _text(eid, "entity_id"); _require(eid in ctx["entities"], "entity_id", f"Unknown pilot entity {eid!r}.")


def _normal(value):
    return unicodedata.normalize("NFKC", value).casefold().strip()


def _find(ctx, text, entity_type):
    _text(text, "search")
    if entity_type is not None: _require(isinstance(entity_type, str) and entity_type in ENTITY_TYPES, "entity_type", "Unsupported entity filter.")
    query = _normal(text)
    matches = [deepcopy(e) for eid, e in sorted(ctx["entities"].items())
               if (entity_type is None or e["type"] == entity_type) and any(query in _normal(v) for v in [eid, e["label"], *e["aliases"]])]
    return _response(ctx, matches=matches, ambiguous=len(matches) > 1)


def find_entities(text, entity_type=None):
    return _find(load_library(), text, entity_type)


def _issues(ctx, entity_id):
    if entity_id is not None: _entity_id(ctx, entity_id)
    found = []
    for iid, issue in sorted(ctx["data"]["issues"].items()):
        if entity_id is not None and not any(entity_id in ctx["data"]["claims"][cid]["subject_ids"] for cid in issue["claim_ids"]): continue
        found.append({"id": iid, **deepcopy(issue), "claims": [_claim(ctx, cid) for cid in sorted(issue["claim_ids"])]})
    return _response(ctx, issues=found)


def issues(entity_id=None):
    """An absent entity filter explicitly requests all registered pilot issues."""
    return _issues(load_library(), entity_id)


def _details(ctx, entity_id):
    _entity_id(ctx, entity_id)
    entity = ctx["entities"][entity_id]
    relations = [{"id": rid, **deepcopy(r)} for rid, r in sorted(ctx["data"]["relations"].items()) if entity_id in (r["source"], r["target"])]
    return _response(ctx, entity=deepcopy(entity), authority=deepcopy(ctx["bindings"][entity["binding_id"]]),
                     evidence=_evidence(ctx, entity["citation_ids"]),
                     claims=[_claim(ctx, cid) for cid, c in sorted(ctx["data"]["claims"].items()) if entity_id in c["subject_ids"]],
                     relations=relations, issues=_issues(ctx, entity_id)["issues"])


def entity_details(entity_id):
    return _details(load_library(), entity_id)


def validate_feature_consumers(value, ctx):
    at = str(FEATURE_CONSUMERS_PATH)
    _keys(value, {"version", "dataset_id", "consumers"}, at)
    _require(type(value["version"]) is int and value["version"] == 1, at, "Unsupported feature-consumer version.")
    _require(value["dataset_id"] == ctx["data"]["id"], at, "Feature consumers name an incompatible dataset.")
    _keys(value["consumers"], set(FEATURE_CONTEXTS), at + ".consumers")
    for consumer, expected in FEATURE_CONTEXTS.items():
        spec = value["consumers"][consumer]
        _keys(spec, {"contexts", "context_order"}, at + "." + consumer)
        _keys(spec["contexts"], set(expected), at + "." + consumer + ".contexts")
        _refs(spec["context_order"], expected, at + "." + consumer + ".context_order")
        _require(set(spec["context_order"]) == set(expected), at, "Context ordering must name every registered widget exactly once.")
        for ident, binding in expected.items():
            row = spec["contexts"][ident]; path = f"{at}.{consumer}.{ident}"
            _keys(row, {"binding_id", "claim_ids", "entity_ids", "relation_ids"}, path)
            _require(row["binding_id"] == binding and binding in ctx["bindings"], path, "Widget native binding disagrees with its registration.")
            resolved = ctx["bindings"][binding]
            _require((resolved["adapter"], resolved["native_id"]) == FEATURE_BINDINGS[binding], path, "Widget adapter/native identity disagrees with its registration.")
            for field, records in (("claim_ids", ctx["data"]["claims"]), ("entity_ids", ctx["entities"]), ("relation_ids", ctx["data"]["relations"])):
                _refs(row[field], records, path + "." + field)
            _require(bool(row["claim_ids"]) and bool(row["entity_ids"]), path, "A widget needs explicitly selected claims and entities.")
            selected = set(row["claim_ids"])
            for cid in selected:
                _require(set(ctx["data"]["claims"][cid]["subject_ids"]) <= set(row["entity_ids"]), path, "Claim subjects must be included in the context.")
            for rid in row["relation_ids"]:
                relation = ctx["data"]["relations"][rid]
                _require({relation["source"], relation["target"]} <= set(row["entity_ids"]), path, "Relationship endpoints must be included in the context.")
                _require(set(relation["claim_ids"]) <= selected, path, "Relationship supporting claims must be displayed.")
            for issue in ctx["data"]["issues"].values():
                affected = set(issue["claim_ids"])
                _require(not selected & affected or affected <= selected, path, "An unresolved issue must display all affected claims together.")
    return value


def _feature_consumers(ctx):
    return validate_feature_consumers(read_json(FEATURE_CONSUMERS_PATH), ctx)


def _feature_evidence(ctx, consumers, consumer_id):
    _text(consumer_id, "consumer_id")
    _require(consumer_id in FEATURE_CONTEXTS, "consumer_id", f"Unknown feature consumer {consumer_id!r}.")
    contexts = {}
    spec = consumers["consumers"][consumer_id]
    for ident in spec["context_order"]:
        row = spec["contexts"][ident]
        selected = set(row["claim_ids"])
        entities = []
        for eid in row["entity_ids"]:
            entity = ctx["entities"][eid]
            entities.append({**deepcopy(entity), "authority": deepcopy(ctx["bindings"][entity["binding_id"]]), "evidence": _evidence(ctx, entity["citation_ids"])})
        contexts[ident] = {
            "binding": deepcopy(ctx["bindings"][row["binding_id"]]),
            "claims": [_claim(ctx, cid) for cid in row["claim_ids"]], "entities": entities,
            "relations": [{"id": rid, **deepcopy(ctx["data"]["relations"][rid]), "evidence": _evidence(ctx, ctx["data"]["relations"][rid]["citation_ids"])} for rid in row["relation_ids"]],
            "issues": [{"id": iid, **deepcopy(issue)} for iid, issue in sorted(ctx["data"]["issues"].items()) if selected & set(issue["claim_ids"])],
        }
    return _response(ctx, consumer_id=consumer_id, consumer_registry_hash=_digest(consumers), context_order=deepcopy(spec["context_order"]), contexts=contexts)


def feature_evidence(consumer_id):
    """Current reference evidence only: never reads or updates a project/save."""
    ctx = load_library()
    return _feature_evidence(ctx, _feature_consumers(ctx), consumer_id)


RELATION_LABELS = {
    "programme_contains_route": "contains route", "call_context_for": "call context for",
    "approach_has_palette": "has planting palette", "palette_starter_species": "lists starter species",
    "palette_optional_species": "lists optional species",
    "approach_treatment_guidance": "describes treatment", "example_uses_approach": "illustrates approach",
    "example_mentions_species": "mentions species", "example_considers_route": "considers route",
    "example_may_address_need": "may address need",
    "irrigation_profile_for_species": "records irrigation assessment for",
}


def _explorer_graph(ctx, consumers=None):
    # None explicitly selects the installed feature registry; intake supplies its
    # already captured registry to avoid changing any process-global loader path.
    consumers = _feature_consumers(ctx) if consumers is None else validate_feature_consumers(consumers, ctx)
    nodes, edges = {}, {}
    for eid, entity in sorted(ctx["entities"].items()):
        details = _details(ctx, eid)
        nodes[eid] = {"id": eid, "kind": "entity", "label": entity["label"], "details": {k: details[k] for k in ("entity", "authority", "evidence", "claims", "relations", "issues")}}
    for cid, claim in sorted(ctx["data"]["claims"].items()):
        nodes[cid] = {"id": cid, "kind": "claim", "label": claim["statement"], "details": _claim(ctx, cid)}
    catalogue = {d["id"]: d for d in ctx["documents"]}
    passage_uses = {}
    for ref in _evidence(ctx, ctx["data"]["sources"]):
        passage_uses.setdefault(ref["passage_id"], []).append(ref)
    for pid, refs in sorted(passage_uses.items()):
        first = refs[0]
        doc = catalogue[first["document_id"]]
        _require(doc["sha256"] == first["sha256"], "explorer", "Document edition changed while building the graph. Retry after checking registration.")
        nodes[pid] = {"id": pid, "kind": "passage", "label": f"{first['document_id']} · PDF page {first['page']}",
                      "details": {"document": deepcopy(doc), "passage_id": pid, "page": first["page"], "page_basis": "pdf", "citation_uses": refs}}
    def derived(kind, source, target, refs):
        ident = "edge:" + _digest([kind, source, target])
        _require(ident not in edges, "explorer", "Duplicate derived connection.")
        edges[ident] = {"id": ident, "kind": kind, "source": source, "target": target,
                        "label": "about" if kind == "claim_subject" else "cites", "details": {"evidence": _evidence(ctx, refs)}}
    for cid, claim in sorted(ctx["data"]["claims"].items()):
        for eid in claim["subject_ids"]: derived("claim_subject", cid, eid, [])
    for kind, records in (("claim_cites", ctx["data"]["claims"]), ("entity_cites", ctx["entities"])):
        for ident, record in sorted(records.items()):
            grouped = {}
            for cid in record["citation_ids"]:
                pid = ctx["registry"]["citations"][cid]["passage_id"]
                grouped.setdefault(pid, []).append(cid)
            for pid, refs in sorted(grouped.items()): derived(kind, ident, pid, refs)
    for rid, relation in sorted(ctx["data"]["relations"].items()):
        edges[rid] = {"id": rid, "kind": "relationship", "source": relation["source"], "target": relation["target"],
                      "label": RELATION_LABELS[relation["type"]],
                      "details": {"id": rid, **deepcopy(relation), "evidence": _evidence(ctx, relation["citation_ids"])}}
    expected = {"claim_subject": ("claim", "entity"), "claim_cites": ("claim", "passage"), "entity_cites": ("entity", "passage"), "relationship": ("entity", "entity")}
    for edge in edges.values():
        _require(edge["source"] in nodes and edge["target"] in nodes, "explorer", "A connection has an unresolved endpoint.")
        _require((nodes[edge["source"]]["kind"], nodes[edge["target"]]["kind"]) == expected[edge["kind"]], "explorer", "Connection endpoint kinds disagree.")
    return _response(ctx, consumer_registry_hash=_digest(consumers), nodes=[nodes[k] for k in sorted(nodes)],
                     edges=[edges[k] for k in sorted(edges)], issues=_issues(ctx, None)["issues"],
                     entity_types=deepcopy(ENTITY_TYPES), relation_types=deepcopy(RELATION_LABELS))


def explorer_graph():
    """Deterministic, bounded corpus projection. Never reads project state."""
    return _explorer_graph(load_library())


def _impact(ctx, target_kind, target_id, consumers=None):
    _require(isinstance(target_kind, str) and target_kind in {"claim", "passage"}, "impact", "Target kind must be claim or passage.")
    _text(target_id, "impact.target_id")
    data, registry = ctx["data"], ctx["registry"]
    passage_by_citation = {cid: registry["citations"][cid]["passage_id"] for cid in data["sources"]}
    dependencies, entity_ids, relation_ids = [], [], []
    if target_kind == "claim":
        _require(target_id in data["claims"], "impact", "Unknown pilot claim.")
        claim_ids = [target_id]
    else:
        _require(target_id in set(passage_by_citation.values()), "impact", "Passage is unknown or outside the registered pilot coverage.")
        source_ids = {cid for cid, pid in passage_by_citation.items() if pid == target_id}
        claim_ids = [cid for cid, c in data["claims"].items() if source_ids & set(c["citation_ids"])]
        entity_ids = sorted(eid for eid, e in data["entities"].items() if source_ids & set(e["citation_ids"]))
        relation_ids = sorted(rid for rid, r in data["relations"].items() if source_ids & set(r["citation_ids"]))
        for consumer, definition in sorted(registry["consumers"].items()):
            refs = sorted(source_ids & set(definition["citation_ids"]))
            if refs:
                dependencies.append({"consumer_id": consumer, "citation_ids": refs, "effect": "citation_validation_dependency",
                                     "file": citations.CONSUMER_PATHS[consumer].relative_to(DIRECTORY).as_posix(),
                                     "explanation": "This consumer validates these citation metadata mirrors; this does not update saved projects or adopt a changed claim."})
    targets = []
    for cid in sorted(claim_ids):
        for bid in sorted(data["claims"][cid]["review_targets"]):
            path = [{"kind": target_kind, "id": target_id}]
            if target_kind == "passage": path.append({"kind": "claim", "id": cid})
            path.append({"kind": "review_target", "id": bid})
            targets.append({"claim_id": cid, "binding_id": bid, "effect": "review_required", "path": path,
                            "target": deepcopy(ctx["bindings"][bid]),
                            "explanation": "Manually registered review target for retained wording, rules or calculations. Actual shared-evidence consumption is listed separately; no saved rules or project values are adopted by this path."})
    consumers = _feature_consumers(ctx) if consumers is None else validate_feature_consumers(consumers, ctx)
    feature_dependencies = []
    for consumer, spec in consumers["consumers"].items():
        for ident, row in spec["contexts"].items():
            matches = [(kind, key) for kind, keys, included in (("claim", claim_ids, row["claim_ids"]), ("entity", entity_ids, row["entity_ids"]), ("relation", relation_ids, row["relation_ids"])) for key in sorted(set(keys) & set(included))]
            for kind, key in matches:
                path = [{"kind": target_kind, "id": target_id}]
                if kind != target_kind or key != target_id: path.append({"kind": kind, "id": key})
                path.append({"kind": "feature_context", "id": consumer + "/" + ident})
                feature_dependencies.append({"consumer_id": consumer, "context_id": ident, "binding_id": row["binding_id"], "effect": "shared_evidence_dependency", "path": path,
                                             "explanation": "This screen displays the registered shared evidence. Its retained help, calculations and saved snapshots remain separately owned."})
    return _response(ctx, version=2, consumer_registry_hash=_digest(consumers), target={"kind": target_kind, "id": target_id}, claim_ids=sorted(claim_ids),
                     entity_ids=entity_ids, relation_ids=relation_ids, validation_dependencies=dependencies, review_targets=targets, feature_dependencies=feature_dependencies)


def impact(target_kind, target_id):
    return _impact(load_library(), target_kind, target_id)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    operation = parser.add_mutually_exclusive_group(required=True)
    operation.add_argument("--check", action="store_true")
    operation.add_argument("--search")
    operation.add_argument("--entity")
    operation.add_argument("--impact-claim")
    operation.add_argument("--impact-passage")
    operation.add_argument("--issues", action="store_true")
    operation.add_argument("--feature-evidence", choices=tuple(FEATURE_CONTEXTS), metavar="CONSUMER_ID")
    operation.add_argument("--explorer", action="store_true")
    parser.add_argument("--type", choices=tuple(ENTITY_TYPES))
    parser.add_argument("--for-entity")
    args = parser.parse_args(argv)
    if args.type is not None and args.search is None: parser.error("--type requires --search")
    if args.for_entity is not None and not args.issues: parser.error("--for-entity requires --issues")
    try:
        ctx = load_library()
        if args.check:
            _explorer_graph(ctx)
            for edition in ctx["registry"]["editions"].values(): documents.verified_file(edition["document_id"], expected_sha256=edition["sha256"])
            result = _response(ctx, validated={name: len(ctx["data"][name]) for name in ("entities", "claims", "relations", "issues", "bindings", "sources")})
        elif args.search is not None: result = _find(ctx, args.search, args.type)
        elif args.entity is not None: result = _details(ctx, args.entity)
        elif args.impact_claim is not None: result = _impact(ctx, "claim", args.impact_claim)
        elif args.impact_passage is not None: result = _impact(ctx, "passage", args.impact_passage)
        elif args.feature_evidence is not None: result = _feature_evidence(ctx, _feature_consumers(ctx), args.feature_evidence)
        elif args.explorer: result = _explorer_graph(ctx)
        else: result = _issues(ctx, args.for_entity)
        output = json.dumps(result, sort_keys=True, ensure_ascii=False, allow_nan=False, indent=2)
    except (Invalid, HTTPException) as exc:
        detail = exc.detail if isinstance(exc, HTTPException) else str(exc)
        print(f"Knowledge pilot ({LIBRARY_PATH}): {detail}", file=sys.stderr)
        return 1
    print(output)
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(main())
