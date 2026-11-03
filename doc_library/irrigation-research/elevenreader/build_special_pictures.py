"""Render the published CatWAN board and extract two identified manual photographs.

Pass --nieblas-pdf with the inspected LIFE NIEBLAS technical manual (224 pages).
The PCB illustration uses the author's actual coordinates, not an invented board.
"""
from pathlib import Path
from io import BytesIO
import argparse
import hashlib
import json
import math
import re
import requests
import pymupdf
from PIL import Image, ImageDraw, ImageFont

HERE=Path(__file__).resolve().parent
OUT=HERE/'photos'
ORIGINALS=OUT/'originals'
PCB_URL='https://raw.githubusercontent.com/ElectronicCats/CatWAN_Farmer/master/Hardware/Catwan_Farmer.kicad_pcb'
MANUAL_URL='https://lifenieblas.com/sites/default/files/documentacion/2024/Techcnical%20Manual%20LIFE%20NIEBLAS%20-ENG_0.pdf'
sha=lambda b:hashlib.sha256(b).hexdigest()

def nodes(data,key):
    return [x for x in data[1:] if isinstance(x,list) and x and x[0]==key]

def one(data,key):
    found=nodes(data,key)
    if len(found)!=1:
        raise ValueError(f'Expected one {key}, found {len(found)}')
    return found[0][1:]

def read_tree(source):
    tokens=iter(re.findall(r'"(?:\\.|[^"\\])*"|[()]|[^\s()]+',source))
    def parse():
        value=[]
        for token in tokens:
            if token==')':return value
            if token=='(':value.append(parse())
            elif token.startswith('"'):value.append(json.loads(token))
            else:value.append(token)
        raise ValueError('Unclosed PCB expression')
    if next(tokens)!='(':raise ValueError('Not a KiCad board')
    return parse()

def board_picture():
    r=requests.get(PCB_URL,timeout=20);r.raise_for_status()
    data=r.content
    (ORIGINALS/'p13.kicad_pcb').write_bytes(data)
    tree=read_tree(data.decode('utf-8'))
    edges=[x for x in nodes(tree,'gr_line') if one(x,'layer')==['Edge.Cuts']]
    if not edges:raise ValueError('Published PCB has no expected board outline')
    points=[tuple(map(float,one(x,key))) for x in edges for key in ['start','end']]
    xmin=min(x for x,y in points);xmax=max(x for x,y in points)
    ymin=min(y for x,y in points);ymax=max(y for x,y in points)
    width,height=1600,1250
    scale=min(1360/(xmax-xmin),900/(ymax-ymin))
    dx=(width-(xmax-xmin)*scale)/2;dy=180
    def xy(p):return (dx+(p[0]-xmin)*scale,dy+(p[1]-ymin)*scale)
    im=Image.new('RGB',(width,height),'white');draw=ImageDraw.Draw(im)
    font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',33)
    small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',22)
    tiny=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',12)
    draw.text((60,35),'CatWAN Farmer - published PCB layout',font=font,fill='#19343e')
    draw.text((60,90),'Source coordinates from Electronic Cats; this is a layout view, not a product photograph.',font=small,fill='#19343e')
    draw.rectangle([xy((xmin,ymin)),xy((xmax,ymax))],fill='#e1ecd9',outline='#38684d',width=3)
    tracks=nodes(tree,'segment')
    for track in tracks:
        layer=one(track,'layer')[0]
        color={'F.Cu':'#b85548','B.Cu':'#457998'}
        if layer not in color:raise ValueError(f'Unexpected copper layer {layer}')
        draw.line([xy(tuple(map(float,one(track,'start')))),xy(tuple(map(float,one(track,'end'))))],fill=color[layer],width=max(1,round(float(one(track,'width')[0])*scale)))
    for module in nodes(tree,'module'):
        at=one(module,'at');mx,my=map(float,at[:2]);angle=float(at[2]) if len(at)==3 else 0
        def local(p):
            a=math.radians(-angle);x,y=p
            return xy((mx+x*math.cos(a)-y*math.sin(a),my+x*math.sin(a)+y*math.cos(a)))
        for ln in nodes(module,'fp_line'):
            if one(ln,'layer')==['F.SilkS']:
                draw.line([local(tuple(map(float,one(ln,'start')))),local(tuple(map(float,one(ln,'end'))))],fill='#35543b',width=2)
        for pad in nodes(module,'pad'):
            at=one(pad,'at');x,y=local(tuple(map(float,at[:2])))
            sx,sy=map(float,one(pad,'size'))
            if round(angle)%180==90:sx,sy=sy,sx
            bounds=[x-sx*scale/2,y-sy*scale/2,x+sx*scale/2,y+sy*scale/2]
            if pad[3] in ['circle','oval']:draw.ellipse(bounds,fill='#bdad67',outline='#8e7733')
            else:draw.rectangle(bounds,fill='#bdad67',outline='#8e7733')
            holes=nodes(pad,'drill')
            if holes and holes[0][1]!='oval':
                radius=float(holes[0][1])*scale/2
                draw.ellipse([x-radius,y-radius,x+radius,y+radius],fill='#f9faf4')
        refs=[x for x in nodes(module,'fp_text') if x[1]=='reference']
        if refs:
            p=local(tuple(map(float,one(refs[0],'at')[:2])))
            draw.text(p,refs[0][2],font=tiny,fill='#253c31')
    for edge in edges:draw.line([xy(tuple(map(float,one(edge,'start')))),xy(tuple(map(float,one(edge,'end'))))],fill='#264b35',width=3)
    draw.text((60,1135),f'{xmax-xmin:.1f} x {ymax-ymin:.1f} mm board outline; {len(nodes(tree,"module"))} footprints; {len(tracks)} copper segments.',font=small,fill='#19343e')
    draw.text((60,1180),'Electronic Cats / Montserrat Figueroa / Eduardo Contreras / revision 1.0 / 15 June 2020.',font=small,fill='#19343e')
    file=OUT/'p13-catwan-layout.png';im.save(file)
    return dict(id='p13',slug='catwan-layout',title='CatWAN Farmer published PCB layout; source-derived view, not a photograph',owner='Electronic Cats; Montserrat Figueroa and Eduardo Contreras',source_page='https://github.com/ElectronicCats/CatWAN_Farmer',image_url=PCB_URL,retrieved='2026-11-03',chapter=3,after_starts='Electronic Cats publishes the CatWAN',covers=['CatWAN Farmer','published PCB','connectors','radio footprint'],kind='original rendering of published board coordinates',rights='Repository README states CERN Open Hardware Licence v1.2; source attribution retained',file=file.name,original_file='photos/originals/p13.kicad_pcb',source_sha256=sha(data),sha256=sha(file.read_bytes()),pixels=list(im.size),status='verified image')

def manual_picture(document,page,index,ident,slug,title,anchor,covers,manual_hash):
    images=document[page-1].get_images(full=True)
    if index>=len(images):raise ValueError(f'Missing source image {page}:{index}')
    data=document.extract_image(images[index][0])
    raw=data['image'];original=ORIGINALS/f'{ident}.{data["ext"]}';original.write_bytes(raw)
    file=OUT/f'{ident}-{slug}.png'
    with Image.open(BytesIO(raw)) as im:
        im.load();im.save(file);size=list(im.size)
    return dict(id=ident,slug=slug,title=title,owner='LIFE NIEBLAS partners / GESPLAN; technical manual photograph',source_page=MANUAL_URL,image_url=MANUAL_URL+f'#page={page}',retrieved='2026-11-03',chapter=6,after_starts=anchor,covers=covers,kind='photograph extracted without cropping from identified PDF page',rights='Project/source copyright retained; no open image-reuse licence established',source_pdf_page=page,source_pdf_sha256=manual_hash,file=file.name,original_file=str(original.relative_to(HERE)),source_sha256=sha(raw),sha256=sha(file.read_bytes()),pixels=size,status='verified image')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--nieblas-pdf',type=Path,required=True);args=parser.parse_args()
    pdfbytes=args.nieblas_pdf.read_bytes();doc=pymupdf.open(stream=pdfbytes,filetype='pdf')
    if len(doc)!=224 or 'Cocoons' not in doc[92].get_text():raise ValueError('Unexpected LIFE NIEBLAS edition')
    results=[board_picture(),
             manual_picture(doc,93,0,'p27','cocoon','Cocoon reservoir around a seedling; LIFE NIEBLAS field example','The LIFE NIEBLAS manual documents',['Cocoon','biodegradable reservoir','tree shelter'],sha(pdfbytes)),
             manual_picture(doc,95,0,'p29','fog-guard','LIFE NIEBLAS individual fog-collection and plant-protection guard','Fog harvesting is relevant',['fog collector','guard','mesh'],sha(pdfbytes))]
    network=json.loads((HERE/'Photo acquisition.json').read_text(encoding='utf-8'))
    if any(x['status']!='verified image' for x in network):raise ValueError('Unresolved photo retrieval failure')
    combined=sorted(network+results,key=lambda x:int(x['id'][1:]))
    if len({x['id'] for x in combined})!=len(combined):raise ValueError('Duplicate picture identity')
    (HERE/'Photo manifest.json').write_text(json.dumps({'date':'2026-11-03','pictures':combined},indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(f'{len(combined)} verified product/component pictures; 12 original concept diagrams remain separate.')
