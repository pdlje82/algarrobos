"""Rebuild the original LEARN-016 technical concept diagrams (not installation drawings).

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


f=Figure(1, 'Three levels of irrigation control', 'Sensing, valve control and measured delivery are separate design choices.')
for y,title,detail in [(175,'A  Sector control','One valve waters a matched group; several representative probes.'),(365,'B  Individual electronic control','Each plant has an addressable valve; sensing and metering add cost.'),(555,'C  Individual passive control','A ceramic moisture mechanism opens its own valve; telemetry is separate.')]:
    f.box(65,y,530,140,title,detail.replace('; ',';\n'),GREEN)
    f.line(650,y+60,1260,y+60,BLUE,5)
    if y==175:
        f.rect(650,y+45,35,30,'#d9ebf2',BLUE)
    for j,x in enumerate([770,970,1170]):
        f.line(x,y+60,x,y+90,BLUE)
        if y!=175: f.circle(x,y+62,12,'#f7e5c8',ORANGE)
        f.plant(x,y+127)
    if y==175: f.text(725,y+177,'Valve + group of plants',19)
f.save('control-levels')

f=Figure(2, 'A landscape made of serviceable water cells', 'Original layout hypothesis: three tanks, dispersed plants and vegetation islands.')
f.raw('<path d="M70 230 Q450 130 1320 270 M70 380 Q520 260 1320 410 M70 530 Q550 420 1320 560 M70 680 Q600 590 1320 720" fill="none" stroke="#dbd4c4" stroke-width="3"/>')
for tx,ty,tag,clusters in [(190,250,'TANK A',[(430,245),(410,470)]),(720,300,'TANK B',[(940,215),(1000,430)]),(670,620,'TANK C',[(340,680),(1020,665)])]:
    for cx,cy in clusters:
        f.line(tx,ty,cx,cy,BLUE,4)
        f.raw(f'<ellipse cx="{cx}" cy="{cy}" rx="113" ry="72" fill="#edf4e7" stroke="#8da87e" stroke-width="2"/>')
        for dx,dy in [(-47,5),(15,20),(60,-5)]:f.plant(cx+dx,cy+dy)
    f.box(tx-65,ty-45,200,92,tag,'Solar + control',BLUE)
f.box(1100,145,235,90,'Shared gateway','Local data + upload')
f.text(65,775,'Tank positions follow refill access and hydraulic head. Cell size needs a terrain and pipe survey.',21)
f.save('landscape-water-cells')

f=Figure(3, 'Tank station hydraulic assembly', 'Proposed pumped cell: physical protection and measurement precede automation.')
f.rect(70,205,190,230,'#e5f2f8',BLUE)
f.line(85,280,245,280,BLUE,3)
f.text(92,245,'REFILLABLE',23,BLUE,'bold');f.text(92,275,'TANK',23,BLUE,'bold')
f.text(92,380,'Level probe',21);f.text(92,412,'Low-level trip',21)
xs=[315,535,755,975]
for x,title,detail in zip(xs,['Isolation','Pump','Filter','Flow meter'],['Manual shutoff','Dry-run cutout','Service + flush','Sized for low flow']):
    f.box(x,270,185,130,title,detail,BLUE)
    f.arrow(x-55,335,x,335)
f.box(975,495,270,115,'Master isolation','Independent shutoff\n+ pressure observation',RED)
f.arrow(1160,335,1260,335);f.line(1260,335,1260,465,BLUE);f.arrow(1260,465,1110,465);f.line(1110,465,1110,495,BLUE)
f.box(530,515,260,100,'Zone / plant valves','Matched to pressure + flow')
f.arrow(975,550,790,550)
f.line(530,565,375,565,BLUE);f.arrow(375,565,375,670)
f.plant(375,735,'Drippers + accessible flush ends')
f.box(65,510,250,105,'Design checks','Anti-siphon / backflow\nAir release where needed')
f.text(555,720,'Actual filter, regulator, relief and air-device placement\nfollows the selected pump and hydraulic design.',22)
f.save('tank-station-hydraulics')

f=Figure(4, 'Gravity pressure is a height budget', 'Physics illustration: static pressure is reduced by pipe, filter and valve losses.')
f.line(100,680,1300,680,'#947952',4)
f.rect(130,210,210,230,'#e5f2f8',BLUE);f.line(145,280,325,280,BLUE,4)
f.line(160,440,160,680,INK,6);f.line(310,440,310,680,INK,6)
f.line(340,410,420,410,BLUE,6);f.line(420,410,420,650,BLUE,6);f.line(420,650,1050,650,BLUE,6)
f.plant(1050,680)
f.arrow(80,280,80,650,ORANGE);f.arrow(80,650,80,280,ORANGE)
f.text(465,240,'1 m of water head = about 0.098 bar',30,BLUE,'bold')
f.text(465,295,'2 m gives only about 0.20 bar before losses.',25)
f.text(465,343,'0.5 bar requires about 5.1 m before losses.',25)
f.text(465,405,'Measure from the LOWEST operating water level\nto the HIGHEST emitter, not from the tank outlet.',24)
f.box(520,485,720,105,'A ground tank is not a pressure source','Use verified gravity components, elevation, or a sized pump.',BLUE)
f.text(130,750,'Raised tanks carry large loads: use a designed support or safe natural elevation.',23,RED)
f.save('gravity-pressure-budget')

f=Figure(5, 'A repairable electronic plant or island node', 'Functional architecture only: select ratings and protection before wiring hardware.')
f.box(65,185,270,110,'Solar + charger','Replaceable battery\nLow-voltage cutoff',ORANGE)
f.box(450,185,355,110,'Low-power controller','Clock + watchdog + local rules\nLocal event log + device identity')
f.box(965,185,320,110,'LoRa radio + antenna','EU868 hardware variant\nSurvey real coverage',GREEN)
f.arrow(335,240,450,240,ORANGE);f.arrow(805,240,965,240,GREEN)
f.box(70,415,320,125,'Replaceable probes','Soil water status + temperature\nCompatible analogue or bus input',BLUE)
f.box(480,415,320,125,'Valve driver','Polarity pulse for latch valve\nOR rated motor-valve interface',ORANGE)
f.box(965,415,320,125,'Waterproof connectors','Separate wet probe, electronics,\npower module and valve module')
f.arrow(390,470,440,470);f.line(440,470,440,320,BLUE);f.arrow(440,320,580,320);f.line(580,320,580,295,BLUE)
f.arrow(640,295,640,415,ORANGE)
f.box(475,640,365,95,'Valve + position / flow check','Command sent does not prove water delivered.',RED)
f.arrow(640,540,640,640,ORANGE)
f.text(65,630,'One node: several nearby probes\nand valves within one island.\nFewer radios and batteries to service.',23)
f.text(965,640,'Do not bury the radio.\nDo not pot the whole unit.\nKeep service screws accessible.',23)
f.save('repairable-node')

f=Figure(6, 'Where the soil sensor actually measures', 'Installation concept: nursery substrate, native soil and the wetting bulb differ.')
f.rect(65,410,1270,330,SOIL,'#ceb790',0)
f.line(65,410,1335,410,'#8c7755',4)
f.raw('<ellipse cx="655" cy="525" rx="230" ry="155" fill="#d3e5ed" stroke="#137fa7" stroke-width="2" stroke-dasharray="8 7"/>')
f.rect(555,410,155,165,'#c3a882','#806b4d',2)
f.plant(635,405)
f.line(270,390,760,390,BLUE,6);f.arrow(760,390,760,435,BLUE)
f.circle(620,475,10,ORANGE);f.circle(820,535,10,BLUE);f.circle(780,665,10,RED)
f.text(95,225,'S1  Root-ball observation',25,ORANGE,'bold');f.text(95,265,'Check the original nursery plug;\nwet soil beside it can conceal a dry plug.',22)
f.line(365,290,620,475,ORANGE,2)
f.text(840,205,'S2  Representative active roots',25,BLUE,'bold');f.text(840,245,'Good soil contact; avoid air gaps\nand the saturated point at the outlet.',22)
f.line(980,285,820,535,BLUE,2)
f.text(930,605,'S3  Optional deeper check',24,RED,'bold');f.text(930,645,'Watch water movement below roots;\nit does not directly measure drainage.',21)
f.line(920,635,790,665,RED,2)
f.text(95,780,'No universal depth, distance or threshold is specified. Verify wetting shape and stock dimensions on site.',21)
f.save('sensor-placement')

f=Figure(7, 'Passive per-plant control with monitored supply', 'Tropf-Blumat principle, redrawn: the cone senses; water leaves a separate drip tube.')
for x,title,fill,flow in [(85,'DRY SOIL - valve opens','#ecd8b8',True),(755,'MOIST SOIL - valve closes','#d7e6e9',False)]:
    f.text(x,190,title,26,GREEN,'bold')
    f.rect(x,460,555,230,fill,'#b8b29f',0)
    f.line(x+55,350,x+435,350,BLUE,6)
    f.rect(x+150,325,140,95,'#e2eadd',GREEN)
    f.text(x+168,365,'Valve head',20)
    f.raw(f'<path d="M{x+175} 420 L{x+265} 420 L{x+246} 570 Q{x+220} 610 {x+194} 570 Z" fill="#bca48a" stroke="#806b4d" stroke-width="3"/>')
    f.text(x+120,655,'Water-filled ceramic cone',21)
    f.plant(x+420,455)
    if flow:
        for y in [395,420,445]: f.circle(x+435,y,5,BLUE)
        f.arrow(x+295,350,x+410,350)
    else:
        f.line(x+310,330,x+340,370,RED,5);f.line(x+310,370,x+340,330,RED,5)
    f.text(x,735,'Independent mechanical valve; no battery, radio or moisture data output.',19)
f.text(90,285,'Supply still needs clean water, suitable head, commissioning and refill monitoring.',23)
f.save('passive-per-plant')

f=Figure(8, 'Local autonomy and wireless supervision', 'LoRa is the radio; LoRaWAN adds a network protocol and server. Cloud use is optional.')
for y,title,detail in [(185,'Tank A controller','Local water budget + timeout'),(365,'Tank B controller','Local water budget + timeout'),(545,'Tank C controller','Local water budget + timeout')]:
    f.box(65,y,360,115,title,detail,BLUE)
    f.arrow(425,y+55,630,420,GREEN,True)
f.box(630,345,290,155,'Shared radio gateway','Local network server\n+ data store + dashboard\nAerial clear of tanks',GREEN)
f.box(1070,190,260,110,'Operator on site','Local Wi-Fi access\nNo internet required')
f.box(1070,535,260,120,'Optional internet','4G / fixed connection\nRemote alarms + export')
f.arrow(920,375,1070,245,GREEN,True);f.arrow(920,465,1070,590,GREEN,True)
f.box(510,650,510,100,'A lost radio link must not strand an open valve','Closure, volume caps and fault handling execute locally.',RED)
f.text(65,765,'Class A downlinks wait for receive windows. Do not rely on a later cloud CLOSE command.',22)
f.save('wireless-and-local-control')

f=Figure(9, 'Visible control states and delivery verification', 'Proposed policy: required invalid inputs stop automatic starts and raise an actionable fault.')
f.box(75,180,325,105,'VALIDATE','Fresh probes, level, energy\nConfiguration + sensor health')
f.box(535,180,325,105,'WAIT / REQUEST','Local threshold + agreed budget\nQueue within tank capacity')
f.box(995,180,325,105,'OPEN + VERIFY','Expected pressure and flow\nwithin configured timeout',BLUE)
f.arrow(400,230,535,230);f.arrow(860,230,995,230)
f.box(995,420,325,115,'DOSE + CLOSE','Whichever limit comes first:\nvolume cap or maximum runtime',BLUE)
f.arrow(1155,285,1155,420)
f.box(535,420,325,115,'VERIFY STOP','Flow returns to expected rest\nLog delivered / estimated litres')
f.arrow(995,475,860,475)
f.box(75,420,325,115,'SOAK + REASSESS','Minimum rest interval\nObserve soil + plant response')
f.arrow(535,475,400,475);f.arrow(235,420,235,285)
f.box(350,655,700,100,'FAULT - isolate the affected branch or tank','Log the cause; show uncertainty; explicit repair and re-arm action.',RED)
for x in [235,700,1155]:f.arrow(x,535,x,610,RED,True)
f.line(235,610,1155,610,RED,2,True);f.arrow(700,610,700,655,RED,True)
f.save('control-state-diagram')

f=Figure(10, 'Water storage and solar energy are different budgets', 'Illustrative assumptions for arithmetic only. These are not species watering recommendations.')
f.box(65,175,600,120,'ONE WATER CELL','40 plants x 5 L per event = 200 L/event\n900 L usable tank / 200 L = 4.5 events',BLUE)
f.box(735,175,600,120,'PUMP ENERGY','200 L x 15 m head / 30% efficiency\n= about 27.3 Wh per irrigation event',ORANGE)
f.text(70,365,'Tank usable volume',25,BLUE,'bold')
f.rect(70,395,590,90,'#e5eff2',BLUE)
for i in range(4):f.rect(72+i*131,397,128,86,'#96c6d6',BLUE,0)
f.text(85,450,'1 event',22);f.text(220,450,'2',22);f.text(355,450,'3',22);f.text(485,450,'4',22)
f.text(70,530,'At one event/week: about 31.5 days before reserve.\nAt two events/week: about 15.8 days.\nLeaks, flushing and heat can shorten this.',23)
f.text(740,365,'Always-on electronics can dominate',25,ORANGE,'bold')
f.text(740,415,'Example gateway: 5 W x 24 h = 120 Wh/day.\nAdd controller load and average pump energy.\nDo not size all solar from the valve alone.',23)
f.text(740,560,'Example: 130 Wh/day total load\n/ (3 peak-sun-hours x 0.65 system yield)\n= 67 W calculated panel minimum.',23)
f.text(70,745,'Choose a larger panel after a seasonal design; size battery usable Wh, heat protection and dark-day reserve.',21)
f.save('water-and-energy-budgets')

f=Figure(11, 'Repair modules instead of discarding whole devices', 'Proposed local assembly: retain durable electronics and replace the failed part.')
for x,y,title,detail,color in [(70,180,'Housing','Gasket, screws, glands\nUV shield + asset label',INK),(520,180,'Power cassette','Battery + fuse + charger\nTest separately',ORANGE),(970,180,'Electronics','Radio + controller\nOpen firmware + connectors',GREEN),(70,465,'Wet probe','Detachable calibrated probe\nRecord serial + calibration',BLUE),(520,465,'Valve service kit','Seal, diaphragm or actuator\nManual isolation for repair',BLUE),(970,465,'Bench test tools','Known-wet / known-dry check\nCurrent + leak + flow checks',INK)]:
    f.box(x,y,360,160,title,detail,color)
f.arrow(430,260,520,260,ORANGE);f.arrow(880,260,970,260,GREEN)
f.arrow(250,465,250,340,BLUE);f.arrow(700,465,700,340,BLUE)
f.text(75,720,'Local work: pipe assembly, installation, calibration, PCB assembly, repair training and documentation.',22)
f.text(75,760,'Imported semiconductors and qualified probes remain likely. Recycled tanks require known safe provenance.',22)
f.save('repair-and-local-assembly')

f=Figure(12, 'A comparison trial that separates site from technology', 'Proposed 48-plant pilot: four blocks; three independently controlled four-plant units per block.')
labels=['Position 1','Position 2','Position 3']
colors=[BLUE,ORANGE,GREEN]
for col in range(3):f.text(325+col*380,190,labels[col],24,colors[col],'bold',anchor='middle')
orders=[[0,1,2],[2,0,1],[1,2,0],[2,1,0]]
for row,order in enumerate(orders):
    y=240+row*115;f.text(70,y+48,f'Block {row+1}',23,INK,'bold')
    for col,treatment in enumerate(order):
        x=200+col*380;f.rect(x,y,325,85,'#f1f5ef','#b1c1b0')
        f.text(x+17,y+35,chr(65+treatment),23,colors[treatment],'bold')
        for j in range(4):f.circle(x+90+j*55,y+43,14,'#dae8d6',GREEN)
f.text(75,714,'A = sector drip     B = electronic per plant     C = passive per plant',21)
f.text(75,745,'Rows show different microsites. Treatment positions are randomized within blocks.',21)
f.text(75,772,'Unit replication = 4 per treatment; plants within a shared sector are subsamples. This is a feasibility pilot.',21)
f.save('comparison-trial')

# A contact sheet is an inspection aid, not an additional evidence figure.
files=sorted(OUT.glob('*.png'))
if len(files)!=12:raise ValueError(f'Expected 12 figure PNGs, found {len(files)}')
sheet=Image.new('RGB',(1400,4*310),'#e4e9e8')
for i,p in enumerate(files):
    with Image.open(p) as im:
        thumb=ImageOps.contain(im,(460,300))
        sheet.paste(thumb,((i%3)*466,(i//3)*310))
sheet.save(OUT/'contact-sheet.jpg',quality=92)
print(f'Created {len(files)} SVG + PNG figure pairs in {OUT}')
