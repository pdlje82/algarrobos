from pathlib import Path
from html import escape
from zipfile import ZipFile, ZIP_STORED, ZIP_DEFLATED
from datetime import datetime, timezone
from uuid import UUID
import hashlib
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'doc_library' / 'LEARN-010 - AL20 EDLL - Spanish Listening Primer - 2026-11-02.txt'
DEST = ROOT / 'doc_library' / 'edll-listening-primer' / 'Guia EDLL AL20.epub'
text = SOURCE.read_text(encoding='utf-8')
assert '\ufffd' not in text
blocks = text.strip().split('\n\n')
title, subtitle = blocks[0].splitlines()
chapters = []
for block in blocks[1:]:
    if block == 'Introducción' or re.match(r'^(Primera|Segunda|Tercera|Cuarta|Quinta|Sexta|Séptima|Octava|Novena|Décima|Undécima) parte\.', block):
        chapters.append((block, []))
    else:
        if not chapters:
            raise ValueError('Paragraph has no chapter')
        chapters[-1][1].append(block)
assert len(chapters) == 12
assert all(paragraphs for _, paragraphs in chapters)
uid = 'urn:uuid:' + str(UUID(hashlib.sha256(text.encode('utf-8')).hexdigest()[:32]))
css = 'body { font-family: serif; line-height: 1.5; margin: 1.2em; color: #000; } h1, h2 { font-family: sans-serif; line-height: 1.25; color: #000; } h1 { font-size: 1.5em; } h2 { font-size: 1.25em; } p { margin: 0 0 0.9em; } .subtitle { font-size: 1.05em; }'
def xhtml(heading, body):
    return '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="es" xml:lang="es"><head><title>' + escape(heading) + '</title><meta charset="utf-8"/><link rel="stylesheet" type="text/css" href="style.css"/></head><body>' + body + '</body></html>'
files = {}
for i, (heading, paragraphs) in enumerate(chapters):
    body = ''
    if i == 0:
        body += '<h1>' + escape(title) + '</h1><p class="subtitle">' + escape(subtitle) + '</p>'
    body += '<section epub:type="chapter" id="chapter-' + str(i+1) + '"><h2>' + escape(heading) + '</h2>'
    body += ''.join('<p>' + escape(p) + '</p>' for p in paragraphs) + '</section>'
    files[f'EPUB/chapter-{i+1:02d}.xhtml'] = xhtml(heading, body)
links = ''.join(f'<li><a href="chapter-{i+1:02d}.xhtml">{escape(h)}</a></li>' for i,(h,_) in enumerate(chapters))
files['EPUB/nav.xhtml'] = xhtml('Contenido', '<nav epub:type="toc" id="toc"><h1>Contenido</h1><ol>' + links + '</ol></nav>')
manifest = '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="style" href="style.css" media-type="text/css"/>'
manifest += ''.join(f'<item id="c{i+1}" href="chapter-{i+1:02d}.xhtml" media-type="application/xhtml+xml"/>' for i in range(len(chapters)))
spine = ''.join(f'<itemref idref="c{i+1}"/>' for i in range(len(chapters)))
modified = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
files['EPUB/package.opf'] = f'''<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="pub-id">{uid}</dc:identifier><dc:title>{escape(title)}</dc:title><dc:language>es</dc:language><dc:description>Guía de escucha en español sobre la EDLL y las tipologías AL20 3.4 y 3.5</dc:description><meta property="dcterms:modified">{modified}</meta></metadata><manifest>{manifest}</manifest><spine>{spine}</spine></package>'''
files['META-INF/container.xml'] = '<?xml version="1.0" encoding="utf-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
files['EPUB/style.css'] = css
for name, content in files.items():
    if name.endswith(('.xhtml', '.xml', '.opf')):
        ET.fromstring(content)
DEST.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(DEST, 'w') as z:
    z.writestr('mimetype', 'application/epub+zip', compress_type=ZIP_STORED)
    for name, content in files.items():
        z.writestr(name, content, compress_type=ZIP_DEFLATED)

# Read the finished ZIP and check all content, navigation and package references.
with ZipFile(DEST) as z:
    assert z.testzip() is None
    assert z.infolist()[0].filename == 'mimetype'
    assert z.infolist()[0].compress_type == ZIP_STORED
    assert z.read('mimetype') == b'application/epub+zip'
    opf = ET.fromstring(z.read('EPUB/package.opf'))
    ns = {'o': 'http://www.idpf.org/2007/opf', 'h': 'http://www.w3.org/1999/xhtml'}
    ids = {}
    for item in opf.findall('o:manifest/o:item', ns):
        assert 'EPUB/' + item.attrib['href'] in z.namelist()
        ids[item.attrib['id']] = item.attrib['href']
    readback = []
    for item in opf.findall('o:spine/o:itemref', ns):
        root = ET.fromstring(z.read('EPUB/' + ids[item.attrib['idref']]))
        readback.append(' '.join(root.find('h:body', ns).itertext()))
    normalize = lambda value: re.sub(r'\s+', ' ', value).strip()
    assert normalize(' '.join(readback)) == normalize(text), 'EPUB differs from narration'
    nav = ET.fromstring(z.read('EPUB/nav.xhtml'))
    anchors = nav.findall('.//h:a', ns)
    assert len(anchors) == 12
    for anchor in anchors:
        assert 'EPUB/' + anchor.attrib['href'] in z.namelist()
words = len(re.findall(r'\b[\w]+(?:[’\x27-][\w]+)*\b', text))
print(f'Validated EPUB: {DEST}')
print(f'{len(chapters)} chapters; {words} words; {words/160:.1f}-{words/130:.1f} minutes at 130-160 words/minute')
print(f'TXT: {SOURCE.stat().st_size} bytes; EPUB: {DEST.stat().st_size} bytes')
