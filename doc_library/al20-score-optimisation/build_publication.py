"""Build and validate the Spanish listening book and separate review package."""
from datetime import datetime, timezone
from decimal import Decimal
from html import escape
from pathlib import Path
from uuid import UUID
from zipfile import ZipFile, ZIP_STORED, ZIP_DEFLATED
import hashlib, json, re, xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
NARRATION = ROOT / 'doc_library/LEARN-014 - AL20 - Plan de actividades para superar sesenta puntos - 2026-11-03.txt'
EPUB = HERE / 'Un aula viva antes del parque - Plan AL20.epub'
text = NARRATION.read_text(encoding='utf-8')
if text != (HERE / 'Presentacion del proyecto.txt').read_text(encoding='utf-8'):
    raise ValueError('The public presentation and canonical narration differ.')
application = (HERE / 'Apartado para la solicitud.txt').read_text(encoding='utf-8')
notes = (HERE / 'Fuentes y condiciones de puntuacion.txt').read_text(encoding='utf-8')
model = json.loads((HERE / 'Plan y calculos.json').read_text(encoding='utf-8'))
original_baseline = ROOT / 'doc_library/al20-demonstrator-proposal/Baseline and retained rules.json'
baseline = json.loads(original_baseline.read_text(encoding='utf-8'))
save = ROOT / baseline['save_path']
if hashlib.sha256(save.read_bytes()).hexdigest() != baseline['save_sha256']:
    raise ValueError('Saved baseline changed. Review before publishing.')
blocks = text.strip().split('\n\n')
title, subtitle = blocks[0].splitlines()
chapters = []
for block in blocks[1:]:
    if re.fullmatch(r'Capítulo (uno|dos|tres|cuatro|cinco|seis|siete|ocho)\. .+', block):
        chapters.append((block, []))
    else:
        if not chapters:
            raise ValueError('Narration paragraph has no chapter.')
        chapters[-1][1].append(block)
if len(chapters) != 8 or not all(p for _, p in chapters):
    raise ValueError('Expected eight complete chapters.')
for pattern in [r'https?://', r'www\.', r'\[\d+\]', r'\b(?:FUND|FOREST|LEARN)-\d+',
                r'\b(?:NPL|IN-A|CO\.1|PS\.1)\d*', r'04011A\d+', r'\|', r'\ufffd', r'\d']:
    if re.search(pattern, text):
        raise ValueError('Narration contains unwanted citation, number or format: ' + pattern)

css = 'body{font-family:serif;line-height:1.6;margin:1.2em;color:#192e24}h1,h2{font-family:sans-serif;line-height:1.25;color:#28513f}h1{font-size:1.7em}h2{font-size:1.3em}p{margin:0 0 1em}.subtitle{color:#51665b}'
def xhtml(label, body):
    return ('<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n'
            '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="es" xml:lang="es">'
            '<head><title>' + escape(label) + '</title><meta charset="utf-8"/>'
            '<link rel="stylesheet" type="text/css" href="style.css"/></head><body>' + body + '</body></html>')

files = {}
for n, (label, paragraphs) in enumerate(chapters, 1):
    body = '<h1>' + escape(title) + '</h1><p class="subtitle">' + escape(subtitle) + '</p>' if n == 1 else ''
    body += f'<section epub:type="chapter" id="chapter-{n}"><h2>' + escape(label) + '</h2>'
    body += ''.join('<p>' + escape(p) + '</p>' for p in paragraphs) + '</section>'
    files[f'EPUB/chapter-{n:02d}.xhtml'] = xhtml(label, body)
links = ''.join(f'<li><a href="chapter-{n:02d}.xhtml">{escape(label)}</a></li>' for n, (label, _) in enumerate(chapters, 1))
files['EPUB/nav.xhtml'] = xhtml('Índice', '<nav epub:type="toc" id="toc"><h1>Índice</h1><ol>' + links + '</ol></nav>')
uid = 'urn:uuid:' + str(UUID(hashlib.sha256(text.encode('utf-8')).hexdigest()[:32]))
points = ''.join(f'<navPoint id="nav-{n}" playOrder="{n}"><navLabel><text>{escape(label)}</text></navLabel><content src="chapter-{n:02d}.xhtml"/></navPoint>' for n, (label, _) in enumerate(chapters, 1))
files['EPUB/toc.ncx'] = f'<?xml version="1.0" encoding="utf-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="{uid}"/><meta name="dtb:depth" content="1"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head><docTitle><text>{escape(title)}</text></docTitle><navMap>{points}</navMap></ncx>'
manifest = '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="style" href="style.css" media-type="text/css"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
manifest += ''.join(f'<item id="c{n}" href="chapter-{n:02d}.xhtml" media-type="application/xhtml+xml"/>' for n in range(1, 9))
spine = ''.join(f'<itemref idref="c{n}"/>' for n in range(1, 9))
modified = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
description = 'Una invitación a participar en un aula viva del secano y un posible parque educativo en Alhama: visión y actividades primero; decisiones abiertas y condiciones de financiación en los dos capítulos finales. Propuesta con fuentes separadas.'
files['EPUB/package.opf'] = f'<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" prefix="schema: http://schema.org/"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="pub-id">{uid}</dc:identifier><dc:title>{escape(title)}</dc:title><dc:language>es</dc:language><dc:creator>OpenAI ChatGPT</dc:creator><dc:date>2026-11-03</dc:date><dc:description>{escape(description)}</dc:description><meta property="dcterms:modified">{modified}</meta><meta property="schema:accessMode">textual</meta><meta property="schema:accessibilityFeature">tableOfContents</meta><meta property="schema:accessibilityFeature">readingOrder</meta><meta property="schema:accessibilityHazard">none</meta></metadata><manifest>{manifest}</manifest><spine toc="ncx">{spine}</spine></package>'
files['EPUB/style.css'] = css
files['META-INF/container.xml'] = '<?xml version="1.0" encoding="utf-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
for name, content in files.items():
    if name.endswith(('.xml', '.xhtml', '.opf', '.ncx')):
        ET.fromstring(content)
temporary = EPUB.with_suffix('.building.epub')
with ZipFile(temporary, 'w') as z:
    z.writestr('mimetype', 'application/epub+zip', compress_type=ZIP_STORED)
    for name, content in files.items():
        z.writestr(name, content, compress_type=ZIP_DEFLATED)
ns = {'o': 'http://www.idpf.org/2007/opf', 'h': 'http://www.w3.org/1999/xhtml', 'n': 'http://www.daisy.org/z3986/2005/ncx/'}
normalize = lambda value: re.sub(r'\s+', ' ', value).strip()
with ZipFile(temporary) as z:
    if z.testzip() is not None:
        raise ValueError('ZIP CRC failure.')
    first = z.infolist()[0]
    if first.filename != 'mimetype' or first.compress_type != ZIP_STORED or z.read('mimetype') != b'application/epub+zip':
        raise ValueError('EPUB mimetype invalid.')
    package = ET.fromstring(z.read('EPUB/package.opf'))
    ids = {}
    for item in package.findall('o:manifest/o:item', ns):
        identity = item.attrib['id']
        if identity in ids:
            raise ValueError('Duplicate manifest identity.')
        target = 'EPUB/' + item.attrib['href']
        if target not in z.namelist():
            raise ValueError('Missing manifest file: ' + target)
        ids[identity] = target
    order = [i.attrib['idref'] for i in package.findall('o:spine/o:itemref', ns)]
    if order != [f'c{n}' for n in range(1, 9)]:
        raise ValueError('Incorrect spine order.')
    readback = []
    for ident in order:
        chapter = ET.fromstring(z.read(ids[ident]))
        body = chapter.find('h:body', ns)
        if chapter.findall('.//h:a', ns):
            raise ValueError('Link found in listening text.')
        readback.append(' '.join(body.itertext()))
    if normalize(' '.join(readback)) != normalize(text):
        raise ValueError('Narration not preserved completely.')
    nav = ET.fromstring(z.read('EPUB/nav.xhtml'))
    if [i.attrib['href'] for i in nav.findall('.//h:a', ns)] != [f'chapter-{n:02d}.xhtml' for n in range(1, 9)]:
        raise ValueError('Incorrect EPUB3 navigation.')
    ncx = ET.fromstring(z.read('EPUB/toc.ncx'))
    if [i.attrib['src'] for i in ncx.findall('.//n:content', ns)] != [f'chapter-{n:02d}.xhtml' for n in range(1, 9)]:
        raise ValueError('Incorrect NCX navigation.')
temporary.replace(EPUB)

def linkify(value):
    parts = []; start = 0
    for match in re.finditer(r'https?://[^\s<>]+', value):
        parts.append(escape(value[start:match.start()]))
        url = match.group()
        parts.append('<a href="' + escape(url, quote=True) + '">' + escape(url) + '</a>')
        start = match.end()
    parts.append(escape(value[start:]))
    return ''.join(parts)

def prose(value):
    output = []
    for block in value.strip().split('\n\n'):
        tag = 'h3' if len(block.splitlines()) == 1 and (block.isupper() or re.match(r'^\d+\. ', block)) else 'p'
        output.append('<' + tag + '>' + linkify(block) + '</' + tag + '>')
    return ''.join(output)

def table(headers, rows):
    return '<div class="scroll"><table><thead><tr>' + ''.join('<th>' + escape(h) + '</th>' for h in headers) + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join('<td>' + escape(str(c)) + '</td>' for c in row) + '</tr>' for row in rows) + '</tbody></table></div>'

defs = {c['id']: c for c in model['criterion_definitions']}
recommended = model['cases'][0]['score']
if Decimal(str(recommended['total'])) != Decimal('66.49'):
    raise ValueError('Narrative and score disagree.')
score_rows = [(r['id'], defs[r['id']]['label_es'], str(r['uncapped']), str(r['subtotal']), ', '.join(r['selected']) if r['selected'] else 'No solicitado en este modelo') for r in recommended['criteria']]
labels = ['Programa completo + perfil condicionado', 'Sin crédito por nuevo servicio, pero servicio entregado', 'Sin temática innovadora', 'Sin equipo renovable', 'Sin integración transversal (4)', 'Sin integración territorial (8)', 'Sin ambas integraciones', 'Sin servicio ni temática', 'Sin servicio ni equipo renovable', 'Sin oficio tradicional', 'Sin mejora de accesibilidad sobre mínimos']
sensitivities = [(label, str(case['score']['total']), 'Sí' if case['score']['total'] >= 60 else 'No') for label, case in zip(labels, model['cases'], strict=True)]
changes = [(r['choice'], 'Sin responder' if r['saved'] is None else str(r['saved']), str(r['proposed_model'])) for r in model['changes_for_review']]
docs = {d['id']: d for d in json.loads((ROOT / 'restoration_simulator/scenarios/documents.json').read_text(encoding='utf-8'))['documents']}
source_links = []
source_integrity = []
for key in ['FUND-004', 'FUND-008', 'FUND-009', 'FUND-010', 'FUND-013', 'FOREST-002']:
    doc = docs[key]; path = ROOT / 'doc_library' / doc['filename']
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != doc['sha256']:
        raise ValueError('Registered source changed: ' + key)
    source_links.append('<li><a href="../' + escape(doc['filename'], quote=True) + '">' + escape(key + ' · ' + doc['title']) + '</a> · ya almacenado</li>')
    source_integrity.append({'id': key, 'filename': doc['filename'], 'sha256': digest, 'status': 'Matches registered local document'})

html = '''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Un aula viva antes del parque · Una invitación a participar</title><style>
body{font:16px/1.65 system-ui,sans-serif;color:#20372c;background:#f4f4ed;margin:0}main{max-width:1120px;margin:auto;padding:36px 28px}h1,h2,h3{line-height:1.25;color:#28513f}h1{font-size:2.2rem}h2{margin-top:2.6rem}h3{font-size:1.05rem;margin-top:1.8rem}p{max-width:95ch;white-space:pre-wrap;overflow-wrap:anywhere}a{color:#17604e;overflow-wrap:anywhere}.status{padding:20px;background:#fff0ce;border-left:5px solid #aa742c}.total{font-size:3.2rem;font-weight:750;line-height:1.1;margin:24px 0 8px}.quiet{color:#56685d}.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;background:white;font-size:.9rem;margin:20px 0}td,th{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #dce3d7}th{background:#dce7d9}.links{display:flex;gap:20px;flex-wrap:wrap}details{padding:12px 0}summary{font-weight:650;cursor:pointer}nav{border-bottom:1px solid #c7d4c6;padding:16px 0}nav a{margin-right:18px}@media(max-width:600px){main{padding:24px 16px}h1{font-size:1.7rem}.total{font-size:2.6rem}}@media print{details{display:block}.scroll{overflow:visible}main{padding:0}table{font-size:9pt}tr{break-inside:avoid}}
</style></head><body><main><p class="quiet">ALHAMA DE ALMERÍA · PROPUESTA DE PROYECTO · 3 NOVIEMBRE 2026</p><h1>Un aula viva antes del parque</h1>'''
html += '<p style="font-size:1.2rem">' + escape(subtitle) + '</p>'
html += '<p class="links"><a href="Un%20aula%20viva%20antes%20del%20parque%20-%20Plan%20AL20.epub">Escuchar el proyecto · EPUB</a><a href="Presentacion%20del%20proyecto.txt">Texto de la presentación</a><a href="Paquete%20de%20revision%20AL20.zip">Paquete completo</a></p>'
html += '<nav><a href="#presentacion">El proyecto</a><a href="#chapter-2">Imaginar el parque</a><a href="#chapter-3">El demostrador</a><a href="#pasos">Al final: decisiones y próximos pasos</a></nav>'
html += '<section id="presentacion">'
for number, (label, paragraphs) in enumerate(chapters, 1):
    if number == 7:
        html += '</section><section id="pasos"><h2>Para hacerlo posible</h2>'
    html += f'<section class="chapter" id="chapter-{number}"><h2>' + escape(label) + '</h2>'
    html += ''.join('<p>' + escape(p) + '</p>' for p in paragraphs) + '</section>'
html += '</section><section id="anexos"><h2>Anexos para revisar y preparar la solicitud</h2><p>La presentación anterior reúne las cuestiones abiertas en sus dos capítulos finales. Estos anexos conservan los cálculos, el apartado técnico de solicitud y las fuentes de consulta.</p>'
html += '<details id="puntos"><summary>Puntuación propuesta: 66,49 y condiciones de acreditación</summary><div class="total">66,49 puntos</div><p>Proyección: 54,49 del programa y 12 de integraciones acreditadas de la futura solicitante. Margen: 6,49.</p><p class="status"><strong>Sin puntuación acreditada hoy.</strong> Sin esos doce puntos de integración este programa queda en 54,49. Terreno, equipo, permisos, presupuesto, entidad y valoración oficial deben concretarse como se explica en los capítulos finales. No hay una ayuda concedida por preparar estos documentos.</p>'
html += '<h3>Cálculo con la edición guardada</h3>' + table(['Criterio', 'Objeto', 'Suma nominal', 'Con tope', 'Opciones propuestas'], score_rows)
html += '<p>El cálculo está completo como escenario numérico y verificado de forma independiente. Su cumplimiento material y su valoración oficial siguen pendientes. Los doce puntos de PS.1 no son puntos de una actividad.</p>'
html += '<h3 id="sensibilidad">Margen y dependencias</h3>' + table(['Escenario', 'Puntos', 'Alcanza 60'], sensitivities)
html += '<p>Retirar realmente el servicio y su iniciativa residencial deja 59. El caso de 61,49 sin crédito SP.1 supone que se entrega el servicio y se acepta separadamente la temática innovadora. Las pérdidas simultáneas necesitan nuevo cálculo.</p>'
html += '<h3>Cambios numéricos propuestos frente al guardado</h3>' + table(['Opción', 'Guardado', 'Modelo propuesto'], changes) + '<p>Los nulos se excluyen explícitamente solo para este modelo completo. No se ha adoptado ninguna respuesta; también deben revisarse referencias y compromisos descritos en el texto.</p><p><a href="Plan%20y%20calculos.json">Cálculos completos y cambios propuestos</a></p></details>'
html += '<details id="solicitud"><summary>Apartado técnico de solicitud, conservado para revisión</summary><p><a href="Apartado%20para%20la%20solicitud.txt">Abrir texto editable del apartado técnico</a></p>' + prose(application) + '</details>'
html += '<details id="fuentes"><summary>Fuentes, condiciones y comprobaciones por capítulo y tema</summary><p><a href="Fuentes%20y%20condiciones%20de%20puntuacion.txt">Abrir notas de fuentes separadas</a></p>' + prose(notes)
html += '<h3>Originales ya almacenados en la biblioteca</h3><ul>' + ''.join(source_links) + '</ul><p>Los enlaces públicos de descarga y las fechas verificadas figuran en el anexo anterior. No se añaden duplicados de las fuentes.</p></details></section></main></body></html>'
(HERE / 'Revision y puntuacion.html').write_text(html, encoding='utf-8')
(HERE / 'Baseline conservado.json').write_bytes(original_baseline.read_bytes())
(HERE / 'Texto para escuchar.txt').write_text(text, encoding='utf-8')
words = len(re.findall(r'\b\w+(?:[’\'-]\w+)*\b', text))
validation = {'created_on': '2026-11-03', 'epub': EPUB.name, 'epub_sha256': hashlib.sha256(EPUB.read_bytes()).hexdigest(),
              'narration_sha256': hashlib.sha256(NARRATION.read_bytes()).hexdigest(), 'language': 'es',
              'chapters': len(chapters), 'words': words, 'estimated_minutes_at_130_to_160_wpm': [round(words / 160, 1), round(words / 130, 1)],
              'checks': ['ZIP CRC', 'EPUB mimetype first and stored', 'XML parsing', 'manifest target/identity integrity',
                         'spine reading order', 'EPUB3 navigation links', 'NCX compatibility navigation',
                         'complete normalized narration readback', 'no narration links/citation codes/digit strings',
                         'retained app evaluator plus independent Decimal capped sum and exclusive-alternative validation', 'six registered source checksums',
                         'active save unchanged'],
              'source_integrity': source_integrity, 'direct_elevenreader_playback_checked': False,
              'epubcheck_run': False, 'epubcheck_note': 'No claim of full EPUBCheck certification; structural checks are listed explicitly.',
              'baseline_save_sha256': baseline['save_sha256'], 'score_proposed': recommended['total'], 'accredited_score': None}
validation['editorial_structure'] = {'chapters_1_to_6': 'Project invitation, park vision, demonstrator, activities and reasons to participate',
                                   'chapters_7_to_8': 'Open decisions, land/applicant/permissions/budget, conditional score and next steps',
                                   'html_technical_annexes': 'After the narrative; collapsed by default',
                                   'earlier_version_preserved': 'Version anterior - Enfoque de puntuacion.zip',
                                   'scoring_model_changed': False}
(HERE / 'Validacion.json').write_text(json.dumps(validation, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k: validation[k] for k in ['chapters', 'words', 'estimated_minutes_at_130_to_160_wpm', 'score_proposed', 'direct_elevenreader_playback_checked']}, ensure_ascii=False))
