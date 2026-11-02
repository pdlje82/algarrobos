"""Explain location decisions before explicit application; no project storage writes."""
from copy import deepcopy
from decimal import Decimal
from . import funding, funding_statistics as stats, funding_selection as scoring
from .configuration import keys
from .engine import require

ORDER = ["AT.3", "RD.5"]


def points_for(definition, answers):
    return float(min(sum((scoring.points(c["points"]) for c in definition["choices"] if answers[c["id"]] is True), Decimal(0)), scoring.points(definition["cap"])))


def inputs_for(data, settings, cid):
    keys(settings, set(data["defaults"]), "location decision inputs")
    require(isinstance(settings["population_mode"], str) and settings["population_mode"] in {"unconfirmed", "municipality_proxy", "settlement"}, "Choose a supported population basis.")
    require(settings["settlement_name"] is None or isinstance(settings["settlement_name"], str) and len(settings["settlement_name"]) <= 300, "Enter a valid settlement name.")
    require(settings["population"] is None or type(settings["population"]) is int and 0 <= settings["population"] <= 100000000, "Population must be a nonnegative whole number.")
    require(settings["population_year"] is None or type(settings["population_year"]) is int and settings["population_year"] == data["year"], "Use the dataset reference year, or enter this criterion manually.")
    if cid == "RD.5":
        return {**deepcopy(data["defaults"]), "municipality": settings["municipality"]}
    return deepcopy(settings)


def explain(data, definition, settings):
    cid = definition["id"]
    canonical = inputs_for(data, settings, cid)
    result = stats.lookup(data, canonical)
    row, benchmarks = result["municipality"], data["benchmarks"]
    require(definition["method"] == "sum" and {c["id"] for c in definition["choices"]} == set(result["answers"][cid]), "This scoring edition needs a reviewed location adapter.")
    if cid == "AT.3":
        require(result["population_used"] is not None, "Choose a population basis for AT.3 before applying its comparison.")
        require(scoring.points(definition["choices"][0]["points"]) >= scoring.points(definition["choices"][1]["points"]) and any(set(g) == set(result["answers"][cid]) for g in definition["exclusive_groups"]), "The population alternatives need a reviewed location adapter.")
        population = result["population_used"]
        comparisons = [{"label": "Population below the AL20 median", "left": population, "operator": "<", "right": benchmarks["population_zrl_median"], "result": Decimal(population) < Decimal(benchmarks["population_zrl_median"]), "source_pages": [113]},
                       {"label": "Population below the Andalusian median", "left": population, "operator": "<", "right": benchmarks["population_andalusia_median"], "result": Decimal(population) < Decimal(benchmarks["population_andalusia_median"]), "source_pages": [126]}]
        basis = "Municipality total used for the settlement comparison" if canonical["population_mode"] == "municipality_proxy" else "Settlement: " + canonical["settlement_name"]
        explanation = "The strongest satisfied population band is selected. AT.3.1 and AT.3.2 cannot be combined."
        pages = [113, 126]
    else:
        comparisons = [{"label": "Municipal businesses below the AL20 average", "left": row["businesses"], "operator": "<", "right": benchmarks["businesses_zrl_mean"], "result": Decimal(row["businesses"]) < Decimal(benchmarks["businesses_zrl_mean"]), "source_pages": [row["businesses_page"], 182]}]
        basis = "Municipality business count; population is not used"
        explanation = "RD.5.1 is selected only when the municipality business count is strictly below the published AL20 average."
        pages = list(dict.fromkeys([row["businesses_page"], 182]))
    answers = result["answers"][cid]
    selected = [id for id, value in answers.items() if value is True]
    outcome = ", ".join(selected) + " selected" if selected else "No option selected"
    points = points_for(definition, answers)
    sources = [deepcopy(s) for s in data["sources"] if s["page"] in pages]
    for source in definition["sources"]:
        if source not in sources: sources.append(deepcopy(source))
    return {"settings": canonical, "municipality": row["name"], "basis": basis, "year": data["year"], "answers": answers, "points": points, "cap": float(scoring.points(definition["cap"])), "comparisons": comparisons,
            "explanation": explanation, "outcome": outcome + f" · {points:g}/{definition['cap']} points", "sources": sources}


def previous_records(assessment):
    if "location_lookup" not in assessment: return {}
    metadata = assessment["location_lookup"]
    if metadata["version"] == 2: return deepcopy(metadata["items"])
    require(metadata["version"] == 1, "Unsupported location decision history.")
    return {cid: {"settings": deepcopy(metadata["settings"]), "before_answers": None} for cid in metadata["automated"]}


@funding.checked
def preview(draft, project, route, settings, dataset_hash):
    funding.validate_draft(draft, project)
    require(draft["version"] == 4 and route in draft["selection_assessments"], "Choose a supported AL20 assessment route.")
    data = stats.dataset()
    require(dataset_hash == funding.digest(data), "The statistics edition changed. Reload statistics and review the comparison again.")
    assessment = draft["selection_assessments"][route]
    definitions = {c["id"]: c for c in scoring.profile_for(draft["bundle"], route)["criteria"] if c["id"] in stats.CRITERIA}
    require(set(definitions) == stats.CRITERIA, "The location criteria are missing from this scoring edition.")
    current_score = scoring.calculate(draft["bundle"], draft["selection_assessments"], route)
    metadata = assessment["location_lookup"] if "location_lookup" in assessment else None
    records = previous_records(assessment)
    decisions = {}
    for cid in ORDER:
        definition = definitions[cid]
        before = assessment["criteria"][cid]["answers"]
        decision = {"id": cid, "label": definition["label"], "ready": False, "error": "", "proposal": None, "before_answers": deepcopy(before), "before_points": points_for(definition, before), "choices": [{"id": c["id"], "label": c["label"], "points": c["points"]} for c in definition["choices"]], "last_applied": None, "active": metadata is not None and cid in metadata["automated"]}
        try:
            decision.update(ready=True, proposal=explain(data, definition, settings))
        except funding.Invalid as exc:
            decision.update(ready=False, error=str(exc))
        decision["points_delta"] = float(Decimal(str(decision["proposal"]["points"])) - Decimal(str(decision["before_points"]))) if decision["ready"] else None
        decision["after_score"] = float(Decimal(str(current_score["subtotal"])) + Decimal(str(decision["points_delta"]))) if decision["ready"] else None
        if cid in records:
            record = records[cid]
            if cid == "AT.3" and record["settings"]["population_mode"] == "unconfirmed":
                decision["last_applied"] = {"legacy_no_population": True, "settings": record["settings"], "year": data["year"], "outcome": "No population was entered for this older lookup; no population band was selected."}
            else:
                trace = explain(data, definition, record["settings"])
                trace.update(legacy_no_population=False, before_answers=record["before_answers"], before_points=None if record["before_answers"] is None else points_for(definition, record["before_answers"]))
                decision["last_applied"] = trace
        decisions[cid] = decision
    hashes = {}
    for ids, key in [(["AT.3"], "AT.3"), (["RD.5"], "RD.5"), (ORDER, "both")]:
        hashes[key] = funding.digest([data, route, draft["bundle"]["selection"], current_score["subtotal"], [(cid, decisions[cid]["before_answers"], decisions[cid]["proposal"]) for cid in ids]]) if all(decisions[cid]["ready"] for cid in ids) else None
    both_after = float(Decimal(str(current_score["subtotal"])) + sum((Decimal(str(d["points_delta"])) for d in decisions.values()), Decimal(0))) if all(d["ready"] for d in decisions.values()) else None
    return {"version": 1, "route": route, "dataset_id": data["id"], "dataset_hash": dataset_hash, "year": data["year"], "before_score": current_score["subtotal"], "both_after_score": both_after, "decisions": decisions, "hashes": hashes}


@funding.checked
def apply(draft, project, route, settings, criteria, dataset_hash, preview_hash):
    require(isinstance(criteria, list) and criteria and len(set(criteria)) == len(criteria) and set(criteria) <= stats.CRITERIA, "Choose AT.3, RD.5, or both explicitly.")
    review = preview(draft, project, route, settings, dataset_hash)
    key = "both" if len(criteria) == 2 else criteria[0]
    require(review["hashes"][key] is not None and review["hashes"][key] == preview_hash, "The location comparison or selections changed. Preview again; your draft is retained.")
    result = deepcopy(draft)
    assessment = result["selection_assessments"][route]
    old = assessment["location_lookup"] if "location_lookup" in assessment else None
    items = previous_records(assessment)
    # Version 1 did not record previous selections. Null retains that absence;
    # migration never reconstructs a before value or detaches a sibling.
    if old is not None and old["version"] == 1:
        for cid in items:
            if cid == "RD.5": items[cid]["settings"] = inputs_for(stats.dataset(), items[cid]["settings"], cid)
    automatic = set() if old is None else set(old["automated"])
    for cid in criteria:
        proposal = review["decisions"][cid]["proposal"]
        items[cid] = {"settings": deepcopy(proposal["settings"]), "before_answers": deepcopy(assessment["criteria"][cid]["answers"])}
        assessment["criteria"][cid]["answers"] = deepcopy(proposal["answers"])
        automatic.add(cid)
    assessment["location_lookup"] = {"version": 2, "dataset_id": review["dataset_id"], "dataset_hash": dataset_hash, "items": items, "automated": [cid for cid in ORDER if cid in automatic]}
    funding.validate_draft(result, project)
    return result
