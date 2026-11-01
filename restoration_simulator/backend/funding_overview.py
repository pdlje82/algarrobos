"""Read-only overview shared by Navigator and deterministic project briefs."""
from copy import deepcopy
from .engine import require
from .funding import checked
from . import funding_selection as selection


def scoring(bundle, assessments, route, concept=None):
    score = selection.calculate(bundle, assessments, route)
    definitions = selection.profile_for(bundle, route)["criteria"]
    criteria, details, references = [], [], {}
    activities = [] if concept is None else concept["activities"]
    has_edl = any("edl_evidence" in row and any(row["edl_evidence"]["selections"].values()) for row in assessments[route]["criteria"].values())
    edl = None
    if has_edl:
        from .funding_edl import library
        edl = library()
    guidance = None
    if route in {"LEADER-AL20-3.4", "LEADER-AL20-3.5"}:
        from .funding_selection_guidance import describe
        guidance = describe()["library"]
    for definition, result in zip(definitions, score["criteria"], strict=True):
        row = assessments[route]["criteria"][definition["id"]]
        items = []
        for choice in selection.choices_for(definition, route):
            included = choice["id"] in result["selected"] if definition["method"] == "ratio" else row["answers"][choice["id"]] is True
            context = row["choice_context"]["items"][choice["id"]] if "choice_context" in row and choice["id"] in row["choice_context"]["items"] else {"notes": "", "reference": ""}
            refs = row["edl_evidence"]["selections"][choice["id"]] if "edl_evidence" in row and choice["id"] in row["edl_evidence"]["selections"] else []
            resolved_refs = []
            for rid in refs:
                item = next((i for i in edl["items"] if i["id"] == rid), None)
                require(item is not None, "An overview EDL reference is missing: " + rid)
                ref = {"id": rid, "label": item["label"], "page": item["page"], "document_id": edl["source"]["document_id"], "sha256": edl["source"]["sha256"]}
                resolved_refs.append(ref)
                references[rid] = ref
            linked = [{"id": a["id"], "title": a["title"]} for a in activities if choice["id"] in a["bindings"]]
            missing = []
            if included and not (context["reference"].strip() or row["reference"].strip()): missing.append("Add a supporting reference for " + choice["id"] + ".")
            if included and concept is not None and not linked and choice["id"] not in concept["justifications"]: missing.append("Add an activity or explanation for " + choice["id"] + ".")
            if included and guidance is not None:
                missing.extend(choice["id"] + ": " + q["text"] for q in guidance["nodes"][choice["id"]]["unresolved"])
            details.extend(missing)
            items.append({**deepcopy(choice), "selected": included, "notes": context["notes"], "reference": context["reference"], "edl": resolved_refs, "activities": linked, "details": missing})
        details.extend(result["issues"])
        criteria.append({**deepcopy(result), "label": definition["label"], "method": definition["method"], "notes": row["notes"], "reference": row["reference"],
                         "calculation_included": row["calculation_included"] if "calculation_included" in row else definition["method"] == "ratio" and any(v is not None for v in row["inputs"].values()), "items": items})
    if concept is not None:
        for activity in activities:
            for field in ["description", "outcome", "responsible", "timing", "evidence"]:
                if not activity[field].strip(): details.append(activity["title"] + ": add " + field + ".")
    lines = ["## Scoring overview", f"Score: {score['subtotal']:g} points; threshold {score['threshold']:g}."]
    if score["unresolved"]: lines.append(f"{score['unresolved']} criteria need inputs under this scoring edition.")
    for criterion in criteria:
        selected = [i for i in criterion["items"] if i["selected"]]
        if not selected and not criterion["calculation_included"]: continue
        lines += ["", "### " + criterion["id"] + " · " + criterion["label"], f"{criterion['uncapped']:g} selected points → {criterion['subtotal']:g} included; maximum {criterion['cap']:g}."]
        for item in selected:
            lines.append(f"- {item['id']} · {item['label']} ({item['points']} points)")
            if item["notes"]: lines.append("  Notes: " + item["notes"])
            if item["reference"]: lines.append("  Reference: " + item["reference"])
            if item["activities"]: lines.append("  Activities: " + ", ".join(a["title"] for a in item["activities"]))
            if item["edl"]: lines.append("  EDL: " + ", ".join(r["id"] for r in item["edl"]))
        if criterion["notes"]: lines.append("Shared notes: " + criterion["notes"])
        if criterion["reference"]: lines.append("Shared reference: " + criterion["reference"])
    if references:
        lines += ["", "## Selected EDL needs and references", "These strategy references are separate from grant-selection points."] + ["- " + r["id"] + " · " + r["label"] for r in references.values()]
    lines += ["", "## Details to add"] + (["- " + d for d in dict.fromkeys(details)] if details else ["No additional details recorded."])
    return {"score": score, "criteria": criteria, "edl": list(references.values()), "details": list(dict.fromkeys(details)), "markdown": "\n".join(lines) + "\n"}


@checked
def describe(draft, project, route, planning=None):
    from . import funding
    assessment = funding.evaluate(draft, project, planning)
    entry = next((e for e in draft["bundle"]["entries"] if e["id"] == route), None)
    require(entry is not None, "Choose a route in this version's catalogue before opening its overview.")
    concept = draft["project_concepts"][route] if "project_concepts" in draft and route in draft["project_concepts"] else None
    result = {"version": 1, "route": route, "title": entry["title"], "name": draft["name"], "score": None, "criteria": [], "edl": [], "details": [], "delivery": [], "markdown": "", "concept": deepcopy(concept),
              "checks": next(r["checks"] for r in assessment["results"] if r["id"] == route)}
    if draft["version"] == 4 and route in draft["bundle"]["selection"]["routes"]:
        result.update(scoring(draft["bundle"], draft["selection_assessments"], route, concept))
    else:
        result["details"] = [c["message"] for c in result["checks"] if c["result"] != "pass"]
        result["markdown"] = "## Route overview\n" + route + " · " + entry["title"] + "\n\n" + "\n".join("- " + d for d in result["details"]) + "\n"
    result["markdown"] = "# " + draft["name"] + "\n\nRoute: " + route + "\n\n" + result["markdown"]
    if concept is not None and "delivery_plan" in concept:
        from .delivery_plans import library, review
        data = library()
        for tid, topic in data["topics"].items():
            if route not in topic["routes"]: continue
            answer = concept["delivery_plan"]["topics"][tid]["answer"]
            answers = answer if isinstance(answer, list) else [answer]
            labels = {option["id"]: option["label"] for option in topic["options"]}
            result["delivery"].append({"id": tid, "label": topic["label"], "value": ", ".join(labels[a] for a in answers if a is not None) if answer is not None and answer != [] else "Not entered"})
        _, lines, _ = review(concept["delivery_plan"], concept)
        result["markdown"] += "\n" + "\n".join(lines) + "\n"
    sources = {(s["document_id"], s["page"], s["sha256"]): s for c in result["criteria"] for s in c["sources"] + [s for i in c["items"] if i["selected"] for s in i["sources"]]}
    for ref in result["edl"]:
        sources[(ref["document_id"], ref["page"], ref["sha256"])] = {"document_id": ref["document_id"], "page": ref["page"], "sha256": ref["sha256"], "label": ref["id"] + " · " + ref["label"], "role": "EDL supporting reference"}
    result["sources"] = list(sources.values())
    if result["sources"]:
        from .project_concepts import guide
        publications = guide()["publications"]
    result["markdown"] += "\n## Sources\n"
    for source in result["sources"]:
        require(source["document_id"] in publications, "An overview source has no registered publication: " + source["document_id"])
        result["markdown"] += f"- [{source['label']}]({publications[source['document_id']]['download_url']}#page={source['page']})\n"
    return result
