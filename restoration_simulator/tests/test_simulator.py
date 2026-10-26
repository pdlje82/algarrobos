from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient

from backend.app import create_app
from backend.engine import Invalid, list_actions, new_project, summary, transition, validate_state


class EngineTests(unittest.TestCase):
    def test_complete_routes_with_and_without_organizations(self):
        for route in ('use_own_land', 'buy_demonstrator'):
            for organizations in (False, True):
                with self.subTest(route=route, organizations=organizations):
                    state = new_project('Playtest')
                    steps = [(route, {}), ('demonstrator', {'parcel_id': 'parcel-1'}),
                             ('apply_grant', {}), ('award_grant', {}), ('receive_payment', {}),
                             ('expand', {'parcel_id': 'parcel-1'}), ('buy_land', {}),
                             ('access_land', {}), ('expand', {'parcel_id': 'parcel-3'})]
                    if organizations:
                        steps += [('company', {}), ('foundation', {})]
                    for action, inputs in steps:
                        before = deepcopy(state)
                        state, _ = transition(state, action, inputs)
                        self.assertEqual(before['history'], state['history'][:-1])
                    state, _ = transition(state, 'advance', {'target_year': 30})
                    expected = 51000 - (18000 if route == 'buy_demonstrator' else 0) - (5000 if organizations else 0)
                    self.assertEqual(state['cash'], expected)
                    self.assertEqual(len(state['history']), len(steps) + 1)
                    self.assertEqual(state['organizations'], ['Company', 'Foundation'] if organizations else [])
                    self.assertEqual(state['parcels'][2]['owner'], 'Third party')
                    self.assertEqual(state['parcels'][0]['owner'], 'Individual')
                    self.assertEqual(summary(state)['restored_area'], 3)
                    self.assertTrue(summary(state)['complete'])
                    self.assertEqual(validate_state(state), state)

    def test_invalid_actions_leave_original_unchanged(self):
        state = new_project('Checks')
        for action, inputs in [('receive_payment', {}), ('advance', {'target_year': 31}),
                               ('advance', {'target_year': True}), ('company', {}),
                               ('use_own_land', {'cost': 0})]:
            original = deepcopy(state)
            with self.assertRaises(Invalid):
                transition(state, action, inputs)
            self.assertEqual(state, original)
        self.assertTrue(next(a for a in list_actions(state) if a['id'] == 'company')['reason'])

    def test_grants_are_separate_and_paid_once(self):
        state = new_project('Funding')
        for a, inputs in [('use_own_land', {}), ('demonstrator', {'parcel_id': 'parcel-1'}), ('apply_grant', {})]:
            state, _ = transition(state, a, inputs)
        self.assertEqual(state['cash'], 47500)
        self.assertEqual(state['grant']['status'], 'applied')
        state, _ = transition(state, 'award_grant')
        self.assertEqual(state['cash'], 47500)
        state, _ = transition(state, 'receive_payment')
        self.assertEqual(state['cash'], 87500)
        with self.assertRaises(Invalid):
            transition(state, 'receive_payment')

    def test_frozen_scenario_and_horizon(self):
        state = new_project('Frozen')
        scenario = deepcopy(state['scenario'])
        scenario['actions'][0]['cost'] = 123
        different = new_project('Later', scenario)
        self.assertEqual(state['scenario']['actions'][0]['cost'], 0)
        self.assertEqual(different['scenario']['actions'][0]['cost'], 123)
        state, _ = transition(state, 'advance', {'target_year': 29.9})
        with self.assertRaises(Invalid):
            transition(state, 'buy_demonstrator')


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / 'save.json'
        self.app = create_app(self.path)
        self.client = TestClient(self.app)
        self.post('project/new', name='API journey')

    def tearDown(self):
        self.client.close()
        self.temp.cleanup()

    def current(self):
        response = self.client.get('/api/project')
        self.assertEqual(response.status_code, 200)
        return response.json()

    def post(self, endpoint, expected=200, **body):
        payload = {'revision': self.current()['revision'], 'request_id': str(uuid4()), **body}
        response = self.client.post('/api/' + endpoint, json=payload)
        self.assertEqual(response.status_code, expected, response.text)
        return response.json()

    def commit(self, action, inputs=None):
        return self.post('commit', action_id=action, inputs=inputs or {})

    def test_preview_and_replay_after_restart_and_undo(self):
        before = self.current()
        disk = self.path.read_bytes()
        request = {'revision': before['revision'], 'action_id': 'use_own_land', 'inputs': {}}
        self.assertEqual(self.client.post('/api/preview', json=request).status_code, 200)
        self.assertEqual(self.current(), before)
        self.assertEqual(self.path.read_bytes(), disk)
        request['request_id'] = str(uuid4())
        self.assertEqual(self.client.post('/api/commit', json=request).status_code, 200)
        committed = self.current()['project']
        self.client = TestClient(create_app(self.path))  # restart Python adapter and storage
        self.assertEqual(self.current()['project'], committed)
        self.assertTrue(self.current()['can_undo'])
        self.assertEqual(self.client.post('/api/commit', json=request).status_code, 200)
        self.assertEqual(self.current()['project'], committed)
        stale = {**request, 'request_id': str(uuid4())}
        self.assertEqual(self.client.post('/api/commit', json=stale).status_code, 409)
        self.post('undo')
        self.assertEqual(self.current()['project']['parcels'], [])
        self.assertEqual(self.client.post('/api/commit', json=request).status_code, 200)
        self.assertEqual(self.current()['project']['parcels'], [])

    def test_export_import_undo_and_invalid_import_preserve_save(self):
        self.commit('buy_demonstrator')
        self.commit('demonstrator', {'parcel_id': 'parcel-1'})
        exported = self.client.get('/api/export').json()
        self.post('project/new', name='Replacement', confirm_replace=True)
        self.post('import', save=exported, confirm_replace=True)
        self.assertEqual(self.current()['project']['activities'], exported['project']['activities'])
        self.post('undo')
        self.assertEqual(self.current()['project']['activities'], [])
        before = self.current()
        disk = self.path.read_bytes()
        corruptions = [lambda x: x.update(format_version=2),
                       lambda x: x['project'].update(cash=-1),
                       lambda x: x['project'].update(time=True),
                       lambda x: x['project'].update(parcels=[]),
                       lambda x: x['project']['scenario'].update(version=77),
                       lambda x: x['project']['scenario']['actions'][0].update(kind=[]),
                       lambda x: x['project']['history'][0].update(cost=True),
                       lambda x: x['undo'].update(history=[])]
        for corrupt in corruptions:
            payload = deepcopy(exported)
            corrupt(payload)
            self.post('import', expected=422, save=payload, confirm_replace=True)
            self.assertEqual(self.current(), before)
            self.assertEqual(self.path.read_bytes(), disk)
        malformed = self.client.post('/api/import', content='{broken', headers={'Content-Type': 'application/json'})
        self.assertEqual(malformed.status_code, 422)
        self.assertEqual(self.current(), before)

    def test_save_failure_is_visible_and_does_not_publish_candidate(self):
        before = self.current()
        disk = self.path.read_bytes()
        with patch('backend.storage.os.replace', side_effect=OSError('Disk unavailable')):
            failed = self.post('commit', expected=503, action_id='use_own_land', inputs={})
        self.assertIn('Disk unavailable', failed['detail'])
        self.assertEqual(self.current(), before)
        self.assertEqual(self.path.read_bytes(), disk)
        self.assertEqual(list(self.path.parent.glob('*.tmp')), [])

    def test_browser_json_numbers_roundtrip_at_year_30(self):
        self.commit('use_own_land')
        self.commit('advance', {'target_year': 30})
        exported = self.client.get('/api/export').json()
        browser_export = json.loads(json.dumps(exported), parse_float=lambda s:
                                    int(float(s)) if float(s).is_integer() else float(s))
        self.post('import', save=browser_export, confirm_replace=True)
        self.assertEqual(self.current()['project']['time'], 30)
        self.assertTrue(self.current()['can_undo'])

    def test_confirmation_and_request_validation(self):
        before = self.current()
        self.post('project/new', expected=422, name='Accidental replacement')
        self.assertEqual(self.current(), before)
        self.post('commit', expected=422, action_id='use_own_land', inputs={}, revision=True)
        self.assertEqual(self.current(), before)
        response = self.client.post('/api/import', content=' ' * 2_000_001)
        self.assertEqual(response.status_code, 413)

    def test_corrupt_autosave_is_never_overwritten(self):
        self.path.write_text('{broken', encoding='utf-8')
        client = TestClient(create_app(self.path))
        self.assertEqual(client.get('/api/project').status_code, 503)
        self.assertEqual(client.post('/api/project/new', json={'revision': 0, 'request_id': str(uuid4()), 'name': 'Oops'}).status_code, 503)
        self.assertEqual(self.path.read_text(), '{broken')


if __name__ == '__main__':
    unittest.main()
