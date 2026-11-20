"""Build a complete, blank line-3 selection worksheet from the canonical app data."""
from pathlib import Path
from decimal import Decimal
from collections import OrderedDict
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[3]
SCENARIOS = ROOT / 'restoration_simulator/scenarios'

def read(name):
    return json.loads((SCENARIOS / name).read_text(encoding='utf-8'))

funding = read('funding.json')
edll = read('funding-edl-v1.json')
guide = read('funding-selection-guidance-v1.json')
stats = read('funding-al20-statistics-v1.json')
documents = {d['id']: d for d in read('documents.json')['documents']}
profile = funding['selection']['profiles']['line3']
criteria = profile['criteria']
items = {i['id']: i for i in edll['items']}
topics = {t['id']: t for t in edll['topics']}
choices = {q['id']: q for c in criteria for q in c['choices']}
assert len(criteria) == 14 and len(choices) == 45 and len(items) == 109
assert sum(Decimal(c['cap']) for c in criteria) == Decimal('100')
assert set(guide['nodes']) == set(choices)
assert all(c['method'] == 'sum' and not c['requires'] for c in criteria)
for q in choices.values():
    assert set(q['routes']) == {'LEADER-AL20-3.4', 'LEADER-AL20-3.5'}
for docid, publication in guide['publications'].items():
    assert publication['sha256'] == documents[docid]['sha256'], docid
    assert (ROOT/'doc_library'/documents[docid]['filename']).is_file(),docid

lines=[]
def add(*parts):
    lines.extend(parts)

def anchor(value):
    return re.sub(r'[^a-z0-9-]', '', value.lower().replace('.', '-').replace(' ', '-'))

def local_link(path, label, page=None):
    suffix=f'#page={page}' if page is not None else ''
    return f'[{label}](<{path.as_posix()}{suffix}>)'

def doc_link(docid, page=None, label=None):
    return local_link(ROOT/'doc_library'/documents[docid]['filename'], label or (f'{docid}, PDF p. {page}' if page else docid), page)

def citation_list(refs):
    grouped=OrderedDict()
    for sid in refs:
        source=guide['sources'][sid]
        grouped.setdefault(source['document_id'],set()).add(source['page'])
    return '; '.join(', '.join(doc_link(docid,p) for p in sorted(pages)) for docid,pages in grouped.items())

def number(value):
    return format(Decimal(str(value)).normalize(),'f')

def clean(text):
    return text.replace('one distinct prioritised needs','one distinct prioritised need')

COMBINATIONS = {
    'AT.3': ('Exclusive alternatives', 'Select at most one of **AT.3.1** and **AT.3.2**. A settlement qualifying for both comparisons does not receive 10 + 8 points.', '10 + 8 is not a valid combination; the applicable selected alternative gives 10 or 8, with a maximum of **10**.'),
    'CO.1': ('Exclusive alternatives', 'Select at most one of **CO.1.1**, **CO.1.2** and **CO.1.3**, according to the number of distinct qualifying needs actually addressed.', 'Three qualifying needs correspond to **15** points, not 10 + 12 + 15. Four or fifty needs still give at most **15**.'),
    'RD.5': ('Single option', 'Claim **RD.5.1** once if its condition is supported. Several supported municipalities do not multiply this option.', 'A supported claim gives **15**; otherwise this criterion contributes 0.'),
    'CC.2': ('Single option', 'Claim **CC.2.1** once if the operation meets the specified acquisition/commissioning condition. Several pieces of equipment do not multiply it.', 'One qualifying equipment package and several qualifying equipment packages both give at most **5**.'),
    'CC.7': ('Cumulative, capped', 'The three options may be combined when each independently qualifies. Add their points, then cap the criterion at **5**.', 'CC.7.2 + CC.7.3 = 4 + 4 = 8 raw points, but only **5** count. All three options total 9 raw points and still count as **5**.'),
    'IG.8': ('Exclusive alternatives', 'Select at most one of **IG.8.1–IG.8.4**. These are four alternative ways of satisfying the same two-point criterion.', 'Two qualifying activities under different IG.8 alternatives do not give 4 points. The maximum is **2**.'),
    'IG.11': ('Mixed: exclusive group + cumulative options', 'Select at most one of **IG.11.1–IG.11.4**. Options **IG.11.5**, **IG.11.6** and **IG.11.7** are cumulative and may be combined with that selected alternative. Apply the overall **2-point** cap.', 'IG.11.5 + IG.11.6 + IG.11.7 = 1 + 1 + 1 = 3 raw points, capped at **2**. A two-point alternative plus a one-point option also remains **2**.'),
    'DRI.3': ('Cumulative, capped', 'The three inclusion options may be combined, subject to their separate conditions. Apply the overall **4-point** cap.', 'DRI.3.1 + DRI.3.2 = 3 + 2 = 5 raw points, capped at **4**. Selecting all three gives 6 raw points, still capped at **4**.'),
    'JR.3': ('Mixed: exclusive group + cumulative options', 'Select at most one of **JR.3.1**, **JR.3.2**, **JR.3.5**, **JR.3.6** and **JR.3.7**. Options **JR.3.3**, **JR.3.4** and **JR.3.8** are cumulative and may be combined with the selected alternative. Apply the overall **4-point** cap.', 'JR.3.3 + JR.3.4 = 3 + 2 = 5 raw points, capped at **4**. JR.3.5 + JR.3.8 = 4 + 2 = 6 raw points, also capped at **4**.'),
    'IN.1': ('Cumulative, subject to EDLL designation', 'The three printed options are cumulative: **0.02 + 2.49 + 2.49 = 5.00**. Each option is scored once, regardless of the number of supporting themes or aspects. The sector option has no designated EDLL sector list in this edition; see the qualification below.', 'One qualifying theme gives **2.49**, even if several themes are referenced. One or several qualifying aspects give **2.49** under IN.1.3. Theme + aspect = **4.98**, without rounding to 5.'),
    'PT.1': ('Cumulative, capped', 'The three heritage options may be combined when each qualifies. Apply the overall **15-point** cap.', 'PT.1.1 + PT.1.2 = 13 + 7 = 20 raw points, capped at **15**. PT.1.1 + PT.1.3 = 13 + 2 = **15**. All three total 22 raw points and still count as **15**.'),
    'PS.1': ('Cumulative, capped', 'The three membership conditions are cumulative when independently substantiated. They concern the applicant’s qualifying active memberships, not informal project cooperation. Apply the overall **12-point** cap.', 'PS.1.1 + PS.1.2 = 4 + 4 = **8**. Either four-point condition plus PS.1.3 gives **12**. All three total 16 raw points, capped at **12**.'),
    'PS.3': ('Single option', 'Claim **PS.3.1** once if the actual applicant has never been a beneficiary of an earlier LEADER call.', 'A new project does not reset the applicant’s funding history. This criterion contributes **1** or 0.'),
    'SP.1': ('Mixed: exclusive alternatives + cumulative option', 'Select at most one of **SP.1.1** and **SP.1.2**. **SP.1.3** may be added when it independently qualifies. Apply the overall **5-point** cap.', 'SP.1.2 + SP.1.3 = 4 + 1 = **5**. SP.1.1 + SP.1.3 = 5 + 1 = 6 raw points, capped at **5**. SP.1.1 + SP.1.2 is invalid.'),
}
assert set(COMBINATIONS)=={c['id'] for c in criteria}

INTRO = '''# AL20 selection assessment: complete checklist for routes 3.4 and 3.5

**Blank assessment and reference guide · Compiled 19 November 2026**

This document contains the complete selection framework exposed by the app for **AL20 aid line 3, routes 3.4 and 3.5**: **14 criteria, all 45 scoring options, and all 109 distinct supporting EDLL references**. The same scoring framework applies to both routes. Route eligibility and the actual evidence must be assessed separately.

All choices start unchecked. No selections, scores, applicant facts or assumptions from the existing project have been carried over. Use a separate copy for each operation/route assessment if comparing alternatives.

The English explanations are the app’s source-based summaries. Each scoring option also retains its Spanish annex wording. EDLL Spanish labels are short source keywords rather than full quotations. PDF references identify the source passages and preserve conditions that a short heading alone cannot convey.

## Assessment details

- Project / operation: ________________________________________
- Applicant legal name: ______________________________________
- Assessor and assessment date: ______________________________
- [ ] This worksheet assesses **AL20 3.4 — nonproductive demonstration**.
- [ ] This worksheet assesses **AL20 3.5 — rural/environmental heritage conservation and recovery**.
- Location / municipality / actual settlement: __________________
- Applicable call and GDR confirmation reference: _______________

**Worksheet convention:** check a scoring option to claim it; check an EDLL reference to identify supporting content. These are different actions. A checked EDLL reference awards **no additional points by itself**. Blank score fields mean “not yet assessed”, rather than a completed assessment of zero.

## Contents

- [How points and caps work](#how-points-and-caps-work)
- [Score overview and worksheet](#score-overview)
- [Route conditions: 3.4 and 3.5](#route-conditions)
- [All scoring criteria and EDLL choices](#all-criteria)
'''
add(INTRO.rstrip())
for c in criteria:
    add(f"  - [{c['id']} — {c['label']} ({number(c['cap'])}-point maximum)](#criterion-{anchor(c['id'])})")
add('- [Location reference tables](#location-reference-tables)', '- [Evidence log and final calculation](#final-calculation)', '- [Sources and completeness](#sources)', '')

add('<a id="how-points-and-caps-work"></a>', '## How points and caps work', '',
    '1. **Check eligibility separately.** Scoring 60 points does not establish that the applicant, operation or expenditure is eligible, and does not guarantee an award.',
    '2. **Claim only qualifying options.** Each scoring option can contribute its printed value once. Several activities, organisations or EDLL references supporting one option do not multiply its points.',
    '3. **Resolve exclusive alternatives first.** Where alternatives are mutually exclusive, selecting more than one is invalid; the cap is not a way to make an invalid combination acceptable.',
    '4. **Add the permitted selections within each criterion.** Some criteria are cumulative; others mix an exclusive group with cumulative options.',
    '5. **Apply that criterion’s cap:** `counted criterion points = min(sum of permitted selected option points, criterion maximum)`.',
    '6. **Add the 14 capped results.** The published maximum is **100** and the selection minimum is **60**. Below 60 does not meet the scoring minimum; 60 or more meets that minimum, subject to all other checks.',
    '7. **Keep exact decimals.** In particular, 2.49 + 2.49 = 4.98, not 5.00. Do not round an assessment up to cross the threshold.', '',
    '**Weights:** a 15-point cap accounts for 15 of the published 100 selection points. These weights are unrelated to the percentage of costs a grant might reimburse.', '',
    '**EDLL support:** an NPL need, women’s interest, youth priority, innovative theme/aspect or other reference is supporting content for the linked scoring question. The NPL ranking figures and the strategy’s programme-wide financial targets are not extra selection points. Each criterion must independently satisfy its own conditions; selecting a climate reference does not automatically establish equipment acquisition or qualifying organisational membership.', '',
    '**Unchecked options:** when completing the calculation, unclaimed options contribute zero. In this initially blank worksheet, an empty checkbox also means the question may still need review; do not treat the untouched document as a completed zero-point assessment.', '')

add('<a id="score-overview"></a>', '## Score overview and worksheet', '',
    '| Criterion | What is assessed | Maximum / weight out of 100 | Combination rule | Your raw points | Your capped points |',
    '| --- | --- | ---: | --- | ---: | ---: |')
for c in criteria:
    kind=COMBINATIONS[c['id']][0]
    add(f"| [{c['id']}](#criterion-{anchor(c['id'])}) | {c['label']} | **{number(c['cap'])}** | {kind} | ____ | ____ |")
add('| **Total** | **Sum of the capped results** | **100** | **Minimum required: 60** | — | **____ / 100** |', '',
    '> **Innovation qualification:** the printed IN.1 cap is 5.00, but the reviewed EDLL designates no innovative sectors for the 0.02-point IN.1.1 option. Theme + aspect can contribute 4.98 when both qualify. Without an accepted sector claim, reaching all other category caps would produce an arithmetic ceiling of 99.98, not an automatic entitlement to that score. Obtain written GDR clarification rather than inventing a sector or rounding 4.98 to 5.', '',
    '**Common later-control rule:** the reviewed guidance does not specify separate later-control evidence for any of these 45 individual subcriteria. General route, investment, public-use/publication and record-retention duties still apply. No separate payment-stage document being named for an option is likewise not an exemption from general justification duties.', '')

add('<a id="route-conditions"></a>', '## Route conditions: 3.4 and 3.5', '',
    'These are route checks, **not extra point-scoring options**. This section records the route conditions used in the app; the detailed 45-option selection assessment follows.', '',
    '| Route | Purpose | Aid ceiling in the stored 2026 rules | Main distinction |',
    '| --- | --- | ---: | --- |',
    '| **3.4** | Nonproductive demonstration: test and evaluate something new or unknown in AL20 and share transferable results | **€28,000; 100% of accepted eligible costs** | Novelty, evaluation, dissemination and a complete usable demonstration result |',
    '| **3.5** | Nonproductive conservation, protection, rehabilitation or recovery of rural heritage, including environmental heritage | **€200,000; 100% of accepted eligible costs** | Heritage value, a qualifying conservation/recovery intervention and dissemination and/or public use |', '',
    '**Both routes:** reimbursement is based on eligible expenditure actually incurred and paid; the percentage and ceiling do not confirm an award or make every proposed cost eligible. Eligible applicants include the specified public/nonprofit legal entities, public-law bodies and companies with qualifying public participation. The applicant must have the relationship/competence required to deliver the operation at application. A private individual does not qualify simply by owning a proposed site.', '',
    '### Route 3.4 checklist', '',
    '- [ ] The operation is nonproductive and does not provide the beneficiary with the prohibited economic benefit.',
    '- [ ] A technology, process, method or approach is new or unknown in the relevant AL20 LEADER area; the proposal explains that local novelty.',
    '- [ ] The operation actually tests and evaluates it, and explains transferability to comparable settings.',
    '- [ ] Participation is open to those entitled to participate; limited places are allocated objectively and transparently. Membership of the beneficiary is not an access requirement.',
    '- [ ] The operation has the required clear territorial link to AL20.',
    '- [ ] Method/activity information will be online from the start, and results will be published as they emerge.',
    '- [ ] That online information will remain available for at least **three years after final payment**.',
    '- [ ] The operation will produce usable and disseminable results by completion, rather than depend on an unfinished later phase.',
    '- [ ] Its final objective is not to improve productive-sector competitiveness; any repeated previously supported activity has the required justified added value.',
    '- [ ] Applicant status and competence, site rights, permissions, financing and the actual cost categories have been checked.',
    '- [ ] Any immovable-property investment satisfies the special requirement of exclusive demonstration use; applicable removal/reinstatement and other cost restrictions have been checked.', '',
    guide['route_contexts']['LEADER-AL20-3.4']['official']['text'], '',
    '**Follow-up:** '+guide['route_contexts']['LEADER-AL20-3.4']['follow_up']['text'], '',
    '**Sources:** '+citation_list(guide['route_contexts']['LEADER-AL20-3.4']['official']['sources']+guide['route_contexts']['LEADER-AL20-3.4']['follow_up']['sources']), '',
    '### Route 3.5 checklist', '',
    '- [ ] The resource qualifies as rural/environmental heritage; its value and the conservation/recovery benefit are documented.',
    '- [ ] The operation is nonproductive and respects the applicable competition/public-concession conditions.',
    '- [ ] Dissemination and/or public use of the supported heritage is an explicit objective.',
    '- [ ] For an enclosed or bounded site, the project includes an opening/public-use plan specifying visiting days/hours or other mechanisms bringing the heritage to the public.',
    '- [ ] Where a forest-management plan or equivalent is legally required, it is valid **at application** and the operation is consistent with it.',
    '- [ ] The proposal is not a standalone study/plan or an isolated training, information, awareness, promotion or demonstration operation.',
    '- [ ] It does not provide excluded agricultural-production/processing/marketing support or excluded forestry-production support; economic forestry productivity is not its main purpose.',
    '- [ ] The budget does not claim acquisition of the heritage asset itself.',
    '- [ ] Applicant status and competence, site rights, permissions, financing, eligible costs, maintenance and public-use responsibilities are established.', '',
    guide['route_contexts']['LEADER-AL20-3.5']['official']['text'], '',
    '**Follow-up:** '+guide['route_contexts']['LEADER-AL20-3.5']['follow_up']['text'], '',
    '**Sources:** '+citation_list(guide['route_contexts']['LEADER-AL20-3.5']['official']['sources']+guide['route_contexts']['LEADER-AL20-3.5']['follow_up']['sources']), '',
    '**Keep the two tests separate:** a component may describe a valid selection claim but still be an ineligible standalone operation or cost under the chosen route. For example, a training or leisure criterion does not remove 3.5’s exclusion of an isolated event.', '')

topic_bindings={}
for cid in choices:
    if cid in edll['bindings']:
        for tid in edll['bindings'][cid]['topic_ids']:
            topic_bindings.setdefault(cid.split('.')[0]+'.'+cid.split('.')[1], OrderedDict()).setdefault(tid,[]).append(cid)
used_items=set()
rendered_choice_ids=[]
rendered_topic_instances=[]

add('<a id="all-criteria"></a>', '## All scoring criteria and EDLL choices', '',
    '**How to mark the guide:** each “Claim” task is a scoring selection; each EDLL task underneath is a supporting-reference selection with **0 additional points**. Lists are repeated where the app allows the same strategy reference to support different scoring questions, so that you can mark each use separately. An absence of an EDLL list is stated explicitly rather than filled with inferred choices.', '')

for c in criteria:
    cid=c['id']
    kind,combination,example=COMBINATIONS[cid]
    cap_unit='point' if Decimal(c['cap'])==1 else 'points'
    add(f'<a id="criterion-{anchor(cid)}"></a>',f"### {cid} — {c['label']}", '',
        f"**Maximum: {number(c['cap'])} {cap_unit} out of 100.** **Rule:** {kind}.", '',
        combination, '', '**Cap/combination example:** '+example, '')
    if cid=='AT.3':
        add('**Population lookup and unresolved reference year**', '',
            'The local selection wording specifies **INE 2023**. The later verification guide refers to the latest published data and contains **2025** reference tables. Its AL20 population median is **539** (PDF p. 113); the Andalusia table gives **2,256** (p. 126), while the guide’s AT.3 prose also prints **2,497**. These discrepancies are unresolved in the app. Confirm the applicable year and benchmark with AL20; do not silently choose one or mix years.', '',
            'Use the actual **settlement (núcleo)** population, which can differ from the municipality total. “Below” means strictly smaller; equality does not qualify. The app’s municipality totals are provisional proxies if expressly used as such, not verified settlement counts. See the [location reference tables](#location-reference-tables).', '',
            '[INE Nomenclátor population lookup](https://www.ine.es/nomen2/index.do?L=1).', '')
    elif cid=='CO.1':
        add('Use the **NPL list addressable through LEADER**, not the separate NPNL list. Count a need only once, even if several activities address it. All 50 selectable NPL needs appear below; their published priority order is preserved.', '')
    elif cid=='RD.5':
        add('This is a **business-count** comparison, not a population comparison. Compare the municipality’s count with the published AL20 **mean of 60**, not its **median of 21.5**, in the app’s provisional 2025 dataset. The operation must actually support the municipality. The applicable reference year needs confirmation. See the [location reference tables](#location-reference-tables).', '')
    elif cid=='IN.1':
        add('> **Do not invent innovative sectors.** The printed IN.1.1 option remains in this complete checklist with its **0.02-point** value, but the reviewed strategy explicitly designates themes/aspects instead of sectors. There is no sector checkbox list to supply here. A claim under IN.1.1 needs documented GDR clarification.', '',
            'The novelty needed to make a demonstration eligible under 3.4 does **not** automatically establish any of these EDLL-specific innovation claims. Certification, income, professional supervision and territorial restrictions in the following lists remain part of the relevant aspect.', '')
    if c['limitations']:
        add('**Stored assessment limitations:**', '')
        for limitation in c['limitations']:
            add('- '+limitation)
        add('')

    add('#### Scoring selections', '')
    for q in c['choices']:
        qid=q['id']; node=guide['nodes'][qid]
        rendered_choice_ids.append(qid)
        point_unit='point' if Decimal(q['points'])==1 else 'points'
        add(f"- [ ] **Claim {qid} — {number(q['points'])} {point_unit}:** {q['label']}.", '')
        if qid in edll['bindings']:
            bindings=edll['bindings'][qid]
            topic_links=', '.join(f"[{topics[tid]['title']}](#edll-{anchor(cid)}-{tid})" for tid in bindings['topic_ids'])
            add(f'**EDLL choices:** {topic_links}.', '', bindings['note'], '')
        add('<details>',f'<summary>{qid}: Spanish wording, meaning and evidence</summary>', '',
            '**Spanish annex wording:** '+q['label_es'], '',
            '**What this requires:** '+clean(node['official']['text']), '',
            '**Application-stage evidence:** '+node['application']['text'], '',
            '**Payment-stage evidence:** '+node['payment']['text'], '',
            '**Relevance to an environmental/restoration operation:** '+node['restoration']['text'], '')
        if node['unresolved']:
            add('**Questions still requiring confirmation:**', '')
            for issue in node['unresolved']:
                add('- '+issue['text'])
            add('')
        refs=[]
        for field in ['official','application','payment','restoration']:
            refs.extend(node[field]['sources'])
        for issue in node['unresolved']:
            refs.extend(issue['sources'])
        add('**Sources:** '+citation_list(refs), '', '</details>', '')

    if cid not in topic_bindings:
        add('#### EDLL choices for this criterion', '',
            'The current app exposes **no separate selectable EDLL list** for this criterion. Apply the printed condition and its evidence requirements above; do not create extra points or substitute a general strategy objective for that condition.', '')
    else:
        for tid,bound_choice_ids in topic_bindings[cid].items():
            t=topics[tid]
            rendered_topic_instances.append((cid,tid))
            add(f'<a id="edll-{anchor(cid)}-{tid}"></a>', f"#### EDLL choices — {t['title']}", '',
                '**Supports:** '+', '.join(f'**{qid}**' for qid in bound_choice_ids)+'. **Additional points for checking an EDLL reference: 0.**', '',
                t['summary'], '',
                '**Strategy location:** section '+t['section']+'; '+', '.join(doc_link('FUND-013',p) for p in t['pages'])+'.', '')
            if not t['item_ids']:
                assert t['status']=='not_designated'
                add('**No designated choices exist in this strategy edition.** The absence is intentional, not a missing list. Record any GDR clarification in the evidence log.', '')
            else:
                for iid in t['item_ids']:
                    item=items[iid]
                    used_items.add(iid)
                    add(f"- [ ] **{iid} — {item['label']}**")
                    add(f"  - Spanish source keyword: *{item['label_es']}*.")
                    # Generic NPL caution is already stated above the list; retain all other item-level conditions.
                    if item['classification']!='prioritised_need':
                        add('  - Scope/conditions: '+item['summary'])
                    add(f"  - Source: {doc_link('FUND-013',item['page'])}; section {item['section']}.", '')
            add('**Reference-to-activity notes for this list:** ________________________________________', '')
    add(f"**{cid} calculation:** permitted selected points ____ → apply maximum {number(c['cap'])} → **counted points ____ / {number(c['cap'])}**.", '',
        '**Evidence / outstanding questions:** ________________________________________', '', '[Back to score overview](#score-overview)', '', '---', '')

add('<a id="location-reference-tables"></a>', '## Location reference tables', '',
    '**Purpose:** reproduce the location figures available in the app for reviewing AT.3 and RD.5. **Dataset:** `'+stats['id']+'`; year **'+str(stats['year'])+'**; status **'+stats['status']+'**. These are not current verified settlement-level eligibility determinations.', '',
    '### Published lookup benchmarks', '',
    '| Indicator | AL20 median | AL20 mean | Andalusia median | Andalusia mean | Use in scoring |',
    '| --- | ---: | ---: | ---: | ---: | --- |',
    f"| Population | {stats['benchmarks']['population_zrl_median']} | {stats['benchmarks']['population_zrl_mean']} | {stats['benchmarks']['population_andalusia_median']} | {stats['benchmarks']['population_andalusia_mean']} | AT.3 compares against the applicable **median**, using an actual settlement count and a confirmed reference year |",
    f"| Businesses | {stats['benchmarks']['businesses_zrl_median']} | {stats['benchmarks']['businesses_zrl_mean']} | — | — | RD.5 uses the AL20 **mean**, not median |", '',
    '**Recorded limitations:**', '')
for limitation in stats['limitations']:
    add('- '+limitation)
add('', '### Municipality figures in the app', '',
    'Municipality figures below do not identify the population of a smaller settlement. No row is preselected and no points are inferred from this table.', '',
    '| Municipality | Population (2025 reference) | Businesses (2025 reference) | FUND-010 population PDF page | FUND-010 businesses PDF page |',
    '| --- | ---: | ---: | --- | --- |')
for m in stats['municipalities']:
    add(f"| {m['name']} | {m['population']} | {m['businesses']} | {doc_link('FUND-010',m['population_page'])} | {doc_link('FUND-010',m['businesses_page'])} |")
add('', '**Actual settlement and verified count:** ________________________________________', '',
    '**Reference year, applicable median/mean and AL20 confirmation:** __________________', '')

add('<a id="final-calculation"></a>', '## Evidence log and final calculation', '',
    'Add one row per scoring claim or supporting reference as needed. Record the EDLL code together with the scoring option it supports, so that a shared reference is not mistaken for an independent point award.', '',
    '| Scoring option | EDLL reference(s), if applicable | Activity / applicant fact / location fact | Intended result | Application proof / source page | Delivery proof / owner | Confirmed / unresolved |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    '| ____ | ____ | ____ | ____ | ____ | ____ | ____ |',
    '| ____ | ____ | ____ | ____ | ____ | ____ | ____ |',
    '| ____ | ____ | ____ | ____ | ____ | ____ | ____ |', '',
    '### Completion checks', '',
    '- [ ] Every claimed scoring option has a stated basis and supporting evidence.',
    '- [ ] Mutually exclusive options have not been selected together.',
    '- [ ] Cumulative points have been capped within each of the 14 criteria.',
    '- [ ] Multiple references/activities under one option have not multiplied its point value.',
    '- [ ] EDLL reference checkboxes, NPL priority rankings and programme financial targets have not been added as points.',
    '- [ ] Population/business assumptions, source years and the innovation-sector question have been explicitly resolved or retained as unresolved.',
    '- [ ] Separate route, applicant, land/use, cost, publication/public-use and delivery requirements have been reviewed.',
    '- [ ] All 14 capped results have been transferred to the score overview.', '',
    '**Final arithmetic:** `AT.3 + CO.1 + RD.5 + CC.2 + CC.7 + IG.8 + IG.11 + DRI.3 + JR.3 + IN.1 + PT.1 + PS.1 + PS.3 + SP.1 = ____ / 100`.', '',
    '**Gap to the minimum:** `max(0, 60 − final supported score) = ____ points`.', '',
    '- [ ] The completed, supported total is **below 60**: the scoring minimum is not met.',
    '- [ ] The completed, supported total is **60 or more**: the scoring minimum is met; other eligibility and award checks remain.',
    '- [ ] The assessment is **still unresolved**: a provisional total must not be described as an accepted score.', '',
    '> Markdown checkboxes are a manual worksheet. They do not calculate the total, validate exclusive groups, certify evidence or change the saved assessment in the app.', '')

add('<a id="sources"></a>', '## Sources and completeness', '',
    '### Official source editions already held in the project', '',
    'These editions underpin the app’s existing reviewed data. The guidance records its official-download review on **1 November 2026**. Compiling this worksheet on **19 November 2026** does not constitute a new legal-source review or a new published registry edition. Cite PDF page positions.', '')
for docid,pub in guide['publications'].items():
    add(f"- **{docid} — {pub['title'].removeprefix(docid+' - ')}**")
    add('  - Edition: '+pub['edition']+'.')
    add('  - '+doc_link(docid,label='Open the registered local PDF')+'.')
    add(f"  - [Official PDF download]({pub['download_url']}); [publication page]({pub['publication_url']}).")
    add('  - Registered PDF SHA-256: `'+pub['sha256']+'`.', '')
add('### Coverage check', '',
    '- **14/14** line-3 criteria included; published category caps sum to **100**.',
    '- **45/45** scoring options included, with their exact point values, Spanish wording and recorded combination relationships.',
    '- **109/109 distinct** EDLL reference items included. References are repeated where useful for marking a different scoring question; repeats do not create new points.',
    '- **50/50** LEADER-addressable prioritised NPL needs included in published order.',
    '- **5/5** innovative themes and **12/12** innovative aspects included; the absence of designated innovative sectors is explicit.',
    '- **14/14** women’s references, **10/10** youth references, all **5** inclusion-context references, all **4** named trade examples, all **13** heritage-topic references and all **3** cross-cutting objectives included.',
    '- All **13** EDLL bindings applicable to the 3.4/3.5 scoring options are included. The library’s separate binding for productive route 2.6 is outside this worksheet.',
    '- All app municipality reference rows are reproduced as provisional lookups, with their source pages.', '',
    '**Scope:** complete for the app’s current AL20 3.4/3.5 selection assessment and its selectable EDLL supporting library. It does not reproduce every page of the 544-page strategy, other AL20 aid-line profiles, or the full general grant-law/procurement/application manual.', '',
    '### App data used to compile this worksheet', '')
for filename in ['funding.json','funding-edl-v1.json','funding-selection-guidance-v1.json','funding-al20-statistics-v1.json']:
    path=SCENARIOS/filename
    add('- '+local_link(path,filename)+' — file SHA-256 `'+hashlib.sha256(path.read_bytes()).hexdigest()+'`.')
add('', '**Library edition:** `'+edll['id']+'`; '+edll['edition']+'. Scoring configuration version: **'+str(funding['selection']['version'])+'**. Supporting reference selections do not award points in the app’s evaluator.', '')

text='\n'.join(lines).rstrip()+'\n'
text=re.sub(r'(<a id="[^"]+"></a>)\n(?=#+ )',r'\1\n\n',text)
assert rendered_choice_ids==list(choices)
assert used_items==set(items),(set(items)-used_items)
applicable_bindings=set(choices)&set(edll['bindings'])
assert len(applicable_bindings)==13
assert all(f'**EDLL choices:**' in text for _ in [0])
assert text.count('- [ ] **Claim ')==45
assert not re.search(r'- \[[xX]\]',text)
assert text.count('<details>')==45 and text.count('</details>')==45
assert '\\n' not in text
assert len(rendered_topic_instances)==11  # women repeats under the two separate criteria

out=ROOT/'output/markdown'
out.mkdir(parents=True,exist_ok=True)
destination=out/'AL20-3.4-and-3.5-Complete-Selection-Assessment.md'
assert not destination.exists() or '--replace-generated' in sys.argv,f'Preserve existing document before replacing: {destination}'
destination.write_text(text,encoding='utf-8')
print(destination)
print(f'{len(text.split()):,} words | {len(text.splitlines()):,} lines | {len(text.encode("utf-8")):,} bytes')
print(f'Coverage: {len(criteria)} criteria, {len(choices)} scoring checkboxes, {len(used_items)} distinct EDLL references, {len(stats["municipalities"])} municipality rows')
