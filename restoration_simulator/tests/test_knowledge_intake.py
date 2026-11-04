"""Candidate review is isolated from publication, live projects and rule adoption."""
from collections import Counter
from contextlib import redirect_stdout, redirect_stderr
from copy import deepcopy
import io
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from backend import knowledge_intake as intake, knowledge_graph as graph, documents
from backend.engine_v3 import Invalid


class KnowledgeIntakeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.current = intake._current_snapshot()
        cls.frozen = json.loads((Path(__file__).parent/'fixtures/knowledge-milestone-5-baseline.json').read_text(encoding='utf8'))

    def setUp(self):
        self.temp=TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.folder=Path(self.temp.name)
        self.data=deepcopy(self.current['ctx']['data']);self.registry=deepcopy(self.current['ctx']['registry'])
        self.cid='claim:life-nature-objectives'
        self.data['claims'][self.cid]['statement']+=' Test-only candidate wording.'
        self.manifest=None
        self.write()

    def write(self):
        for name,value in [('connected-pilot-v1.json',self.data),('citations-v1.json',self.registry)]:
            (self.folder/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
        proposed={'data':self.data,'registry':self.registry}
        changes=intake._changes(self.current['ctx'],proposed)
        refs=intake._affected_refs(changes,self.current['ctx'],proposed)
        pages={}
        for ctx in (self.current['ctx'],proposed):
            for cid in refs & set(ctx['data']['sources']):
                r=ctx['data']['sources'][cid];pages.setdefault((r['document_id'],r['sha256']),set()).add(r['page'])
        self.manifest={'version':1,'id':'isolated-review','title':'Test-only candidate','reviewed_on':self.data['reviewed_on'],'adoption':'explorer_only',
                       'baseline':deepcopy(self.current['baseline']),'candidate_files':{n:intake._sha((self.folder/n).read_bytes()) for n in intake.CANDIDATES},
                       'candidate_authorities':{bid:b['authority'] for bid,b in self.current['ctx']['bindings'].items()},
                       'source_review':[{'document_id':d,'sha256':s,'pages':sorted(p),'publication_context':'Isolated test uses the registered local edition.','review_notes':'Test fixture; no application content is published.'} for (d,s),p in sorted(pages.items())],
                       'reasons':{c['key']:'Explicit isolated-test replacement/removal.' for c in changes if c['operation']!='add' and c['key']!='knowledge.metadata/reviewed_on'}}
        self.save_manifest()

    def save_manifest(self):
        (self.folder/'batch.json').write_text(json.dumps(self.manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

    def cli(self,args):
        out,err=io.StringIO(),io.StringIO()
        with redirect_stdout(out),redirect_stderr(err):status=intake.main(args)
        return status,out.getvalue(),err.getvalue()

    def test_check_review_are_deterministic_complete_and_nonmutating(self):
        before=intake._fingerprints(intake._inputs());files={p.name:p.read_bytes() for p in self.folder.iterdir()}
        with patch('backend.storage.Store',side_effect=AssertionError('Intake must not open project state')):
            check=intake.check_batch(self.folder);review=intake.review_batch(self.folder)
        self.assertEqual(review,intake.review_batch(self.folder));self.assertEqual(check,intake.check_batch(self.folder))
        self.assertEqual(check['version'],1);self.assertTrue(check['compatibility']['feature_contexts_unchanged'])
        self.assertEqual(check['candidate']['consumer_registry_hash'],self.frozen['registration_hash'])
        self.assertNotEqual(check['candidate']['dataset_hash'],check['baseline']['dataset_hash'])
        self.assertEqual([c['key'] for c in review['changes']],['knowledge.claims/'+self.cid])
        target=next(t for t in review['impacts'] if t['kind']=='claim')
        self.assertTrue(target['before']['review_targets']);self.assertTrue(target['after']['review_targets'])
        self.assertEqual(target['after']['feature_dependencies'],[])
        self.assertEqual(before,intake._fingerprints(intake._inputs()))
        self.assertEqual(files,{p.name:p.read_bytes() for p in self.folder.iterdir()})
        self.assertEqual(self.cli(['--review',str(self.folder)]),self.cli(['--review',str(self.folder)]))

    def test_manifest_required_fields_versions_dates_adoption_and_unknown_fields_fail(self):
        mutations=[lambda m:m.update(version=True),lambda m:m.update(version=2),lambda m:m.update(extra=1),lambda m:m.pop('source_review'),
                   lambda m:m.update(reviewed_on='2099-01-01'),lambda m:m.update(reviewed_on='2026-02-30'),lambda m:m.update(id='../outside'),
                   lambda m:m.update(adoption='automatic'),lambda m:m.update(title='')]
        original=deepcopy(self.manifest)
        for mutate in mutations:
            with self.subTest(mutate=mutate):
                self.manifest=deepcopy(original);mutate(self.manifest);self.save_manifest()
                with self.assertRaises(Invalid):intake.check_batch(self.folder)

    def test_candidate_source_projection_requires_explicit_labels_and_is_nonmutating(self):
        registry=deepcopy(self.registry);labels={cid:ref['label'] for cid,ref in self.data['sources'].items()}
        before=deepcopy((registry,labels))
        self.assertEqual(intake.project_candidate_sources(registry,labels),self.data['sources'])
        self.assertEqual((registry,labels),before)
        labels.pop(next(iter(labels)))
        with self.assertRaises(Invalid):intake.project_candidate_sources(registry,labels)

    def test_missing_corrupt_duplicate_nonfinite_and_failed_file_reads_are_explicit(self):
        for raw in [b'{bad',b'{"version":1,"version":1}',b'{"version":NaN}',b'\xff']:
            (self.folder/'batch.json').write_bytes(raw)
            status,out,err=self.cli(['--check',str(self.folder)])
            self.assertEqual((status,out),(1,''));self.assertTrue(err)
        self.save_manifest();(self.folder/'citations-v1.json').unlink()
        with self.assertRaisesRegex(Invalid,'citations-v1.json'):intake.check_batch(self.folder)
        self.write();original=Path.read_bytes
        def denied(path):
            if path==self.folder/'batch.json':raise PermissionError('fixture access denied')
            return original(path)
        with patch.object(Path,'read_bytes',denied):
            with self.assertRaisesRegex(Invalid,'fixture access denied'):intake.check_batch(self.folder)
        self.assertEqual(intake.check_batch(self.folder)['version'],1)

    def test_stale_file_dataset_registration_and_candidate_fingerprints_fail(self):
        mutations=[lambda m:m['baseline'].update(dataset_hash='0'*64),lambda m:m['baseline'].update(consumer_registry_hash='0'*64),
                   lambda m:m['baseline']['files'].update({'scenarios/plant-prices.json':'0'*64}),
                   lambda m:m['candidate_files'].update({'connected-pilot-v1.json':'0'*64})]
        original=deepcopy(self.manifest)
        for mutate in mutations:
            self.manifest=deepcopy(original);mutate(self.manifest);self.save_manifest()
            with self.assertRaises(Invalid):intake.check_batch(self.folder)
        self.manifest=original;self.save_manifest();(self.folder/'connected-pilot-v1.json').write_bytes((self.folder/'connected-pilot-v1.json').read_bytes()+b' ')
        with self.assertRaisesRegex(Invalid,'fingerprint'):intake.check_batch(self.folder)

    def test_changed_native_authorities_and_missing_binding_fingerprints_fail(self):
        self.manifest['candidate_authorities'].pop('guide-life-nature');self.save_manifest()
        with self.assertRaisesRegex(Invalid,'Native bindings'):intake.check_batch(self.folder)
        self.write();original=graph._Resolver.owner
        def changed(resolver,name):
            value,path=original(resolver,name)
            if name=='research_guides':
                value=deepcopy(value);value['guides']['EU-LIFE-NATURE']['title']='Concurrent fixture guide edit'
            return value,path
        with patch.object(graph._Resolver,'owner',changed):
            with self.assertRaisesRegex(Invalid,'stale'):intake.check_batch(self.folder)
        self.assertEqual(intake.check_batch(self.folder)['version'],1)

    def test_bad_candidate_schema_citations_editions_pages_bindings_and_references_fail(self):
        original_data,original_registry=deepcopy(self.data),deepcopy(self.registry)
        mutations=[lambda d,r:d.pop('sources'),lambda d,r:d.update(version=2),lambda d,r:d['claims'][self.cid].update(subject_ids=['missing']),
                   lambda d,r:d['bindings']['guide-life-nature'].update(adapter='unknown'),lambda d,r:d['bindings']['plant-kermes-oak'].update(native_id='missing'),
                   lambda d,r:r.update(version=True),lambda d,r:r.update(extra=1),
                   lambda d,r:next(iter(r['passages'].values())).update(page=99999),lambda d,r:next(iter(r['editions'].values())).update(sha256='0'*64)]
        for i,mutate in enumerate(mutations):
            self.data,self.registry=deepcopy(original_data),deepcopy(original_registry);mutate(self.data,self.registry)
            # Deliberately malformed candidates bypass fixture ledger construction.
            for name,value in [('connected-pilot-v1.json',self.data),('citations-v1.json',self.registry)]:
                (self.folder/name).write_text(json.dumps(value),encoding='utf8');self.manifest['candidate_files'][name]=intake._sha((self.folder/name).read_bytes())
            self.save_manifest()
            with self.subTest(i=i),self.assertRaises(Invalid):intake.check_batch(self.folder)

    def test_replacements_and_removals_require_explicit_exact_reasons(self):
        self.manifest['reasons']={};self.save_manifest()
        with self.assertRaisesRegex(Invalid,'reasons'):intake.check_batch(self.folder)
        self.data=deepcopy(self.current['ctx']['data']);self.data['claims'].pop('claim:life-sap-purpose');self.write()
        self.manifest['reasons']={};self.save_manifest()
        with self.assertRaisesRegex(Invalid,'reasons'):intake.review_batch(self.folder)
        self.write();review=intake.review_batch(self.folder)
        change=next(c for c in review['changes'] if c['operation']=='remove')
        self.assertEqual(change['id'],'claim:life-sap-purpose');self.assertIsNone(change['after'])
        target=next(i for i in review['impacts'] if i['id']==change['id'])
        self.assertIsNotNone(target['before']);self.assertIsNone(target['after'])

    def test_incomplete_source_reviews_and_future_verification_dates_fail(self):
        original=deepcopy(self.manifest)
        for mutate in [lambda m:m.update(source_review=[]),lambda m:m['source_review'][0].update(pages=[8]),lambda m:m['source_review'][0].update(pages=[9,8]),
                       lambda m:m['source_review'][0].update(review_notes=''),lambda m:m['source_review'][0].update(extra=1)]:
            self.manifest=deepcopy(original);mutate(self.manifest);self.save_manifest()
            with self.assertRaises(Invalid):intake.check_batch(self.folder)
        self.manifest=original;self.save_manifest()
        cid=self.data['claims'][self.cid]['citation_ids'][0]
        self.registry['citations'][cid]['verified_on']='2099-01-01';self.data['sources'][cid]['verified_on']='2099-01-01';self.write()
        with self.assertRaisesRegex(Invalid,'verification date'):intake.check_batch(self.folder)

    def test_existing_feature_changes_are_rejected_without_touching_drafts(self):
        self.data['claims']['claim:al20-34-novel-demonstration']['statement']+=' Unadopted fixture change.';self.write()
        before=intake._fingerprints(intake._inputs())
        with self.assertRaisesRegex(Invalid,'Existing feature contexts changed:.*selection_guidance/route-34'):intake.review_batch(self.folder)
        self.assertEqual(before,intake._fingerprints(intake._inputs()))

    def test_new_claim_about_existing_subject_is_not_automatically_adopted(self):
        self.data=deepcopy(self.current['ctx']['data']);claim=deepcopy(self.data['claims']['claim:kermes-community-context'])
        claim['subject_ids']=['species:carob'];claim['review_targets']=['plant-carob'];claim['statement']='Isolated proposed source-context claim about carob.'
        self.data['claims']['claim:isolated-carob-context']=claim;self.write()
        report=intake.review_batch(self.folder);row=next(i for i in report['impacts'] if i['id']=='claim:isolated-carob-context')
        self.assertIsNone(row['before']);self.assertEqual(row['after']['feature_dependencies'],[])
        self.assertTrue(report['compatibility']['feature_contexts_unchanged'])

    def test_source_metadata_updates_expose_citation_and_manual_paths(self):
        self.data=deepcopy(self.current['ctx']['data']);cid=self.data['claims'][self.cid]['citation_ids'][0]
        self.registry['citations'][cid]['role']='Isolated reviewed context role';self.data['sources'][cid]['role']='Isolated reviewed context role';self.write()
        report=intake.review_batch(self.folder);pid=self.registry['citations'][cid]['passage_id'];impact=next(i for i in report['impacts'] if i['id']==pid)
        for side in ('before','after'):
            self.assertEqual({d['consumer_id'] for d in impact[side]['validation_dependencies']},{'knowledge_pilot'})
            self.assertTrue(impact[side]['review_targets']);self.assertEqual(impact[side]['feature_dependencies'],[])
        al20=graph.impact('claim','claim:al20-34-novel-demonstration')
        self.assertEqual({d['consumer_id'] for d in al20['feature_dependencies']},{'selection_guidance','project_concept','delivery_plan'})

    def test_binding_only_change_reports_all_registered_dependent_claims(self):
        self.data=deepcopy(self.current['ctx']['data'])
        self.data['bindings']['guide-life-nature']['explanation']+=' Isolated reference-review note.'
        self.write();report=intake.review_batch(self.folder)
        self.assertEqual([c['key'] for c in report['changes']],['knowledge.bindings/guide-life-nature'])
        claims=[r for r in report['impacts'] if r['kind']=='claim']
        self.assertEqual({r['id'] for r in claims},{'claim:life-nature-objectives','claim:life-sap-purpose','claim:life-sap-cofinancing-framework'})
        self.assertEqual(self.manifest['source_review'][0]['pages'],[8,9,20,21])
        for row in claims:
            self.assertEqual(row['after']['feature_dependencies'],[])
            target=row['after']['review_targets'][0]['target']
            self.assertIn('Isolated reference-review note.',target['explanation'])

    def test_document_failures_retry_and_once_per_edition(self):
        with patch.object(documents,'verified_file',side_effect=HTTPException(404,'Fixture source missing')):
            status,out,err=self.cli(['--review',str(self.folder)])
            self.assertEqual((status,out),(1,''));self.assertIn('Fixture source missing',err)
        with patch.object(documents,'verified_file') as verify:
            report=intake.check_batch(self.folder)
            self.assertEqual(verify.call_count,6)
            self.assertEqual(len(report['verified_editions']),6)
            self.assertEqual(len({(c.args[0],c.kwargs['expected_sha256']) for c in verify.call_args_list}),6)
        self.assertEqual(intake.check_batch(self.folder)['version'],1)

    def test_files_changed_during_validation_do_not_return_partial_success(self):
        original=documents.verified_file;changed=False
        def change(*args,**kwargs):
            nonlocal changed
            if not changed:
                changed=True;p=self.folder/'connected-pilot-v1.json';p.write_bytes(p.read_bytes()+b' ')
            return original(*args,**kwargs)
        with patch.object(documents,'verified_file',change):
            status,out,err=self.cli(['--check',str(self.folder)])
            self.assertEqual((status,out),(1,''));self.assertIn('Candidate files changed during review',err)
        self.write();original_inputs=intake._inputs;calls=0
        def concurrent():
            nonlocal calls
            calls+=1;result=original_inputs()
            if calls>=3:result['scenarios/plant-prices.json']+=b' '
            return result
        with patch.object(intake,'_inputs',concurrent):
            with self.assertRaisesRegex(Invalid,'canonical authority changed during review'):intake.check_batch(self.folder)

    def test_cli_usage_errors_and_published_candidates_are_stale(self):
        for args in [[],['--check'],['--check',str(self.folder),'--review',str(self.folder)],['--unknown']]:
            with redirect_stderr(io.StringIO()),self.assertRaises(SystemExit) as caught:intake.main(args)
            self.assertEqual(caught.exception.code,2)
        for ident in ('life-nature-v1','kermes-oak-v1'):
            status,out,err=self.cli(['--check',str(graph.DIRECTORY/'knowledge/intake'/ident)])
            self.assertEqual((status,out),(1,''));self.assertIn('stale',err)

    def test_original_records_graph_and_feature_contexts_keep_fingerprints(self):
        ctx=self.current['ctx'];frozen=self.frozen
        for collection,records in frozen['data'].items():
            for ident,digest in records.items():self.assertEqual(graph._digest(ctx['data'][collection][ident]),digest,(collection,ident))
        for collection,records in frozen['registry'].items():
            for ident,digest in records.items():
                if collection=='consumers' and ident=='knowledge_pilot':continue
                self.assertEqual(graph._digest(ctx['registry'][collection][ident]),digest,(collection,ident))
        original_members=frozen['consumer_memberships']['knowledge_pilot']['citation_ids']
        self.assertEqual([cid for cid in ctx['registry']['consumers']['knowledge_pilot']['citation_ids'] if cid in original_members],original_members)
        nodes={n['id']:n for n in self.current['graph']['nodes']};edges={e['id']:e for e in self.current['graph']['edges']}
        self.assertEqual((len(frozen['nodes']),len(frozen['edges'])),(34,52))
        for ident,digest in frozen['nodes'].items():
            n=nodes[ident];value=n if n['kind']!='entity' else {**n,'details':{k:n['details'][k] for k in ['entity','authority','evidence']}}
            self.assertEqual(graph._digest(value),digest,ident)
        for ident,digest in frozen['edges'].items():self.assertEqual(graph._digest(edges[ident]),digest,ident)
        for c,digest in frozen['feature_contexts'].items():self.assertEqual(graph._digest(self.current['features'][c]['contexts']),digest,c)
        self.assertEqual(graph._digest(self.current['registration']),frozen['registration_hash'])

    def test_published_batches_have_exact_scope_sources_and_unresolved_contexts(self):
        ctx=self.current['ctx'];base_claims=set(self.frozen['data']['claims'])
        new=set(ctx['data']['claims'])-base_claims
        self.assertEqual((sum(c.startswith('claim:life-') for c in new),sum(c.startswith('claim:kermes-') for c in new)),(3,6))
        self.assertEqual(set(ctx['entities'])-set(self.frozen['data']['entities']),{'programme:EU-LIFE','route:EU-LIFE-NATURE','species:kermes_oak','series:coscoja_series','series:lentisk_series'})
        self.assertEqual((len(self.current['graph']['nodes']),len(self.current['graph']['edges'])),(55,86))
        issue=next(i for i in self.current['graph']['issues'] if i['id']=='issue:kermes-warm-series-naming')
        self.assertEqual(len(issue['claims']),2);self.assertTrue(all(c['review_status']=='unresolved' for c in issue['claims']));self.assertNotIn('preferred',issue)
        self.assertTrue(all(ctx['entities'][e]['availability']=='not_assessed' for e in ['programme:EU-LIFE','route:EU-LIFE-NATURE']))
        self.assertEqual(ctx['data']['coverage']['root_entities'][:3],['route:LEADER-AL20-3.4','species:carob','approach:mr2'])
        for c in new:self.assertEqual(graph._impact(ctx,'claim',c,self.current['registration'])['feature_dependencies'],[])
        optional=ctx['data']['relations']['relation:mr2-optional-kermes'];self.assertEqual(optional['basis'],'project_assumption')
        broken=deepcopy(ctx['data']);broken['relations']['relation:mr2-optional-kermes']['target']='species:carob'
        with self.assertRaisesRegex(Invalid,'not optional'):graph._build(broken,ctx['registry'])
        reports=[json.loads((graph.DIRECTORY/'knowledge/intake'/i/'review.json').read_text(encoding='utf8')) for i in ('life-nature-v1','kermes-oak-v1')]
        self.assertEqual(reports[0]['candidate']['dataset_hash'],reports[1]['baseline']['dataset_hash'])
        self.assertEqual(reports[1]['candidate']['dataset_hash'],ctx['hash'])
        self.assertTrue(all(r['adoption']=='explorer_only' and r['compatibility']['feature_contexts_unchanged'] for r in reports))


if __name__=='__main__':unittest.main()
