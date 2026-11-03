"""Inspect explicitly selected primary sources; retain research cache outside library.

Run with Python, requests, BeautifulSoup and PyMuPDF. HTTP/parse failures are
reported individually and make the command fail; they are never substituted.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin
import hashlib
import json
import sys
import tempfile
import requests
import pymupdf
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')
CACHE = Path(tempfile.gettempdir()) / 'algarrobos-drone-research-20261103'
CACHE.mkdir(exist_ok=True)
SOURCES = {
    'mavic': 'https://enterprise.dji.com/mavic-3-m',
    't50': 'https://ag.dji.com/t50',
    't100': 'https://ag.dji.com/t100',
    'altum': 'https://ageagle.com/drone-sensors/altum-pt/',
    'miwa': 'https://medcraveonline.com/IRATJ/experiments-on-watering-citrus-fruits-with-a-wire-supplied-drone-using-rtk-gnss.html',
    'monash': 'https://smart.eng.monash.edu/index.html',
    'ferry': 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8914728/',
    'ifapa': 'https://www.juntadeandalucia.es/agriculturaypesca/ifapa/web/noticias/el-dron-aliado-imprescindible-en-la-investigacion-andaluza',
    'robot': 'https://github.com/thedaisylab/UAV-soil-moisture-robot',
    'gpr': 'https://sites.uclouvain.be/gprlouvain/',
    'forest_pdf': 'https://fgr.nz/wp-content/uploads/2024/06/PSP-T018_UAVSurvival_Report_Multispectral_vs-RGB_final-1.pdf',
    'ortho_pdf': 'https://www.toolsforforesters.co.nz/__data/assets/pdf_file/0005/124925/UAV-Survival_RGB_ortho-plot.pdf',
    'miwa_pdf': 'https://medcraveonline.com/IRATJ/IRATJ-10-00280.pdf',
    'gpr_pdf': 'https://orbi.uliege.be/bitstream/2268/336849/1/_Henrion%20SRS%202025.pdf',
    'ifapa_pdf': 'https://www.mapa.gob.es/dam/mapa/contenido/desarrollo-rural/temas/gestion-sostenible-de-regadios/documentos/ponencia2.pdf',
    't50_pdf': 'https://dl.djicdn.com/downloads/t50_t25/20250109/T50_T25_User_Manual_v1.0_EN.pdf',
    'greenscatter_pdf': 'https://arxiv.org/pdf/2604.09363',
}

def inspect(item):
    key, url = item
    response = requests.get(url, timeout=90)
    response.raise_for_status()
    data = response.content
    record = {'id':key, 'url':url, 'resolved_url':response.url,
              'bytes':len(data), 'sha256':hashlib.sha256(data).hexdigest()}
    if key.endswith('_pdf'):
        if not data.startswith(b'%PDF-'):
            raise ValueError(f'{key}: Expected PDF, got {response.headers.get("Content-Type")}')
        target = CACHE / (key+'.pdf')
        target.write_bytes(data)
        with pymupdf.open(target) as doc:
            record['pages'] = len(doc)
            content = '\n'.join(page.get_text() for page in doc)
        (CACHE/(key+'.txt')).write_text(content, encoding='utf-8')
        record['opening_text'] = content[:1400]
    else:
        (CACHE/(key+'.html')).write_bytes(data)
        soup=BeautifulSoup(data,'html.parser')
        record['title']=soup.title.get_text(' ',strip=True) if soup.title else '(no HTML title)'
        candidates=[]
        for im in soup.find_all(['img','meta']):
            if im.name=='meta' and im.get('property')!='og:image':
                continue
            src=im.get('data-src') or im.get('src') or im.get('content')
            if not src or src.startswith('data:'):
                continue
            candidates.append({'alt':im.get('alt',''), 'url':urljoin(response.url,src)})
        record['images']=candidates
        (CACHE/(key+'.txt')).write_text(soup.get_text(' ',strip=True),encoding='utf-8')
    return record

if __name__=='__main__':
    records=[]
    failures=[]
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures={key:pool.submit(inspect,(key,url)) for key,url in SOURCES.items()}
        for key,future in futures.items():
            try:
                records.append(future.result())
            except Exception as error:
                failures.append({'id':key,'url':SOURCES[key],'error':str(error)})
    (CACHE/'verification.json').write_text(json.dumps({'sources':records,'failures':failures},indent=2,ensure_ascii=False),encoding='utf-8')
    for r in records:
        print(json.dumps(r,ensure_ascii=False))
    print(json.dumps({'cache':str(CACHE),'failures':failures},ensure_ascii=False))
    if failures:
        raise SystemExit('One or more intended source reads failed; see explicit failures above.')
