"""Frozen selection-library v2 completion policy."""
from decimal import Decimal
from .engine import require
from .funding_selection import profile_for, points


def calculate(bundle, assessments, route):
    from .funding_selection_v1 import calculate as original
    result = original(bundle, assessments, route)
    version = bundle["selection"]["version"]
    if version == 1:
        return result
    require(version == 2 and bundle["selection"]["completion_policy"] == "cap_or_all_answers", "Unsupported scoring completion policy.")
    definitions = {c["id"]: c for c in profile_for(bundle, route)["criteria"]}
    for row in result["criteria"]:
        definition = definitions[row["id"]]
        answers = assessments[route]["criteria"][row["id"]]
        answered = (all(v is not None for v in answers["inputs"].values()) if definition["method"] == "ratio" else all(v is not None for v in answers["answers"].values()))
        maximum = Decimal(str(row["subtotal"])) == points(definition["cap"])
        complete = row["complete"] or maximum
        row.update(answers_complete=answered, score_complete=complete, complete=complete,
                   completion_reason="cap_reached" if maximum else "calculation_complete" if complete and definition["method"] == "ratio" else "all_answered" if complete else "unresolved")
        if maximum:
            row["issues"] = [i for i in row["issues"] if i != "Answer every applicable subcriterion, including explicit rejections."]
    result["unresolved"] = sum(not c["score_complete"] for c in result["criteria"])
    result["total"] = result["subtotal"] if result["unresolved"] == 0 else None
    result["result"] = "unknown" if result["unresolved"] else "pass" if result["subtotal"] >= result["threshold"] else "fail"
    result["version"] = 2
    return result

