"""Read-only explorer projection; no project fixtures are shared with real saves."""
from collections import Counter
from contextlib import redirect_stdout, redirect_stderr
from copy import deepcopy
import io
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from backend import knowledge_graph as graph
from backend.app import create_app
from backend.engine_v3 import Invalid


class KnowledgeExplorerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ctx = graph.load_library()
        cls.snapshot = graph._explorer_graph(cls.ctx)

    def cli(self, args):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            status = graph.main(args)
        return status, out.getvalue(), err.getvalue()

    def test_exact_membership_and_native_identities(self):
        value = self.snapshot
        self.assertEqual(Counter(n['kind'] for n in value['nodes']), {'entity':85,'claim':67,'passage':46})
        self.assertEqual(Counter(e['kind'] for e in value['edges']), {'relationship':34,'claim_subject':170,'claim_cites':128,'entity_cites':184})
        self.assertEqual({n['id'] for n in value['nodes'] if n['kind']=='entity'}, set(self.ctx['entities']))
        self.assertEqual({n['id'] for n in value['nodes'] if n['kind']=='claim'}, set(self.ctx['data']['claims']))
        self.assertEqual({e['id'] for e in value['edges'] if e['kind']=='relationship'}, set(self.ctx['data']['relations']))
        self.assertEqual(value['dataset_hash'], self.ctx['hash'])
        self.assertEqual(value['consumer_registry_hash'], graph.feature_evidence('designer')['consumer_registry_hash'])
        self.assertEqual(value['coverage']['mode'], 'registered-pilot-only')

    def test_only_explicit_edges_with_stable_ids_and_typed_endpoints(self):
        nodes = {n['id']:n for n in self.snapshot['nodes']}
        for e in self.snapshot['edges']:
            a,b = nodes[e['source']], nodes[e['target']]
            if e['kind']=='relationship':
                r = self.ctx['data']['relations'][e['id']]
                self.assertEqual((a['details']['entity']['type'],b['details']['entity']['type']), graph.RELATION_TYPES[r['type']])
                self.assertEqual(e['details']['evidence'],graph._evidence(self.ctx,r['citation_ids']))
            else:
                self.assertEqual(e['id'], 'edge:'+graph._digest([e['kind'],e['source'],e['target']]))
                if e['kind']=='claim_subject':
                    self.assertIn(b['id'],a['details']['subject_ids']); self.assertEqual(e['details']['evidence'],[])
                else:
                    self.assertEqual(e['label'],'cites')
                    self.assertEqual(b['kind'],'passage')
                    refs = a['details']['evidence']
                    self.assertEqual(e['details']['evidence'], [r for r in refs if r['passage_id']==b['id']])
        # Relationship provenance alone never creates an entity-to-source link.
        actual={(e['source'],e['target']) for e in self.snapshot['edges'] if e['kind']=='entity_cites'}
        expected={(eid,self.ctx['registry']['citations'][cid]['passage_id']) for eid,e in self.ctx['entities'].items() for cid in e['citation_ids']}
        self.assertEqual(actual, expected)

    def test_passages_keep_roles_editions_and_complete_issues(self):
        seen=set()
        for n in self.snapshot['nodes']:
            if n['kind']!='passage':continue
            d=n['details'];self.assertEqual(d['page_basis'],'pdf')
            self.assertEqual(n['id'],f"{d['document']['id']}@{d['document']['sha256']}:pdf:{d['page']}")
            for r in d['citation_uses']:
                self.assertEqual((r['sha256'],r['page'],r['passage_id']),(d['document']['sha256'],d['page'],n['id']))
                self.assertEqual(r['role'],self.ctx['registry']['citations'][r['citation_id']]['role'])
                seen.add(r['citation_id'])
        self.assertEqual(seen,set(self.ctx['data']['sources']))
        p120=next(n for n in self.snapshot['nodes'] if n['kind']=='passage' and n['details']['document']['id']=='FUND-008' and n['details']['page']==120)
        self.assertEqual(p120['details']['citation_uses'][0]['role'],'route requirements')
        # A second explicitly registered use of that same page keeps its own role.
        ctx=deepcopy(self.ctx); original=p120['details']['citation_uses'][0]['citation_id']; new='fixture:distinct-role'
        ctx['data']['sources'][new]={**ctx['data']['sources'][original],'role':'fixture interpretation'}
        ctx['registry']['citations'][new]={**ctx['registry']['citations'][original],'role':'fixture interpretation'}
        result=graph._explorer_graph(ctx)
        passage=next(n for n in result['nodes'] if n['id']==p120['id'])
        self.assertEqual({r['role'] for r in passage['details']['citation_uses']},{'route requirements','fixture interpretation'})
        self.assertEqual((len(result['nodes']),len(result['edges'])),(198,516))
        tension=next(i for i in self.snapshot['issues'] if i['id']=='issue:mr2-stock-source-tension')
        self.assertEqual({r['page'] for c in tension['claims'] for r in c['evidence']},{133,134})
        self.assertEqual(len(tension['claims']),2);self.assertNotIn('preferred',tension)
        self.assertTrue(all(c['review_status']=='unresolved' for c in tension['claims']))
        call=next(n for n in self.snapshot['nodes'] if n['kind']=='entity' and n['details']['entity']['type']=='funding_call')
        self.assertEqual(call['details']['entity']['availability'],'not_assessed')

    def test_snapshot_is_deterministic_isolated_and_loaded_once(self):
        before=deepcopy(self.ctx)
        self.assertEqual(graph._explorer_graph(self.ctx),self.snapshot)
        self.assertEqual(self.ctx,before)
        with patch.object(graph,'load_library',return_value=self.ctx) as load:
            result=graph.explorer_graph();load.assert_called_once_with()
        result['nodes'][0]['label']='caller edit'
        self.assertEqual(graph._explorer_graph(self.ctx),self.snapshot)

    def test_failed_reads_and_broken_registration_retry_without_stale_graph(self):
        with TemporaryDirectory() as folder:
            path=Path(folder)/'pilot.json'
            with patch.object(graph,'LIBRARY_PATH',path):
                for text in (None,'{bad','{"version":1,"version":2}'):
                    if text is not None:path.write_text(text,encoding='utf8')
                    with self.assertRaises(Invalid):graph.explorer_graph()
                path.write_text(json.dumps(self.ctx['data']),encoding='utf8')
                self.assertEqual(graph.explorer_graph(),self.snapshot)
                original=Path.read_text
                def denied(p,*a,**kw):
                    if p==path:raise PermissionError('fixture access denied')
                    return original(p,*a,**kw)
                with patch.object(Path,'read_text',denied):
                    with self.assertRaisesRegex(Invalid,'fixture access denied'):graph.explorer_graph()
                path.unlink()
                with self.assertRaises(Invalid):graph.explorer_graph()
        with patch.object(graph,'FEATURE_CONSUMERS_PATH',Path('missing-explorer-consumers.json')):
            with self.assertRaises(Invalid):graph.explorer_graph()
        self.assertEqual(graph.explorer_graph(),self.snapshot)

    def test_endpoints_are_project_free_and_errors_are_actionable(self):
        with TemporaryDirectory() as folder:
            path=Path(folder)/'must-not-exist.json'
            app=create_app(path)
            with patch('backend.app.Store',side_effect=AssertionError('Explorer must not open project state')), TestClient(app) as client:
                self.assertEqual(client.get('/api/knowledge/explorer').json(),self.snapshot)
                search=client.get('/api/knowledge/search',params={'text':'\uff2d\uff32\uff12'})
                self.assertEqual(search.status_code,200);self.assertTrue(search.json()['ambiguous'])
                empty=client.get('/api/knowledge/search',params={'text':'no such pilot topic'})
                self.assertEqual(empty.status_code,200);self.assertEqual(empty.json()['matches'],[])
                self.assertEqual(client.get('/api/knowledge/search',params={'text':'carob','entity_type':'species'}).json()['matches'][0]['id'],'species:carob')
                result=client.get('/api/knowledge/impact',params={'target_kind':'claim','target_id':'claim:mr2-runoff-capture'})
                self.assertEqual(result.status_code,200,result.text);self.assertEqual(result.json()['version'],2)
                for endpoint,params in [('search',{}),('search',{'text':''}),('search',{'text':'x','entity_type':'unknown'}),('impact',{'target_kind':'entity','target_id':'species:carob'}),('impact',{'target_kind':'claim','target_id':'unknown'})]:
                    self.assertEqual(client.get('/api/knowledge/'+endpoint,params=params).status_code,422)
                for endpoint in ('explorer?unexpected=1','search?text=carob&unexpected=1','search?text=carob&text=MR2','impact?target_kind=claim&target_id=x&extra=1'):
                    self.assertEqual(client.get('/api/knowledge/'+endpoint).status_code,422)
                with patch.object(graph,'LIBRARY_PATH',Path(folder)/'missing.json'):
                    failed=client.get('/api/knowledge/explorer');self.assertEqual(failed.status_code,422);self.assertIn('missing.json',failed.text)
                self.assertEqual(client.get('/api/knowledge/explorer').status_code,200)
            self.assertFalse(path.exists())

    def test_cli_snapshot_errors_usage_and_check_compatibility(self):
        first=self.cli(['--explorer']);self.assertEqual(first,self.cli(['--explorer']))
        self.assertEqual((first[0],first[2]),(0,''));self.assertEqual(json.loads(first[1]),self.snapshot)
        with patch.object(graph,'LIBRARY_PATH',Path('missing-explorer.json')):
            status,out,err=self.cli(['--explorer']);self.assertEqual((status,out),(1,''));self.assertIn('missing-explorer.json',err)
        for args in (['--explorer','--issues'],['--explorer','--type','species'],['--explorer','--for-entity','species:carob']):
            with redirect_stderr(io.StringIO()),self.assertRaises(SystemExit) as caught:graph.main(args)
            self.assertEqual(caught.exception.code,2)
        with patch.object(graph,'_explorer_graph',side_effect=Invalid('fixture broken projection')):
            status,out,err=self.cli(['--check']);self.assertEqual((status,out),(1,''));self.assertIn('fixture broken projection',err)


if __name__=='__main__':unittest.main()
