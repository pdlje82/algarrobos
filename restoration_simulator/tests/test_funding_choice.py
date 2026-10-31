"""One applicant choice and logical question state, retaining earlier save semantics."""
from copy import deepcopy
import unittest
from backend import funding, funding_inputs, funding_visual, engine
import test_funding as fixtures


class ChoiceTests(unittest.TestCase):
    def setUp(self):
        self.project=fixtures.site()
        self.draft=funding.new_draft(self.project,None,[],"business")
        self.draft["baseline"]["facts"].update(applicant_id="individual",applicant_kind="individual")

    def test_recorded_applicants_are_atomic_and_owner_independent(self):
        d=deepcopy(self.draft);before=deepcopy(self.project)
        d["applicant_choice"]={"kind":"recorded","party_id":"partner"}
        a=funding.evaluate(d,self.project)
        self.assertEqual(a["facts"]["applicant_kind"],"nonprofit")
        d["applicant_choice"]={"kind":"recorded","party_id":"individual"}
        d["overrides"]["owner_id"]="municipality"
        self.assertEqual(funding.effective(d)["applicant_kind"],"individual")
        for field in ["applicant_id","applicant_kind"]:
            invalid=deepcopy(d);invalid["overrides"][field]="nonprofit"
            with self.assertRaises(engine.Invalid):funding.evaluate(invalid,self.project)
        self.assertEqual(self.project,before)

    def test_planned_potential_unknown_and_inherited_choices(self):
        d=deepcopy(self.draft)
        for kind in ["planned","potential"]:
            d["applicant_choice"]={"kind":kind,"legal_form":"nonprofit"}
            a=funding.evaluate(d,self.project);meta=funding_inputs.describe(d)
            self.assertEqual(a["facts"]["applicant_kind"],"nonprofit")
            q=next(q for q in meta["questions"] if q["id"]=="applicant_choice")
            self.assertIn("not yet created" if kind=="planned" else "not yet identified",q["origin"])
            self.assertFalse(q["unknown"])
        d["applicant_choice"]={"kind":"unknown"}
        self.assertIsNone(funding.effective(d)["applicant_kind"])
        self.assertIsNone(funding.effective(d)["applicant_id"])
        d["applicant_choice"]=None
        self.assertEqual(funding.effective(d)["applicant_kind"],"individual")
        d["applicant_choice"]={"kind":"potential","legal_form":None}
        self.assertIsNone(funding.effective(d)["applicant_kind"])

    def test_logical_questions_provenance_and_relevance(self):
        d=deepcopy(self.draft);d["overrides"].update(municipality=None,net_year1=0)
        v=funding_visual.visualise(funding.evaluate(d,self.project));qs=v["input_context"]["questions"]
        self.assertEqual(len(qs),len(d["bundle"]["questions"])-1)
        self.assertEqual(sum(q["type"]=="applicant" for q in qs),1)
        self.assertFalse(any(q["id"] in {"applicant_id","applicant_kind"} for q in qs))
        applicant=next(q for q in qs if q["id"]=="applicant_choice")
        self.assertIn("Inherited context",applicant["origin"])
        self.assertEqual(applicant["initial_value"],{"kind":"recorded","party_id":"individual"})
        self.assertTrue(next(q for q in qs if q["id"]=="municipality")["unknown"])
        self.assertEqual(next(q for q in qs if q["id"]=="net_year1")["display_value"],"0")
        self.assertFalse(next(q for q in qs if q["id"]=="owner_id")["relevant"])
        d["overrides"]["activity"]="demonstration"
        qs=funding_inputs.describe(d)["questions"]
        self.assertFalse(next(q for q in qs if q["id"]=="net_year1")["relevant"])
        self.assertEqual(d["overrides"]["net_year1"],0)
        app_checks=[c for c in v["visualisation"]["conditions"] if ":applicant_kind:" in c["id"]]
        self.assertTrue(all(c["fields"]==["applicant_choice"] for c in app_checks))
        # Absence of the historical optional activity restriction means all activities.
        next(q for q in d["bundle"]["questions"] if q["id"]=="net_year1").pop("activities")
        self.assertTrue(next(q for q in funding_inputs.describe(d)["questions"] if q["id"]=="net_year1")["relevant"])

    def test_legacy_conflicts_require_review_and_matching_answers_convert_losslessly(self):
        old=deepcopy(self.draft);old["version"]=2;del old["applicant_choice"]
        old["overrides"].update(applicant_id="individual",applicant_kind="nonprofit")
        original=deepcopy(old);pending=funding.prepare(old,self.project)
        self.assertIsNotNone(pending["applicant_review"])
        self.assertEqual(pending["draft"],old)
        chosen=funding.prepare(old,self.project,{"kind":"planned","legal_form":"nonprofit"},resolve=True)
        self.assertEqual(chosen["draft"]["version"],3)
        self.assertEqual(chosen["draft"]["overrides"],{})
        self.assertEqual(funding.effective(chosen["draft"])["applicant_kind"],"nonprofit")
        self.assertEqual(old,original)
        old["overrides"]["applicant_id"]="partner"
        mapped=funding.prepare(old,self.project)
        self.assertIsNone(mapped["applicant_review"])
        self.assertEqual(mapped["draft"]["applicant_choice"],{"kind":"recorded","party_id":"partner"})
        self.assertEqual(funding.effective(mapped["draft"]),funding.effective(old))

    def test_current_choice_financial_rules_and_saved_snapshots(self):
        old=fixtures.FundingTests.eligible(self)
        # This fixture starts from a v3 draft; use the frozen old shape for the adapter.
        old["version"]=2;del old["applicant_choice"]
        current=funding.prepare(old,self.project)["draft"]
        self.assertEqual(next(r for r in funding.evaluate(current,self.project)["results"] if r["id"]=="LEADER-AL20-2.7")["finance"]["estimate"],37000)
        current["overrides"].update({k:"yes" for k in current["bundle"]["rules"]["2.7"]["bonuses"]})
        self.assertEqual(next(r for r in funding.evaluate(current,self.project)["results"] if r["id"]=="LEADER-AL20-2.7")["finance"]["estimate"],50000)
        value=funding.operate(None,self.project,None,"save",old,None);snapshot=deepcopy(value["scenarios"])
        value=funding.operate(value,self.project,None,"draft",current,None)
        self.assertEqual(value["scenarios"],snapshot)
        funding.validate_attachment(value,self.project)


class PrepareChoiceApiTests(unittest.TestCase):
    setUp=fixtures.FundingPersistenceTests.setUp
    seed=fixtures.FundingPersistenceTests.seed
    def test_review_and_resolution_do_not_write(self):
        old=self.seed();old["version"]=2;del old["applicant_choice"]
        old["overrides"].update(applicant_id="individual",applicant_kind="nonprofit")
        before=self.path.read_bytes();body={"revision":self.view["revision"],"draft":old}
        pending=self.client.post("/api/funding/prepare",json=body)
        self.assertEqual(pending.status_code,200,pending.text)
        self.assertIsNotNone(pending.json()["applicant_review"])
        done=self.client.post("/api/funding/prepare",json={**body,"applicant_choice":{"kind":"potential","legal_form":"nonprofit"}})
        self.assertEqual(done.status_code,200,done.text)
        self.assertEqual(done.json()["draft"]["version"],3)
        self.assertEqual(self.path.read_bytes(),before)
