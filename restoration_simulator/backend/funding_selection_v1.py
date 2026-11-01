"""Frozen selection-library v1 evaluation for saved assessments."""
from copy import deepcopy
from decimal import Decimal
from .funding_selection import profile_for, choices_for, points


def calculate(bundle, assessments, route):
    profile = profile_for(bundle, route)
    rows = assessments[route]["criteria"]
    breakdown = []
    for criterion in profile["criteria"]:
        row = rows[criterion["id"]]
        choices = choices_for(criterion, route)
        method = criterion["method"]
        issues = []
        if method == "ratio":
            grant, jobs = row["inputs"]["grant"], row["inputs"]["quality_jobs"]
            complete = grant is not None and jobs is not None
            selected = []
            ratio = None
            if complete and jobs > 0:
                ratio = Decimal(str(grant)) / Decimal(str(jobs))
                # The three strict boundaries are part of the PE.4 definitions.
                for choice, boundary in zip(choices, criterion["parameters"]["boundaries"], strict=True):
                    if ratio < points(boundary):
                        selected = [choice["id"]]
                        break
            if not complete: issues.append("Enter the grant amount and qualifying quality jobs, or explicitly enter zero jobs.")
        else:
            selected = [c["id"] for c in choices if row["answers"][c["id"]] is True]
            complete = all(v is not None for v in row["answers"].values())
            if not complete: issues.append("Answer every applicable subcriterion, including explicit rejections.")
            if method == "employment" and selected and row["inputs"]["qualifying_uta"] is not True:
                complete = False
                issues.append("Confirm the minimum one-year / 1 UTA condition. No undocumented part-time graduation is calculated; obtain GDR clarification if it is needed.")
        applicable = not (method == "employment" and selected and row["inputs"]["qualifying_uta"] is not True)
        raw = sum((points(c["points"]) for c in choices if applicable and c["id"] in selected), Decimal(0))
        subtotal = min(raw, points(criterion["cap"]))
        breakdown.append({"id": criterion["id"], "subtotal": float(subtotal), "uncapped": float(raw), "cap": float(points(criterion["cap"])),
                          "complete": complete, "selected": selected, "issues": issues, "sources": deepcopy(criterion["sources"])})
    unresolved = sum(not c["complete"] for c in breakdown)
    subtotal = sum((Decimal(str(c["subtotal"])) for c in breakdown), Decimal(0))
    threshold = bundle["rules"][route.removeprefix("LEADER-AL20-")]["minimum_score"]
    location_basis = None
    assessment = assessments[route]
    if "location_lookup" in assessment and assessment["location_lookup"]["automated"]:
        from .funding_statistics import dataset
        metadata = assessment["location_lookup"]
        location_basis = {"status": "provisional", "municipality": metadata["settings"]["municipality"], "year": dataset()["year"],
                          "automated": deepcopy(metadata["automated"]), "dataset_id": metadata["dataset_id"]}
    return {"route": route, "profile": bundle["selection"]["routes"][route], "basis": "Self-assessed; supporting references are not certified",
            "subtotal": float(subtotal), "total": float(subtotal) if unresolved == 0 else None, "unresolved": unresolved,
            "threshold": threshold, "result": "unknown" if unresolved else "pass" if subtotal >= Decimal(str(threshold)) else "fail",
            "criteria": breakdown, "location_basis": location_basis}

