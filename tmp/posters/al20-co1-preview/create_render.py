"""Typeset one neutral AL20 criterion poster directly to PNG. No PDF is created."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from decimal import Decimal
import json

ROOT = Path(__file__).resolve().parents[3]
CAT = json.loads((ROOT / 'restoration_simulator/scenarios/funding.json').read_text(encoding='utf-8'))
EDLL = json.loads((ROOT / 'restoration_simulator/scenarios/funding-edl-v1.json').read_text(encoding='utf-8'))
GUIDE = json.loads((ROOT / 'restoration_simulator/scenarios/funding-selection-guidance-v1.json').read_text(encoding='utf-8'))
PROFILE = CAT['selection']['profiles']['line3']
CRITERIA = {item['id']: item for item in PROFILE['criteria']}
RULE = CRITERIA['CO.1']
ITEMS = {item['id']: item for item in EDLL['items']}
NEEDS = [ITEMS[f'NPL{number}'] for number in range(1, 26)]

# Complete future-series partition; CO.1 has two consecutive catalogue sheets.
# Every scoring choice is retained, independent of the saved project assessment.
SERIES = [
    {'topic': 'EDLL needs, NPL1-25', 'criteria': ['CO.1'], 'needs': list(range(1, 26))},
    {'topic': 'EDLL needs, NPL26-50', 'criteria': ['CO.1'], 'needs': list(range(26, 51))},
    {'topic': 'EDLL innovation themes and aspects', 'criteria': ['IN.1']},
    {'topic': 'Leisure with a gender perspective', 'criteria': ['IG.8']},
    {'topic': "Women's participation and associations", 'criteria': ['IG.11']},
    {'topic': 'Rural youth', 'criteria': ['JR.3']},
    {'topic': 'Inclusion and accessibility', 'criteria': ['DRI.3']},
    {'topic': 'Rural heritage and traditional trades', 'criteria': ['PT.1']},
    {'topic': 'Applicant memberships and funding history', 'criteria': ['PS.1', 'PS.3']},
    {'topic': 'Renewable energy and mobility', 'criteria': ['CC.2', 'CC.7']},
    {'topic': 'Settlement and territorial balance', 'criteria': ['AT.3', 'RD.5']},
    {'topic': 'Quality local services', 'criteria': ['SP.1']},
]
assert {cid for sheet in SERIES for cid in sheet['criteria']} == set(CRITERIA)
assert len(RULE['choices']) == 3
assert [q['points'] for q in RULE['choices']] == ['10', '12', '15']
assert Decimal(RULE['cap']) == 15
assert len(NEEDS) == 25 and len({n['id'] for n in NEEDS}) == 25
assert all(CAT['selection']['routes'][r] == 'line3' for r in ['LEADER-AL20-3.4', 'LEADER-AL20-3.5'])
assert sum(len(v['choices']) for v in CRITERIA.values()) == 45
assert sum(Decimal(v['cap']) for v in CRITERIA.values()) == 100

W, H = 2400, 3394
M = 110
CW = W - 2*M
GAP = 82
COL = (CW-GAP)//2
BG = '#F6F3E9'
INK = '#203D32'
MUTED = '#617064'
GREEN = '#2A7666'
PALE = '#E8EDE2'
RULE_COLOR = '#D5DCCF'
GOLD = '#946A35'
GOLD_PALE = '#EEE2CC'
WHITE = '#FFFFFF'

im = Image.new('RGB', (W, H), BG)
draw = ImageDraw.Draw(im)
font_dir = Path('C:/Windows/Fonts')
fonts = {}
font_files = {'regular': 'segoeui.ttf', 'bold': 'segoeuib.ttf', 'serif': 'georgia.ttf', 'italic': 'georgiai.ttf'}
for face, filename in font_files.items():
    assert (font_dir/filename).is_file(), filename

def font(size, face='regular'):
    key=(size,face)
    if key not in fonts:
        fonts[key]=ImageFont.truetype(str(font_dir/font_files[face]),size)
    return fonts[key]

text_boxes=[]

def tx(x,y,value,size=27,face='regular',fill=INK,align='left'):
    f=font(size,face)
    width=draw.textlength(value,font=f)
    if align=='right': x-=width
    if align=='center': x-=width/2
    draw.text((round(x),round(y)),value,font=f,fill=fill,anchor='lt')
    box=draw.textbbox((round(x),round(y)),value,font=f,anchor='lt')
    text_boxes.append((box,value))
    return width

def wrap(value,size,max_width,face='regular'):
    result=[]
    for paragraph in value.split('\n'):
        current=''
        for word in paragraph.split():
            candidate=f'{current} {word}'.strip()
            if draw.textlength(candidate,font=font(size,face)) > max_width and current:
                result.append(current)
                current=word
            else:
                current=candidate
        result.append(current)
    return result

def block(x,y,value,size,width,leading,face='regular',fill=INK,max_lines=None):
    lines=wrap(value,size,width,face)
    if max_lines is not None:
        assert len(lines)<=max_lines,(value,lines,max_lines)
    for index,line in enumerate(lines):
        tx(x,y+index*leading,line,size,face,fill)
    return len(lines)*leading

def line(x,y,width,color=RULE_COLOR,thickness=2):
    draw.line((x,y,x+width,y),fill=color,width=thickness)

def rounded(x,y,width,height,fill,radius=15):
    draw.rounded_rectangle((int(x),int(y),int(x+width),int(y+height)),radius=radius,fill=fill)

# Header: a criterion reference sheet rather than a selected project proposal.
draw.rectangle((M,67,M+58,77),fill=GREEN)
draw.rectangle((M+68,67,M+97,77),fill=GOLD)
tx(M+124,58,'AL20  /  LINES 3.4 + 3.5',27,'bold')
tx(W-M,62,'CRITERION GUIDE  /  01',24,'bold',MUTED,'right')
block(M,136,'Which needs could\nyour project address?',105,CW,120,'serif',max_lines=2)
tx(M,406,'CO.1  /  Addressing needs prioritised in the EDLL',34,'regular',MUTED)

tx(M,486,'ALL THREE SCORING OPTIONS',25,'bold',GREEN)
tx(W-M,486,'CATEGORY MAXIMUM: 15 POINTS',25,'bold',GREEN,'right')
option_gap=24
option_w=(CW-2*option_gap)/3
need_counts=['1 prioritised need','2 distinct prioritised needs','3 or more distinct needs']
for index,choice in enumerate(RULE['choices']):
    x=M+index*(option_w+option_gap)
    rounded(x,535,option_w,210,WHITE,16)
    tx(x+28,558,choice['id'],23,'bold',MUTED)
    tx(x+28,597,choice['points'],71,'bold',INK)
    tx(x+145,631,'POINTS',22,'bold',MUTED)
    tx(x+28,698,need_counts[index],27,'regular')
tx(M,774,'Alternative levels: one score only. No demonstrated prioritised need = 0 points.',28,'regular')
tx(M,816,'All three options refer to the same EDLL list. Count distinct needs that the operation actually addresses.',27,'regular',MUTED)

line(M,880,CW)
tx(M,921,'What the EDLL actually lists',49,'serif')
tx(M,991,'NEEDS 1-25 OF 50  /  PUBLISHED PRIORITY ORDER',24,'bold',GREEN)
tx(W-M,991,'EDLL V1  /  PDF pp. 395-396',23,'regular',MUTED,'right')

list_y=1057
row_h=126
for index,item in enumerate(NEEDS):
    side=0 if index<13 else 1
    row=index if side==0 else index-13
    x=M+side*(COL+GAP)
    y=list_y+row*row_h
    tx(x,y+3,item['id'],23,'bold',GREEN)
    title_x=x+118
    title_w=COL-213
    title_lines=wrap(item['label_es'],27,title_w,'bold')
    assert len(title_lines)==1,(item['id'],title_lines)
    tx(title_x,y,item['label_es'],27,'bold')
    tx(x+COL,y+5,f"p. {item['page']}",20,'regular',MUTED,'right')
    block(title_x,y+40,item['label'],28,COL-118,35,'regular',INK,max_lines=2)
    line(x,y+row_h-18,COL,thickness=1)

# A continuation notice occupies the unused 26th slot rather than squeezing in another list.
x=M+COL+GAP
y=list_y+12*row_h
rounded(x,y-1,COL,row_h-15,PALE,10)
tx(x+24,y+19,'CONTINUED ON THE NEXT POSTER',21,'bold',GREEN)
tx(x+24,y+57,'NPL26-NPL50  /  The remaining 25 needs',28,'regular')

footer_y=2762
line(M,footer_y,CW)
tx(M,footer_y+35,'HOW TO SUPPORT ANY OF THESE OPTIONS',24,'bold',GREEN)
third=(CW-96)/3
steps=[
    ('01','Identify the need','Name its NPL code and the strategy passage.'),
    ('02','Explain the response','Describe the activity, objective and intended result.'),
    ('03','Document the fit','Set out the link in the application memorandum; GDR verification is required.'),
]
for index,(number,title,body) in enumerate(steps):
    sx=M+index*(third+48)
    tx(sx,footer_y+96,number,24,'bold',GREEN)
    tx(sx+59,footer_y+91,title,31,'bold')
    block(sx+59,footer_y+143,body,27,third-59,37,'regular',MUTED,max_lines=3)

rounded(M,3046,CW,112,GOLD_PALE,12)
block(M+28,3067,
      'NPL codes and EDLL priority rankings are not grant-selection points. CO.1 contributes up to 15 points towards the overall minimum of 60 out of 100.',
      28,CW-56,38,'regular',INK,max_lines=2)
tx(M,3191,'SOURCE EDITIONS',21,'bold',MUTED)
block(M,3226,
      'AL20 selection criteria, 2026 (FUND-004), PDF p. 16. Verification guide v2-4 (FUND-010), PDF pp. 16-17 and 219.\n'
      'EDLL 2023-2027, V1, 19 Nov 2024 (FUND-013), PDF pp. 395-397; entries on this sheet: pp. 395-396.',
      21,CW,30,'regular',MUTED,max_lines=3)
tx(M,3320,'English summaries with Spanish source keywords  /  Reference preview  /  19 Nov 2026',20,'regular',MUTED)
tx(W-M,3320,'CO.1  /  PART 1 OF 2',20,'bold',MUTED,'right')

# No text clipping or missing needs; only the canonical catalogue and EDLL library are read.
for (left,top,right,bottom),value in text_boxes:
    assert left>=0 and top>=0 and right<=W and bottom<=H,(left,top,right,bottom,value)
for need in NEEDS:
    assert any(value==need['id'] for _,value in text_boxes),need['id']
out=ROOT/'output/posters'
out.mkdir(parents=True,exist_ok=True)
dest=out/'AL20-CO1-EDLL-Needs-Part-1-render.png'
assert not dest.with_suffix('.pdf').exists()
im.save(dest,dpi=(145,145))
print(dest)
print(f'{W}x{H} PNG | 3 open scoring options | 25 canonical needs | complete future-series coverage: 14 criteria / 45 options')
