"""Reproduce reader illustrations and bounded source-figure renders.

Run with the bundled artifact Python (pypdfium2). Original PDF bytes are never
changed. Source figures are presentation excerpts, not new scientific evidence.
"""
import hashlib
import html
import json
from pathlib import Path
import pypdfium2 as pdfium

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ASSETS = HERE / "assets"
ASSETS.mkdir(exist_ok=True)
CATALOGUE = json.loads((ROOT / "restoration_simulator/scenarios/documents.json").read_text(encoding="utf8"))
DOCS = {d["id"]: d for d in CATALOGUE["documents"]}
credits = []

# Normalised page rectangles: left, top, right, bottom. These select figures,
# retaining original geometry; no retouching, reconstruction or generative edit.
FIGURES = [
    ("growboxx-cutaway", "IRR-001", 2, (.25,.07,.80,.35), "Groasis manufacturer cutaway of a Growboxx; product illustration, not a drone installation."),
    ("growboxx-field", "IRR-001", 3, (.20,.07,.87,.45), "Groasis field photograph: seedling and protected reservoir installation; no autonomous refill shown."),
    ("waterboxx-cutaway", "IRR-002", 2, (.28,.05,.77,.25), "Groasis Waterboxx cutaway illustrations; reusable polypropylene comparator."),
    ("cocoon-field", "IRR-003", 92, (.16,.045,.93,.40), "LIFE NIEBLAS photograph of a planted Cocoon; field installation, not a drone interface."),
    ("cocoon-refill", "IRR-003", 120, (.27,.30,.94,.86), "LIFE NIEBLAS illustrated initial and subsequent watering sequence; ground watering, not autonomous insertion."),
    ("reservoir-wear", "IRR-003", 93, (.18,.19,.90,.40), "LIFE NIEBLAS photographs of reservoir condition; not a quantified service-life guarantee."),
    ("field-monitoring", "IRR-003", 143, (.55,.48,.91,.92), "LIFE NIEBLAS field photographs beside irrigation recommendations; context is the original trial."),
    ("m350-airframe", "DRONE-001", 1, (.16,.37,.88,.71), "DJI Matrice 350 RTK manual-cover drawing; no watering kit is depicted or certified."),
    ("dock4-system", "DRONE-002", 1, (.29,.23,.76,.76), "DJI Dock 4 manual-cover drawing of dock and aircraft; no water-refill system shown."),
    ("t25-airframe", "DRONE-003", 11, (.16,.08,.88,.41), "DJI T25 aircraft overview, including annotated components; larger agricultural benchmark."),
    ("hose-prototype", "DRONE-004", 2, (.51,.19,.98,.43), "Miwa et al. experimental hose-fed spraying setup; not a plant-reservoir hose insertion system."),
    ("hose-field-trial", "DRONE-004", 3, (.51,.70,.98,.90), "Miwa et al. outdoor experimental photograph; spray trial, not proof of root-zone irrigation benefit."),
    ("restoration-islands", "FOREST-002", 133, (.11,.20,.94,.49), "Junta de Andalucia handbook field photographs; restoration context, not a prescribed drone cluster layout."),
]

for name, ident, number, rectangle, caption in FIGURES:
    record = DOCS[ident]
    path = ROOT / "doc_library" / record["filename"]
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != record["sha256"]:
        raise ValueError(f"{ident}: original source checksum changed; review before rendering.")
    pdf = pdfium.PdfDocument(path)
    page = pdf[number - 1]
    w, h = page.get_size()
    left, top, right, bottom = rectangle
    bitmap = page.render(scale=2, crop=(left*w, (1-bottom)*h, (1-right)*w, top*h))
    bitmap.to_pil().save(ASSETS / (name + ".webp"), "WEBP", quality=91)
    bitmap.close(); page.close(); pdf.close()
    credits.append({"file": name + ".webp", "kind": "source_figure", "document_id": ident,
                    "pdf_page": number, "source_sha256": digest, "rectangle_ltrb": list(rectangle),
                    "caption": caption, "rights": "Original publisher/figure authors retain rights; no new licence asserted."})

def text(x, y, value, size=22, color="#183b34", weight=400, anchor="start"):
    return f'<text x="{x}" y="{y}" fill="{color}" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}">{html.escape(value)}</text>'

def box(x, y, w, h, lines, fill="#e2eadb", color="#183b34"):
    out = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="18" fill="{fill}" stroke="#b7c7b4"/>'
    for i, line in enumerate(lines): out += text(x+20,y+36+i*29,line,22,color,600 if i==0 else 400)
    return out

def arrow(x1,y1,x2,y2,color="#317d74",dash=False):
    return f'<path d="M{x1} {y1} L{x2} {y2}" fill="none" stroke="{color}" stroke-width="4" marker-end="url(#arrow)" {"stroke-dasharray=\"9 7\"" if dash else ""}/>'

def tree(x,y,s=1):
    return f'<g transform="translate({x} {y}) scale({s})"><path d="M0 0 L0 -64" stroke="#946b43" stroke-width="10"/><circle cx="0" cy="-84" r="39" fill="#407d55"/><circle cx="-23" cy="-66" r="29" fill="#609565"/><circle cx="25" cy="-67" r="30" fill="#54875b"/></g>'

def drone(x,y,s=1):
    return f'<g transform="translate({x} {y}) scale({s})"><path d="M-48 -27 L48 27 M-48 27 L48 -27" stroke="#183b34" stroke-width="9"/><rect x="-20" y="-19" width="40" height="38" rx="12" fill="#317d74"/>'+''.join(f'<ellipse cx="{a}" cy="{b}" rx="27" ry="8" fill="#c1d8ce" stroke="#183b34" stroke-width="3"/>' for a,b in [(-48,-27),(48,27),(-48,27),(48,-27)])+'</g>'

def save(name,title,subtitle,body):
    svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 620" role="img"><title>'+html.escape(title)+'</title><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#317d74"/></marker></defs><rect width="1120" height="620" rx="24" fill="#f5f1e7"/><g font-family="Segoe UI,Arial,sans-serif">'+text(44,58,title,32,weight=700)+text(44,94,subtitle,19,color="#52675e")+body+text(44,591,'Explanatory schematic · author illustration · not to scale or validated hardware',16,color="#65736a")+'</g></svg>'
    (ASSETS/(name+'.svg')).write_text(svg,encoding='utf8')
    credits.append({"file":name+'.svg',"kind":"author_schematic","caption":title+". "+subtitle,"rights":"Repository-authored explanatory illustration; not evidence of field performance."})

save('system-overview','Intelligence at the drone. Simplicity at each plant.','The proposed service cycle; component integration still requires development.',
     box(45,180,245,240,['REMOTE BASE','Stored water','Power + battery service','Human support as needed'])+drone(538,220,1.1)+box(406,321,265,100,['ONE DRONE','Useful water + return reserve'])+arrow(300,230,445,230)+arrow(630,230,793,230)+tree(875,346,.9)+tree(1008,366,.7)+'<ellipse cx="875" cy="351" rx="55" ry="17" fill="#c9a575"/><ellipse cx="1008" cy="371" rx="43" ry="13" fill="#c9a575"/>'+box(760,420,310,90,['PASSIVE RESERVOIRS','One refillable unit per plant'])+arrow(804,510,300,470,dash=True)+text(384,505,'Return for water / battery service',20))
save('app-map','From a readable story to the exact evidence','Knowledge Explorer is the entry point; reading does not adopt rules.',
     box(45,170,310,115,['1 · ILLUSTRATED READER','Access guide + 11 readouts'])+box(410,170,310,115,['2 · STRUCTURED RECORD','Profile, product or work package'])+box(775,170,300,115,['3 · SOURCE PASSAGE','Checked PDF edition + page'])+arrow(360,225,405,225)+arrow(725,225,770,225)+box(210,380,700,115,['REVIEW BEFORE OPERATIONAL USE','Prepared clusters / inputs remain unadopted.','Unknown water demand remains unknown.'], '#f0debf')+arrow(550,300,550,370))
save('reservoir-section','What the drone would actually have to refill','A passive capture guide is a proposal, not a reviewed commercial interface.',
     '<path d="M40 390 H1080 V548 H40z" fill="#d8c19f"/><path d="M110 360 H270 L290 465 H90z" fill="#b58a55"/><path d="M122 376 H257 L274 445 H107z" fill="#69b5c4"/>'+tree(530,390,1.3)+drone(870,195,1.1)+'<path d="M870 219 C875 320 790 290 790 370" stroke="#324d4b" stroke-width="8" fill="none"/>'+'<path d="M755 358 L790 410 L825 358" fill="#ddb26b" stroke="#886c42" stroke-width="3"/>'+box(60,145,320,120,['RESERVOIR QUESTIONS','Usable retained volume?','Repeated wet strength?'])+box(650,445,400,98,['INTERFACE QUESTIONS','Capture, fill acceptance, disengage?'])+arrow(245,280,197,351)+arrow(800,429,797,402))
save('lifecycle-cost','Cheap to buy is only one part of the cost','Compare a common establishment period and equivalent service outcomes.',
     box(40,165,325,140,['RESERVOIR','Purchase + delivery','Install + inlet adaptation'])+box(398,165,325,140,['SERVICE','Water + energy + labour','Drone / base / batteries'])+box(756,165,325,140,['REPLACEMENT / REUSE','Failure + retrieval','Cleaning + storage'])+text(379,245,'+',30,weight=700)+text(736,245,'+',30,weight=700)+arrow(560,330,560,394)+box(185,405,750,120,['COMPARE COST PER ESTABLISHED PLANT','Keep survival, visit frequency and service horizon explicit.'], '#f0debf'))
save('plant-evidence','Three separate questions for every plant','A species name alone answers none of these completely.',
     tree(147,338,1.1)+box(290,150,770,98,['1 · SUITABILITY','Exact species + nursery stock + reservoir + site'])+box(290,283,770,98,['2 · WATER NEED','Establishment stage + soil + weather + useful delivery'])+box(290,416,770,98,['3 · PHYSICAL FIT','Root plug + reservoir opening + shelter + refill access'])+arrow(190,255,280,206)+arrow(205,330,280,330)+arrow(190,390,280,463))
save('water-balance','A disappearing litre is not necessarily a useful litre','Release, plant need, losses and rainfall must be accounted for separately.',
     box(45,175,280,135,['RESERVOIR','Initial water + top-ups','+ effective captured rain'])+box(422,175,280,135,['ROOT ZONE','Useful delivered water','Soil / root conditions'])+box(798,175,280,135,['PLANT','Supplemental need','Changes with conditions'])+arrow(335,235,412,235)+arrow(712,235,788,235)+arrow(175,325,175,417)+box(45,432,500,90,['LOSSES / UNAVAILABLE WATER','Evaporation, leakage, bypass, retained dead volume'], '#f0debf')+box(610,400,470,125,['NO UNIVERSAL COUNTDOWN','Refill interval needs measured inputs.','All 23 daily-rate profiles remain unknown.']))
save('cluster-plan','Plant association and drone access share the same space','Candidate carob island; illustrative geometry without counts or spacing defaults.',
     '<rect x="65" y="145" width="625" height="388" rx="30" fill="#e2eadb" stroke="#a8b99f"/>'+tree(370,360,1.35)+tree(190,300,.65)+tree(515,435,.75)+tree(540,250,.55)+'<path d="M115 480 C260 430 230 160 600 195" stroke="#dba85f" stroke-width="30" fill="none" stroke-dasharray="12 10"/>'+''.join(f'<circle cx="{x}" cy="{y}" r="12" fill="#73afbb" stroke="#183b34"/>' for x,y in [(385,390),(205,321),(527,455),(552,270)] )+box(735,165,335,130,['CENTRAL RULES','Species / dimensions / placement','Existing palette references'])+box(735,337,335,150,['ADDITIONAL ACCESS CHECK','Exposed inlet + canopy growth','Rotor, hose and shelter clearance','No new numeric spacing adopted']))
save('payload-budget','Water competes for payload with its own delivery equipment','An airframe rating is not a useful water payload or loaded flight duration.',
     drone(560,170,1.2)+box(70,280,300,140,['FITTED AIRCRAFT','Airframe + batteries','Already configured equipment'])+box(410,280,300,140,['WATERING KIT','Tank + pump + hose','Guidance + fittings'])+box(750,280,300,140,['USEFUL WATER','Remaining verified capacity','Return reserve still required'])+text(380,364,'+',30)+text(720,364,'+',30)+box(180,457,760,75,['Validate the complete fitted mass and loaded sortie together.'], '#f0debf'))
save('hose-capture','The inlet is part of the robotics problem','Illustrated funnel capture is a development option, not a proven product.',
     drone(275,200,1.15)+'<path d="M275 220 C280 300 370 300 370 385" stroke="#324d4b" stroke-width="9" fill="none"/><path d="M305 360 L370 450 L435 360" fill="#ddb26b" stroke="#886c42" stroke-width="4"/><rect x="300" y="455" width="140" height="70" rx="24" fill="#c8a473"/>'+box(610,160,455,112,['FIND AND APPROACH','Localise the inlet; account for wind and vegetation.'])+box(610,305,455,112,['CAPTURE AND TRANSFER','Verify engagement, flow and retained useful water.'])+box(610,450,455,85,['DISENGAGE AND VERIFY','Avoid damage, drips and hose snagging.'])+arrow(835,280,835,296)+arrow(835,425,835,442))
save('base-integration','A dock is only as autonomous as the whole refill cycle','Battery automation does not establish water-service automation.',
     box(45,155,315,170,['BATTERY / POWER','Compatible aircraft','Swap / charge / return','Documented component'])+box(405,155,315,170,['WATER SERVICE','Tank + pump + coupling','Metered transfer + leaks','Integration to be developed'])+box(765,155,315,170,['OPERATIONS','Water resupply + maintenance','Communications + weather','Human interventions recorded'])+arrow(205,345,205,405)+arrow(565,345,565,405)+arrow(925,345,925,405)+box(45,420,1035,100,['ONE COMPLETE CYCLE','Arrive → safe service → sufficient water and energy → depart → return safely'], '#f0debf'))
save('remote-base','Remote does not mean resupply-free','Sketch the site support system before estimating unattended service capacity.',
     '<rect x="55" y="150" width="600" height="380" rx="22" fill="#e2eadb"/><path d="M70 485 C220 390 320 520 640 370" stroke="#c5a77e" stroke-width="38" fill="none"/><rect x="130" y="245" width="130" height="140" rx="18" fill="#76b2c0"/>'+text(145,315,'WATER',22,weight=600)+box(335,210,260,95,['BASE / SERVICE','Power + weather cover'])+drone(470,390,.7)+box(705,160,360,120,['BEFORE THE RUN','Usable stored water','Energy / battery inventory'])+box(705,315,360,150,['DURING THE RUN','Weather windows + communication','Access, cleaning, filters, faults','Explicit human support'])+arrow(270,300,325,260))
save('operating-gates','Technical feasibility and operating permission are separate','Planning checklist from the reviewed guidance; no site or flight is cleared.',
     box(55,150,470,125,['DEFINE THE OPERATION','Aircraft, water transfer, autonomy, people','Coordinates, dates and operating conditions'])+box(595,150,470,125,['ASSESS THE CATEGORY / SITE','EASA / AESA framework + geographic zones','Do not assume open-category eligibility'])+arrow(535,210,585,210)+box(55,365,470,125,['PLAN THE CONTROLS','Personnel, authorisation where required','Emergency response and operating limits'])+box(595,365,470,125,['VERIFY BEFORE DEPLOYMENT','Current rules + actual site + complete system','This reader provides no flight clearance'], '#f0debf')+arrow(825,290,825,350)+arrow(585,427,535,427))
save('validation-gates','Build confidence in four measured stages','Keep operational throughput separate from biological establishment outcomes.',
     box(45,170,245,260,['1 · RESERVOIR','Retained useful volume','Leakage + acceptance flow','Repeated wet strength'])+box(310,170,245,260,['2 · INTERFACE','Capture + disengage','Spill / miss / recovery','Handling time + damage'])+box(575,170,245,260,['3 · SERVICE CYCLE','Loaded flight + reserve','Water / battery base time','Human interventions'])+box(840,170,245,260,['4 · PLANTS / VALUE','Water status + survival','Matched ground baseline','Lifecycle cost / service'])+text(302,490,'Measure failed attempts and missed deadlines, too.',23,weight=600))
save('capacity-tradeoffs','More visits are useful only if plants get enough water','No numerical capacity estimate is defensible until the inputs are explicit.',
     box(55,155,470,132,['TIME / CAPACITY','Travel + acquisition + transfer + return','Base service + weather + human support'])+box(595,155,470,132,['PLANT / RESERVOIR','Useful refill volume + demand + losses','Deadline margin + reservoir service life'])+arrow(530,220,585,220)+arrow(585,255,535,255)+box(155,390,810,115,['COMPARE THE SAME JOB','Same layout, season, plant outcomes, horizon and water inventory.','Report costs, useful litres and deadline failures alongside throughput.'], '#f0debf'))

(HERE/'VISUAL_CREDITS.json').write_text(json.dumps({'version':1,'prepared_on':'2026-11-04','visuals':credits},indent=2)+'\n',encoding='utf8')
print(f'Created {len(credits)} credited visual assets in {ASSETS}')
