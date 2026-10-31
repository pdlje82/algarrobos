"""Catalogue-edition-2 assessment. Monetary formulas are unchanged from edition 1."""
import unicodedata


def assess(entry, f, c):
    checks = []
    questions = {q["id"]: q for q in c["questions"]}
    def sources_for(key):
        question = questions["applicant_id" if key == "applicant_kind" else key]
        refs = [s for item in question["guidance"]["requirements"] if entry["id"] in item["programme_ids"] for s in item["sources"]]
        return list({(s["document_id"], s["page"], s["sha256"]): s for s in refs}.values())
    def check(key, acceptable, message, page=None):
        v = f[key]
        checks.append({"field": key, "result": "unknown" if v is None else "pass" if v in acceptable else "fail", "message": message, "sources": sources_for(key)})
    def y(key, message, page=None): check(key, {"yes"}, message, page)
    r = entry["rule"]
    if r:
        def canonical(value):
            return "".join(ch for ch in unicodedata.normalize("NFKD", value).casefold() if not unicodedata.combining(ch)).strip()
        municipality = f["municipality"]
        territory = c["territory"][r]
        check("municipality", set(territory["municipalities"]), "Municipality coverage is separate from operation scope, residence and call availability.")
        if municipality is not None:
            location = canonical(municipality)
            known = location in {canonical(m) for m in territory["municipalities"]}
            outside = location in {"outside", "outside al20"}
            checks[-1]["result"] = "pass" if known else "fail" if outside and not territory["outside_exception"] else "unknown"
            if outside and territory["outside_exception"]:
                checks[-1]["message"] = "Location confirmed outside AL20. Article 6.7 contains conditional territorial exceptions; local benefit and applicant-location evidence require GDR verification. This exception is not assessed here."
            elif not known and not outside:
                checks[-1]["message"] = "Municipality coverage has not been verified. An unrecognised name is not treated as outside the programme area."
            elif outside:
                checks[-1]["message"] = "The location is confirmed outside AL20; category 3.4 requires an operation/study within its LEADER area."
        score = f["selection_score"]
        checks.append(dict(field="selection_score", result="unknown" if score is None else "pass" if score >= c["rules"][r]["minimum_score"] else "fail", message="Verify the applicable local selection criteria and at least 60 points; no ecological impact score is inferred.", sources=[s for s in entry["sources"] if s["document_id"] == "FUND-008" and s["page"] == 38]))
        if r == "2.7":
            check("applicant_kind", {"individual"}, "2.7 is for an individual starting self-employment.", 112)
            check("sector", {"general"}, "Agricultural/forestry production, exclusive agrarian trade and 1.11 support services are excluded; mixed services require GDR classification.", 111)
            for key, msg in [("unemployed", "Unemployed when applying."), ("new_activity", "A genuinely new activity and submitted business plan."), ("no_same_reta", "No same-CNAE-group RETA registration in the preceding three years."), ("resident", "Resident in the relevant territory by commencement."), ("exclusive", "Exclusive full-time self-employment."), ("start_after_application", "Begin RETA/tax activity after applying and by three months after award notification."), ("plan_24_months", "Implement the plan within 24 months."), ("retention", "Maintain full-time self-employment until three years after final payment.")]: y(key, msg, 112 if key != "start_after_application" else 111)
            if f["sector"] == "mixed": next(x for x in checks if x["field"] == "sector")["result"] = "unknown"
            v = f["unemployment_percent"]
            startup = c["rules"]["2.7"]
            checks.append(dict(field="unemployment_percent", result="unknown" if v is None else "pass" if v >= startup["minimum_unemployment_percent"] else "fail", message="At least 50% unemployment in the preceding three months.", sources=[s for s in entry["sources"] if s["page"] == 112]))
            check("other_aid", {"no"}, "2.7 is incompatible with other aid for the same operation.")
            for net, benchmark, factor in [("net_year1", "smi_year1", startup["first_year_smi_factor"]), ("net_year2", "smi_year2", startup["final_smi_factor"])]:
                n, b = f[net], f[benchmark]
                checks.append(dict(field=net, result="unknown" if n is None or b is None else "pass" if n >= factor*b else "fail", message="Projected net income must meet " + ("half the verified annual 12-payment SMI benchmark in year one." if net == "net_year1" else "the verified annual application-year SMI benchmark in year two."), sources=[s for s in entry["sources"] if s["page"] == 112]))
        elif r in {"3.4", "3.5"}:
            check("applicant_kind", {"nonprofit", "public", "public_company"}, "A qualifying public/nonprofit legal entity or qualifying publicly participated enterprise is required.")
            if f["applicant_kind"] == "university":
                next(x for x in checks if x["field"] == "applicant_kind")["result"] = "unknown"
                checks.append(dict(field="applicant_kind", result="unknown", message="Verify whether this research institution is an eligible public/nonprofit legal entity.", sources=entry["sources"]))
            if f["applicant_kind"] == "public_company":
                checks.append(dict(field="applicant_kind", result="unknown", message="Public participation enterprise must meet the additional Article 7 conditions.", sources=entry["sources"]))
            check("purpose", {"conservation"}, "Nonproductive public-benefit purpose is required.")
            for k, msg in [("rights_sufficient", "Rights must cover implementation and commitments."), ("permits", "Verify the required permissions."), ("related_competence", "Applicant must have relevant purpose or competencies."), ("not_started", "Verify application precedes binding commitments.")]: y(k, msg)
            if f["permits"] == "no": next(x for x in checks if x["field"] == "permits")["result"] = "unknown"
            if r == "3.4":
                y("demonstration_participation", "Open participation by relevant interested participants; transparent capacity limits and no membership requirement. This is not unrestricted entry to the whole parcel.")
                check("operation_scope", {"within"}, "The demonstration/study’s territorial scope must not exceed the relevant LEADER territory.")
                for k, msg in [("novelty", "The method must be new or unfamiliar in the ZRL."), ("testable", "A testable, transferable demonstration is required."), ("dissemination", "Publish activities and results online."), ("publication_three_years", "Keep online information for three years after final payment.")]: y(k, msg)
            else:
                y("heritage_public_use", "Define public dissemination/use of the heritage resource and suitable opening hours or another public-use mechanism for an enclosed site.")
                y("heritage", "Document rural/environmental heritage value.")
                y("forest_plan", "Check any required forest management instrument.")
                check("land_purchase", {"no"}, "Acquisition of rural heritage assets is excluded from 3.5.", 124)
        else:
            check("applicant_kind", {"individual", "company"}, "A qualifying enterprise or prospective entrepreneur is required.")
            y("sme", "Verify SME and financial capacity requirements.")
            y("not_started", "Check application and investment start conditions.")
            check("sector", {"agrarian_services"} if r == "1.11" else {"general"}, "1.11 covers support services to agriculture/forestry; 2.6 excludes those services. Actual mixed activity requires GDR classification.")
            if f["sector"] == "mixed": checks[-1]["result"] = "unknown"
    elif entry["mechanism"] == "existing_cash":
        checks.append(dict(field="available_contribution", result="unknown" if f["available_contribution"] is None else "pass", message="Verify funds already held, their restrictions and the intended allocation. This is not a new receipt.", sources=[]))
    else:
        checks.append(dict(field=None, result="unknown", message="Research option: current programme/call, applicant conditions, economic viability and supporting source passages require verification.", sources=entry["sources"]))
    issues = [x for x in checks if x["result"] == "fail"]
    unknowns = [x for x in checks if x["result"] == "unknown"]
    finance = {"basis": "Unknown / mechanism-specific", "estimate": None, "schedule": [], "notes": ["No award, receipt or payment is created by this assessment."]}
    if entry["mechanism"] == "existing_cash":
        finance.update(basis="User-reported funds already available", estimate=f["available_contribution"])
    elif r == "2.7":
        rule = c["rules"][r]
        bonus = min(rule["bonus_cap"], sum(amount for key, amount in rule["bonuses"].items() if f[key] == "yes"))
        unknown_bonus = [key for key in rule["bonuses"] if f[key] is None]
        finance.update(basis="Conditional business-plan lump sum", estimate=None if issues else rule["base"] + bonus, base=rule["base"], bonus=bonus, maximum=rule["cap"], bonus_unknowns=unknown_bonus,
            schedule=[{"label": "First instalment: commencement after award", "amount": rule["first"]}, {"label": "Final instalment: plan and income milestones verified", "amount": rule["second"] + bonus}])
        finance["notes"].extend(["Estimate uses only the bonus conditions answered Yes; unanswered bonuses remain unconfirmed.", "Milestone preview only. First-year intermediate income and continuing commitment conditions apply. No entitlement or cash posting is inferred."])
    elif r:
        rule = c["rules"][r]
        cost = f["eligible_cost"]
        finance.update(basis="Percentage of verified eligible cost; reimbursement", estimate=None if issues or cost is None else round(min(cost*rule["rate"], rule["cap"]), 2), rate=rule["rate"], maximum=rule["cap"])
        finance["notes"].append("Legal maximum is not an award. Confirm cost eligibility, actual call limits, cofinance, guarantees and reimbursement timing.")
    return {"id": entry["id"], "status": "Does not match these facts" if issues else "Needs information" if unknowns else "Possible match — eligibility unverified", "relevant": f["activity"] is None or f["activity"] in entry["activities"], "checks": checks, "finance": finance}

