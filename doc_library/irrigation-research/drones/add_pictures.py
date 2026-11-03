"""Add the twelve explicitly reviewed drone reference pictures to the ebook registry.

Requires the source-inspection cache and reviewed candidate_images/candidates.json.
No automatic replacement is permitted. Rerunning after publication is an error.
"""
from pathlib import Path
import hashlib
import io
import json
import shutil
import tempfile
import requests
from PIL import Image, ImageOps, ImageDraw

HERE=Path(__file__).resolve().parent
BOOK=HERE.parent/'elevenreader'
CACHE=Path(tempfile.gettempdir())/'algarrobos-drone-research-20261103'
old=json.loads((BOOK/'Photo manifest.json').read_text(encoding='utf-8'))
if len(old['pictures'])!=40:
    raise ValueError('This explicit migration requires the forty-picture pre-drone registry; do not rerun over an enriched registry.')
candidates={p['name']:p for p in json.loads((CACHE/'candidate_images/candidates.json').read_text(encoding='utf-8'))}
mavic='https://enterprise.dji.com/mavic-3-m'
miwa='https://medcraveonline.com/IRATJ/experiments-on-watering-citrus-fruits-with-a-wire-supplied-drone-using-rtk-gnss.html'
altum='https://eaglenxt.com/products/sensors/micasense-series/altum-pt/'
copyright='Copyright retained by source owner; no open reuse licence established. Reference illustration, not an endorsement or a compatible-kit specification.'
miwa_rights='Source PDF states Creative Commons attribution with a non-commercial restriction; website also displays BY-NC. Authors credited; no commercial reuse permission inferred.'
rows=[
    (41,'mavic-aircraft','DJI Mavic 3 Multispectral aircraft','DJI',mavic,'mavic-3',13,['RGB mapping','multispectral aircraft']),
    (42,'mavic-array','DJI Mavic 3M four-band multispectral camera array','DJI',mavic,'mavic-8',13,['green red red-edge NIR','multispectral camera']),
    (43,'mavic-rgb','DJI Mavic 3M RGB camera','DJI',mavic,'mavic-9',13,['visible-light survey camera']),
    (44,'altum-pt','MicaSense Altum-PT multispectral and thermal payload','EagleNXT / MicaSense',altum,'https://eaglenxt.com/wp-content/uploads/altum-pt-side-header.png',14,['thermal camera','multispectral payload']),
    (45,'reflectance-calibration','MicaSense reflectance-calibration example','EagleNXT / MicaSense',altum,'https://eaglenxt.com/wp-content/uploads/calibrated-multispectral.jpg',14,['radiometric calibration example','effects on mapped reflectance']),
    (46,'gpr-research','Research drone carrying the GPR antenna, Henrion and colleagues','Henrion et al., 2025', 'https://orbi.uliege.be/bitstream/2268/336849/1/_Henrion%20SRS%202025.pdf','gpr_pdf-page3-xref71',14,['ground-penetrating radar','specialist soil-moisture mapping']),
    (47,'agras-t50','DJI Agras T50 spraying in an orchard','DJI','https://ag.dji.com/t50','t50-0',15,['40-litre spray drone','spraying versus irrigation']),
    (48,'agras-t100','DJI Agras T100 agricultural spray aircraft','DJI','https://ag.dji.com/t100','t100-0',15,['100-litre spray drone']),
    (49,'hose-prototype','Miwa and colleagues: hose-fed water-spraying prototype','Miwa, Hishida, Nishikawa and Shiromaru, 2024',miwa,'miwa-1',15,['tethered water supply','research prototype']),
    (50,'hose-field','Miwa and colleagues: citrus-orchard spraying field test','Miwa, Hishida, Nishikawa and Shiromaru, 2024',miwa,'miwa-6',15,['hose-fed flight experiment']),
    (51,'hose-ground-support','Miwa and colleagues: ground support during spraying','Miwa, Hishida, Nishikawa and Shiromaru, 2024',miwa,'miwa-9',15,['hose management','ground vehicle support']),
    (52,'matrice-series','DJI Matrice 4 series: compact enterprise aircraft examples','DJI','https://enterprise.dji.com/matrice-4-series','matrice-6',14,['Matrice 4E and 4T family','integrated-camera alternative']),
]
new=[]
for number,slug,title,owner,page,key,chapter,covers in rows:
    # The forty-picture predecessor already reserves p41 and has no p36.
    # Preserve those identities; this extension uses p42 through p53.
    identity_number = number + 1
    if key.startswith('https:'):
        response=requests.get(key,timeout=60);response.raise_for_status()
        data=response.content;url=key;suffix=Path(key).suffix
    else:
        selected=candidates[key];data=Path(selected['file']).read_bytes();url=selected['url'];suffix=Path(selected['file']).suffix
    im=Image.open(io.BytesIO(data));im.verify()
    im=Image.open(io.BytesIO(data)).convert('RGBA')
    if min(im.size)<100:
        raise ValueError('Selected picture is too small: '+slug)
    ident=f'p{identity_number:02d}'
    if ident in {e['id'] for e in old['pictures']+new}:
        raise ValueError('Duplicate source-picture identity: '+ident)
    original=BOOK/'photos/originals'/(ident+suffix)
    canonical=BOOK/'photos'/(ident+'-'+slug+'.png')
    if original.exists() or canonical.exists():raise FileExistsError(canonical)
    original.write_bytes(data);im.save(canonical)
    entry={'id':ident,'slug':slug,'title':title,'owner':owner,'source_page':page,
           'image_url':url,'retrieved':'2026-11-03','chapter':chapter,'after_starts':'Explicitly placed in drone chapter',
           'covers':covers,'kind':'manufacturer reference picture' if owner in ('DJI','EagleNXT / MicaSense') else 'research photograph',
           'rights':miwa_rights if number in (49,50,51) else copyright,
           'file':canonical.name,'original_file':original.relative_to(BOOK).as_posix(),
           'pixels':list(im.size),'source_sha256':hashlib.sha256(data).hexdigest(),
           'sha256':hashlib.sha256(canonical.read_bytes()).hexdigest(),'status':'verified image'}
    if number==46:
        entry.update(image_url=page,source_pdf_page=3,source_pdf_figure='Figure 1(b), embedded photograph xref 71',
                     source_pdf_sha256=hashlib.sha256((CACHE/'gpr_pdf.pdf').read_bytes()).hexdigest(),
                     rights='Henrion et al. 2025, CC BY-NC-ND 4.0 as stated in the article. Unaltered embedded photograph from Figure 1(b); image format conversion only. Non-commercial research reference.')
    if number in (49,50,51):entry['source_figure']={49:'Figure 1',50:'Figure 6',51:'Figure 9'}[number]
    new.append(entry)
manifest={'date':'2026-11-03','pictures':old['pictures']+new}
temp=BOOK/'Photo manifest.building.json';temp.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');temp.replace(BOOK/'Photo manifest.json')
(HERE/'Acquisition record.json').write_text(json.dumps({'date':'2026-11-03','pictures':new},indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
sheet=Image.new('RGB',(1200,3*280),'#eee9df');draw=ImageDraw.Draw(sheet)
for n,e in enumerate(new):
    with Image.open(BOOK/'photos'/e['file']) as im:
        canvas=Image.new('RGBA',im.size,'white');canvas.alpha_composite(im.convert('RGBA'));thumb=ImageOps.contain(canvas.convert('RGB'),(285,240))
        x=(n%4)*300+7;y=(n//4)*280;sheet.paste(thumb,(x+(285-thumb.width)//2,y));draw.text((x,y+245),e['id']+' '+e['slug'],fill='black')
sheet.save(HERE/'picture-contact-sheet.jpg',quality=90)
print('Added twelve verified source pictures; registry now contains',len(manifest['pictures']))
