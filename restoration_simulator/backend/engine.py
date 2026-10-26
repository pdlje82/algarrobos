"""Deterministic, copy-on-write simulation. Uses only the Python standard library."""
from copy import deepcopy
import json
import math
from pathlib import Path
from uuid import uuid4

SCENARIO_PATH = Path(__file__).resolve().parents[1] / 'scenarios' / 'default.json'
KINDS = {'land_start', 'restore_start', 'grant_apply', 'grant_award', 'grant_pay',
         'restore', 'organization', 'land', 'advance'}


class Invalid(ValueError):
    pass


def require(ok, message):
    if not ok:
        raise Invalid(message)


def number(value, low=0, high=1_000_000_000):
    return type(value) in (int, float) and math.isfinite(value) and low <= value <= high


def text(value, limit=2000):
    return isinstance(value, str) and 0 < len(value.strip()) <= limit


def same_json(expected, actual):
    """JSON numbers may lose a trailing .0 in a browser; booleans are never numbers."""
    if type(expected) in (int, float):
        return type(actual) in (int, float) and expected == actual
    if type(expected) is not type(actual):
        return False
    if isinstance(expected, dict):
        return expected.keys() == actual.keys() and all(same_json(v, actual[k]) for k, v in expected.items())
    if isinstance(expected, list):
        return len(expected) == len(actual) and all(same_json(a, b) for a, b in zip(expected, actual))
    return expected == actual


def _validate_scenario(scenario):
    require(isinstance(scenario, dict), 'Scenario must be an object.')
    require(scenario.get('id') == 'dryland-demonstrator' and scenario.get('version') == 1,
            'Unsupported scenario ID or version.')
    require(type(scenario.get('version')) is int, 'Invalid scenario version.')
    require(scenario.get('horizon') == 30 and type(scenario['horizon']) is int,
            'This engine supports a 30-year horizon.')
    require(number(scenario.get('initial_cash')), 'Invalid starting cash.')
    require(text(scenario.get('title')) and text(scenario.get('notice')), 'Missing scenario description.')
    outline = scenario.get('outline')
    require(isinstance(outline, list) and 2 <= len(outline) <= 20, 'Invalid outline.')
    for point in outline:
        require(isinstance(point, dict) and number(point.get('year'), 0, 30)
                and text(point.get('title')) and text(point.get('description')), 'Invalid outline milestone.')
    actions = scenario.get('actions')
    require(isinstance(actions, list) and 1 <= len(actions) <= 40, 'Invalid scenario actions.')
    ids = set()
    for a in actions:
        require(isinstance(a, dict), 'Invalid action definition.')
        require(text(a.get('id'), 80) and a['id'] not in ids, 'Invalid or duplicate action ID.')
        ids.add(a['id'])
        require(a.get('kind') in KINDS, 'Unsupported action handler.')
        require(all(text(a.get(k)) for k in ('title', 'description', 'outcome')), 'Invalid action wording.')
        require(number(a.get('cost')) and number(a.get('duration'), 0, 30), 'Invalid action cost or duration.')
        require(a['kind'] == 'advance' or a['duration'] >= 0.1, 'Actions must take at least 0.1 years.')
        require(type(a.get('optional')) is bool and type(a.get('repeatable')) is bool, 'Invalid action flags.')
        require(isinstance(a.get('requires'), list) and all(text(x, 80) for x in a['requires']), 'Invalid prerequisites.')
        effects = a.get('effects')
        require(isinstance(effects, dict), 'Invalid effects.')
        expected = {'land_start': {'area', 'access', 'owner'}, 'land': {'area', 'access', 'owner'},
                    'restore_start': {'area'}, 'restore': {'area'}, 'grant_award': {'award'},
                    'organization': {'organization'}}.get(a['kind'], set())
        require(set(effects) == expected, 'Unsupported effects for action handler.')
        if 'area' in effects:
            require(number(effects['area'], 0.1, 10000), 'Invalid parcel or restoration area.')
        if 'access' in effects:
            require(text(effects['access'], 100) and text(effects['owner'], 100), 'Invalid land labels.')
        if 'award' in effects:
            require(number(effects['award'], 1), 'Invalid grant award.')
        if 'organization' in effects:
            require(effects['organization'] in ('Company', 'Foundation'), 'Unsupported organization.')
        if a['kind'] in ('grant_apply', 'grant_award', 'grant_pay', 'land_start', 'restore_start', 'organization'):
            require(not a['repeatable'], 'This handler cannot be repeatable.')
    require(all(x in ids for a in actions for x in a['requires']), 'Unknown prerequisite action.')
    return deepcopy(scenario)


def validate_scenario(scenario):
    try:
        return _validate_scenario(scenario)
    except (KeyError, TypeError, OverflowError, RecursionError) as exc:
        raise Invalid('Malformed scenario fields.') from exc


def load_scenario():
    return validate_scenario(json.loads(SCENARIO_PATH.read_text(encoding='utf-8')))


def new_project(name, scenario=None, project_id=None):
    require(text(name, 80), 'Enter a project name of 1–80 characters.')
    scenario = validate_scenario(scenario if scenario is not None else load_scenario())
    return {'schema_version': 1, 'id': project_id or str(uuid4()), 'name': name.strip(),
            'scenario': scenario, 'revision': 0, 'time': 0, 'cash': scenario['initial_cash'],
            'parcels': [], 'activities': [], 'organizations': [],
            'grant': {'status': 'not_applied', 'amount': 0}, 'history': []}


def parcel_options(state, area):
    return [{'value': p['id'], 'label': f"{p['name']} · {p['access']}",
             'remaining_area': round(p['area'] - sum(x['area'] for x in state['activities']
                                                    if x['parcel_id'] == p['id']), 4)}
            for p in state['parcels']
            if p['area'] - sum(x['area'] for x in state['activities'] if x['parcel_id'] == p['id']) >= area]


def unavailable(state, a):
    if state['time'] >= state['scenario']['horizon']:
        return 'The 30-year horizon is complete. Undo to revisit the last decision.'
    completed = {h['action_id'] for h in state['history']}
    if not a['repeatable'] and a['id'] in completed:
        return 'Already completed.'
    missing = [x for x in a['requires'] if x not in completed]
    if missing:
        titles = {x['id']: x['title'] for x in state['scenario']['actions']}
        return 'First complete: ' + ', '.join(titles[x] for x in missing) + '.'
    kind = a['kind']
    if kind == 'land_start' and state['parcels']:
        return 'A starting land route has already been selected.'
    if kind == 'restore_start' and not state['parcels']:
        return 'First establish access to a starting parcel.'
    if kind == 'restore_start' and state['activities']:
        return 'The demonstrator is already complete.'
    if kind in ('restore', 'restore_start') and not parcel_options(state, a['effects']['area']):
        return 'No parcel has enough unrestored area. Acquire more land or access.'
    if kind == 'organization' and a['effects']['organization'] in state['organizations']:
        return 'This organization already exists.'
    expected = {'grant_apply': 'not_applied', 'grant_award': 'applied', 'grant_pay': 'awarded'}
    if kind in expected and state['grant']['status'] != expected[kind]:
        return 'Grant stage unavailable; each award can be paid only once.'
    if state['cash'] < a['cost']:
        return 'Insufficient available cash.'
    if round(state['time'] + a['duration'], 4) > state['scenario']['horizon']:
        return 'This action would finish beyond year 30.'
    return None


def list_actions(state):
    result = []
    for action in state['scenario']['actions']:
        a = deepcopy(action)
        a['reason'] = unavailable(state, a)
        a['available'] = a['reason'] is None
        a['fields'] = []
        if a['kind'] == 'advance':
            a['fields'] = [{'name': 'target_year', 'label': 'Advance to year', 'type': 'number',
                            'min': round(state['time'] + 0.0001, 4), 'max': 30, 'default': 30}]
        elif a['kind'] in ('restore', 'restore_start'):
            options = parcel_options(state, a['effects']['area'])
            a['fields'] = [{'name': 'parcel_id', 'label': 'Restoration parcel', 'type': 'select',
                            'options': options, 'default': options[0]['value'] if options else ''}]
        result.append(a)
    return result


def transition(state, action_id, inputs=None):
    """Return (new_state, explanation). No mutation, I/O, randomness or web dependency."""
    require(len(state['history']) < 500, 'The MVP supports at most 500 decisions per project.')
    action = next((a for a in state['scenario']['actions'] if a['id'] == action_id), None)
    require(action is not None, 'Unknown action.')
    reason = unavailable(state, action)
    require(reason is None, reason)
    inputs = {} if inputs is None else inputs
    require(isinstance(inputs, dict), 'Action inputs must be an object.')
    kind = action['kind']
    expected = {'target_year'} if kind == 'advance' else {'parcel_id'} if kind in ('restore', 'restore_start') else set()
    require(set(inputs) == expected, 'Provide exactly the fields shown for this action.')
    duration = action['duration']
    if kind == 'advance':
        target = inputs['target_year']
        require(number(target, 0, 30) and target > state['time'], 'Choose a later year, at most year 30.')
        require(round(target, 4) == target, 'Use at most four decimal places for time.')
        duration = round(target - state['time'], 4)
    if kind in ('restore', 'restore_start'):
        require(inputs['parcel_id'] in [p['value'] for p in parcel_options(state, action['effects']['area'])],
                'Choose a parcel with sufficient unrestored area.')
    new = deepcopy(state)
    new['time'] = round(new['time'] + duration, 4)
    new['cash'] = round(new['cash'] - action['cost'], 2)
    new['revision'] += 1
    effects = action['effects']
    if kind in ('land_start', 'land'):
        index = len(new['parcels']) + 1
        new['parcels'].append({'id': f'parcel-{index}', 'name': f'Parcel {index}', **effects,
                               'acquired_by': action_id, 'acquisition_cost': action['cost'], 'year': new['time']})
    elif kind in ('restore_start', 'restore'):
        new['activities'].append({'id': f"activity-{len(new['activities']) + 1}", 'title': action['title'],
                                  'parcel_id': inputs['parcel_id'], 'area': effects['area'],
                                  'year': new['time'], 'action_id': action_id})
    elif kind == 'organization':
        new['organizations'].append(effects['organization'])
    elif kind == 'grant_apply':
        new['grant']['status'] = 'applied'
    elif kind == 'grant_award':
        new['grant'] = {'status': 'awarded', 'amount': effects['award']}
    elif kind == 'grant_pay':
        new['cash'] = round(new['cash'] + new['grant']['amount'], 2)
        new['grant']['status'] = 'paid'
    explanation = action['outcome']
    new['history'].append({'action_id': action_id, 'title': action['title'], 'inputs': deepcopy(inputs),
                           'start': state['time'], 'end': new['time'], 'cost': action['cost'],
                           'cash_change': round(new['cash'] - state['cash'], 2), 'explanation': explanation})
    return new, explanation


def _validate_state(state):
    """Replay history against the embedded scenario to validate every derived field."""
    require(isinstance(state, dict) and type(state.get('schema_version')) is int
            and state['schema_version'] == 1, 'Unsupported save schema.')
    require(text(state.get('id'), 80) and text(state.get('name'), 80), 'Invalid project identity.')
    require(type(state.get('revision')) is int and 0 <= state['revision'] <= 1_000_000_000, 'Invalid revision.')
    require(number(state.get('time'), 0, 30) and number(state.get('cash')), 'Invalid time or cash.')
    history = state.get('history')
    require(isinstance(history, list) and len(history) <= 500, 'Invalid or excessively long history.')
    replay = new_project(state['name'], state.get('scenario'), state['id'])
    for h in history:
        require(isinstance(h, dict) and text(h.get('action_id'), 80), 'Invalid history entry.')
        replay, _ = transition(replay, h['action_id'], h.get('inputs'))
        require(same_json(replay['history'][-1], h), 'History does not match its configured action result.')
    replay['revision'] = state['revision']
    require(same_json(replay, state),
            'Saved state does not match its action history or field types.')
    return deepcopy(state)


def validate_state(state):
    try:
        return _validate_state(state)
    except (KeyError, TypeError, OverflowError, RecursionError) as exc:
        raise Invalid('Malformed saved project fields.') from exc


def summary(state):
    grant = state['grant']
    pending = {'not_applied': 'No grant application.', 'applied': 'Application pending decision; no cash received.',
               'awarded': 'Award pending payment; not available cash.', 'paid': 'Award paid once.'}[grant['status']]
    return {'complete': state['time'] == 30, 'area': sum(p['area'] for p in state['parcels']),
            'restored_area': sum(a['area'] for a in state['activities']),
            'completed_activities': len(state['activities']), 'grant_explanation': pending,
            'asset_explanation': 'Land area includes ownership and permission. Land has no assigned market valuation. Organizations do not receive land automatically.',
            'pending': pending if grant['status'] in ('applied', 'awarded') else 'No pending activity. Unchosen outline milestones are proposals only.'}
