"""Exploration content never scores; reviewed two-way updates are atomic."""
from copy import deepcopy
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from uuid import uuid4
import unittest

from fastapi.testclient import TestClient
from backend import funding, funding_selection, project_concepts as concepts
from backend.app import create_app
from backend.engine import Invalid
from backend.storage import Store, validate_export
from test_designer_library import site

R34="LEADER-AL20-3.4"
R35="LEADER-AL20-3.5"

class ConceptDomainTests(unittest.TestCase):
    def setUp(self):
        self.project=site()
        self.draft=funding.new_draft(self.project,None,[],"activity")
        self.concept=concepts.new(self.draft,R34)

    def activity(self,bindings=None):
        g=concepts.guide()
        return {**g["defaults"]["activity"],"id":str(uuid4()),"template_id":None,"bindings":[] if bindings is None else bindings}

    def test_library_complete_sources_explicit_factual_tasks_and_route_starters(self):
        g=concepts.guide()
        self.assertEqual(len(g["bindings"]),95)
        for route in [R34,R35]:
            for b in g["bindings"].values():
                if b["kind"]=="starter":self.assertTrue(any(route in g["templates"][t]["routes"] for t in b["template_ids"]))
        self.assertEqual(g["bindings"]["AT.3.1"]["kind"],"evidence_only")
        self.assertEqual(g["bindings"]["PS.1.1"]["kind"],"evidence_only")
        self.assertEqual(g["bindings"]["IN.1.1"]["kind"],"evidence_only")
        for n in ["NPL15","NPL18"]:self.assertIn("5.3",g["bindings"][n]["confirmation"])
        p=g["bindings"]["PT.1.1"]["template_ids"]
        self.assertEqual({tuple(g["templates"][t]["routes"]) for t in p},{(R34,),(R35,)})
        for change in [lambda x:x["bindings"].pop("NPL3"),lambda x:x["sources"][next(iter(x["sources"]))].update(page=99999),lambda x:x["templates"][p[0]].update(routes=[R35])]:
            broken=deepcopy(g);change(broken)
            with self.assertRaises(Invalid):concepts.validate_guide(broken)

    def test_create_and_read_cannot_select_needs_or_score(self):
        original=deepcopy(self.draft)
        self.assertEqual(self.concept["objectives"],[])
        self.concept["objectives"]=["NPL3","NPL4","NPL8"]
        self.concept["activities"]=[self.activity(["NPL3","NPL4","PT.1.1"])]
        before=funding_selection.calculate(self.draft["bundle"],self.draft["selection_assessments"],R34)
        self.draft["project_concepts"]={R34:self.concept}
        funding.validate_draft(self.draft,self.project)
        r=concepts.report(self.concept,concepts.source_context(self.draft,R34),self.project)
        self.assertEqual(before,r["score"])
        self.assertEqual(self.draft["selection_assessments"],original["selection_assessments"])
        self.assertEqual(r["selected_claims"],[])
        self.assertTrue(any("not a current" in g for g in r["gaps"]))
        self.assertEqual(len(self.concept["activities"]),1)

    def test_brief_deterministic_unknowns_notes_and_exact_page_links(self):
        self.concept["objectives"]=["NPL15","NPL18","NPL3"]
        self.concept["activities"]=[self.activity(["NPL3"])]
        row=self.draft["selection_assessments"][R34]["criteria"]["PT.1"]
        row["notes"]="shared heritage context"
        row["choice_context"]={"version":1,"items":{"PT.1.1":{"notes":"independent note","reference":"record A"}}}
        r=concepts.report(self.concept,concepts.source_context(self.draft,R34),self.project)
        self.assertIn("Not defined",r["markdown"])
        self.assertIn("shared heritage context",r["markdown"])
        self.assertIn("independent note",r["markdown"])
        self.assertIn("#page=419",r["markdown"])
        self.assertEqual(r,concepts.report(self.concept,concepts.source_context(self.draft,R34),self.project))
        self.assertTrue(any("NPL15" in g and "5.3" in g for g in r["gaps"]))

    def test_annotations_are_optional_independent_and_do_not_change_score(self):
        answers=deepcopy(self.draft["selection_assessments"])
        row=answers[R34]["criteria"]["IG.8"]
        row["choice_context"]={"version":1,"items":{"IG.8.1":{"notes":"women's spaces","reference":"A"},"IG.8.2":{"notes":"participation","reference":"B"}}}
        funding_selection.validate_answers(answers,self.draft["bundle"])
        self.assertEqual(funding_selection.calculate(self.draft["bundle"],answers,R34),funding_selection.calculate(self.draft["bundle"],self.draft["selection_assessments"],R34))
        row["choice_context"]["items"]["IG.8.5"]={"notes":"","reference":""}
        with self.assertRaises(Invalid):funding_selection.validate_answers(answers,self.draft["bundle"])

    def test_invalid_version_missing_binding_identity_duplicate_activity_and_edition_fail(self):
        for change in [lambda c:c.update(version=2),lambda c:c.update(guide_hash="a"*64),lambda c:c.update(objectives=["NPL99"]),lambda c:c.update(activities=[self.activity(["missing"])]),lambda c:c.update(id="not-a-uuid")]:
            c=deepcopy(self.concept);change(c)
            with self.assertRaises(Invalid):concepts.validate(c,self.project)
        a=self.activity();self.concept["activities"]=[a,deepcopy(a)]
        with self.assertRaisesRegex(Invalid,"Duplicate"):concepts.validate(self.concept,self.project)

    def test_three_way_merges_by_identity_and_conflicts_at_fields_and_deletion(self):
        b=deepcopy(self.concept);b["activities"]=[self.activity(["NPL3"])]
        n=deepcopy(b);d=deepcopy(b)
        n["purpose"]="Navigator purpose";d["activities"][0]["timing"]="Next winter"
        f=concepts.merge(b,n,d)
        self.assertFalse(any(x["conflict"] for x in f))
        self.assertEqual(next(x for x in f if x["path"]==["purpose"])["suggested"],"navigator")
        self.assertEqual(next(x for x in f if x["path"][-1]=="timing")["suggested"],"demonstrator")
        d["purpose"]="Demonstrator purpose"
        self.assertTrue(next(x for x in concepts.merge(b,n,d) if x["path"]==["purpose"])["conflict"])
        n["activities"]=[]
        self.assertTrue(next(x for x in concepts.merge(b,n,d) if x["path"][0]=="activities")["conflict"])
        d=deepcopy(b)
        self.assertTrue(next(x for x in concepts.merge(b,n,d) if x["path"][0]=="activities")["conflict"],"Even a deletion against an unchanged copy needs a choice")
        other=self.activity();other["title"]=b["activities"][0]["title"]
        n=deepcopy(b);n["activities"].append(other)
        self.assertTrue(any(x["path"]==["activities",other["id"]] for x in concepts.merge(b,n,b)))

class ConceptAPITests(unittest.TestCase):
    def setUp(self):
        self.folder=TemporaryDirectory();self.addCleanup(self.folder.cleanup)
        self.path=Path(self.folder.name)/"save.json"
        Store(self.path).mutate("import",0,str(uuid4()),dict(save=dict(format_version=4,project=site(),undo=None),confirm_replace=False))
        self.client=TestClient(create_app(self.path));self.addCleanup(self.client.close)
        self.state=self.client.get("/api/project").json()
        self.draft=self.post("funding/context",dict(revision=self.state["revision"],planning_revision=self.state["planning"]["planning_revision"],design_revision=self.state["designer_revision"],target="activity",parcel_ids=[]))
        self.concept=self.post("funding/project-concept/create",dict(revision=self.state["revision"],draft=self.draft,route=R34))
        self.draft["project_concepts"]={R34:self.concept}
        self.save()

    def post(self,path,body,status=200):
        r=self.client.post("/api/"+path,json=body);self.assertEqual(r.status_code,status,r.text);return r.json()

    def context(self):
        self.state=self.client.get("/api/project").json()
        return dict(revision=self.state["revision"],funding_revision=self.state["funding_revision"],planning_revision=self.state["planning"]["planning_revision"],concept_id=self.concept["id"])

    def save(self):
        b=self.context();b.pop("concept_id")
        return self.post("funding/save",dict(**b,design_revision=self.state["designer_revision"],request_id=str(uuid4()),operation="draft",draft=self.draft,record_id=None))

    def preview(self):return self.post("funding/project-concept/transfer-preview",self.context())

    def transfer(self,resolutions=None):
        p=self.preview();body=dict(**self.context(),request_id=str(uuid4()),preview_hash=p["preview_hash"],resolutions={} if resolutions is None else resolutions)
        self.state=self.post("funding/project-concept/transfer",body);return body

    def edit(self,concept):
        self.state=self.post("demonstrator/project-concept",dict(**self.context(),request_id=str(uuid4()),operation="edit",concept=concept))

    def test_initial_repeat_route35_no_finance_change_and_both_workspace_edits(self):
        before=deepcopy(self.state["project"]);inputs=deepcopy(self.state["planning"]["draft"]["inputs"])
        body=self.transfer()
        repeated=self.post("funding/project-concept/transfer",body)
        self.assertEqual(repeated,self.state)
        self.assertEqual(self.state["project"],before)
        self.assertEqual(self.state["planning"]["draft"]["inputs"],inputs)
        record=self.state["planning"]["draft"]["project_concepts"][0]
        demo=deepcopy(record["concept"]);demo["notes"]="Demonstrator note";self.edit(demo)
        self.concept["purpose"]="Navigator purpose";self.save()
        p=self.preview();self.assertFalse(p["first_transfer"]);self.assertFalse(any(f["conflict"] for f in p["fields"]))
        self.transfer()
        record=self.state["planning"]["draft"]["project_concepts"][0]
        nav=self.client.get("/api/funding").json()["attachment"]["draft"]["project_concepts"][R34]
        self.assertEqual(nav,record["concept"]);self.assertEqual(nav,record["baseline"])
        self.assertEqual((nav["purpose"],nav["notes"]),("Navigator purpose","Demonstrator note"))
        self.draft["project_concepts"][R34]=nav
        c35=concepts.new(self.draft,R35);self.draft["project_concepts"][R35]=c35;self.save()
        self.concept=c35;self.transfer()
        self.assertEqual(len(self.state["planning"]["draft"]["project_concepts"]),2)
        self.assertEqual(self.state["planning"]["draft"]["inputs"],inputs)

    def test_conflict_requires_resolution_hash_rechecks_and_stale_revision(self):
        self.transfer();demo=deepcopy(self.concept);demo["purpose"]="Demo";self.edit(demo)
        self.concept["purpose"]="Navigator";self.save()
        p=self.preview();index=next(str(i) for i,f in enumerate(p["fields"]) if f["path"]==["purpose"])
        body=dict(**self.context(),request_id=str(uuid4()),preview_hash=p["preview_hash"],resolutions={})
        before=self.path.read_bytes();self.post("funding/project-concept/transfer",body,422);self.assertEqual(before,self.path.read_bytes())
        body["resolutions"]={index:"demonstrator"};body["preview_hash"]="a"*64
        self.post("funding/project-concept/transfer",body,422);self.assertEqual(before,self.path.read_bytes())
        body["preview_hash"]=p["preview_hash"];body["funding_revision"]-=1
        self.post("funding/project-concept/transfer",body,409);self.assertEqual(before,self.path.read_bytes())
        body["funding_revision"]+=1;self.post("funding/project-concept/transfer",body)
        self.assertEqual(self.client.get("/api/funding").json()["attachment"]["draft"]["project_concepts"][R34]["purpose"],"Demo")

    def test_write_failure_preserves_both_and_retry_idempotency(self):
        p=self.preview();body=dict(**self.context(),request_id=str(uuid4()),preview_hash=p["preview_hash"],resolutions={})
        before=self.path.read_bytes()
        with patch.object(Store,"write",side_effect=OSError("fixture disk full")):
            self.post("funding/project-concept/transfer",body,503)
        self.assertEqual(before,self.path.read_bytes())
        self.assertFalse(self.preview()["first_transfer"] is False)
        success=self.post("funding/project-concept/transfer",body)
        self.assertEqual(success,self.post("funding/project-concept/transfer",body))
        body["resolutions"]={"0":"demonstrator"};self.post("funding/project-concept/transfer",body,422)

    def test_export_import_missing_source_records_and_explicit_unlink(self):
        self.transfer();export=self.client.get("/api/export").json()
        verified=validate_export(export);self.assertEqual(verified["planning"]["project_concepts"][0]["concept"],self.concept)
        wrong=deepcopy(export);wrong["funding"]=None
        with self.assertRaisesRegex(Invalid,"last funding source"):validate_export(wrong)
        self.draft["project_concepts"]={}
        b=self.context();b.pop("concept_id")
        self.post("funding/save",dict(**b,design_revision=self.state["designer_revision"],request_id=str(uuid4()),operation="draft",draft=self.draft,record_id=None),422)
        self.post("demonstrator/project-concept",dict(**self.context(),request_id=str(uuid4()),operation="unlink",concept=None))
        self.save()
        self.assertEqual(self.client.get("/api/funding").json()["attachment"]["draft"]["project_concepts"],{})

    def test_missing_origin_fails_and_legacy_optional_absence_is_preserved(self):
        legacy=deepcopy(self.draft);legacy.pop("project_concepts")
        funding.validate_draft(legacy,self.state["project"]);self.assertNotIn("project_concepts",legacy)
        self.transfer();self.draft["project_concepts"]={R35:concepts.new(self.draft,R35)}
        # Keep the originating copy as a named alternative before changing active context.
        b=self.context();b.pop("concept_id")
        original=self.client.get("/api/funding").json()["attachment"]["draft"]
        self.post("funding/save",dict(**b,design_revision=self.state["designer_revision"],request_id=str(uuid4()),operation="save",draft=original,record_id=None))
        self.save();self.post("funding/project-concept/transfer-preview",self.context(),422)

    def test_linked_parcel_removal_is_identified_and_atomic(self):
        pid=self.state["project"]["parcels"][0]["id"]
        self.draft["baseline"]["parcel_ids"]=[pid];self.save();self.transfer()
        before=self.path.read_bytes()
        self.post("parcels/removal-preview",dict(revision=self.state["revision"],parcel_id=pid),422)
        response=self.post("parcels/delete",dict(revision=self.state["revision"],request_id=str(uuid4()),parcel_id=pid,confirm=True),422)
        self.assertIn(self.concept["title"],response["detail"]);self.assertEqual(before,self.path.read_bytes())

    def test_malformed_demonstrator_preview_is_actionable(self):
        self.transfer()
        self.post("demonstrator/project-concept/preview",dict(revision=self.state["revision"],concept_id=self.concept["id"],concept={}),422)

if __name__=="__main__":unittest.main()
