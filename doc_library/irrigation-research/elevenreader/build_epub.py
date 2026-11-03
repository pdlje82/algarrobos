"""Build and verify the illustrated listening edition without external services.

The Markdown manuscript is authoritative for this adaptation. The research report
and the original figure bytes are read-only inputs. Requires Python and Pillow.
"""
from pathlib import Path, PurePosixPath
from datetime import datetime, timezone
from html import escape
from uuid import UUID
from zipfile import ZipFile, ZIP_STORED, ZIP_DEFLATED
from urllib.parse import unquote, urlsplit
import base64
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from PIL import Image

HERE = Path(__file__).resolve().parent
MANUSCRIPT = HERE / 'Irrigation - Illustrated Listening Edition.md'
EPUB = HERE / 'Irrigation for a Native Restoration Park.epub'
HTML = HERE / 'Irrigation - Read Along.html'
REPORT = HERE.parents[1] / 'LEARN-016 - Almeria Restoration - Irrigation Technology and Demonstrator Research - 2026-11-03.md'
source_report_bytes = REPORT.read_bytes()
photo_manifest = json.loads((HERE / 'Photo manifest.json').read_text(encoding='utf-8'))
photo_entries = photo_manifest['pictures']
contract = json.loads((HERE / 'Edition contract.json').read_text(encoding='utf-8'))
if [p['id'] for p in photo_entries] != contract['reference_picture_ids']:
    raise ValueError('Reference picture registry differs from the explicit edition contract')
chapter_count = contract['chapter_count']
concept_numbers = contract['original_figure_numbers'] + contract['drone_figure_numbers']
registered_photos = {}
for entry in photo_entries:
    photo_path = (HERE / 'photos' / entry['file']).resolve()
    if photo_path in registered_photos:
        raise ValueError('Duplicate registered photo path')
    if hashlib.sha256(photo_path.read_bytes()).hexdigest() != entry['sha256']:
        raise ValueError('Picture bytes differ from the verified source record: '+entry['id'])
    if hashlib.sha256((HERE / entry['original_file']).read_bytes()).hexdigest() != entry['source_sha256']:
        raise ValueError('Retained original differs from its provenance record: '+entry['id'])
    if hashlib.sha256((HERE / entry['ebook_file']).read_bytes()).hexdigest() != entry['ebook_sha256']:
        raise ValueError('Prepared EPUB image differs from its provenance record: '+entry['id'])
    registered_photos[photo_path] = entry
text = MANUSCRIPT.read_text(encoding='utf-8')
blocks = text.strip().split('\n\n')
if not blocks[0].startswith('# '):
    raise ValueError('Manuscript must begin with one title')
title = blocks[0][2:]
subtitle = blocks[1]
chapters = []
images = []
seen_figures = set()
for block in blocks[2:]:
    if block.startswith('## Chapter '):
        chapters.append({'title': block[3:], 'blocks': []})
        continue
    if not chapters:
        raise ValueError('Content appears before the first chapter')
    match = re.fullmatch(r'!\[([^\]]+)\]\(([^)]+)\)', block)
    if match:
        alt, rel = match.groups()
        path = (HERE / unquote(rel)).resolve()
        if path.parent in ((HERE.parent / 'figures').resolve(), (HERE.parent / 'drones/figures').resolve()) and path.suffix == '.png':
            figure_no = int(path.name.split('-')[0])
            kind = 'concept'
            caption = None
            package_path = path
        elif path in registered_photos:
            registered = registered_photos[path]
            figure_no = 'photo-'+registered['id']
            kind = 'reference'
            caption = registered['title']
            package_path = HERE / registered['ebook_file']
            if alt != caption or registered['chapter'] != len(chapters):
                raise ValueError('Picture label or chapter differs from its source record: '+registered['id'])
        else:
            raise ValueError(f'Unregistered or unexpected image path {path}')
        if not path.is_file():
            raise FileNotFoundError(path)
        if figure_no in seen_figures:
            raise ValueError(f'Duplicate figure {figure_no}')
        seen_figures.add(figure_no)
        with Image.open(package_path) as im:
            im.verify()
        with Image.open(package_path) as im:
            size = im.size
        image = {'number': figure_no, 'alt': alt, 'path': package_path, 'manuscript_path':path, 'kind':kind, 'caption':caption,
                 'filename': package_path.name, 'size': size, 'chapter': len(chapters)}
        images.append(image)
        chapters[-1]['blocks'].append(('image', image))
    else:
        if re.search(r'https?://|www\.|\b(?:FUND|LEARN|FOREST)-\d+|\ufffd|[|`]|\[[^\]]+\]\(', block):
            raise ValueError(f'Unexpected citation or formatting in narration: {block[:100]}')
        if block.startswith(('#', '- ', '* ')):
            raise ValueError(f'Unsupported manuscript block: {block[:100]}')
        chapters[-1]['blocks'].append(('paragraph', block))
if len(chapters) != chapter_count or [i['number'] for i in images if i['kind']=='concept'] != concept_numbers:
    raise ValueError('Chapter or concept-figure sequence differs from the explicit edition contract')
if {i['manuscript_path'] for i in images if i['kind']=='reference'} != set(registered_photos):
    raise ValueError('The manuscript does not include every registered product/component picture')
if any(not c['blocks'] for c in chapters):
    raise ValueError('Empty chapter')

def digest(data):
    return hashlib.sha256(data).hexdigest()

uid = 'urn:uuid:' + str(UUID(digest(text.encode('utf-8'))[:32]))
css = '''body{font-family:serif;line-height:1.55;margin:1em}h1,h2{font-family:sans-serif;line-height:1.25}h1{font-size:1.8em}h2{font-size:1.45em}p{margin:0 0 1em}figure{margin:1.5em 0;break-inside:avoid;page-break-inside:avoid}img{display:block;width:100%;max-width:100%;height:auto;margin:0 auto}.reference img{width:auto;max-width:100%;max-height:26em;object-fit:contain}.reference{padding:.7em;background:white;color:#19343e}figcaption{font-family:sans-serif;font-size:.9em;line-height:1.4;margin:.6em auto 0;max-width:45em}.subtitle{font-size:1.05em}'''
def xhtml(label, body):
    return ('<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n'
            '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en">'
            '<head><title>'+escape(label)+'</title><meta charset="utf-8"/>'
            '<link rel="stylesheet" type="text/css" href="style.css"/></head><body>'+body+'</body></html>')

files = {}
html_chapters = []
plain = [title, subtitle]
for n, chapter in enumerate(chapters, 1):
    opening = '<h1>'+escape(title)+'</h1><p class="subtitle">'+escape(subtitle)+'</p>' if n == 1 else ''
    body = '<section epub:type="chapter" id="chapter-'+str(n)+'"><h2>'+escape(chapter['title'])+'</h2>'
    plain.append(chapter['title'])
    for kind, value in chapter['blocks']:
        if kind == 'paragraph':
            body += '<p>'+escape(value)+'</p>'
            plain.append(value)
        else:
            caption = '<figcaption>'+escape(value['caption'])+'</figcaption>' if value['caption'] is not None else ''
            body += f'<figure class="{value["kind"]}" id="figure-{value["number"]}"><img src="images/{value["filename"]}" width="{value["size"][0]}" height="{value["size"][1]}" alt="{escape(value["alt"], quote=True)}"/>{caption}</figure>'
            if value['caption'] is not None:
                plain.append(value['caption'])
    body += '</section>'
    files[f'EPUB/chapter-{n:02d}.xhtml'] = xhtml(chapter['title'], opening+body)
    html_body = re.sub(r' epub:type="[^"]+"', '', body)
    for value in images:
        marker = 'src="images/'+value['filename']+'"'
        if marker in html_body:
            encoded = base64.b64encode(value['path'].read_bytes()).decode('ascii')
            media_type = 'image/jpeg' if value['path'].suffix == '.jpg' else 'image/png'
            html_body = html_body.replace(marker, 'src="data:'+media_type+';base64,'+encoded+'"')
    html_chapters.append(html_body)

links = ''.join(f'<li><a href="chapter-{n:02d}.xhtml">{escape(c["title"])}</a></li>' for n, c in enumerate(chapters, 1))
figure_links = ''.join(f'<li><a href="chapter-{i["chapter"]:02d}.xhtml#figure-{i["number"]}">{escape(i["alt"])}</a></li>' for i in images)
files['EPUB/nav.xhtml'] = xhtml('Contents', '<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>'+links+'</ol></nav><nav epub:type="loi" id="illustrations"><h2>Illustrations</h2><ol>'+figure_links+'</ol></nav>')
credit_sections=[]
for entry in photo_entries:
    credit_sections.append('<section id="'+escape(entry['id'])+'"><h2>'+escape(entry['title'])+'</h2><p>'+escape(entry['owner'])+'</p><p>'+escape(entry['kind'])+'. Retrieved '+entry['retrieved']+'.</p><p>'+escape(entry['rights'])+'</p><p>Embedded copy: '+escape(entry['ebook_preparation'])+'</p><p><a href="'+escape(entry['source_page'],quote=True)+'">Source publication or manufacturer page</a></p><p><a href="'+escape(entry['image_url'],quote=True)+'">Original image or design source</a></p></section>')
files['EPUB/credits.xhtml']=xhtml('Picture credits','<h1>Picture credits</h1><p>These pictures identify the technologies discussed. Generic examples are not a selected or verified compatible installation. Twenty original concept diagrams were drawn for Algarrobos. Fifty-two reference pictures retain the source credits below; CatWAN is a source-derived PCB view rather than a photograph. Drone research pictures distinguish commercial equipment, manufacturer renders and field experiments.</p>'+''.join(credit_sections))
files['EPUB/nav.xhtml']=files['EPUB/nav.xhtml'].replace('</body>','<p><a href="credits.xhtml">Picture credits and source links</a></p></body>')
ncx = ''.join(f'<navPoint id="nav-{n}" playOrder="{n}"><navLabel><text>{escape(c["title"])}</text></navLabel><content src="chapter-{n:02d}.xhtml"/></navPoint>' for n, c in enumerate(chapters, 1))
files['EPUB/toc.ncx'] = f'<?xml version="1.0" encoding="utf-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="{uid}"/><meta name="dtb:depth" content="1"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head><docTitle><text>{escape(title)}</text></docTitle><navMap>{ncx}</navMap></ncx>'
manifest = '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="credits" href="credits.xhtml" media-type="application/xhtml+xml"/>'
manifest += ''.join(f'<item id="c{n}" href="chapter-{n:02d}.xhtml" media-type="application/xhtml+xml"/>' for n in range(1,chapter_count+1))
manifest += ''.join(f'<item id="f{i["number"]}" href="images/{i["filename"]}" media-type="'+('image/jpeg' if i['path'].suffix=='.jpg' else 'image/png')+'"/>' for i in images)
spine = ''.join(f'<itemref idref="c{n}"/>' for n in range(1,chapter_count+1))
modified = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
files['EPUB/package.opf'] = f'''<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" prefix="schema: http://schema.org/">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="pub-id">{uid}</dc:identifier><dc:title>{escape(title)}</dc:title>
<dc:language>en</dc:language><dc:creator>OpenAI ChatGPT for the Algarrobos project</dc:creator><dc:date>2026-11-03</dc:date>
<dc:description>Illustrated listening adaptation of the Almeria irrigation and drone research: sixteen chapters, twenty original concept diagrams, fifty-two equipment/component/research reference pictures, spoken explanations and separately accessible picture credits.</dc:description>
<meta property="dcterms:modified">{modified}</meta>
<meta property="schema:accessMode">textual</meta><meta property="schema:accessMode">visual</meta>
<meta property="schema:accessibilityFeature">tableOfContents</meta><meta property="schema:accessibilityFeature">readingOrder</meta><meta property="schema:accessibilityFeature">alternativeText</meta>
<meta property="schema:accessibilitySummary">Reflowable text, twenty technical concept diagrams and fifty-two captioned equipment/component/research pictures. Prose explains the decisions; source credits are separately accessible. Dense image labels may require magnification.</meta>
</metadata><manifest>{manifest}</manifest><spine toc="ncx">{spine}</spine></package>'''
files['EPUB/style.css'] = css
files['META-INF/container.xml'] = '<?xml version="1.0" encoding="utf-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
for name, content in files.items():
    if name.endswith(('.xhtml', '.xml', '.opf', '.ncx')):
        ET.fromstring(content)

temporary = EPUB.with_suffix('.building.epub')
with ZipFile(temporary, 'w') as z:
    z.writestr('mimetype', 'application/epub+zip', compress_type=ZIP_STORED)
    for name, content in files.items():
        z.writestr(name, content, compress_type=ZIP_DEFLATED)
    for i in images:
        z.writestr('EPUB/images/'+i['filename'], i['path'].read_bytes(), compress_type=ZIP_DEFLATED)

ns = {'o':'http://www.idpf.org/2007/opf', 'h':'http://www.w3.org/1999/xhtml'}
normal = lambda s: re.sub(r'\s+', ' ', s).strip()
with ZipFile(temporary) as z:
    if z.testzip() is not None:
        raise ValueError('EPUB ZIP integrity failure')
    if z.infolist()[0].filename != 'mimetype' or z.infolist()[0].compress_type != ZIP_STORED or z.read('mimetype') != b'application/epub+zip':
        raise ValueError('Invalid EPUB mimetype')
    package = ET.fromstring(z.read('EPUB/package.opf'))
    items = package.findall('o:manifest/o:item', ns)
    ids = {i.attrib['id']: 'EPUB/'+i.attrib['href'] for i in items}
    if len(ids) != len(items):
        raise ValueError('Duplicate manifest ID')
    for path in ids.values():
        if path not in z.namelist():
            raise ValueError('Missing resource '+path)
    order = [i.attrib['idref'] for i in package.findall('o:spine/o:itemref', ns)]
    if order != [f'c{n}' for n in range(1,chapter_count+1)]:
        raise ValueError('Incorrect reading spine')
    extracted = []
    embedded = []
    for ident in order:
        name = ids[ident]
        chapter = ET.fromstring(z.read(name))
        body = chapter.find('h:body', ns)
        extracted.extend(''.join(e.itertext()) for e in body.iter() if e.tag.rsplit('}',1)[-1] in ('h1','h2','p','figcaption'))
        for im in chapter.findall('.//h:img', ns):
            target = str(PurePosixPath(name).parent / im.attrib['src'])
            if target not in z.namelist() or not im.attrib.get('alt'):
                raise ValueError('Missing image or alt text')
            embedded.append(target)
        if chapter.findall('.//h:a', ns):
            raise ValueError('Unexpected narration hyperlink')
    if normal(' '.join(extracted)) != normal(' '.join(plain)):
        raise ValueError('Narration text did not round-trip intact')
    if len(embedded) != len(images):
        raise ValueError('The EPUB does not contain all registered diagrams and pictures')
    for i in images:
        if z.read('EPUB/images/'+i['filename']) != i['path'].read_bytes():
            raise ValueError('Image bytes changed')
    nav = ET.fromstring(z.read('EPUB/nav.xhtml'))
    for a in nav.findall('.//h:a', ns):
        target, _, fragment = a.attrib['href'].partition('#')
        if 'EPUB/'+target not in z.namelist():
            raise ValueError('Broken navigation')
        if fragment:
            doc = ET.fromstring(z.read('EPUB/'+target))
            if not any(e.attrib.get('id') == fragment for e in doc.iter()):
                raise ValueError('Missing figure navigation target')
temporary.replace(EPUB)

html_css = '''*{box-sizing:border-box}body{margin:0;background:#f5f4ee;color:#19343e;font:19px/1.65 Georgia,serif}main{max-width:1040px;margin:auto;padding:44px 28px 90px}header{margin-bottom:44px}h1,h2,nav,button{font-family:Arial,sans-serif}h1{font-size:2.25rem;line-height:1.15;max-width:24ch}h2{font-size:1.55rem;line-height:1.3;margin:2.5em 0 1em}p{max-width:72ch}nav{font-size:15px;line-height:1.8}nav ol{padding-left:1.5em;columns:2;column-gap:2em}nav li{break-inside:avoid}a{color:#176581}figure{margin:2em 0;background:white}figure img{display:block;max-width:100%;width:100%;height:auto;cursor:zoom-in}section{scroll-margin-top:24px}.intro{color:#4a635e}dialog{max-width:96vw;width:96vw;max-height:94vh;border:1px solid #9eb1ab;padding:16px;background:white;color:#19343e}dialog::backdrop{background:#15252bd9}dialog button{position:sticky;top:0;float:right;padding:10px 18px;font-size:16px;background:white;border:1px solid #65867d}#enlarged{overflow:auto;max-height:78vh;clear:both}#enlarged img{width:auto;max-width:none;height:auto}#dialog-label{font:18px Arial,sans-serif;margin:0 0 12px}button.figure-open{display:block;background:white;border:0;padding:0;width:100%;cursor:zoom-in}@media(max-width:600px){body{font-size:18px}main{padding:24px 16px 60px}nav ol{columns:1}h1{font-size:1.9rem}}'''
browser_links = ''.join(f'<li><a href="#chapter-{n}">{escape(c["title"])}</a></li>' for n,c in enumerate(chapters,1))
browser_body = ''.join(html_chapters)
browser_body = re.sub(r'<figure([^>]*)>(<img[^>]+/>)(.*?)</figure>', r'<figure\1><button type="button" class="figure-open" aria-label="Enlarge picture">\2</button>\3</figure>', browser_body)
html_css += '.reference{padding:18px}.reference img{width:auto;max-width:100%;max-height:460px;object-fit:contain;margin:auto}figcaption{font:16px/1.45 Arial,sans-serif;max-width:70ch;margin:12px auto 0}.picture-credits{max-width:1040px;margin:auto;padding:0 28px 70px;font:15px/1.6 Arial,sans-serif}.picture-credits section{margin:1.8em 0}.picture-credits h2{font-size:1.1rem}.picture-credits a{overflow-wrap:anywhere}'
browser_document = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(title)+' — Read Along</title><style>'+html_css+'</style></head><body><main><header><h1>'+escape(title)+'</h1><p class="intro">'+escape(subtitle)+'</p><p class="intro">The same narration and twelve diagrams as the listening EPUB. Select a diagram to enlarge it.</p><nav aria-label="Chapters"><ol>'+browser_links+'</ol></nav></header>'+browser_body+'</main><dialog id="diagram-dialog" aria-labelledby="dialog-label"><button type="button" id="close-diagram">Close</button><p id="dialog-label">Diagram</p><div id="enlarged"></div></dialog><script>const dialog=document.getElementById("diagram-dialog");document.querySelectorAll(".figure-open").forEach(button=>button.addEventListener("click",()=>{const img=button.querySelector("img");document.getElementById("dialog-label").textContent=img.alt;document.getElementById("enlarged").replaceChildren(img.cloneNode());dialog.showModal();}));document.getElementById("close-diagram").addEventListener("click",()=>dialog.close());</script></body></html>'
browser_document=browser_document.replace('The same narration and twelve diagrams as the listening EPUB. Select a diagram to enlarge it.','Twenty concept diagrams and fifty-two labelled equipment/component/research pictures, embedded with the listening text. Select any picture to enlarge it.').replace('</nav></header>','</nav><p><a href="#picture-credits">Picture credits and source links</a></p></header>')
browser_credits='<aside class="picture-credits" id="picture-credits"><details><summary>Picture credits and source links</summary>'+''.join(credit_sections)+'</details></aside>'
temporary_html=HTML.with_suffix('.building.html')
temporary_html.write_text(browser_document.replace('</main>','</main>'+browser_credits),encoding='utf-8')
temporary_html.replace(HTML)
(HERE / 'Irrigation - Narration.txt').write_text('\n\n'.join(plain)+'\n', encoding='utf-8')
words = len(' '.join(plain).split())
validation = {
    'date': '2026-11-03', 'chapters':chapter_count, 'original_figures_embedded':len(contract['original_figure_numbers']),
    'drone_figures_embedded':len(contract['drone_figure_numbers']), 'concept_figures_embedded':len(concept_numbers),
    'product_component_pictures_embedded':len(photo_entries), 'total_embedded_illustrations':len(images),
    'word_count':words, 'estimated_minutes_at_130_to_160_wpm':[round(words/160),round(words/130)],
    'zip_integrity':'passed', 'xml_and_resource_references':'passed',
    'spine_order':'passed', 'narration_round_trip':'passed',
    'image_bytes_match_packaged_assets':'passed', 'original_concept_diagram_bytes_unchanged':'passed', 'chapter_and_figure_navigation':'passed',
    'source_report_sha256':digest(source_report_bytes), 'manuscript_sha256':digest(MANUSCRIPT.read_bytes()),
    'epub_sha256':digest(EPUB.read_bytes()),
    'elevenreader_import_and_playback':'not tested',
    'illustrations':[{'number':i['number'],'kind':i['kind'],'chapter':i['chapter'],'file':i['filename'],'pixels':i['size'],'sha256':digest(i['path'].read_bytes())} for i in images]
}
(HERE / 'Publication checks.json').write_text(json.dumps(validation,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:validation[k] for k in ['chapters','original_figures_embedded','product_component_pictures_embedded','total_embedded_illustrations','word_count','estimated_minutes_at_130_to_160_wpm']},indent=2))
print(EPUB)
