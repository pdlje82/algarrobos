"""Transient presentation dependencies; never part of saved funding assessments.

Checks remain authoritative in funding.assess. Composite inputs and calculation
inputs are declared here, rather than inferred from human-readable explanations.
"""
from collections import defaultdict
from copy import deepcopy
from .funding import applicant_form
from . import funding_inputs

COMPOSITE_INPUTS = {
    ("2.7", "net_year1"): ["net_year1", "smi_year1"],
    ("2.7", "net_year2"): ["net_year2", "smi_year2"],
}
CALCULATION_INPUTS = {
    "1.11": "eligible_cost", "2.6": "eligible_cost",
    "3.4": "eligible_cost", "3.5": "eligible_cost",
}


def describe(assessment):
    """Return a versioned, read-only network over an unchanged assessment."""
    draft, facts = assessment["draft"], assessment["facts"]
    catalogue = draft["bundle"]
    entries = {e["id"]: e for e in catalogue["entries"]}
    conditions, coverage = [], []
    for result in assessment["results"]:
        entry = entries[result["id"]]
        counts = defaultdict(int)
        option_conditions = []
        for check in result["checks"]:
            field = check["field"]
            if field is None:
                continue  # Research is explicitly unmodelled, not a failed condition.
            ordinal = counts[field]
            counts[field] += 1
            inputs = COMPOSITE_INPUTS.get((entry["rule"], field), [field])
            if field == "applicant_kind" and draft["version"] == 2 and field not in draft["overrides"]:
                inputs = ["applicant_id", "applicant_kind"]
            inputs = list(dict.fromkeys("applicant_choice" if f in {"applicant_id", "applicant_kind"} else f for f in inputs))
            condition = dict(
                id=f'{result["id"]}:eligibility:{field}:{ordinal}',
                option_id=result["id"],
                fields=inputs,
                effect="eligibility", result=check["result"],
                message=check["message"], sources=deepcopy(check["sources"]),
                value=None,
            )
            conditions.append(condition)
            option_conditions.append(condition["id"])

        def amount(field, value, message, sources):
            condition = dict(id=f'{result["id"]}:amount:{field}',
                             option_id=result["id"], fields=[field], effect="amount",
                             result="unknown" if facts[field] is None else
                             "fail" if facts[field] == "no" else "pass",
                             message=message, sources=deepcopy(sources), value=value)
            conditions.append(condition)
            option_conditions.append(condition["id"])

        if entry["rule"] == "2.7":
            for field, addition in catalogue["rules"]["2.7"]["bonuses"].items():
                amount(field, None if facts[field] is None else addition if facts[field] == "yes" else 0,
                       "Conditional startup addition before the combined bonus cap. Does not establish eligibility.",
                       [s for s in entry["sources"] if s["page"] == 113])
        elif entry["rule"] in CALCULATION_INPUTS:
            field = CALCULATION_INPUTS[entry["rule"]]
            amount(field, facts[field], "Eligible-cost input to the sourced rate and cap; the assessment supplies the conditional estimate.", entry["sources"])
        elif entry["mechanism"] == "existing_cash":
            amount("available_contribution", facts["available_contribution"], "Reported available contribution; no cash receipt is created.", [])
        coverage.append(dict(option_id=result["id"],
                             requirements="modelled" if option_conditions else "research_only",
                             condition_ids=option_conditions,
                             unresolved_count=sum(c["result"] == "unknown" for c in conditions if c["option_id"] == result["id"]),
                             scope_fields=["activity"]))
    return dict(version=1, conditions=conditions, coverage=coverage)


def visualise(assessment):
    d = assessment["draft"]
    facts = assessment["facts"]
    party = next((p for p in d["baseline"]["parties"] if p["id"] == facts["applicant_id"]), None)
    inherited = applicant_form(d, facts["applicant_id"])
    return {"assessment": assessment, "visualisation": describe(assessment), "input_context": funding_inputs.describe(d),
            "applicant_context": {"party_name": None if party is None else party["name"],
                                  "inherited_form": inherited,
                                  "derived": d["version"] == 2 and "applicant_kind" not in d["overrides"],
                                  "override_conflict": "applicant_kind" in d["overrides"] and inherited is not None and facts["applicant_kind"] != inherited}}
