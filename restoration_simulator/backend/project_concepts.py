"""Explicit project proposals and reviewed synchronisation, outside simulation."""
from copy import deepcopy
from pathlib import Path
from uuid import UUID, uuid4

from .configuration import keys, read_json
from .engine import require
from .funding import checked, digest

GUIDE = Path(__file__).resolve().parents[1] / "scenarios" / "funding-project-concept-v1.json"
ROUTES = {"LEADER-AL20-3.4", "LEADER-AL20-3.5"}
ACTIVITY_FIELDS = {"title", "description", "outcome", "responsible", "timing", "evidence", "reference"}
EDIT_FIELDS = {"title", "purpose", "objectives", "justifications", "notes"}


def identity(value):
    require(isinstance(value, str) and str(UUID(value)) == value, "Invalid project concept/activity identity.")


@checked
def validate_guide(data):
    keys(data, {"version", "id", "checked_on", "defaults", "limits", "ui", "publications", "sources", "bindings", "templates", "core_suggestions"}, "project concept guide")
    require(type(data["version"]) is int and data["version"] == 1 and data["id"] == "al20-project-concept-v1", "Unsupported project concept guide.")
    from datetime import date
    date.fromisoformat(data["checked_on"])
    keys(data["defaults"], {"title", "purpose", "notes", "activity"}, "concept defaults")
    keys(data["defaults"]["activity"], ACTIVITY_FIELDS, "manual activity defaults")
    keys(data["limits"], {"activities", "short_text", "long_text"}, "concept limits")
    require(all(type(v) is int and v > 0 for v in data["limits"].values()), "Invalid project concept limits.")
    keys(data["ui"], {"preview_delay_ms", "autosave_delay_ms"}, "concept UI settings")
    require(all(type(v) is int and v > 0 for v in data["ui"].values()), "Missing concept UI settings.")
    require(all(isinstance(data["defaults"][k], str) for k in ["title", "purpose", "notes"]) and data["defaults"]["title"].strip(), "Missing concept defaults.")
    require(all(isinstance(v, str) for v in data["defaults"]["activity"].values()) and data["defaults"]["activity"]["title"].strip(), "Missing manual activity defaults.")
    from .funding_selection import source
    from .documents import catalogue
    records = {r["id"]: r for r in catalogue()["documents"]}
    require(isinstance(data["publications"], dict) and data["publications"], "Missing concept publication metadata.")
    for ident, publication in data["publications"].items():
        require(ident in records and publication["sha256"] == records[ident]["sha256"] and isinstance(publication["download_url"], str) and publication["download_url"].startswith("https://"), "Invalid concept publication edition/download.")
    require(isinstance(data["sources"], dict) and data["sources"], "Concept sources are missing.")
    for sid, ref in data["sources"].items():
        require(isinstance(sid, str) and sid.strip(), "Missing concept source identity.")
        source(ref)
        require(ref["document_id"] in records, "Unknown concept source document.")
        d = records[ref["document_id"]]
        require(ref["sha256"] == d["sha256"] and ref["page"] <= d["pages"] and all(isinstance(ref[k], str) and ref[k].strip() for k in ["label", "role"]), "Invalid concept source edition or description: " + sid)
    def refs(value):
        require(isinstance(value, list) and value and all(isinstance(s, str) for s in value) and len(set(value)) == len(value) and set(value) <= set(data["sources"]), "Missing or unknown concept source.")
    require(isinstance(data["templates"], dict) and data["templates"], "Activity starters are missing.")
    for tid, template in data["templates"].items():
        keys(template, {"routes", "title", "description", "outcome", "sources"}, "activity starter " + tid)
        require(isinstance(tid, str) and tid.strip() and isinstance(template["routes"], list) and template["routes"] and len(set(template["routes"])) == len(template["routes"]) and set(template["routes"]) <= ROUTES, "Invalid starter route/identity.")
        require(all(isinstance(template[k], str) and template[k].strip() for k in ["title", "description"] ) and isinstance(template["outcome"], str), "Incomplete activity starter.")
        refs(template["sources"])
    from . import funding
    c = funding.catalogue()
    expected = {x["id"] for g in c["selection"]["profiles"]["line3"]["criteria"] for x in g["choices"]} | {"NPL" + str(i) for i in range(1, 51)}
    keys(data["bindings"], expected, "concept need and subcriterion bindings")
    for bid, binding in data["bindings"].items():
        keys(binding, {"label", "kind", "template_ids", "explanation", "sources", "confirmation"}, "concept binding " + bid)
        require(binding["kind"] in {"starter", "evidence_only", "manual"} and all(isinstance(binding[k], str) and binding[k].strip() for k in ["label", "explanation"]), "Missing concept binding classification.")
        require(isinstance(binding["template_ids"], list) and len(set(binding["template_ids"])) == len(binding["template_ids"]) and set(binding["template_ids"]) <= set(data["templates"]), "Unknown/repeated activity starter.")
        require((binding["kind"] == "starter") == bool(binding["template_ids"]), "A binding needs an explicit starter or evidence/manual instruction.")
        for route in ROUTES:
            require(binding["kind"] != "starter" or any(route in data["templates"][t]["routes"] for t in binding["template_ids"]), "A starter binding has no recommendation for this route.")
        require(binding["confirmation"] is None or isinstance(binding["confirmation"], str) and binding["confirmation"].strip(), "Invalid AL20 confirmation question.")
        refs(binding["sources"])
    require(data["core_suggestions"] == ["NPL3", "NPL4", "NPL8"], "Missing explicit core restoration suggestions.")
    return data


def guide():
    return validate_guide(read_json(GUIDE))


def describe():
    data = guide()
    return {"version": 1, "library": data, "library_hash": digest(data)}


@checked
def validate(concept, project=None):
    keys(concept, {"version", "id", "route", "guide_id", "guide_hash", "title", "purpose", "objectives", "activities", "justifications", "notes"} | ({"delivery_plan"} if "delivery_plan" in concept else set()), "project concept")
    require(type(concept["version"]) is int and concept["version"] == 1 and concept["route"] in ROUTES, "Unsupported project concept version/route.")
    identity(concept["id"])
    data = guide()
    require(concept["guide_id"] == data["id"] and concept["guide_hash"] == digest(data), "This concept needs its retained starter-library edition. Restore that edition; do not replace the saved concept.")
    for key in ["title", "purpose", "notes"]:
        require(isinstance(concept[key], str) and len(concept[key]) <= data["limits"]["long_text"], "Invalid concept " + key)
    require(concept["title"].strip(), "Enter a project concept title.")
    def bindings(value, objectives=False):
        require(isinstance(value, list) and all(isinstance(v, str) for v in value) and len(set(value)) == len(value) and set(value) <= set(data["bindings"]), "Unknown or repeated concept need/criterion link.")
        require(not objectives or all(v.startswith("NPL") for v in value), "Objectives must identify prioritised needs.")
    bindings(concept["objectives"], True)
    require(isinstance(concept["justifications"], dict) and set(concept["justifications"]) <= set(data["bindings"]) and all(isinstance(v, str) and len(v) <= data["limits"]["long_text"] for v in concept["justifications"].values()), "Invalid concept justifications.")
    require(isinstance(concept["activities"], list) and len(concept["activities"]) <= data["limits"]["activities"], "Too many or missing project activities.")
    ids = set()
    for activity in concept["activities"]:
        keys(activity, ACTIVITY_FIELDS | {"id", "template_id", "bindings"}, "project activity")
        identity(activity["id"])
        require(activity["id"] not in ids, "Duplicate project activity identity.")
        ids.add(activity["id"])
        require(activity["template_id"] is None or activity["template_id"] in data["templates"] and concept["route"] in data["templates"][activity["template_id"]]["routes"], "Unknown or inapplicable activity starter.")
        for field in ACTIVITY_FIELDS:
            require(isinstance(activity[field], str) and len(activity[field]) <= data["limits"]["long_text"], "Invalid activity " + field)
        require(activity["title"].strip() and len(activity["title"]) <= data["limits"]["short_text"], "Enter an activity title within the configured limit.")
        bindings(activity["bindings"])
    if "delivery_plan" in concept:
        from .delivery_plans import validate as validate_delivery
        validate_delivery(concept["delivery_plan"], concept)
    return concept


def new(draft, route):
    require(draft["version"] == 4 and route in ROUTES, "Project concepts are available for structured AL20 routes 3.4 and 3.5.")
    data = guide()
    return {"version": 1, "id": str(uuid4()), "route": route, "guide_id": data["id"], "guide_hash": digest(data), "title": data["defaults"]["title"], "purpose": data["defaults"]["purpose"], "notes": data["defaults"]["notes"], "objectives": [n for n in references(draft, route) if n.startswith("NPL")], "activities": [], "justifications": {}}


def references(draft, route):
    refs = set()
    for row in draft["selection_assessments"][route]["criteria"].values():
        if "edl_evidence" in row:
            for selected in row["edl_evidence"]["selections"].values(): refs.update(selected)
    return sorted(refs)


def source_context(draft, route):
    from . import funding
    applicant = funding.resolved_applicant(draft)
    label = funding.applicant_label(applicant, draft) if applicant["kind"] == "recorded" else "Not entered" if applicant["kind"] == "unknown" or applicant["legal_form"] is None else funding.legal_forms(draft)[applicant["legal_form"]]
    return {"project_id": draft["baseline"]["project_id"], "activity_key": draft["activity_key"], "baseline": deepcopy(draft["baseline"]), "applicant": label, "municipality": funding.effective(draft)["municipality"],
            "scoring": {"selection": deepcopy(draft["bundle"]["selection"]), "rules": {r: {"minimum_score": v["minimum_score"]} for r, v in draft["bundle"]["rules"].items()}, "answers": deepcopy(draft["selection_assessments"]), "catalogue_hash": digest(draft["bundle"])}}


@checked
def validate_source(source, project):
    keys(source, {"project_id", "activity_key", "baseline", "applicant", "municipality", "scoring"}, "concept source context")
    require(source["project_id"] == project["id"] and isinstance(source["activity_key"], str) and source["activity_key"] and isinstance(source["applicant"], str) and (source["municipality"] is None or isinstance(source["municipality"], str)), "Concept source belongs to a different project or has invalid context.")
    b = source["baseline"]
    keys(b, {"project_id", "project_revision", "facts", "parties", "target", "parcel_ids", "work_budget"}, "concept recorded baseline")
    require(type(b["project_revision"]) is int and b["project_revision"] >= 0 and b["target"] in {"activity", "demonstrator", "business"} and isinstance(b["facts"], dict) and isinstance(b["parties"], list) and all(isinstance(p, dict) and all(isinstance(p[k], str) and p[k] for k in ["id", "name", "kind"]) for p in b["parties"]), "Invalid recorded concept site/applicant context.")
    require(b["project_id"] == project["id"] and isinstance(b["parcel_ids"], list) and all(isinstance(p, str) for p in b["parcel_ids"]) and len(set(b["parcel_ids"])) == len(b["parcel_ids"]) and set(b["parcel_ids"]) <= {p["id"] for p in project["parcels"]}, "Concept source refers to a missing parcel. Unlink it explicitly before removing its site.")
    proof = source["scoring"]
    keys(proof, {"selection", "rules", "answers", "catalogue_hash"}, "concept scoring snapshot")
    from . import funding_selection
    bundle = {"selection": proof["selection"], "rules": proof["rules"]}
    funding_selection.validate_rules(proof["selection"], bundle)
    funding_selection.validate_answers(proof["answers"], bundle)
    for row in proof["rules"].values():
        keys(row, {"minimum_score"}, "concept score threshold")
        require(type(row["minimum_score"]) in (int, float) and 0 <= row["minimum_score"] <= 100, "Invalid concept score threshold.")
    require(isinstance(proof["catalogue_hash"], str) and len(proof["catalogue_hash"]) == 64 and all(c in "0123456789abcdef" for c in proof["catalogue_hash"]), "Missing concept scoring provenance.")
    return source


def validate_collection(value, project):
    require(isinstance(value, dict), "Project concepts must be an object keyed by route.")
    require(set(value) <= ROUTES, "Unsupported project concept route.")
    for route, concept in value.items():
        validate(concept, project)
        require(concept["route"] == route, "Project concept route does not match its saved key.")


def validate_planning(value, project):
    require(isinstance(value, list), "Planning project concepts must be a list.")
    ids = set()
    for record in value:
        keys(record, {"concept", "baseline", "source"}, "planning concept link")
        validate(record["concept"], project)
        validate(record["baseline"], project)
        require(record["concept"]["id"] == record["baseline"]["id"] and record["concept"]["route"] == record["baseline"]["route"] and record["concept"]["id"] not in ids, "Invalid or duplicate planning concept link.")
        ids.add(record["concept"]["id"])
        validate_source(record["source"], project)


def report(concept, source, project):
    validate(concept, project)
    validate_source(source, project)
    data = guide()
    from .funding_selection import calculate
    proof = source["scoring"]
    score = calculate({"selection": proof["selection"], "rules": proof["rules"]}, proof["answers"], concept["route"])
    selected = [s for c in score["criteria"] for s in c["selected"]]
    supporting = references({"selection_assessments": proof["answers"]}, concept["route"])
    gaps = []
    delivery_lines, delivery_refs = [], []
    if "delivery_plan" in concept:
        from .delivery_plans import review as review_delivery
        delivery_gaps, delivery_lines, delivery_refs = review_delivery(concept["delivery_plan"], concept)
        gaps.extend(delivery_gaps)
    else:
        gaps.append("Create or adopt the monitoring, participation and sharing plan.")
    if not concept["purpose"].strip(): gaps.append("Define the project purpose.")
    if not concept["activities"]: gaps.append("Include at least one proposed project activity.")
    for bid in list(dict.fromkeys(concept["objectives"] + selected)):
        binding = data["bindings"][bid]
        linked = any(bid in a["bindings"] for a in concept["activities"])
        justified = bid in concept["justifications"] and bool(concept["justifications"][bid].strip())
        if not linked and not justified: gaps.append(bid + ": add an activity or justification (" + binding["kind"].replace("_", " ") + ").")
        if binding["confirmation"] is not None: gaps.append(bid + ": " + binding["confirmation"])
    for activity in concept["activities"]:
        for field in ["description", "outcome", "responsible", "timing", "evidence"]:
            if not activity[field].strip(): gaps.append(activity["title"] + ": define " + field + ".")
        for bid in activity["bindings"]:
            if bid.startswith("NPL") and bid not in concept["objectives"] or not bid.startswith("NPL") and bid not in selected:
                gaps.append(activity["title"] + ": " + bid + " is not a current objective/selected scoring claim. Review the link explicitly.")
    needs = list(dict.fromkeys(concept["objectives"] + [n for n in supporting if n.startswith("NPL")]))
    binding_ids = list(dict.fromkeys(needs + selected + [b for a in concept["activities"] for b in a["bindings"]]))
    source_ids = list(dict.fromkeys([s for b in binding_ids for s in data["bindings"][b]["sources"]] + [s for a in concept["activities"] if a["template_id"] is not None for s in data["templates"][a["template_id"]]["sources"]]))
    citations = list({(r["document_id"], r["page"], r["sha256"], r["label"], r["role"]): r for r in [data["sources"][s] for s in source_ids] + delivery_refs}.values())
    lines = ["# " + concept["title"], "", "Project concept for funding exploration.", "", "## Purpose", concept["purpose"] if concept["purpose"].strip() else "Not defined.", "", "## Context", "Route: " + concept["route"], "Applicant: " + source["applicant"], "Municipality: " + (source["municipality"] if source["municipality"] is not None else "Unknown"), "Recorded site links: " + (", ".join(source["baseline"]["parcel_ids"]) if source["baseline"]["parcel_ids"] else "Not assigned"), "", "## Objectives"]
    lines += ["- " + n + " · " + data["bindings"][n]["label"] for n in concept["objectives"]]
    if not concept["objectives"]: lines.append("No objectives included yet.")
    lines += ["", "## Proposed activities"]
    for a in concept["activities"]:
        lines += ["", "### " + a["title"]]
        for field, label in [("description", "Activity"), ("outcome", "Intended outcome"), ("responsible", "Responsible"), ("timing", "Timing"), ("evidence", "Evidence plan"), ("reference", "Supporting reference")]:
            lines.append(label + ": " + (a[field] if a[field].strip() else "Not defined"))
        lines.append("Links: " + (", ".join(a["bindings"]) if a["bindings"] else "Not linked"))
    if not concept["activities"]: lines.append("No activities included yet.")
    lines += delivery_lines
    from .funding_overview import scoring as scoring_overview
    lines += ["", scoring_overview({"selection": proof["selection"], "rules": proof["rules"]}, proof["answers"], concept["route"], concept)["markdown"]]
    lines += ["", "## Supporting notes and explanations"]
    lines += ["- " + bid + ": " + text for bid, text in concept["justifications"].items()]
    for cid, row in proof["answers"][concept["route"]]["criteria"].items():
        if row["notes"] or row["reference"]: lines.append("- Shared " + cid + " context: " + row["notes"] + " Reference: " + row["reference"])
        if "choice_context" in row:
            for bid, note in row["choice_context"]["items"].items():
                if note["notes"] or note["reference"]: lines.append("- " + bid + ": " + note["notes"] + " Reference: " + note["reference"])
    lines += ["", "## Questions and remaining detail"] + ["- " + g for g in gaps]
    lines += ["", "## Context and notes", concept["notes"] if concept["notes"].strip() else "No additional notes recorded.", "Physical design, quantities, budget, legal eligibility and application evidence require separate review.", "", "## Sources"]
    for ref in citations:
        require(ref["document_id"] in data["publications"], "A concept source has no configured official download.")
        url = data["publications"][ref["document_id"]]["download_url"]
        lines.append(f"- [{ref['label']}]({url}#page={ref['page']}) — edition SHA-256 {ref['sha256']}")
    return {"version": 1, "concept": deepcopy(concept), "context": deepcopy(source), "score": score, "selected_claims": selected, "supporting_references": supporting, "gaps": gaps, "sources": citations, "markdown": "\n".join(lines) + "\n"}


def planning_record(planning, concept_id):
    require(planning is not None and "project_concepts" in planning, "No transferred project concept exists. Transfer it after review first.")
    matches = [r for r in planning["project_concepts"] if r["concept"]["id"] == concept_id]
    require(len(matches) == 1, "The transferred concept is missing. Retain local edits and review its origin.")
    return matches[0]


def active_concept(funding, concept_id):
    require(funding is not None and funding["draft"] is not None and "project_concepts" in funding["draft"], "Load the funding exploration containing this concept before synchronising.")
    draft = funding["draft"]
    matches = [c for c in draft["project_concepts"].values() if c["id"] == concept_id]
    require(len(matches) == 1, "Load the funding exploration containing this concept before synchronising; no other concept was substituted.")
    return draft, matches[0]


def merge(base, navigator, demonstrator):
    """Three-way field merge, preserving stable identities and explicit deletions."""
    fields = []
    def propose(path, b, n, d):
        removal = b is not None and (n is None or d is None)
        if path == ["objectives"] or path[-1] == "activity_ids":
            removal = bool(set(b) - set(n) or set(b) - set(d))
        conflict = n != d and (n != b and d != b or removal)
        choice = None if conflict else "navigator" if d == b or n == d else "demonstrator"
        fields.append({"path": path, "baseline": deepcopy(b), "navigator": deepcopy(n), "demonstrator": deepcopy(d), "conflict": conflict, "suggested": choice})
    for field in sorted(EDIT_FIELDS):
        if field == "justifications":
            for bid in sorted(set(base[field]) | set(navigator[field]) | set(demonstrator[field])):
                propose([field, bid], base[field][bid] if bid in base[field] else None, navigator[field][bid] if bid in navigator[field] else None, demonstrator[field][bid] if bid in demonstrator[field] else None)
        else: propose([field], base[field], navigator[field], demonstrator[field])
    bplan = base["delivery_plan"] if "delivery_plan" in base else None
    nplan = navigator["delivery_plan"] if "delivery_plan" in navigator else None
    dplan = demonstrator["delivery_plan"] if "delivery_plan" in demonstrator else None
    if bplan is None or nplan is None or dplan is None:
        propose(["delivery_plan"], bplan, nplan, dplan)
    else:
        require(bplan["library_hash"] == nplan["library_hash"] == dplan["library_hash"], "Delivery library editions differ. Review an explicit library update first.")
        propose(["delivery_plan", "legacy_source"], bplan["legacy_source"], nplan["legacy_source"], dplan["legacy_source"])
        for tid in bplan["topics"]:
            for field in bplan["topics"][tid]:
                propose(["delivery_plan", tid, field], bplan["topics"][tid][field], nplan["topics"][tid][field], dplan["topics"][tid][field])
    bacts = {a["id"]: a for a in base["activities"]}
    nacts = {a["id"]: a for a in navigator["activities"]}
    dacts = {a["id"]: a for a in demonstrator["activities"]}
    order = list(dict.fromkeys([a["id"] for a in navigator["activities"] + demonstrator["activities"] + base["activities"]]))
    for aid in order:
        b = bacts[aid] if aid in bacts else None
        n = nacts[aid] if aid in nacts else None
        d = dacts[aid] if aid in dacts else None
        if n is None or d is None or b is None:
            propose(["activities", aid], b, n, d)
        else:
            for field in sorted(ACTIVITY_FIELDS | {"bindings", "template_id"}): propose(["activities", aid, field], b[field], n[field], d[field])
    return fields


def transfer_preview(state, concept_id):
    draft, nav = active_concept(state["funding"], concept_id)
    validate(nav, state["project"])
    records = [] if state["planning"] is None or "project_concepts" not in state["planning"] else state["planning"]["project_concepts"]
    matching = [r for r in records if r["concept"]["id"] == concept_id]
    source = source_context(draft, nav["route"])
    if matching:
        record = matching[0]
        require(record["source"]["activity_key"] == draft["activity_key"] and record["concept"]["route"] == nav["route"], "This concept belongs to a different funding activity. Explicitly copy it instead of replacing its identity.")
        fields = merge(record["baseline"], nav, record["concept"])
    else:
        fields = [{"path": ["initial_transfer"], "baseline": None, "navigator": deepcopy(nav), "demonstrator": None, "conflict": False, "suggested": "navigator"}]
    result = {"version": 1, "concept_id": concept_id, "route": nav["route"], "first_transfer": not matching, "fields": fields, "source": source, "notice": "Confirming synchronises both linked concept copies. It does not change scoring answers, planting, prices, financing or simulation history."}
    result["preview_hash"] = digest([result, state["revision"], state["funding_revision"], state["planning_revision"]])
    return result


def resolve_transfer(state, concept_id, expected_hash, resolutions):
    preview = transfer_preview(state, concept_id)
    require(preview["preview_hash"] == expected_hash, "Concepts or context changed. Review the transfer again; both copies are retained.")
    require(isinstance(resolutions, dict) and set(resolutions) <= {str(i) for i in range(len(preview["fields"]))}, "Unknown transfer resolution.")
    draft, original = active_concept(state["funding"], concept_id)
    merged = deepcopy(original)
    activities = {a["id"]: deepcopy(a) for a in merged["activities"]}
    for index, field in enumerate(preview["fields"]):
        key = str(index)
        selected = resolutions[key] if key in resolutions else field["suggested"]
        require(selected in {"navigator", "demonstrator"}, "Resolve every conflicting change, including removals, before confirmation.")
        value = deepcopy(field[selected])
        path = field["path"]
        if path == ["initial_transfer"]:
            require(value is not None, "Initial transfer must include the Navigator concept.")
            merged = value
            activities = {a["id"]: deepcopy(a) for a in merged["activities"]}
        elif path[0] == "delivery_plan":
            if len(path) == 1:
                if value is None:
                    if "delivery_plan" in merged: del merged["delivery_plan"]
                else: merged["delivery_plan"] = value
            elif len(path) == 2: merged["delivery_plan"][path[1]] = value
            else: merged["delivery_plan"]["topics"][path[1]][path[2]] = value
        elif path[0] == "activities":
            aid = path[1]
            if len(path) == 2:
                if value is None:
                    if aid in activities: del activities[aid]
                else: activities[aid] = value
            else:
                require(aid in activities, "Transfer resolution refers to a removed activity.")
                activities[aid][path[2]] = value
        elif path[0] == "justifications":
            if value is None:
                if path[1] in merged["justifications"]: del merged["justifications"][path[1]]
            else: merged["justifications"][path[1]] = value
        else: merged[path[0]] = value
    merged["activities"] = list(activities.values())
    validate(merged, state["project"])
    funding = deepcopy(state["funding"])
    funding["draft"]["project_concepts"][merged["route"]] = deepcopy(merged)
    from .planning_draft import initial
    planning = initial(state["project"]) if state["planning"] is None else deepcopy(state["planning"])
    if "project_concepts" not in planning: planning["project_concepts"] = []  # Explicit first transfer creates this optional collection.
    record = {"concept": deepcopy(merged), "baseline": deepcopy(merged), "source": preview["source"]}
    existing = [i for i, r in enumerate(planning["project_concepts"]) if r["concept"]["id"] == concept_id]
    if existing: planning["project_concepts"][existing[0]] = record
    else: planning["project_concepts"].append(record)
    return funding, planning


def ensure_sources_retained(funding, planning):
    if planning is None or "project_concepts" not in planning: return
    available = set()
    if funding is not None:
        drafts = ([funding["draft"]] if funding["draft"] is not None else []) + [r["draft"] for r in funding["scenarios"] + funding["plans"]]
        for draft in drafts:
            if "project_concepts" in draft: available.update(c["id"] for c in draft["project_concepts"].values())
    missing = [r["concept"] for r in planning["project_concepts"] if r["concept"]["id"] not in available]
    require(not missing, "This would remove the last funding source of transferred concepts: " + "; ".join(c["title"] + " (" + c["route"] + ", " + c["id"] + ")" for c in missing) + ". Explicitly unlink these demonstrator copies before removing the source.")


def guard_parcel_removal(state, removed):
    affected = []
    if state["funding"] is not None:
        drafts = ([state["funding"]["draft"]] if state["funding"]["draft"] is not None else []) + [r["draft"] for r in state["funding"]["scenarios"] + state["funding"]["plans"]]
        for draft in drafts:
            if "project_concepts" in draft and draft["project_concepts"] and set(draft["baseline"]["parcel_ids"]) & set(removed): affected.extend(c["title"] for c in draft["project_concepts"].values())
    if state["planning"] is not None and "project_concepts" in state["planning"]:
        for record in state["planning"]["project_concepts"]:
            if set(record["source"]["baseline"]["parcel_ids"]) & set(removed) or state["planning"]["inputs"]["parcel_id"] in removed: affected.append(record["concept"]["title"])
    if state["planning"] is not None and "applied_delivery_plan" in state["planning"] and state["planning"]["applied_delivery_plan"]["execution_inputs"]["parcel_id"] in removed:
        affected.append("applied delivery snapshot " + state["planning"]["applied_delivery_plan"]["concept_id"] + " (detach its tracking link first)")
    require(not affected, "Parcel removal affects project concepts: " + ", ".join(sorted(set(affected))) + ". Review and explicitly unlink/remove these concepts first; nothing was deleted.")


def guard_parcel_edit(state, deleted):
    from .parcel_removal import rebuild
    _, _, _, maps = rebuild(state["project"], deleted, with_mapping=True)
    affected = {p["id"] for p in state["project"]["parcels"] if p["id"] not in maps["parcel_id"] or maps["parcel_id"][p["id"]] != p["id"]}
    guard_parcel_removal(state, affected)
