"""Render the first AL20 reference poster from the checked project catalogue."""
from pathlib import Path
from decimal import Decimal
import json
import re

from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import A2
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "output" / "pdf"
OUT.mkdir(parents=True, exist_ok=True)
DEST = OUT / "AL20-Poster-01-Routes-3.4-and-3.5.pdf"
CAT = json.loads((ROOT / "restoration_simulator/scenarios/funding.json").read_text(encoding="utf-8"))
GUIDE = json.loads((ROOT / "restoration_simulator/scenarios/funding-selection-guidance-v1.json").read_text(encoding="utf-8"))
PROFILE = CAT["selection"]["profiles"]["line3"]
assert all(CAT["selection"]["routes"][r] == "line3" for r in ["LEADER-AL20-3.4", "LEADER-AL20-3.5"])
assert sum(Decimal(c["cap"]) for c in PROFILE["criteria"]) == Decimal("100")
assert all(CAT["rules"][r]["minimum_score"] == 60 for r in ["3.4", "3.5"])
assert len(PROFILE["criteria"]) == 14
assert sum(len(c["choices"]) for c in PROFILE["criteria"]) == 45
CRITERIA = {c["id"]: c for c in PROFILE["criteria"]}
CHOICES = {q["id"]: q for c in PROFILE["criteria"] for q in c["choices"]}
EXAMPLE = {"CO.1": ["CO.1.3"], "RD.5": ["RD.5.1"], "PT.1": ["PT.1.1"], "PS.1": ["PS.1.2", "PS.1.3"], "CC.2": ["CC.2.1"]}
EXAMPLE_POINTS = [min(Decimal(CRITERIA[cid]["cap"]), sum(Decimal(CHOICES[q]["points"]) for q in qids)) for cid, qids in EXAMPLE.items()]
assert sum(EXAMPLE_POINTS) == Decimal("60")

for name, file in [("Body", "segoeui.ttf"), ("Bold", "segoeuib.ttf"), ("Light", "segoeuil.ttf")]:
    pdfmetrics.registerFont(TTFont(name, str(Path("C:/Windows/Fonts") / file)))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="Bold", italic="Body", boldItalic="Bold")

W, H = A2
BG = "#F5F2E9"
INK = "#20382F"
MUTED = "#5B6B62"
GOLD = "#A96B2B"
GOLD_LIGHT = "#EEE2CE"
TEAL = "#237B72"
TEAL_LIGHT = "#DDECE5"
LINE = "#D7DDD3"
WHITE = "#FFFFFF"
M = 52
CW = W - 2 * M
GAP = 24
COL = (CW - GAP) / 2

c = canvas.Canvas(str(DEST), pagesize=A2, pageCompression=1)
c.setTitle("AL20 | 3.4 or 3.5? | The 60 out of 100 point threshold")
c.setAuthor("Algarrobos | Funding Explorer")
c.setSubject("Poster 01. Route comparison and complete line-3 category score map. 2026 reference editions.")
boxes = []

def col(value):
    return colors.HexColor(value)

def rect(x, top, width, height, fill, radius=0, stroke=None):
    c.setFillColor(col(fill))
    c.setStrokeColor(col(stroke or fill))
    if radius:
        c.roundRect(x, H-top-height, width, height, radius, stroke=bool(stroke), fill=1)
    else:
        c.rect(x, H-top-height, width, height, stroke=bool(stroke), fill=1)

def rule(x, top, width, color=LINE, thickness=1):
    c.setStrokeColor(col(color))
    c.setLineWidth(thickness)
    c.line(x, H-top, x+width, H-top)

def text(x, top, value, size=20, font="Body", color=INK, align="left"):
    c.setFillColor(col(color))
    c.setFont(font, size)
    baseline = H-top-size*0.82
    if align == "right":
        c.drawRightString(x, baseline, value)
    elif align == "center":
        c.drawCentredString(x, baseline, value)
    else:
        c.drawString(x, baseline, value)
    width = pdfmetrics.stringWidth(value, font, size)
    boxes.append((x if align == "left" else x-width if align == "right" else x-width/2, top, width, size*1.2, value))

def para(x, top, width, value, size=19, leading=None, color=INK, font="Body", max_height=None):
    style = ParagraphStyle("poster", fontName=font, fontSize=size, leading=leading or size*1.32,
                           textColor=col(color), spaceAfter=0, allowWidows=0, allowOrphans=0)
    p = Paragraph(value, style)
    _, height = p.wrap(width, 2000)
    if max_height is not None:
        assert height <= max_height + .1, (value, height, max_height)
    p.drawOn(c, x, H-top-height)
    boxes.append((x, top, width, height, re.sub("<[^>]+>", "", value)))
    return height

def label(x, top, value, color=MUTED, size=13):
    text(x, top, value, size, "Bold", color)

def bullet(x, top, width, value, color):
    c.setFillColor(col(color))
    c.circle(x+3, H-top-11, 2.5, stroke=0, fill=1)
    return para(x+16, top, width-16, value, 18, 23)

def route_card(x, number, accent, fill, title, spanish, purpose, cost_note, requirements, example, amount):
    top, height = 218, 415
    rect(x, top, COL, height, WHITE, 12)
    rect(x, top, COL, 8, accent, 3)
    text(x+24, top+25, number, 63, "Light", accent)
    text(x+137, top+28, title, 27, "Bold")
    para(x+137, top+66, COL-160, spanish, 14, 18, MUTED)
    para(x+24, top+111, COL-48, purpose, 20, 26, max_height=78)
    para(x+24, top+171, COL-48, cost_note, 14, 18, MUTED, max_height=18)
    y = top+198
    for item in requirements:
        y += bullet(x+24, y, COL-48, item, accent) + 10
    assert y <= top+325, y
    rect(x+17, top+320, COL-34, 46, fill, 6)
    para(x+28, top+329, COL-56, "<b>Example:</b> " + example, 16, 20, max_height=40)
    text(x+24, top+381, f"Up to {amount}", 23, "Bold", accent)
    text(x+COL-24, top+387, "100% of eligible costs", 15, "Body", MUTED, "right")

rect(0, 0, W, H, BG)
rect(M, 35, 31, 5, TEAL)
rect(M+35, 35, 14, 5, GOLD)
label(M+63, 29, "AL20  /  LEADER", INK, 15)
text(W-M, 29, "FUNDING EXPLORER  /  POSTER 01", 13, "Bold", MUTED, "right")
text(M-3, 76, "3.4 or 3.5?", 82, "Bold")
text(M, 171, "Choose the right operation. Then build an evidenced score.", 24, "Body", MUTED)

route_card(M, "3.4", GOLD, GOLD_LIGHT, "Test & demonstrate", "Actividades de demostración",
           "Test a method new or unknown in AL20.<br/>Evaluate it and share transferable results.",
           "Property investments must be for exclusive demonstration use.",
           ["Show local novelty and a clear evaluation method.",
            "Open participation; publish online from the start.",
            "Keep online information 3 years after final payment."],
           "Compare two soil treatments and publish findings.", "€28,000")
route_card(M+COL+GAP, "3.5", TEAL, TEAL_LIGHT, "Conserve & restore", "Patrimonio rural y medioambiental",
           "Conserve or recover rural heritage,<br/>including environmental heritage.",
           "Excludes standalone studies/events and buying the heritage asset.",
           ["Demonstrate heritage value and conservation benefit.",
            "Include dissemination and/or public use; plan access to enclosed sites.",
            "Have a valid forest plan at application, if required."],
           "Recover a degraded habitat with public interpretation.", "€200,000")

label(M, 643, "BOTH ROUTES  /  NONPRODUCTIVE OPERATIONS", INK, 14)
para(M, 669, CW, "Applicants: eligible public or nonprofit legal entities, public-law bodies and qualifying publicly owned companies. "
     "Verify competence, site rights, permissions and costs. Reimbursement follows eligible expenditure paid.", 18, 24, MUTED, max_height=48)
rule(M, 733, CW)

rect(M, 755, CW, 195, INK, 12)
label(M+27, 777, "ONE SHARED SCORING FRAMEWORK  /  14 CATEGORIES  /  45 OPTIONS", "#B6C6B6", 13)
text(M+25, 811, "60", 82, "Bold", WHITE)
text(M+143, 841, "/ 100", 42, "Light", "#B6C6B6")
text(M+365, 820, "Reach at least 60 evidenced points.", 27, "Bold", WHITE)
para(M+365, 861, CW-400, "Meeting the score minimum does not guarantee funding.", 19, 24, "#E2E9DD", max_height=48)
bar_x, bar_top, bar_w = M+28, 914, CW-56
rect(bar_x, bar_top, bar_w, 7, "#607267", 3)
rect(bar_x, bar_top, bar_w*.6, 7, "#D9B87E", 3)
rule(bar_x+bar_w*.6, bar_top-7, 0, WHITE, 1)
c.setStrokeColor(col(WHITE)); c.setLineWidth(1.2)
c.line(bar_x+bar_w*.6, H-bar_top+8, bar_x+bar_w*.6, H-bar_top-14)
text(bar_x, 929, "0", 11, "Body", "#D5E1D1")
text(bar_x+bar_w*.6, 929, "60 MINIMUM", 11, "Bold", WHITE, "center")
text(bar_x+bar_w, 929, "100 MAXIMUM", 11, "Body", "#D5E1D1", "right")

label(M, 976, "WHERE THE 100 POINTS COME FROM", INK, 17)
text(W-M, 978, "Category maxima - shared by both routes", 14, "Body", MUTED, "right")

names = {
    "AT.3": "Settlement population", "CO.1": "EDLL prioritised needs",
    "RD.5": "Territorial balance / business activity", "CC.2": "Renewable-energy equipment",
    "CC.7": "Sustainable mobility", "IG.8": "Leisure with a gender perspective",
    "IG.11": "Women's participation / associations", "DRI.3": "Inclusion and accessibility",
    "JR.3": "Rural youth", "IN.1": "EDLL-defined innovation", "PT.1": "Rural heritage",
    "PS.1": "Promoter's qualifying memberships", "PS.3": "No previous LEADER support",
    "SP.1": "Quality local services",
}
ids = list(CRITERIA)
for index, cid in enumerate(ids):
    side, row = divmod(index, 7)
    x, y = M+side*(COL+GAP), 1011+row*37
    if row % 2 == 0:
        rect(x, y, COL, 35, "#EBEDE3", 4)
    text(x+9, y+9, cid, 13, "Bold", TEAL)
    text(x+82, y+7, names[cid], 17, "Body")
    text(x+COL-13, y+5, CRITERIA[cid]["cap"], 23, "Bold", INK, "right")

rect(M, 1288, CW, 107, GOLD_LIGHT, 10)
label(M+20, 1304, "ILLUSTRATIVE ARITHMETIC  /  EVERY CLAIM MUST QUALIFY", GOLD, 12)
segments = [("15", "CO.1"), ("15", "RD.5"), ("13", "PT.1"), ("12", "PS.1"), ("5", "CC.2"), ("60", "POINTS")]
step=(CW-70)/6
for index,(points,code) in enumerate(segments):
    center=M+35+step*(index+.5)
    text(center, 1327, points, 36, "Bold", GOLD if index == 5 else INK, "center")
    text(center, 1370, code, 12, "Bold", MUTED, "center")
    if index < 5:
        text(M+35+step*(index+1), 1334, "=" if index == 4 else "+", 24, "Light", MUTED, "center")

rules_top=1420
third=(CW-40)/3
label(M, rules_top, "01  /  SUPPORT THE ANSWER", TEAL, 13)
para(M, rules_top+27, third-7, "Link each activity to the relevant EDLL reference and delivery evidence. References alone award no points.", 17, 23, max_height=92)
label(M+third+20, rules_top, "02  /  RESPECT THE CAPS", TEAL, 13)
para(M+third+20, rules_top+27, third-7, "Some options are alternatives. Apply combination rules and category caps. This 60-point example is hypothetical.", 17, 23, max_height=92)
label(M+2*(third+20), rules_top, "03  /  EDLL NEEDS EXAMPLE", TEAL, 13)
para(M+2*(third+20), rules_top+27, third-7, "<b>1 need = 10 | 2 = 12 | 3+ = 15</b><br/>Choose one CO.1 level. These alternatives do not add together.", 17, 23, max_height=92)

rule(M, 1556, CW)
label(M, 1572, "SOURCE EDITIONS  /  LINKS ARE CLICKABLE IN THE PDF", MUTED, 10)
boja = GUIDE["publications"]["FUND-008"]["download_url"]
criteria_url = GUIDE["publications"]["FUND-004"]["download_url"]
edll = GUIDE["publications"]["FUND-013"]["publication_url"]
para(M, 1592, CW, f'<link href="{boja}"><u>Junta de Andalucía - Order of 3 Feb 2026 (FUND-008)</u></link>: Art. 22, PDF p. 38; routes 3.4 / 3.5, pp. 120-124.', 11, 15, MUTED)
para(M, 1609, CW, f'<link href="{criteria_url}"><u>AL20 local selection criteria, 2026 (FUND-004)</u></link>: line 3, PDF pp. 16-20. '
     f'<link href="{edll}"><u>EDLL 2023-2027, V1, 19 Nov 2024 (FUND-013)</u></link>.', 11, 15, MUTED)
text(M, 1634, "Example poster | 19 Nov 2026 | Confirm the applicable call and claim evidence with the AL20 GDR.", 11, "Body", MUTED)
text(W-M, 1634, "A2  /  420 × 594 mm", 11, "Body", MUTED, "right")

# Verify all text geometry fits within the trimmed page.
for x,y,w,h,value in boxes:
    assert x >= 0 and y >= 0 and x+w <= W+1 and y+h <= H+1, (x,y,w,h,value)
c.showPage()
c.save()
print(DEST)
print(f"A2 portrait; 14 category caps = 100; example = {sum(EXAMPLE_POINTS)}; {len(boxes)} text boxes checked")
