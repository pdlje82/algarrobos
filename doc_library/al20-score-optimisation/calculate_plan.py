"""Explicit proposed selection; never writes project/app state."""
from copy import deepcopy
from decimal import Decimal
from pathlib import Path
import hashlib, json, sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / 'restoration_simulator'))
from backend.funding_selection import calculate

source = ROOT / 'doc_library/al20-demonstrator-proposal/Baseline and retained rules.json'
baseline = json.loads(source.read_text(encoding='utf-8'))
save = ROOT / baseline['save_path']
digest = hashlib.sha256(save.read_bytes()).hexdigest()
if digest != baseline['save_sha256']:
    raise ValueError('The intended saved baseline changed. Review the new save before recalculating.')
draft = baseline['draft']
if draft['bundle']['selection']['version'] != 2:
    raise ValueError('Expected retained scoring edition 2.')
route = 'LEADER-AL20-3.4'
selected = {
    'CO.1.3', 'CC.2.1', 'IG.8.2', 'IG.11.5', 'IG.11.7',
    'DRI.3.1', 'DRI.3.2', 'JR.3.4', 'JR.3.5',
    'IN.1.2', 'PT.1.1', 'PT.1.2', 'PS.1.2', 'PS.1.3', 'SP.1.1'
}
definitions = draft['bundle']['selection']['profiles']['line3']['criteria']
known = {x['id'] for c in definitions for x in c['choices']}
if selected - known:
    raise ValueError('Unknown selected claims: ' + repr(selected - known))

def case(name, chosen):
    answers = deepcopy(draft['selection_assessments'])
    # Deliberate removal of the saved municipal lookup from this numeric-only
    # scenario: no new geographic assessment is made for the destination plot.
    if 'location_lookup' in answers[route]:
        del answers[route]['location_lookup']
    for row in answers[route]['criteria'].values():
        row['reference'] = 'Proposed programme; see Fuentes y condiciones de puntuacion.txt and edll_references in this JSON.'
        row['notes'] = 'Numeric counterfactual only; commitments and evidence require review. Not an application import.'
        for key in row['answers']:
            row['answers'][key] = key in chosen
    score = calculate(draft['bundle'], answers, route)
    if score['unresolved'] or score['total'] is None:
        raise ValueError('Hypothetical score is incomplete: ' + name)
    # Independent decimal/cap cross-check, separate from the app evaluator.
    manual = Decimal('0')
    for c in definitions:
        for group in c['exclusive_groups']:
            if len(chosen.intersection(group)) > 1:
                raise ValueError('Exclusive alternatives selected together: ' + c['id'])
        raw = sum((Decimal(x['points']) for x in c['choices'] if x['id'] in chosen), Decimal('0'))
        manual += min(Decimal(c['cap']), raw)
    if manual != Decimal(str(score['total'])):
        raise ValueError('Independent score disagrees: ' + name)
    return {'name': name, 'status': 'Counterfactual proposed commitments, not accredited facts or an adopted save',
            'chosen': sorted(chosen), 'answers': answers[route], 'score': score}

recommended = case('Recommended programme and qualifying applicant profile', selected)
if Decimal(str(recommended['score']['total'])) != Decimal('66.49'):
    raise ValueError('Recommended total must be 66.49.')
scenarios = [recommended]
for label, removed in [
    ('No new proximity-service credit', {'SP.1.1'}),
    ('No innovative-theme credit', {'IN.1.2'}),
    ('No renewable equipment acquisition/credit', {'CC.2.1'}),
    ('No cross-cutting-objective membership credit', {'PS.1.2'}),
    ('No territorial rural-development membership credit', {'PS.1.3'}),
    ('No applicant-membership credits: activities alone', {'PS.1.2', 'PS.1.3'}),
    ('Neither service nor innovative-theme credit', {'SP.1.1', 'IN.1.2'}),
    ('Neither service nor renewable-equipment credit', {'SP.1.1', 'CC.2.1'}),
    ('Only natural-heritage credit, no traditional-stone-work credit', {'PT.1.2'}),
    ('Staff training only, no beyond-minimum accessibility credit', {'DRI.3.1'})
]:
    scenarios.append(case(label, selected - removed))

baseline_answers = draft['selection_assessments'][route]['criteria']
changes = []
for cid, row in recommended['answers']['criteria'].items():
    for key, value in row['answers'].items():
        old = baseline_answers[cid]['answers'][key]
        if old != value:
            changes.append({'criterion': cid, 'choice': key, 'saved': old, 'proposed_model': value,
                            'adopted': False})

# These are finite alternative programme combinations, not a claim of global
# ecological/cost optimality. Dependencies are declared and rejected explicitly.
core = selected - {'CC.2.1', 'IN.1.2', 'SP.1.1', 'PS.1.2', 'PS.1.3'}
modules = [('solar', {'CC.2.1'}), ('resident_service_theme', {'IN.1.2'}),
           ('new_service', {'SP.1.1'}), ('transversal_membership', {'PS.1.2'}),
           ('rural_development_membership', {'PS.1.3'})]
combinations = []
rejected = []
for bits in range(1 << len(modules)):
    names = [name for i, (name, _) in enumerate(modules) if bits & (1 << i)]
    if 'resident_service_theme' in names and 'new_service' not in names:
        rejected.append({'modules': names, 'reason': 'This proposed theme is based on the new resident-integration proximity service.'})
        continue
    choices = core | set().union(*(items for i, (_, items) in enumerate(modules) if bits & (1 << i)))
    value = case('Enumeration', choices)['score']['total']
    combinations.append({'modules': names, 'total': value, 'reaches_sixty': Decimal(str(value)) >= 60})

edl = json.loads((ROOT / 'restoration_simulator/scenarios/funding-edl-v1.json').read_text(encoding='utf-8'))
refs = {'CO.1.3': ['NPL3', 'NPL4', 'NPL8'], 'IG.8.2': ['W4', 'W7', 'W10'],
        'IG.11.7': ['W4', 'W7', 'W10'], 'IN.1.2': ['IN-T1'], 'PT.1.2': ['TR2']}
byid = {i['id']: i for i in edl['items']}
if set().union(*map(set, refs.values())) - set(byid):
    raise ValueError('Missing EDLL reference.')

result = {
    'date': '2026-11-03', 'status': 'Proposed review scenario, not saved or submitted',
    'site': {'cadastral_reference': '04011A012000190000JE', 'area_m2': 3056,
             'area_status': 'Public cadastral administrative record; not surveyed ecological capacity',
             'land_access': 'Unresolved; no owner agreement evidenced',
             'scope': 'Same scenario site for 3.4 and possible later 3.5; separately assessed operations'},
    'baseline': {k: baseline[k] for k in ['save_path', 'save_sha256', 'project', 'working_draft_name', 'bundle_digest', 'funding_workspace_version', 'funding_revision']},
    'retained_selection': {'version': 2, 'completion_policy': 'cap_or_all_answers'},
    'saved_score': calculate(draft['bundle'], draft['selection_assessments'], route),
    'criterion_definitions': definitions, 'cases': scenarios, 'changes_for_review': changes,
    'edll_references': {key: [byid[i] for i in ids] for key, ids in refs.items()},
    'module_search': {'core_total': case('Core', core)['score']['total'], 'modules': [{'name': name, 'choices': sorted(items)} for name, items in modules],
                      'valid_combinations': combinations, 'rejected_combinations': rejected,
                      'purpose': 'Compare a finite coherent programme family; no global or cost optimum claimed'},
    'interpretation': {
        'projected_total': '66.49', 'programme_points': '54.49', 'applicant_membership_points': '12',
        'margin': '6.49', 'accredited_score': None,
        'accredited_score_reason': 'Proposed activities and applicant profile are not commitments or certified evidence.',
        'no_credit_for': ['AT.3', 'RD.5', 'CC.7', 'IN.1.1', 'IN.1.3', 'PS.3'],
        'scoring_vs_eligibility': 'The retained numeric evaluator does not establish legal eligibility, public benefit, permissions or evidence sufficiency. The saved municipal location_lookup is explicitly removed from counterfactuals because no new geographic assessment is claimed. Old row references/notes are explicitly replaced with programme references; original baseline remains preserved.',
        'dependency': 'If the new service is actually removed, also remove the resident-service innovation theme: total 59.00. The 61.49 no-service-credit sensitivity retains the delivered service but assumes the evaluator rejects its SP.1 classification.'
    }
}
(HERE / 'Plan y calculos.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'saved_total': result['saved_score']['total'], 'saved_subtotal': result['saved_score']['subtotal'],
                  'cases': [{'name': c['name'], 'total': c['score']['total']} for c in scenarios],
                  'save_unchanged': digest == baseline['save_sha256']}, ensure_ascii=False, indent=2))
