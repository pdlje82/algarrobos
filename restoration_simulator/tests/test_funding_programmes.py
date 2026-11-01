from copy import deepcopy
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from backend import funding, funding_programmes as programmes, funding_guides, funding_visual, engine
from backend.configuration import read_json
from backend.app import create_app
from backend.engine import Invalid


class ProgrammeTests(unittest.TestCase):
    def setUp(self):
        self.catalogue=funding.catalogue()
        self.guides=funding_guides.validate(read_json(funding_guides.LIBRARY),self.catalogue)
        self.data=read_json(programmes.LIBRARY)

    def test_every_route_has_one_explicit_parent_and_source_cited_introduction(self):
        value=programmes.validate(self.data,self.catalogue,self.guides)
        self.assertEqual(len(value['programmes']),80)
        ids=[id for p in value['programmes'] for id in p['entry_ids']]
        self.assertEqual(len(ids),99);self.assertEqual(len(set(ids)),99)
        grouped={p['id']:len(p['entry_ids']) for p in value['programmes'] if len(p['entry_ids'])>1}
        self.assertEqual(grouped,{'LEADER-AL20':12,'EU-LIFE':4,'EU-HORIZON':6})
        for p in value['programmes']:
            self.assertTrue(p['guide']['sources'])
            self.assertTrue(all(p['guide'][key] for key in funding_guides.SECTIONS))
        own=next(p for p in value['programmes'] if p['id']=='SELF-FUNDS')
        self.assertIn('already available',own['guide']['what'])
        source=self.guides['guides']['NATURE-01']
        reused=next(p for p in value['programmes'] if p['id']=='NATURE-01')
        self.assertEqual(source['what'],reused['guide']['what'])

    def test_missing_members_duplicate_unknown_routes_sources_and_versions_are_errors(self):
        for mutate in [
            lambda d:d.update(version=2),lambda d:d['defaults'].pop('show_met'),
            lambda d:d['programmes'].pop(),lambda d:d['programmes'][0]['entry_ids'].append('UNKNOWN'),
            lambda d:d['programmes'][0]['entry_ids'].append(d['programmes'][1]['entry_ids'][0]),
            lambda d:d['programmes'][0]['introduction']['source_ids'].append('missing'),
            lambda d:d['extra_sources']['programme-life'].update(url='javascript:alert(1)'),
            lambda d:d['programmes'][0]['introduction'].pop('limitations'),
            lambda d:d['programmes'][3].update(guide_id='NATURE-01'),
        ]:
            invalid=deepcopy(self.data);mutate(invalid)
            with self.assertRaises(Invalid):programmes.validate(invalid,self.catalogue,self.guides)
        with patch.object(programmes,'LIBRARY',programmes.LIBRARY.with_name('missing-programmes.json')):
            with self.assertRaisesRegex(Invalid,'Cannot load required'):programmes.describe()

    def test_endpoint_is_versioned_read_only_and_cannot_change_a_snapshot(self):
        app=create_app()
        with TestClient(app) as client:
            response=client.get('/api/funding/programmes');self.assertEqual(response.status_code,200,response.text)
            self.assertEqual(response.json()['version'],1);self.assertIsNone(app.state.store)
        p=engine.new_project('Programme fixture');d=funding.new_draft(p,None,[],'business')
        before=deepcopy(d);project=deepcopy(p)
        programmes.describe();funding_visual.visualise(funding.evaluate(d,p))
        self.assertEqual(d,before);self.assertEqual(p,project)

    def test_coverage_distinguishes_five_al20_assessments_seven_guides_and_cash_calculation(self):
        p=engine.new_project('Coverage fixture');d=funding.new_draft(p,None,[],'business')
        model=funding_visual.describe(funding.evaluate(d,p));al20=next(p for p in self.data['programmes'] if p['id']=='LEADER-AL20')['entry_ids']
        fit={c['option_id'] for c in model['conditions'] if c['effect']=='eligibility'}
        self.assertEqual(len(fit.intersection(al20)),5)
        self.assertEqual(len(set(al20)-fit),7)
        self.assertTrue(any(c['option_id']=='SELF-FUNDS' and c['effect']=='amount' for c in model['conditions']))
        cash=[c for c in model['conditions'] if c['option_id']=='SELF-FUNDS']
        self.assertTrue(all(c['fields']==['available_contribution'] for c in cash))
