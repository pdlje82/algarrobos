"""Rebuild the eight drone-extension LEARN-016 concept diagrams (not installation drawings).

Requires Python, PyMuPDF and Pillow. Run from any working directory.
All geometry, example quantities and compositions are original; no vendor images reused.
"""
from pathlib import Path
from html import escape
import math
import textwrap
import pymupdf
from PIL import Image, ImageOps, ImageDraw

OUT = Path(__file__).resolve().parent / 'figures'
OUT.mkdir(exist_ok=True)
INK, BLUE, GREEN, ORANGE, RED = '#19343e', '#137fa7', '#39785b', '#b77420', '#a7443c'
PALE, SOIL = '#edf4f3', '#ede2cd'


class Figure:
    def __init__(self, number, title, subtitle):
        self.number = number
        self.parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="850" viewBox="0 0 1400 850">',
                      f'<title>{escape(title)}</title>', '<rect width="1400" height="850" fill="#ffffff"/>']
        self.text(55, 58, f'{number:02d}  {title}', 34, INK, 'bold')
        self.text(55, 99, subtitle, 21)
        self.line(55, 124, 1345, 124, '#b7cbc9', 2)
        self.text(55, 820, 'ALGARROBOS  /  LEARN-016  /  3 NOV 2026  /  CONCEPT ONLY - NOT TO SCALE', 17)

    def raw(self, value):
        self.parts.append(value)

    def text(self, x, y, value, size=23, color=INK, weight='normal', anchor='start'):
        for i, line in enumerate(value.split('\n')):
            self.raw(f'<text x="{x}" y="{y+i*(size+9)}" font-family="sans-serif" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" fill="{color}">{escape(line)}</text>')

    def rect(self, x, y, w, h, fill=PALE, stroke='#91aaa6', radius=9):
        self.raw(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')

    def box(self, x, y, w, h, title, detail='', color=INK):
        wrapped='\n'.join('\n'.join(textwrap.wrap(line, width=max(12,int((w-36)/9)))) for line in detail.split('\n')) if detail else ''
        h=max(h, 75+28*(len(wrapped.splitlines())-1)) if wrapped else h
        self.rect(x, y, w, h)
        self.text(x+18, y+33, title, 24, color, 'bold')
        if detail:
            self.text(x+18, y+62, wrapped, 19)

    def line(self, x1, y1, x2, y2, color=INK, width=3, dash=False):
        dashattr = ' stroke-dasharray="9 7"' if dash else ''
        self.raw(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}"{dashattr}/>')

    def arrow(self, x1, y1, x2, y2, color=BLUE, dash=False):
        self.line(x1, y1, x2, y2, color, 3, dash)
        a = math.atan2(y2-y1, x2-x1)
        pts = [(x2,y2),(x2-13*math.cos(a-.45),y2-13*math.sin(a-.45)),(x2-13*math.cos(a+.45),y2-13*math.sin(a+.45))]
        self.raw(f'<polygon points="{" ".join(f"{x},{y}" for x,y in pts)}" fill="{color}"/>')

    def circle(self, x, y, r, fill=GREEN, stroke=GREEN):
        self.raw(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')

    def plant(self, x, y, label=''):
        self.line(x, y, x, y-45, GREEN, 5)
        self.circle(x-13, y-47, 17, '#dceadd')
        self.circle(x+14, y-54, 20, '#dceadd')
        if label:
            self.text(x, y+30, label, 19, anchor='middle')

    def save(self, slug):
        path = OUT / f'{self.number:02d}-{slug}.svg'
        path.write_text('\n'.join(self.parts+['</svg>']), encoding='utf-8')
        doc = pymupdf.open(path)
        pdf = pymupdf.open('pdf', doc.convert_to_pdf())
        pdf[0].get_pixmap(matrix=pymupdf.Matrix(1.3,1.3), alpha=False).save(path.with_suffix('.png'))


def drone(f, x, y, scale=1, color=INK):
    for dx,dy in [(-50,-23),(50,-23),(-50,23),(50,23)]:
        f.line(x,y,x+dx*scale,y+dy*scale,color,5)
        f.raw(f'<ellipse cx="{x+dx*scale}" cy="{y+dy*scale}" rx="{27*scale}" ry="{8*scale}" fill="#d4e5e8" stroke="{color}" stroke-width="2"/>')
    f.rect(x-20*scale,y-18*scale,40*scale,36*scale,'#d4e5e8',color)


f=Figure(13,'What a drone adds to a restoration site','Author assessment from the sources: ready hardware does not guarantee a validated ecological decision.')
for x,title,lines,color in [
    (65,'SURVEY & INSPECT',['RGB: plant register + change','Multispectral: canopy signals','Thermal: temperature patterns','Best first step: shared service'],GREEN),
    (500,'ESTIMATE & CONNECT',['Radar / radiometer: soil proxy','Landing robot: contact probe','Radio ferry: read ground nodes','Specialist validation required'],BLUE),
    (935,'MOVE WATER',['Spray drones: 40–100 L examples','Hose-fed: field prototypes','Root-basin dosing: trial needed','No routine replacement assumed'],ORANGE)]:
    f.box(x,205,400,110,title,'',color);drone(f,x+200,385,1.3,color)
    for n,line in enumerate(lines):f.text(x+15,490+n*49,line,21)
f.text(65,748,'Recommended demonstrator: periodic aerial surveys + continuous ground sensing + local tank control.',22,GREEN,'bold')
f.save('drone-roles')

f=Figure(14,'A sharp photograph is not a root-zone reading','Separate spatial resolution, positioning accuracy and what the sensor actually observes.')
for x,title,sub in [(65,'RGB / MULTISPECTRAL','Leaves, colour and reflected light'),(735,'THERMAL INFRARED','Surface temperature, mixed pixels')]:
    f.box(x,155,600,90,title,sub)
    for row in range(8):
        for col in range(12):
            inside=((col-5.5)/3.2)**2+((row-3.5)/3.1)**2 < 1
            fill=('#4d895b' if inside else '#dfcda8') if x==65 else ('#e7a658' if inside else '#be6c47')
            f.rect(x+30+col*39,295+row*39,39,39,fill,'#ffffff',0)
    f.text(x+20,662,'Plant identity and condition need ground checks.' if x==65 else 'Hot bare ground can dominate a small seedling.',22)
f.box(65,705,1270,70,'Resolution example','20 cm crown / 17 cm thermal pixel ≈ 1.2 pixels across; not enough for a clean canopy temperature.',ORANGE)
f.text(65,265,'Illustrative pixels, not survey imagery or measured temperatures.',19)
f.save('drone-image-resolution')

f=Figure(15,'Five different meanings of “drone soil moisture”','Depth and footprint depend on the instrument, soil and retrieval model; no universal measurement depth.')
f.rect(70,430,1260,325,SOIL,'#bca27b',0);f.line(70,430,1330,430,GREEN,4)
for x in [245,690,1130]:f.plant(x,425)
drone(f,255,225,1.3);drone(f,695,225,1.3);drone(f,1130,225,1.3)
f.text(90,310,'RGB / thermal',25,INK,'bold');f.text(90,347,'Canopy or soil skin\nIndirect stress / moisture proxy',20)
f.arrow(255,255,245,368,ORANGE)
f.text(540,310,'Radar / radiometer',25,INK,'bold');f.text(540,347,'Microwave response + inversion\nCalibrated layer and footprint',20)
f.arrow(695,255,690,510,BLUE);f.raw('<ellipse cx="690" cy="512" rx="130" ry="45" fill="#c9dfe4" fill-opacity=".65" stroke="#137fa7" stroke-dasharray="7 6"/>')
f.text(1020,310,'Radio data ferry',25,INK,'bold');f.text(1020,347,'Reads fixed buried sensors\nDrone is the communications link',20)
f.rect(1170,402,35,45,'#d4e5e8',BLUE);f.arrow(1130,255,1180,397,BLUE,True)
for y in [510,610]:f.line(1187,445,1187,y,BLUE);f.rect(1160,y,55,14,'#d4e5e8',BLUE)
f.text(1010,680,'Known installed depths',20)
f.box(105,515,405,145,'Landing contact robot','Land → insert probe → read → retract. Point sample; rocky ground and slope are engineering barriers.',ORANGE)
f.text(105,716,'Root-zone estimate from a water-balance model is an inference, not a deeper camera image.',22,INK,'bold')
f.save('drone-moisture-depth')

f=Figure(16,'Connect aerial observations to local irrigation','Proposed architecture: retain acquisition time, uncertainty, plant ID and measurement depth.')
f.box(70,180,370,120,'Periodic drone flight','RGB / spectral / thermal\nMap candidates for inspection',BLUE)
f.box(70,385,370,120,'Fixed soil + tank sensors','Continuous moisture / flow\nLocal records + fault trips',GREEN)
f.box(540,270,350,140,'Join by place and time','Plant IDs + sensor locations\nWeather + calibration + quality\nReject stale or invalid input')
f.arrow(440,240,540,305);f.arrow(440,445,540,375)
f.box(990,270,340,140,'Reviewed action queue','Inspect plant / emitter\nPropose a bounded change\nRecord reason + outcome',ORANGE)
f.arrow(890,340,990,340)
f.box(540,570,350,125,'Tank-cell controller','Local volume / time limits\nIndependent low-level stop',GREEN)
f.arrow(1160,410,1160,630,ORANGE);f.arrow(1160,630,890,630,ORANGE)
f.box(70,600,370,95,'Optional data ferry','Bulk upload on survey flights')
f.arrow(440,650,540,650,BLUE,True)
f.text(65,760,'A missed flight delays the survey. Essential watering and tank protection must still function.',23,GREEN,'bold')
f.save('drone-ground-fusion')

f=Figure(17,'Water payload turns into repeated loads','Arithmetic only: 5 L per plant is inherited from the report example, not an ecological dose.')
f.text(70,190,'EXAMPLE EVENT',24,INK,'bold');f.text(70,236,'40 plants × 5 L = 200 L',30,BLUE,'bold')
for y,litres,label in [(330,40,'T50 reference: 40 L spray tank'),(465,100,'T100 reference: 100 L spray tank')]:
    f.text(70,y,label,24);count=math.ceil(200/litres)
    for n in range(count):f.rect(650+n*118,y-38,98,65,'#d9ebf2',BLUE);f.text(699+n*118,y+4,str(litres)+' L',21,BLUE,'bold','middle')
    f.text(650,y+60,str(count)+' ideal full loads for one 200 L event',22)
f.box(70,590,600,155,'Scale to 1,000 plants at the same dose','5,000 L → at least 125 × 40 L loads\nor 50 × 100 L loads.',ORANGE)
f.box(735,590,595,155,'These are lower bounds','No flight reserve, residual water, missed basin, wind loss, refill delay or battery service included.',ORANGE)
f.text(70,785,'At 1,000 L/ha, water depth is only 0.1 mm. Spray area throughput is not an irrigation-depth metric.',21)
f.save('drone-water-loads')

f=Figure(18,'Spraying leaves and watering roots are different','Concept comparison; the pictured research prototypes validate spraying, not seedling establishment.')
for x,title in [(65,'CARRIED SPRAY'),(735,'HOSE-FED APPLICATION')]:f.box(x,155,600,65,title,'',BLUE)
drone(f,340,285,1.3)
f.raw('<path d="M310 325 L165 510 L515 510 L370 325" fill="#d9ebf2" fill-opacity=".65" stroke="#137fa7" stroke-dasharray="8 6"/>')
f.plant(340,525)
f.line(80,530,650,530,GREEN,4);f.rect(270,548,140,85,SOIL,'#a98a57')
f.text(80,682,'Test litres retained in the planting basin,\ninfiltration and runoff; leaf wetting is insufficient.',21)
drone(f,1110,290,1.3)
f.box(760,440,195,115,'GROUND','Tank + pump\nPower supply',BLUE)
f.raw('<path d="M950 475 Q1010 440 1055 335" fill="none" stroke="#137fa7" stroke-width="7"/>')
f.arrow(1110,330,1190,475,BLUE);f.plant(1210,535)
f.line(750,540,1330,540,GREEN,4)
f.text(760,650,'Hose weight, snagging, nozzle reaction,\nroute clearance and a ground crew remain.',21)
f.text(65,765,'A short drop hose / basin spout is a proposed R&D option, not a validated off-the-shelf solution here.',22,ORANGE,'bold')
f.save('drone-spray-versus-root')

f=Figure(19,'A drone experiment that can disprove its own value','Proposed validation overlay on the existing trial; survey flights do not create independent irrigation replicates.')
for n,x in enumerate([80,400,720,1040],1):
    f.box(x,170,280,75,'BLOCK '+str(n),'',GREEN)
    for j,t in enumerate(['Sector','Per plant','Passive']):
        f.rect(x,280+j*76,280,58,'#e4eee5',GREEN)
        f.text(x+15,316+j*76,t+' + known plant IDs',19)
f.box(80,545,590,175,'Matched evidence at each survey','Drone image + ground alive/dead inspection\nProbe values + weather + emitter delivery\nField-checked suspected faults and healthy controls',BLUE)
f.box(735,545,585,175,'Evaluate on held-out blocks / dates','False alarms + missed stressed plants\nValue beyond RGB and ground sensors\nCost per useful finding and inspection time',ORANGE)
f.text(80,776,'Keep “unknown / obscured” separate from “dead”. Set decision criteria before looking at the results.',22,INK,'bold')
f.save('drone-validation-trial')

f=Figure(20,'Where to invest effort in a repairable demonstrator','Author proposal: borrow or contract aircraft first; build serviceable field technology and transparent evidence.')
for x,n,title,detail in [
    (70,'1','START WITH SURVEY','Shared RGB mapping service\nPlant register + fixed probes\nOpen exports and reproducible maps'),
    (510,'2','TEST EXTRA INFORMATION','Paired thermal / multispectral visit\nMeasure the useful improvement\nRetain uncertainty and raw evidence'),
    (950,'3','GATE WATER DELIVERY','Meter a basin-dose bench test\nCheck legal route + field safety\nCompare full labour and energy')]:
    f.circle(x+170,220,42,'#d9ebf2',BLUE);f.text(x+170,232,n,34,BLUE,'bold','middle')
    f.box(x,315,380,215,title,detail,BLUE)
f.box(70,610,600,135,'LOCAL ASSEMBLY OPPORTUNITY','Sensor housings, mounts, wiring, test rigs, GIS joins, controller software and replaceable ground modules.',GREEN)
f.box(735,610,595,135,'AIRCRAFT LIFECYCLE QUESTIONS','Battery health, spares, propellers, calibration, firmware support, service access and data export.',ORANGE)
f.save('drone-demonstrator-gates')

paths=sorted(OUT.glob('*.png'))
if [int(p.name.split('-')[0]) for p in paths] != list(range(13,21)):
    raise ValueError('Expected exactly drone figures 13 through 20')
sheet=Image.new('RGB',(1400,4*440),'#e9eeeb')
for n,path in enumerate(paths):
    with Image.open(path) as im:
        thumb=ImageOps.contain(im,(680,420))
        sheet.paste(thumb,((n%2)*700+10,(n//2)*440+10))
sheet.save(OUT/'contact-sheet.jpg',quality=90)
print('Built eight SVG/PNG pairs and contact sheet:',OUT)


