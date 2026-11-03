from copy import deepcopy
from decimal import Decimal
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'restoration_simulator'))
from backend.funding_selection import calculate

out=ROOT/'doc_library/al20-demonstrator-proposal'
baseline=json.loads((out/'Baseline and retained rules.json').read_text(encoding='utf-8'))
draft=baseline['draft']; route='LEADER-AL20-3.4'
answers=deepcopy(draft['selection_assessments'])
withdrawals={'CC.2':['CC.2.1'],'IN.1':['IN.1.3'],'PT.1':['PT.1.2']}
changes=[]
for cid,ids in withdrawals.items():
    for ident in ids:
        changes.append({'criterion':cid,'choice':ident,'recorded':answers[route]['criteria'][cid]['answers'][ident],'proposed':False})
        answers[route]['criteria'][cid]['answers'][ident]=False
reviewed=calculate(draft['bundle'],answers,route)

# Sensitivities use explicit hypothetical answers. No null baseline answer is
# silently interpreted as a real rejection or confirmation.
def hypothetical(name,selected):
    sample=deepcopy(answers)
    for row in sample[route]['criteria'].values():
        for key in row['answers']:row['answers'][key]=key in selected
    score=calculate(draft['bundle'],sample,route)
    return {'name':name,'status':'Explicit counterfactual, not recorded evidence or adopted inputs',
            'selected_choices':sorted(selected),'score':score}
selected={s for row in reviewed['criteria'] for s in row['selected']}
cases=[hypothetical('All retained proposed claims supported; unselected options explicitly excluded for this model',selected),
       hypothetical('No qualifying membership or never-funded history evidence',selected-{'PS.1.3','PS.3.1'}),
       hypothetical('New local service and second qualifying membership both accepted',selected|{'SP.1.1','PS.1.2'}),
       hypothetical('Previous case plus a genuinely qualifying settlement below Andalusian population median',selected|{'SP.1.1','PS.1.2','AT.3.2'})]
rows=[
 {'item':'Beneficiary own project staff','units':'80 attributable hours within an eligible six-month period','unit_eur':'35','quantity':'80','amount_eur':'2800','status':'Unconfirmed loaded payroll allowance; actual employment cost, capacity and time records required'},
 {'item':'Ecologist: survey, protocol, supervision, interpretation','units':'6 days','unit_eur':'350','quantity':'6','amount_eur':'2100','status':'Author planning allowance; no quote or appointment'},
 {'item':'Baseline soil analyses','units':'3 samples','unit_eur':'90','quantity':'3','amount_eur':'270','status':'Laboratory scope and quote required; sample design needs field confirmation'},
 {'item':'Independent field monitoring','units':'12 visits, labour and local travel included','unit_eur':'90','quantity':'12','amount_eur':'1080','status':'Planning allowance; no provider commitment'},
 {'item':'Participation and inclusion facilitation','units':'4 sessions','unit_eur':'250','quantity':'4','amount_eur':'1000','status':'Planning allowance; qualified personnel and delivery commitments required'},
 {'item':'Public report, accessible materials and dataset preparation','units':'12 hours','unit_eur':'40','quantity':'12','amount_eur':'480','status':'Planning allowance; excludes recurring hosting'},
 {'item':'Carob plants','units':'2 plants','unit_eur':'6','quantity':'2','amount_eur':'12','status':'Unconfirmed saved planning price; suitable provenance and nursery stock quotation required'},
 {'item':'Lentisk plants','units':'4 plants','unit_eur':'2.5','quantity':'4','amount_eur':'10','status':'Unconfirmed saved planning price; quotation required'},
 {'item':'Retama plants','units':'6 plants','unit_eur':'2.5','quantity':'6','amount_eur':'15','status':'Unconfirmed saved planning price; confirm Retama sphaerocarpa identity and quote'},
 {'item':'Guards and installation consumables','units':'12 units','unit_eur':'1.5','quantity':'12','amount_eur':'18','status':'Unconfirmed saved planning price; ecological need and specification require review'},
 {'item':'Lawfully sourced stone and transport','units':'one allowance','unit_eur':'80','quantity':'1','amount_eur':'80','status':'Author allowance; confirm material, transport, habitat protection and eligibility'},
 {'item':'Metering and tool hire','units':'one allowance within eligible rental period','unit_eur':'180','quantity':'1','amount_eur':'180','status':'Author allowance; no unnecessary equipment purchase'},
 {'item':'Establishment/rescue-water supply','units':'one cash allowance','unit_eur':'60','quantity':'1','amount_eur':'60','status':'Saved water-cost allowance, not a quote or proof that 600 litres can be supplied for this amount'},
 {'item':'Event access and insurance','units':'one allowance','unit_eur':'450','quantity':'1','amount_eur':'450','status':'Author allowance; actual insurance/access arrangements not verified'},
 {'item':'Participant materials','units':'one allowance','unit_eur':'100','quantity':'1','amount_eur':'100','status':'Author allowance'},
 {'item':'Initial hosting','units':'6 months','unit_eur':'15','quantity':'6','amount_eur':'90','status':'Author allowance; recurring-cost eligibility requires confirmation'}
]
for row in rows:
    if Decimal(row['unit_eur'])*Decimal(row['quantity'])!=Decimal(row['amount_eur']):raise ValueError(row['item']+' arithmetic is inconsistent')
total=sum(Decimal(row['amount_eur']) for row in rows)
contingency=(total*Decimal('0.1')).quantize(Decimal('0.01'))
hosting=Decimal('675')
later_coordination=Decimal('1050')
data={
 'baseline_digest':baseline['bundle_digest'],
 'retained_selection_version':draft['bundle']['selection']['version'],
 'retained_completion_policy':draft['bundle']['selection']['completion_policy'],
 'baseline_score':baseline['baseline_score'],'proposed_withdrawals':changes,
 'reviewed_partial_score':reviewed,'hypothetical_scoring_cases':cases,
 'recommended_scenario':{
   'title':'Cortijo Conjuro: Native Vegetation and Water Learning Demonstrator',
   'preferred_site':'A suitable patch on the user-owned Cortijo Conjuro land, subject to a site survey and written use agreement; neighbouring land is a separately reviewed alternative',
   'area_m2_ceiling':200,'area_status':'Retained planning footprint, not surveyed available area or verified ecological capacity',
   'plants':{'carob':2,'lentisk':4,'retama':6},
   'plant_count_basis':'Six same-species matched pairs: one carob pair, two lentisk pairs, three retama pairs. Feasibility design, not power-derived ecological density.',
   'comparison':'Within each matched pair, randomly allocate one plant to added stone mulch and the other to no added stone. Retain pre-existing natural cover in both.',
   'water_capacity_litres':600,'water_basis':'Author-proposed first-year logistics ceiling for 12 plants, not a watering prescription or survival guarantee. Technical review and supply evidence required.',
   'followup_months':12,'publication':'At least three years after final payment; keep method and emerging results online from the start',
   'public_sessions':4,'places_per_session_target':12,'attendance_status':'Targets only; safe capacity, partners and participation unconfirmed',
   'funding_conclusion':'The case is not currently demonstrated to meet the 60-point threshold. Proposed delivery claims and applicant history/memberships remain unverified.'
 },
 'budget':{
   'currency':'EUR','basis':'Working gross cash ceilings, not quotations or a grant-approved budget; recoverable VAT must be removed from a later eligible-cost claim',
   'rows':rows,'working_cost_eur':str(total),'private_contingency_10pct_eur':str(contingency),
   'later_coordination_reserve_eur':str(later_coordination),
   'later_coordination_basis':'30 hours at the same planning loaded cost of EUR 35/hour, outside the grant working-cost model. The beneficiary must confirm capacity and financing after the initial eligible staff period.',
   'post_six_month_hosting_reserve_eur':str(hosting),
   'hosting_reserve_basis':'45 additional months at 15 EUR/month: 9 months from end of month 6 to assumed month-15 final payment, then 36 months. Payment at month 15 is a cash-flow model, not an official processing promise. Extend if payment is later.',
   'no_advance_peak_cash_eur':str(total+contingency+hosting+later_coordination),
   'max_external_share_conservative':str(((total-Decimal('2800'))/total*100).quantize(Decimal('0.01'))),
   'advance_case_eur':str(total/2),
   'advance_conditions':'Illustrative only, if the whole working cost is accepted and a 50% advance is awarded. A guarantee for 100% of the advance may be required; collateral, fees and approval are unverified.',
   'funding_cap_eur':28000,'grant_rate_of_accepted_eligible_cost':1,
   'available_actual_cash':'Unknown. The saved simulation cash of EUR 60000 is not verified real cash.'
 }
}
(out/'Scenario and scoring.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'reviewed_partial_subtotal':reviewed['subtotal'],'reviewed_total':reviewed['total'],
 'cases':[{k:v[k] for k in ['name']}|{'total':v['score']['total']} for v in cases],
 'budget':{k:data['budget'][k] for k in ['working_cost_eur','private_contingency_10pct_eur','post_six_month_hosting_reserve_eur','no_advance_peak_cash_eur','max_external_share_conservative']}},indent=2))
