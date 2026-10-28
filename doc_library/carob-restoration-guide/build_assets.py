"""Extract credited handbook illustrations and draw the LEARN-008 schemes.

Run from the repository root with pypdf and Pillow. PNG schemes are rendered
from SVG separately; no source photographs are retouched or rescaled.
"""
from hashlib import sha256
from html import escape
import json
from pathlib import Path
import xml.etree.ElementTree as ET

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
SOURCE = ROOT / 'doc_library/FOREST-002 - Andalusia - Carob Cultivation and Restoration Handbook - 2026.pdf'
READER = PdfReader(SOURCE)
EXTRACTS = [
    ('01-carob-landscape-examples.png', 92, 0, 'Figure 5.1', 'Andalusian carob formations; the figure caption identifies Cadiz, Malaga and Almeria.'),
    ('02-mixed-oak-carob-dehesa.png', 100, 0, 'Figure 5.6', 'Mixed holm-oak dehesa with carob.'),
    ('03-las-labores-albox.png', 128, 0, 'Figure 5.37, left photograph', 'Carob planting at Las Labores, Albox, Almeria.'),
    ('04-la-alcantarilla-mojacar.png', 135, 1, 'Figure 5.49', 'Oasification with carob at La Alcantarilla, Mojacar, Almeria.'),
    ('05-la-tortola-nijar.png', 137, 0, 'Figure 5.52', 'Naturalized carob vegetation at La Tortola, Nijar, Almeria.'),
]
records = []
for filename, page, index, figure, description in EXTRACTS:
    original = READER.pages[page - 1].images[index]
    original.image.save(OUT / filename, format='PNG')
    records.append({
        'file': filename, 'kind': 'handbook photograph', 'page': page,
        'figure': figure, 'description': description,
        'credit': ('FOREST-002 Figure 5.1; individual photographer and photograph dates not identified in its caption.'
                   if page == 92 else 'QUERAT, 2024, as credited in FOREST-002'),
        'source_image': original.name, 'source_image_index': index,
        'width': original.image.width, 'height': original.image.height,
        'transformation': 'Embedded image decoded from JPEG 2000 to PNG at original pixel dimensions; no retouching or rescaling.',
        'license': 'CC BY-NC-SA 4.0, as stated on handbook page 6; retain original credits.',
        'sha256': sha256((OUT / filename).read_bytes()).hexdigest(),
    })

INK, GREEN, BLUE, SOIL, CREAM = '#243b32', '#356b50', '#246e9b', '#e5d6bd', '#fbf8f0'
def txt(x, y, value, size=22, fill=INK, weight=400, anchor='start'):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-weight="{weight}" text-anchor="{anchor}">{escape(value)}</text>'
def lines(x, y, values, size=21, fill=INK, leading=31):
    return ''.join(txt(x, y+i*leading, value, size, fill) for i, value in enumerate(values))
def rect(x, y, w, h, fill, stroke='none', radius=0):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" rx="{radius}"/>'
def path(d, color=INK, width=3, extra=''):
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" {extra}/>'
def arrow(x1,y1,x2,y2,color=BLUE,both=False):
    return path(f'M{x1} {y1}L{x2} {y2}', color, 2.5, 'marker-end="url(#arrow)"'+(' marker-start="url(#arrow)"' if both else ''))
def circle(x,y,r,fill,stroke=GREEN,width=2):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>'
def save_svg(filename,title,subtitle,description,body):
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900" role="img" aria-labelledby="title desc">
<title id="title">{escape(title)}</title><desc id="desc">{escape(description)}</desc>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="context-stroke"/></marker></defs>
{rect(0,0,1400,900,CREAM)}<g font-family="Segoe UI, Arial, sans-serif">
{txt(45,58,title,32,weight=650)}{txt(45,98,subtitle,21)}{body}
{path('M45 842H1355','#d5cfbf',1)}{txt(45,875,'LEARN-008 | Original teaching scheme | Not to scale | Read the source qualifications in the guide',18,'#526358')}
</g></svg>'''
    ET.fromstring(svg)
    (OUT / filename).write_text(svg, encoding='utf-8')

# Two same-volume blocks: a geometry example, not a real container specification.
b = rect(45,145,550,640,'#fffdf7','#ded8c8',12)
b += txt(70,187,'A. Litres do not define the root-ball shape',23,weight=650)
b += rect(110,265,102.4,200,'#9bb69c',GREEN)
b += rect(350,337,128,128,'#9bb69c',GREEN)
b += lines(90,559,['8 x 8 x 15.625 cm','1 L'],21)
b += lines(338,559,['10 cm each side','1 L'],21)
b += lines(70,669,['Arithmetic examples only: real forestry pots taper.','Measure the actual root-ball width and height.','Ask for internal dimensions and root architecture.'],20)
b += rect(620,145,735,640,'#fffdf7','#ded8c8',12)
b += txt(645,187,'B. Preparation depth differs from planting depth',23,weight=650)
b += rect(650,352,500,290,SOIL)
b += rect(700,352,400,290,'#d5c6aa','#98724e')
b += path('M650 352H1150',GREEN)
b += rect(845,352,110,130,'#9bb69c',GREEN)
b += txt(900,409,'Root ball',19,weight=600,anchor='middle')
b += txt(900,438,'No pot',18,anchor='middle')
b += path('M832 483H969','#806447',6)
b += txt(650,324,'Root collar at the final settled surface',20,GREEN)
b += arrow(984,355,984,480,GREEN,True)
b += txt(1000,421,'Ball height',17,GREEN)
b += arrow(1180,355,1180,640,BLUE,True)
b += lines(1195,465,['Prepared','soil','depth'],17,BLUE,26)
b += lines(645,691,['Stable support beneath the ball; avoid later settlement.','Choose the preparation envelope from the soil diagnosis.','No universal hole-size conversion from litres.'],20)
save_svg('06-container-and-preparation.svg','Container volume, root-ball geometry and preparation','Conceptual geometry explains why a pot size alone cannot determine a planting hole.',
         'Two conceptual rectangular one-litre root balls have different dimensions. A cross-section separates root-ball height, root collar position and deeper soil preparation.',b)

b=rect(45,145,820,650,'#eef0dd','#b8c4a3',12)
b+=txt(70,183,'Conceptual parcel: retain a varied, open matrix',23,weight=650)
b+=path('M100 260Q380 220 800 255M90 400Q380 355 800 390M85 545Q410 510 800 525M100 685Q450 650 800 670','#c5cba8',2)
b+=arrow(160,225,225,303); b+=arrow(500,265,530,331); b+=arrow(300,430,325,497)
for x,y in [(250,340),(555,365),(350,555)]:
    b+=path(f'M{x-85} {y-35}Q{x} {y+105} {x+85} {y-35}','#98724e',5)
    b+=circle(x,y,32,'#356b50')
    for dx,dy in [(-55,5),(53,4),(-24,62),(37,55)]:b+=circle(x+dx,y+dy,12,'#91aa78')
for x,y in [(150,570),(650,590),(710,450),(470,690),(150,380),(715,295)]:b+=circle(x,y,13,'#91aa78')
b+=circle(690,680,33,'#9b873f','#706337')
b+=txt(70,755,'Symbols locate decisions, not measured roots or mature crown sizes.',19)
b+=rect(890,145,465,650,'#fffdf7','#ded8c8',12)
b+=txt(915,187,'Design by microsite',26,weight=650)
b+=circle(935,241,16,'#356b50')+txt(965,248,'Carob in favourable pockets',20)
b+=circle(935,296,10,'#91aa78')+txt(965,303,'Native shrubs / retained plants',20)
b+=circle(935,351,16,'#9b873f','#706337')+txt(965,358,'Oak only where suitable',20)
b+=path('M920 408Q935 430 950 408','#98724e',4)+txt(965,420,'Local runoff capture',20)
b+=arrow(920,467,950,467)+txt(965,474,'Runoff direction to check',20)
b+=lines(915,550,['Keep existing valuable vegetation.','Leave unsuitable ground unplanted.','Check overflow routes and erosion.','Avoid concentrating flow at stems.','Assess oak and carob separately.','Set spacing from water and soil,','not the number of circles shown.'],20,leading=33)
save_svg('07-mixed-restoration-mosaic.svg','Designing a mixed restoration mosaic','A project proposal informed by MR1 and MR2; species and earthworks require a site assessment.',
         'A conceptual parcel contains three small carob and shrub islands with local runoff capture, scattered shrubs, open ground, and one conditional oak location. No area, spacing or catchment size is prescribed.',b)

manifest={
    'created':'2026-10-28', 'source_pdf':str(SOURCE.relative_to(ROOT)).replace('\\','/'),
    'source_pdf_sha256':sha256(SOURCE.read_bytes()).hexdigest(),
    'source_pdf_pages':len(READER.pages), 'photographs':records,
    'schemes': [{'svg':f.name,'kind':'original code-drawn geometry','width':1400,'height':900,
                 'sha256_svg':sha256(f.read_bytes()).hexdigest()} for f in sorted(OUT.glob('*.svg'))],
}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'photographs':len(records),'schemes':len(manifest['schemes'])}))
