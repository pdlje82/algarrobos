"""Reviewed project delivery intentions and explicit legacy-execution adaptation."""
from copy import deepcopy
from pathlib import Path
from .configuration import keys, read_json
from .engine import require, same_json
from .funding import checked, digest

LIBRARY = Path(__file__).resolve().parents[1] / "scenarios" / "funding-delivery-plan-v1.json"
TOPICS = {"comparison", "novelty", "monitoring", "participation", "sharing", "publication"}


@checked
def validate_library(data):
    keys(data, {"version", "id", "checked_on", "routes", "topics", "defaults", "sources", "legacy_fields", "monitoring_legacy", "execution_mappings", "execution_financing", "minimum_publication_years"}, "delivery-plan library")
    require(type(data["version"]) is int and data["version"] == 1 and data["id"] == "al20-delivery-plan-v1", "Unsupported delivery-plan library.")
    from datetime import date
    date.fromisoformat(data["checked_on"])
    require(data["routes"] == ["LEADER-AL20-3.4", "LEADER-AL20-3.5"], "Missing delivery-plan routes.")
    keys(data["topics"], TOPICS, "delivery topics")
    keys(data["defaults"], {"topics"}, "delivery defaults")
    keys(data["defaults"]["topics"], TOPICS, "delivery topic defaults")
    keys(data["legacy_fields"], TOPICS, "delivery legacy bindings")
    keys(data["monitoring_legacy"], {"photo_cover", "photo_survival", "infiltration"}, "monitoring adapter")
    keys(data["execution_mappings"], TOPICS - {"monitoring"}, "execution adapter")
    require(data["execution_financing"] == ["self", "partner"] and type(data["minimum_publication_years"]) is int and data["minimum_publication_years"] == 3, "Invalid delivery financing/publication configuration.")
    from .documents import catalogue
    documents = {r["id"]: r for r in catalogue()["documents"]}
    from .funding_selection import source
    require(isinstance(data["sources"], dict) and data["sources"], "Missing delivery sources.")
    for ref in data["sources"].values():
        source(ref)
        require(ref["document_id"] in documents and ref["sha256"] == documents[ref["document_id"]]["sha256"] and ref["page"] <= documents[ref["document_id"]]["pages"], "Invalid delivery source edition/page.")
    for tid, topic in data["topics"].items():
        keys(topic, {"label", "kind", "routes", "options", "explanation", "sources", "extra_fields"}, "delivery topic " + tid)
        require(topic["kind"] in {"single", "multiple"} and isinstance(topic["label"], str) and topic["label"].strip() and isinstance(topic["explanation"], str) and topic["explanation"].strip(), "Incomplete delivery topic.")
        require(isinstance(topic["routes"], list) and topic["routes"] and set(topic["routes"]) <= set(data["routes"]), "Invalid delivery route binding.")
        require(isinstance(topic["sources"], list) and topic["sources"] and set(topic["sources"]) <= set(data["sources"]), "Missing delivery topic sources.")
        require(isinstance(topic["extra_fields"], list) and len(set(topic["extra_fields"])) == len(topic["extra_fields"]) and set(topic["extra_fields"]) == ({"outputs", "responsible", "location"} if tid == "sharing" else set()), "Unsupported delivery detail fields.")
        require(isinstance(topic["options"], list) and topic["options"] and len({o["id"] for o in topic["options"]}) == len(topic["options"]), "Missing/repeated delivery options.")
        for option in topic["options"]:
            keys(option, {"id", "label", "routes"}, "delivery option")
            require(all(isinstance(option[k], str) and option[k].strip() for k in ["id", "label"]) and isinstance(option["routes"], list) and option["routes"] and set(option["routes"]) <= set(topic["routes"]), "Invalid delivery option.")
        default = data["defaults"]["topics"][tid]
        keys(default, {"answer", "reviewed", "explanation", "reference", "activity_ids"} | set(topic["extra_fields"]), "delivery topic default")
        require(default["answer"] == ([] if topic["kind"] == "multiple" else None) and default["reviewed"] is False and default["activity_ids"] == [] and all(default[k] == "" for k in ["explanation", "reference"] + topic["extra_fields"]), "New delivery plans must start unresolved.")
        if tid != "monitoring":
            require(isinstance(data["execution_mappings"][tid], dict) and set(data["execution_mappings"][tid]) <= {o["id"] for o in topic["options"]} and all(isinstance(v, str) and v for v in data["execution_mappings"][tid].values()), "Invalid execution mapping.")
    methods = {o["id"] for o in data["topics"]["monitoring"]["options"]}
    require(all(isinstance(v, list) and v and len(set(v)) == len(v) and set(v) <= methods for v in data["monitoring_legacy"].values()), "Invalid legacy monitoring interpretation.")
    require(set(data["legacy_fields"].values()) == {"design", "novelty", "baseline_method", "public_participation", "dissemination", "publication_period"}, "Missing execution-field bindings.")
    return data


def library():
    return validate_library(read_json(LIBRARY))


def describe():
    data = library()
    return {"version": 1, "library": data, "library_hash": digest(data)}


@checked
def validate(plan, concept):
    data = library()
    keys(plan, {"version", "library_id", "library_hash", "topics", "legacy_source"}, "delivery plan")
    require(type(plan["version"]) is int and plan["version"] == 1 and plan["library_id"] == data["id"] and plan["library_hash"] == digest(data), "Unsupported delivery plan or unavailable library edition. Restore its version; your plan is retained.")
    keys(plan["topics"], TOPICS, "delivery-plan topics")
    if plan["legacy_source"] is not None:
        keys(plan["legacy_source"], set(data["legacy_fields"].values()), "retained execution values")
        require(all(isinstance(v, str) and len(v) <= 300 for v in plan["legacy_source"].values()), "Invalid retained execution values.")
    activities = {a["id"] for a in concept["activities"]}
    for tid, topic in data["topics"].items():
        value = plan["topics"][tid]
        keys(value, {"answer", "reviewed", "explanation", "reference", "activity_ids"} | set(topic["extra_fields"]), "delivery topic " + tid)
        allowed = {o["id"] for o in topic["options"] if concept["route"] in o["routes"]}
        if topic["kind"] == "multiple":
            require(isinstance(value["answer"], list) and all(isinstance(v, str) for v in value["answer"]) and len(set(value["answer"])) == len(value["answer"]) and set(value["answer"]) <= allowed, "Invalid monitoring methods.")
        else:
            require(value["answer"] is None or isinstance(value["answer"], str) and value["answer"] in allowed, "Invalid or inapplicable delivery answer: " + tid)
        require(type(value["reviewed"]) is bool and all(isinstance(value[k], str) and len(value[k]) <= 10000 for k in ["explanation", "reference"] + topic["extra_fields"]), "Invalid delivery review/details.")
        require(isinstance(value["activity_ids"], list) and all(isinstance(v, str) for v in value["activity_ids"]) and len(set(value["activity_ids"])) == len(value["activity_ids"]) and set(value["activity_ids"]) <= activities, "Delivery plan links to a removed activity. Explicitly resolve these links before removal.")
        if concept["route"] not in topic["routes"]:
            require(value["answer"] is None and not value["reviewed"] and not value["activity_ids"], "Inactive route requirements cannot be asserted.")
    return plan


def new(concept):
    data = library()
    return {"version": 1, "library_id": data["id"], "library_hash": digest(data), "topics": deepcopy(data["defaults"]["topics"]), "legacy_source": None}


def prepare(state, concept, import_execution):
    require(type(import_execution) is bool, "Choose explicitly whether to import execution values.")
    plan = new(concept)
    if not import_execution:
        return {"version": 1, "plan": plan, "retained_settings": None, "origin": "unresolved", "notice": "New topics are unresolved. No execution settings or activities changed."}
    from .planning_draft import initial
    if state["planning"] is not None:
        inputs, origin = state["planning"]["inputs"], "saved_execution"
    elif state["project"]["demonstrator"] is not None:
        require(not state["project"]["demonstrator"]["legacy"], "Review this legacy demonstrator separately before importing its settings.")
        inputs, origin = state["project"]["demonstrator"]["plan"], "committed_execution"
    else:
        inputs, origin = initial(state["project"])["inputs"], "scenario_defaults"
    data = library()
    retained = {name: inputs[name] for name in data["legacy_fields"].values()}
    plan["legacy_source"] = deepcopy(retained)
    for tid, name in data["legacy_fields"].items():
        if concept["route"] not in data["topics"][tid]["routes"]: continue
        value = retained[name]
        target = plan["topics"][tid]
        if tid == "monitoring" and value in data["monitoring_legacy"]:
            target["answer"] = deepcopy(data["monitoring_legacy"][value])
        elif value in {o["id"] for o in data["topics"][tid]["options"] if concept["route"] in o["routes"]}:
            target["answer"] = value
        elif value != "unknown":
            target["answer"] = ["custom"] if tid == "monitoring" else "custom"
            target["explanation"] = "Retained execution value requiring review: " + value
    validate(plan, concept)
    return {"version": 1, "plan": plan, "retained_settings": retained, "origin": origin, "notice": "The six original settings are retained. Review their mapping to delivery choices below. Route-3.4-only settings remain source context for 3.5."}


def review(plan, concept):
    validate(plan, concept)
    data, gaps, lines, refs = library(), [], ["", "## Monitoring, participation and sharing"], []
    for tid, topic in data["topics"].items():
        if concept["route"] not in topic["routes"]: continue
        value = plan["topics"][tid]
        defined = value["answer"] is not None and value["answer"] != []
        optional = tid == "comparison" and concept["route"].endswith("3.5") and not defined
        if not optional and not defined: gaps.append("Delivery plan: define " + topic["label"] + ".")
        if defined and not value["activity_ids"] and not value["explanation"].strip(): gaps.append(topic["label"] + ": link activities or explain the planned arrangements.")
        answers = value["answer"] if isinstance(value["answer"], list) else [value["answer"]]
        if "custom" in answers and not value["explanation"].strip(): gaps.append(topic["label"] + ": explain the custom method/arrangement.")
        labels = {o["id"]: o["label"] for o in topic["options"]}
        description = ", ".join(labels[a] for a in answers if a is not None) if defined else "Not defined" + (" (optional for 3.5)" if optional else "")
        lines += ["", "### " + topic["label"], description, "Explanation: " + (value["explanation"] if value["explanation"].strip() else "Not defined"), "Reference: " + (value["reference"] if value["reference"].strip() else "Not defined")]
        names = {a["id"]: a["title"] for a in concept["activities"]}
        lines.append("Activities: " + (", ".join(names[a] for a in value["activity_ids"]) if value["activity_ids"] else "Not linked"))
        for key in topic["extra_fields"]:
            if not value[key].strip(): gaps.append("Results sharing: define " + key + ".")
            lines.append(key.capitalize() + ": " + (value[key] if value[key].strip() else "Not defined"))
        refs.extend(data["sources"][sid] for sid in topic["sources"])
    lines += ["", "Execution updates require comparison and confirmation."]
    return gaps, lines, refs


@checked
def execution_preview(state, concept_id, choices):
    from .project_concepts import planning_record
    record = planning_record(state["planning"], concept_id)
    concept = record["concept"]
    require("delivery_plan" in concept, "Create and review this concept's delivery plan first.")
    plan, data = validate(concept["delivery_plan"], concept), library()
    keys(choices, {"primary_monitoring", "financing"}, "execution adaptation choices")
    require(choices["primary_monitoring"] is None or choices["primary_monitoring"] in data["monitoring_legacy"], "Choose a supported primary monitoring method.")
    require(choices["financing"] is None or choices["financing"] in data["execution_financing"], "Choose supported own/partner financing explicitly.")
    proposed, blockers, notices = deepcopy(state["planning"]["inputs"]), [], ["All monitoring intentions remain in the concept. The primary execution method only represents the existing simulator's baseline/photo-point prerequisite.", "This changes a planning draft only. Eligibility, quantities, prices and simulation history are not certified or executed."]
    for tid, topic in data["topics"].items():
        if concept["route"] not in topic["routes"]: continue
        value = plan["topics"][tid]
        if tid == "comparison" and concept["route"].endswith("3.5") and value["answer"] is None: continue
        if tid == "monitoring":
            exact = [code for code, methods in data["monitoring_legacy"].items() if set(methods) == set(value["answer"])]
            primary = choices["primary_monitoring"]
            if primary is None and len(exact) == 1: primary = exact[0]
            if primary is None: blockers.append("Choose a primary execution monitoring method; the full combination cannot fit a single legacy dropdown.")
            elif not set(data["monitoring_legacy"][primary]) <= set(value["answer"]): blockers.append("The primary execution method includes monitoring not present in the concept. Revise the plan or primary choice.")
            else: proposed[data["legacy_fields"][tid]] = primary
        elif value["answer"] is None:
            blockers.append("Define " + topic["label"] + " before execution review.")
        elif value["answer"] not in data["execution_mappings"][tid]:
            blockers.append(topic["label"] + " has no supported execution mapping. Keep the complete concept and revise this choice explicitly.")
        else:
            proposed[data["legacy_fields"][tid]] = data["execution_mappings"][tid][value["answer"]]
    if concept["route"].endswith("3.5") and proposed["funding_route"] == "al20_34" and choices["financing"] is None:
        blockers.append("A 3.5 concept cannot silently use AL20 3.4 simulator financing. Choose available own/partner funding explicitly or leave execution unchanged.")
    if choices["financing"] is not None: proposed["funding_route"] = choices["financing"]
    changes = [{"field": key, "before": state["planning"]["inputs"][key], "after": value} for key, value in proposed.items() if not same_json(value, state["planning"]["inputs"][key])]
    result = {"version": 1, "concept_id": concept_id, "route": concept["route"], "changes": changes, "proposed_inputs": proposed, "choices": deepcopy(choices), "blockers": blockers, "notices": notices, "can_apply": not blockers}
    result["preview_hash"] = digest([result, plan, state["revision"], state["funding_revision"], state["planning_revision"]])
    return result


def apply(state, concept_id, choices, preview_hash):
    preview = execution_preview(state, concept_id, choices)
    require(preview["preview_hash"] == preview_hash, "The concept or execution settings changed. Review again; your draft is retained.")
    require(preview["can_apply"], "Resolve the execution review: " + "; ".join(preview["blockers"]))
    from .project_concepts import planning_record
    result = deepcopy(state["planning"])
    record = planning_record(result, concept_id)
    for tid, topic in library()["topics"].items():
        if record["concept"]["route"] in topic["routes"]: record["concept"]["delivery_plan"]["topics"][tid]["reviewed"] = True
    result["inputs"] = preview["proposed_inputs"]
    result["applied_delivery_plan"] = {"version": 1, "concept_id": concept_id, "route": record["concept"]["route"], "delivery_plan": deepcopy(record["concept"]["delivery_plan"]), "activities": deepcopy(record["concept"]["activities"]), "execution_inputs": deepcopy(result["inputs"])}
    return result


@checked
def validate_applied(value, project):
    keys(value, {"version", "concept_id", "route", "delivery_plan", "activities", "execution_inputs"}, "applied delivery snapshot")
    require(type(value["version"]) is int and value["version"] == 1, "Unsupported applied delivery snapshot.")
    from .project_concepts import identity
    identity(value["concept_id"])
    require(value["route"] in library()["routes"] and isinstance(value["activities"], list) and all(isinstance(a, dict) and "id" in a and "title" in a for a in value["activities"]), "Invalid applied delivery activities/route.")
    from .project_concepts import guide as concept_guide, validate as validate_concept
    guide = concept_guide()
    validate_concept({"version": 1, "id": value["concept_id"], "route": value["route"], "guide_id": guide["id"], "guide_hash": digest(guide), "title": guide["defaults"]["title"], "purpose": guide["defaults"]["purpose"], "notes": guide["defaults"]["notes"], "objectives": [], "justifications": {}, "activities": value["activities"], "delivery_plan": value["delivery_plan"]}, project)
    from .planning_draft import validate as validate_planning
    validate_planning({"version": 1, "inputs": value["execution_inputs"], "source": None}, project)
