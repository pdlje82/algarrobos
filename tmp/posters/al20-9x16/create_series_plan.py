"""Plan the complete source-free 9:16 series and typeset its first poster to PNG."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json
import re
import hashlib

ROOT = Path(__file__).resolve().parents[3]
MD = ROOT/'output/markdown/AL20-3.4-and-3.5-Complete-Selection-Assessment.md'
markdown = MD.read_text(encoding='utf-8')
scenarios=ROOT/'restoration_simulator/scenarios'
funding=json.loads((scenarios/'funding.json').read_text(encoding='utf-8'))
edll=json.loads((scenarios/'funding-edl-v1.json').read_text(encoding='utf-8'))
statistics=json.loads((scenarios/'funding-al20-statistics-v1.json').read_text(encoding='utf-8'))
criteria=funding['selection']['profiles']['line3']['criteria']
all_choices={q['id'] for c in criteria for q in c['choices']}
all_references={i['id'] for i in edll['items']}
assert set(re.findall(r'^- \[ \] \*\*Claim ([A-Z]+\.\d+\.\d+) — ',markdown,re.M))==all_choices
assert set(re.findall(r'^- \[ \] \*\*([A-Z][A-Z0-9-]*) — ',markdown,re.M))==all_references

series=[]
def sheet(title,focus,choices=(),references=(),municipalities=(),issues=()):
    series.append({'number':len(series)+1,'title':title,'focus':focus,'scoring_options':list(choices),
                   'edll_references':list(references),'municipalities':list(municipalities),'essential_conditions':list(issues)})

sheet('How the points work','60/100, option values, category caps, permitted combinations and the role of EDLL evidence.',
      issues=['Published maximum versus selection minimum','Scoring does not establish route/applicant/cost eligibility','No saved-project selections'])
sheet('3.4 or 3.5?','Side-by-side operation purposes, applicant types, grant ceilings and reimbursement.',
      issues=['Nonproductive operation','3.4 demonstration and transferability','3.5 heritage conservation and public value','100% concerns eligible costs, not selection points'])
sheet('3.4: the demonstration checklist','Novelty, evaluation, participation, territorial scope and completion duties.',
      issues=['Open/objective participant access','Online information from start','Results as they emerge','Publication retained three years after final payment','Demonstration-only property investment','No unfinished dependent phase','Repeated events need justified added value'])
sheet('3.5: the heritage checklist','Heritage value, public use, enclosed-site opening plan and exclusions.',
      issues=['Forest plan valid at application where required','No standalone studies/events','Agricultural/forestry production exclusions','No buying the heritage asset','Maintenance and nonproductive competition/concession conditions'])
sheet('Where the 100 points come from','A readable table of all 14 criterion caps and blank score slots.')
sheet('Alternatives, additions and caps','Worked examples for the six exclusive groups and capped cumulative scoring.',
      issues=['At most one in an exclusive group','Cap cannot legitimise invalid selections','Exact decimals: 4.98 does not round to 5','Each option scores once'])
sheet('Settlement population: 10 or 8 points','AT.3: the two alternatives and how to verify the actual settlement.',
      choices=['AT.3.1','AT.3.2'],
      issues=['INE 2023 wording versus 2025 tables','539 is provisional','2256 versus 2497 discrepancy','Settlement is not municipality','Strictly below, not equal','Application/payment location consistency'])
sheet('Business counts: up to 15 points','RD.5: actual municipal support and the correct business-count comparison.',
      choices=['RD.5.1'],issues=['Mean 60, not median 21.5','Applicable reference year','No automatic award based only on a location name'])
for offset in range(0,32,8):
    towns=[m['name'] for m in statistics['municipalities'][offset:offset+8]]
    assert len(towns)==8
    assert all(f'| {town} |' in markdown for town in towns)
    sheet(f'Municipality figures {offset//8+1}/4',
          'Eight rows: municipality, population and business count. Retain the 2025 provisional-data label; omit citation columns.',
          municipalities=towns,issues=['Municipality totals are not settlement counts','No rows or project locations preselected','Year and applicable scoring benchmark require confirmation'])
sheet('EDLL needs: 10, 12 or 15 points','CO.1: all three exclusive scoring levels and a need-to-activity example.',
      choices=['CO.1.1','CO.1.2','CO.1.3'],issues=['1 need = 10; 2 = 12; 3+ = 15','Distinct needs, not number of activities','NPL versus non-LEADER-addressable needs','Needs ranking values are not grant points'])
for start in range(1,51,10):
    sheet(f'EDLL needs NPL{start}-NPL{start+9}',
          'Ten needs in original priority order, each with its NPL code and a plain-English description. All remain open.',
          references=[f'NPL{i}' for i in range(start,start+10)],issues=['Supporting references award no extra points'])
sheet('Energy equipment: up to 5 points','CC.2: the acquisition/commissioning requirement, equipment scope and proof.',
      choices=['CC.2.1'],issues=['Printed equipment examples retained','Actual route-compatible equipment need','Technical sheets, eligible acquisition and commissioning evidence'])
sheet('Sustainable mobility: maximum 5 points','CC.7: all three options, their 1/4/4 weights and capped sums.',
      choices=['CC.7.1','CC.7.2','CC.7.3'],issues=['Qualifying green collective transport','Charging installation','Municipal measures backed by the relevant sustainable mobility plan','4+4 counts as 5'])
sheet("Women's leisure: four alternatives",'IG.8: all four two-point alternatives and their distinct purposes.',
      choices=[f'IG.8.{i}' for i in range(1,5)],issues=['One exclusive choice, maximum 2','IG.8.2 requires a documented EDLL demand','Activity plan and delivery evidence'])
sheet("Women's associations: creation and participation",'IG.11.1-4: the four exclusive two-point alternatives and proof of the organisational action.',
      choices=[f'IG.11.{i}' for i in range(1,5)],issues=['Founding/registration versus informal collaboration','Creation, maintenance/equipment, activities or networks','Entire IG.11 category maximum remains 2'])
sheet("Women's participation: additional actions",'IG.11.5-7: three cumulative one-point options and their relationship with the exclusive group.',
      choices=[f'IG.11.{i}' for i in range(5,8)],issues=['Association awareness','Underrepresented sectors','EDLL-based meetings/workshops','1+1+1 counts as 2','Entire IG.11 category maximum remains 2'])
sheet("Women's EDLL interests W1-W7",'Seven consultation interests with full material conditions; show links to IG.8.2 and IG.11.7.',references=[f'W{i}' for i in range(1,8)])
sheet("Women's EDLL interests W8-W14",'Seven further interests, including shared care, employment barriers and empowerment; no invented event menu.',references=[f'W{i}' for i in range(8,15)])
sheet('Inclusion and accessibility: maximum 4 points','DRI.3: all three options, their 3/2/1 values and practical evidence.',
      choices=[f'DRI.3.{i}' for i in range(1,4)],issues=['Disability adaptation must exceed statutory minimums','Training for relevant staff','Specific at-risk population and need','3+2 counts as 4'])
sheet('The EDLL inclusion needs','Five contextual NPL references, with a required connection to the specific at-risk beneficiaries.',
      references=['NPL9','NPL14','NPL17','NPL23','NPL30'],issues=['Broad social benefit alone is insufficient','Use with DRI.3.3'])
sheet('Youth: the five exclusive alternatives','JR.3.1/2/5/6/7: five alternative four-point conditions; describe proof and route compatibility.',
      choices=['JR.3.1','JR.3.2','JR.3.5','JR.3.6','JR.3.7'],issues=['Training/placements','Leisure','Participation','Business/service option must fit nonproductive route','Whole JR.3 cap = 4'])
sheet('Youth: cumulative actions and the cap','JR.3.3/4/8: 3/2/2 points, additive relationship and four-point ceiling.',
      choices=['JR.3.3','JR.3.4','JR.3.8'],issues=['Return within 12 months of qualification','Youth definition requires confirmation','Local-development contribution','Explicit EDLL youth need','Proof of delivery'])
sheet('Youth EDLL choices Y1-Y5','Five youth priorities with their scopes; support for JR.3.8.',references=[f'Y{i}' for i in range(1,6)])
sheet('Youth EDLL choices Y6-Y10','Five further priorities: environmental action, qualifications, talent, leisure and decision-making.',references=[f'Y{i}' for i in range(6,11)])
sheet('What counts as EDLL innovation?','IN.1: all three values, no designated sectors, theme/aspect logic and exact decimals.',
      choices=['IN.1.1','IN.1.2','IN.1.3'],issues=['0.02 sector option needs written clarification','2.49 theme + 2.49 aspect = 4.98','Repeated themes do not multiply points','3.4 local novelty is a separate test','Published cap 5; 99.98 arithmetic ceiling without sector award'])
sheet('The five innovative themes','All five themes with the full initiative or certification conditions.',references=[f'IN-T{i}' for i in range(1,6)])
sheet('Innovative aspects 1-4','Living units, mobile services, carbon-sink income and attracting businesses/remote workers.',references=[f'IN-A{i}' for i in range(1,5)])
sheet('Innovative aspects 5-8','Certification, professional supervision, resident employment and certified footprint conditions.',references=[f'IN-A{i}' for i in range(5,9)],issues=['ROC application, not generic regenerative branding','Relocation affects more than one resident worker','Footprint must be certified and communicated'])
sheet('Innovative aspects 9-12','Camino Mozárabe, themed cooperation, precision agriculture and agricultural logistics.',references=[f'IN-A{i}' for i in range(9,13)],issues=['Preserve Dalías/Berja geographic restrictions','Low-agricultural-production municipality conditions'])
sheet('Heritage scoring: 13, 7 and 2 points','PT.1: three cumulative options, each with its own purpose and evidence; maximum 15.',
      choices=['PT.1.1','PT.1.2','PT.1.3'],issues=['Works versus activities evidence','Subsequent use','13+7 counts as 15','A site name does not establish conservation action'])
sheet('Traditional trades and practices','Four named examples and what a preservation/dissemination activity must demonstrate.',
      references=[f'TR{i}' for i in range(1,5)],issues=['Examples are not an exhaustive approved list','No named traditional-dish list in the app','Generic restoration is not automatically a traditional craft'])
sheet('EDLL heritage: resources 1-6','Six heritage references, linked to a specific conservation or enhancement action.',references=[f'H{i}' for i in range(1,7)])
sheet('EDLL heritage: resources 7-11 and needs','Five further resources, plus the two directly relevant prioritised heritage/tourism needs.',
      references=[f'H{i}' for i in range(7,12)]+['NPL3','NPL18'])
sheet('Applicant memberships: up to 12 points','PS.1: 4/4/8 points, active memberships, certificates, statutes and GDR checks.',
      choices=['PS.1.1','PS.1.2','PS.1.3'],issues=['Cooperative territorial scope','Informal cooperation is not membership','Organisation purposes must match','4+4+8 counts as 12'])
sheet('The three cross-cutting objectives','Gender, youth and climate objectives supporting PS.1.2.',
      references=['OT-G','OT-Y','OT-C'],issues=['Actual applicant membership still required','Multiple objectives do not multiply the four-point option','Programme financial targets are not selection points'])
sheet('Previous LEADER funding: one point','PS.3: the actual applicant must never have been a previous beneficiary.',
      choices=['PS.3.1'],issues=['New project does not reset applicant history','Declaration and official checks','No separate payment document specified does not remove general duties'])
sheet('Quality local services: maximum 5 points','SP.1: 5/4/1 values, new versus improved service, promotion for dependent people.',
      choices=['SP.1.1','SP.1.2','SP.1.3'],issues=['New and improvement alternatives are exclusive','4+1 counts as 5; 5+1 remains 5','Person-oriented proximity service, not any trail or workshop','Application baseline and delivery/equipment/activity proof'])
sheet('From a claim to usable evidence','A compact blank evidence table and the application-to-payment workflow.',
      issues=['Option + EDLL reference + activity/fact + intended result + proof + owner','Mark confirmed versus unresolved','General record retention and investment/public-use duties','No specific later-control evidence is named for the individual options','Claim-specific evidence also appears on every scoring sheet'])
sheet('Your final score and outstanding checks','Blank 14-category score table, capped total, gap to 60 and completion checklist.',
      issues=['No preselected claims','No automatic score from EDLL references','Check exclusive groups and decimals','Scoring result remains separate from grant award'])

assert len(series)==46
claimed=[qid for p in series for qid in p['scoring_options']]
referenced={iid for p in series for iid in p['edll_references']}
towns=[name for p in series for name in p['municipalities']]
assert len(claimed)==45 and set(claimed)==all_choices
assert len(set(claimed))==45
assert referenced==all_references,(all_references-referenced)
assert len(towns)==32 and len(set(towns))==32

out=ROOT/'output/posters/al20-9x16'
out.mkdir(parents=True,exist_ok=True)
plan={'poster_count':46,'format':'9:16 portrait','display_size':[1080,1920],'master_size':[2160,3840],
      'source_markdown':MD.as_posix(),'markdown_sha256':hashlib.sha256(MD.read_bytes()).hexdigest(),
      'editorial_rules':['No source citations, bibliography, PDF page numbers or URLs on poster faces',
                         'English summaries; retain scoring and EDLL reference codes',
                         'Every scoring sheet shows option values, combination rule and category maximum',
                         'Include the option-specific application/payment evidence and unresolved conditions in plain language',
                         'No carried-over project choices; all alternatives remain open',
                         'Keep dates, provisional-data labels and substantive limitations even though citations are omitted',
                         'Repeat common evidence instructions once, then preserve criterion-specific differences',
                         'Aim for 120-180 words per explanatory sheet; never exceed 220 by shrinking type',
                         'At 1080x1920, target at least 32px body text and 24px secondary labels; split any content that will not fit',
                         'Ten short NPL needs, five to seven detailed EDLL items or eight municipality rows per sheet',
                         'No extra points from supporting references or repeated activities'],
      'coverage':{'scoring_options':45,'distinct_edll_references':109,'municipalities':32},'posters':series}
(out/'AL20-9x16-series-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Poster 01 is typeset directly from editable text and shapes; no PDF or prior image is edited.
W,H=2160,3840
M=144
CW=W-2*M
BG='#F5F2E8'; INK='#203E32'; MUTED='#637064'; GREEN='#2D7966'; PALE='#E5EBDD'; GOLD='#9F6F33'; GOLD_PALE='#EEE0C5'; LINE='#D3DBCC'
im=Image.new('RGB',(W,H),BG)
d=ImageDraw.Draw(im)
font_dir=Path('C:/Windows/Fonts')
font_files={'body':'segoeui.ttf','bold':'segoeuib.ttf','serif':'georgia.ttf'}
cache={}
text_boxes=[]

def font(size,face='body'):
    if (size,face) not in cache:
        file=font_dir/font_files[face]
        assert file.exists(),file
        cache[size,face]=ImageFont.truetype(str(file),size)
    return cache[size,face]

def text(x,y,value,size=52,face='body',fill=INK,align='left'):
    f=font(size,face)
    width=d.textlength(value,font=f)
    if align=='right':x-=width
    if align=='center':x-=width/2
    d.text((int(x),int(y)),value,font=f,fill=fill,anchor='lt')
    text_boxes.append((d.textbbox((int(x),int(y)),value,font=f,anchor='lt'),value,size))

def block(x,y,value,size,width,leading,face='body',fill=INK,max_lines=None):
    result=[]
    for paragraph in value.split('\n'):
        current=''
        for word in paragraph.split():
            candidate=(current+' '+word).strip()
            if current and d.textlength(candidate,font=font(size,face))>width:
                result.append(current);current=word
            else:current=candidate
        result.append(current)
    if max_lines is not None:assert len(result)<=max_lines,(value,result)
    for i,line in enumerate(result):text(x,y+i*leading,line,size,face,fill)
    return len(result)*leading

def line(y,color=LINE,width=2):d.line((M,y,W-M,y),fill=color,width=width)
def rounded(x,y,w,h,fill,radius=22):d.rounded_rectangle((x,y,x+w,y+h),radius=radius,fill=fill)
def step(number,y,title,body):
    d.ellipse((M,y-4,M+86,y+82),fill=PALE)
    text(M+43,y+15,str(number),48,'bold',GREEN,'center')
    text(M+126,y,title,72,'bold')
    block(M+126,y+102,body,64,CW-126,78,max_lines=2)

d.rectangle((M,97,M+65,107),fill=GREEN)
d.rectangle((M+76,97,M+107,107),fill=GOLD)
text(M+145,80,'AL20 / 3.4 + 3.5',44,'bold')
text(W-M,80,'01 / 46',44,'bold',MUTED,'right')
line(177)
block(M-7,250,'How the\npoints work',150,CW,169,'serif',max_lines=2)
text(M,628,'A guide for both funding routes.',62,'body',MUTED)

text(M-7,775,'60',328,'bold')
text(M+472,951,'/ 100',126,'serif',MUTED)
text(W-M,844,'14',122,'bold',GREEN,'right')
text(W-M,984,'CATEGORIES',38,'bold',MUTED,'right')
text(M,1154,'60 is the minimum required.',64,'bold')
text(M,1238,'100 is the published maximum.',64,'body',MUTED)

bar_y=1348
rounded(M,bar_y,CW,18,PALE,9)
d.rounded_rectangle((M,bar_y,M+int(CW*.6),bar_y+18),radius=9,fill=GREEN)
d.line((M+int(CW*.6),bar_y-13,M+int(CW*.6),bar_y+34),fill=INK,width=3)
text(M,1392,'0',36,'body',MUTED)
text(M+CW*.6,1392,'60 MINIMUM',36,'bold',GREEN,'center')
text(W-M,1392,'100',36,'body',MUTED,'right')

step(1,1526,'Start with the printed points',
     'Claim an option’s printed points only\nwhen its condition is satisfied.')
step(2,1831,"Apply each category’s cap",
     'Add permitted selections. Stop at the\ncategory maximum.')

rounded(M,2115,CW,346,GOLD_PALE)
text(M+44,2148,'EXAMPLE / HERITAGE',48,'bold',GOLD)
text(M+44,2222,'13 + 7 = 20',100,'bold')
text(M+1088,2222,'→',94,'body',GOLD,'center')
text(W-M-70,2191,'15',148,'bold',GREEN,'right')
text(M+44,2353,'RAW POINTS',46,'bold',MUTED)
text(W-M-49,2353,'COUNTED POINTS',46,'bold',GREEN,'right')
text(M+44,2412,'Heritage maximum: 15 points.',48,'body',MUTED)

step(3,2570,'Add the capped results',
     'Add all 14 capped scores.\nThe selection minimum is 60.')

line(2860)
text(M,2912,'Some choices are alternatives.',68,'bold')
block(M,3008,'Mutually exclusive options cannot be combined.',64,CW,78,max_lines=2)
text(M,3150,'EDLL references support a claim.',68,'bold')
text(M,3247,'They add no points by themselves.',64,'body',MUTED)

rounded(M,3385,CW,230,PALE)
block(M+38,3423,'Applicant, activity and cost eligibility\nstill require separate checks.',64,CW-76,80,'body',INK,max_lines=2)
line(3674)
text(M,3722,'SELECTION / OVERVIEW',35,'bold',MUTED)
text(W-M,3722,'NEXT: 3.4 OR 3.5?',35,'bold',GREEN,'right')

for (left,top,right,bottom),value,size in text_boxes:
    assert left>=0 and top>=0 and right<=W and bottom<=H,(left,top,right,bottom,value)
assert W*16==H*9
assert len(' '.join(v for _,v,_ in text_boxes).split())<220
assert not any(re.search(r'https?://|FUND-\d|PDF|SHA-256',v) for _,v,_ in text_boxes)
poster=out/'AL20-Poster-01-How-the-points-work-9x16.png'
im.save(poster,dpi=(144,144))
im.resize((1080,1920),Image.Resampling.LANCZOS).save(out/'AL20-Poster-01-How-the-points-work-1080x1920.png')
print(poster)
print('Plan:',out/'AL20-9x16-series-plan.json')
print('46 planned posters; 45/45 scoring options, 109/109 EDLL items and 32/32 municipalities covered.')
print(f'Poster 01: 2160x3840 master, 1080x1920 preview, {len(text_boxes)} text runs, no source citations.')
