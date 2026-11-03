"""Rebuild the listening EPUB and evidence companion from retained report inputs."""
from datetime import datetime, timezone
from decimal import Decimal
from html import escape
from pathlib import Path
from uuid import UUID
from zipfile import ZipFile,ZIP_STORED,ZIP_DEFLATED
import hashlib,json,re,xml.etree.ElementTree as ET

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
NARRATION=ROOT/'doc_library/LEARN-013 - AL20 3.4 - Cortijo Conjuro Demonstrator Proposal - 2026-11-03.txt'
SOURCE_NOTES=HERE/'Sources and evidence notes.txt'
EPUB=HERE/'Cortijo Conjuro - A Small Trial Before a Park.epub'
text=NARRATION.read_text(encoding='utf-8')
notes=SOURCE_NOTES.read_text(encoding='utf-8')
scenario=json.loads((HERE/'Scenario and scoring.json').read_text(encoding='utf-8'))
baseline=json.loads((HERE/'Baseline and retained rules.json').read_text(encoding='utf-8'))
blocks=text.strip().split('\n\n');title,subtitle=blocks[0].splitlines();chapters=[]
for block in blocks[1:]:
    if re.fullmatch(r'Chapter (one|two|three|four|five|six|seven|eight|nine|ten|eleven)\. .+',block):chapters.append((block,[]))
    else:
        if not chapters:raise ValueError('Paragraph without chapter')
        chapters[-1][1].append(block)
if len(chapters)!=11 or not all(p for _,p in chapters):raise ValueError('Expected eleven complete chapters')
clutter=[r'https?://',r'www\.',r'\[\d+\]',r'\b(?:FUND|FOREST|LEARN|NIJAR)-\d+',r'\b(?:NPL|IN-A|CO\.1|PS\.1)\d*',r'04011A\d+',r'\|',r'\ufffd']
for pattern in clutter:
    if re.search(pattern,text):raise ValueError('Narration contains unwanted citation/formatting text: '+pattern)
css='body{font-family:serif;line-height:1.55;margin:1.2em;color:#162820}h1,h2{font-family:sans-serif;line-height:1.25;color:#214d3e}h1{font-size:1.65em}h2{font-size:1.3em}p{margin:0 0 .9em}.subtitle{font-size:1.05em;color:#42574d}'
def xhtml(label,body):
    return '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en"><head><title>'+escape(label)+'</title><meta charset="utf-8"/><link rel="stylesheet" type="text/css" href="style.css"/></head><body>'+body+'</body></html>'
files={}
for n,(label,paragraphs) in enumerate(chapters,1):
    body=('<h1>'+escape(title)+'</h1><p class="subtitle">'+escape(subtitle)+'</p>') if n==1 else ''
    body+=f'<section epub:type="chapter" id="chapter-{n}"><h2>'+escape(label)+'</h2>'+''.join('<p>'+escape(p)+'</p>' for p in paragraphs)+'</section>'
    files[f'EPUB/chapter-{n:02d}.xhtml']=xhtml(label,body)
links=''.join(f'<li><a href="chapter-{n:02d}.xhtml">{escape(label)}</a></li>' for n,(label,_) in enumerate(chapters,1))
files['EPUB/nav.xhtml']=xhtml('Contents','<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>'+links+'</ol></nav>')
uid='urn:uuid:'+str(UUID(hashlib.sha256(text.encode('utf-8')).hexdigest()[:32]))
ncxpoints=''.join(f'<navPoint id="nav-{n}" playOrder="{n}"><navLabel><text>{escape(label)}</text></navLabel><content src="chapter-{n:02d}.xhtml"/></navPoint>' for n,(label,_) in enumerate(chapters,1))
files['EPUB/toc.ncx']=f'<?xml version="1.0" encoding="utf-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="{uid}"/><meta name="dtb:depth" content="1"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head><docTitle><text>{escape(title)}</text></docTitle><navMap>{ncxpoints}</navMap></ncx>'
manifest='<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="style" href="style.css" media-type="text/css"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
manifest+=''.join(f'<item id="c{n}" href="chapter-{n:02d}.xhtml" media-type="application/xhtml+xml"/>' for n in range(1,12))
spine=''.join(f'<itemref idref="c{n}"/>' for n in range(1,12))
modified=datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
files['EPUB/package.opf']=f'<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="pub-id">{uid}</dc:identifier><dc:title>{escape(title)}</dc:title><dc:language>en</dc:language><dc:creator>OpenAI ChatGPT</dc:creator><dc:date>2026-11-03</dc:date><dc:description>Researched discussion proposal for a Cortijo Conjuro AL20 3.4 demonstrator informing a possible 3.5 educational restoration park. Funding case remains conditional and below threshold on the reviewed claims; evidence is supplied separately.</dc:description><meta property="dcterms:modified">{modified}</meta><meta property="schema:accessMode">textual</meta><meta property="schema:accessibilityFeature">tableOfContents</meta><meta property="schema:accessibilityFeature">readingOrder</meta><meta property="schema:accessibilityHazard">none</meta></metadata><manifest>{manifest}</manifest><spine toc="ncx">{spine}</spine></package>'
files['EPUB/style.css']=css
files['META-INF/container.xml']='<?xml version="1.0" encoding="utf-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
for name,content in files.items():
    if name.endswith(('.xhtml','.xml','.opf','.ncx')):ET.fromstring(content)
temporary=EPUB.with_suffix('.building.epub')
with ZipFile(temporary,'w') as z:
    z.writestr('mimetype','application/epub+zip',compress_type=ZIP_STORED)
    for name,content in files.items():z.writestr(name,content,compress_type=ZIP_DEFLATED)
ns={'o':'http://www.idpf.org/2007/opf','h':'http://www.w3.org/1999/xhtml','n':'http://www.daisy.org/z3986/2005/ncx/'}
normalize=lambda s:re.sub(r'\s+',' ',s).strip()
with ZipFile(temporary) as z:
    if z.testzip() is not None:raise ValueError('ZIP integrity failure')
    if z.infolist()[0].filename!='mimetype' or z.infolist()[0].compress_type!=ZIP_STORED or z.read('mimetype')!=b'application/epub+zip':raise ValueError('Invalid EPUB mimetype')
    package=ET.fromstring(z.read('EPUB/package.opf'));ids={}
    for i in package.findall('o:manifest/o:item',ns):
        if i.attrib['id'] in ids:raise ValueError('Duplicate manifest identity')
        target='EPUB/'+i.attrib['href']
        if target not in z.namelist():raise ValueError('Missing manifest target '+target)
        ids[i.attrib['id']]=target
    order=[i.attrib['idref'] for i in package.findall('o:spine/o:itemref',ns)]
    if order!=[f'c{n}' for n in range(1,12)]:raise ValueError('Incorrect chapter order')
    readback=[]
    for ident in order:
        chapter=ET.fromstring(z.read(ids[ident]));body=chapter.find('h:body',ns)
        if chapter.findall('.//h:a',ns):raise ValueError('Narration link found')
        readback.append(' '.join(body.itertext()))
    if normalize(' '.join(readback))!=normalize(text):raise ValueError('Incomplete or changed narration')
    nav=ET.fromstring(z.read('EPUB/nav.xhtml'));anchors=nav.findall('.//h:a',ns)
    if [a.attrib['href'] for a in anchors]!=[f'chapter-{n:02d}.xhtml' for n in range(1,12)]:raise ValueError('Invalid navigation')
    ncx=ET.fromstring(z.read('EPUB/toc.ncx'))
    if len(ncx.findall('.//n:navPoint',ns))!=11:raise ValueError('Invalid compatibility navigation')
temporary.replace(EPUB)

def linkify(value):
    chunks=[];start=0
    for m in re.finditer(r'https?://[^\s<>]+',value):
        chunks.append(escape(value[start:m.start()]));url=m.group();chunks.append('<a href="'+escape(url,quote=True)+'">'+escape(url)+'</a>');start=m.end()
    chunks.append(escape(value[start:]));return ''.join(chunks)
def table(headers,rows):
    return '<div class="scroll"><table><thead><tr>'+''.join('<th>'+escape(h)+'</th>' for h in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+linkify(str(c))+'</td>' for c in row)+'</tr>' for row in rows)+'</tbody></table></div>'
budget=scenario['budget']
budget_table=table(['Resource','Quantity / rate basis','EUR','Evidence status'],[(r['item'],r['units']+' at EUR '+r['unit_eur'],r['amount_eur'],r['status']) for r in budget['rows']])
score_rows=[]
defs={c['id']:c for c in baseline['draft']['bundle']['selection']['profiles']['line3']['criteria']}
for r in scenario['reviewed_partial_score']['criteria']:score_rows.append((r['id'],defs[r['id']]['label'],r['subtotal'],r['cap'],', '.join(r['selected']),'Calculation complete' if r['complete'] else 'Other answers unresolved'))
score_table=table(['Criterion','Meaning','Provisional points','Cap','Retained proposed claims','Calculation status'],score_rows)
checks=[
('Saved baseline','Identified and retained','Live export matched; exact bundle and save hashes recorded.'),
('User intent','Clarified','Own land and neighbour alternative, cadastral identities and applicant preference recorded.'),
('Official editions','Verified','Five fresh funding/strategy downloads and the carob handbook match registered files.'),
('Applicant','Unresolved gate','Obtain legal identity, statutes, competence, representative authority and willingness.'),
('Land rights','User ownership reported; instrument unverified','Written beneficiary use/access agreement and title evidence; no neighbour agreement.'),
('Ecological fit and permits','Unresolved gate','Field survey and authority checks; cadastral records/WMS are not a clearance.'),
('Local novelty','Unresolved gate','Existing GEA/IFAPA practice documented; seek a precise comparative knowledge gap.'),
('Funding score','Below threshold on reviewed inputs','48 partial points; no certified completed score. Sensitivities are hypothetical.'),
('Budget','Explicit assumptions; unquoted','EUR 8745 working cost, separate reserves, staff/eligibility/quotes need confirmation.'),
('Actual cash','Unknown','EUR 11344.50 no-advance liquidity model; no real funds or guarantee evidenced.'),
('Delivery','Specified prospectively','Six pairs, 12 monthly visits, four sessions, named roles still to appoint.'),
('Park roadmap','Separate and conditional','Neighbour rights, ecological design, current scoring and non-duplicate costs require later review.'),
('EPUB','Package/text checks passed','Eleven chapters; separate source notes; direct ElevenReader playback untested.')]
check_table=table(['Requirement','Current status','Evidence / action'],checks)
sections=[]
for block in notes.strip().split('\n\n'):
    lines=block.splitlines()
    if len(lines)==1 and (lines[0].startswith('CHAPTER ') or lines[0] in ['READ THIS WITH THE EPUB','OFFICIAL DOCUMENT LINKS AND EDITION VERIFICATION','OTHER LOCAL DOCUMENTS REVIEWED','PRODUCTION AND VERIFICATION']):
        sections.append('<h2>'+escape(block)+'</h2>')
    else:sections.append('<p class="source-block">'+linkify(block)+'</p>')
html='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cortijo Conjuro - Evidence and review</title><style>
body{font:16px/1.6 system-ui,sans-serif;color:#1b3027;background:#f5f5ef;margin:0}main{max-width:1120px;margin:auto;padding:40px 28px}h1,h2{line-height:1.2;color:#244e3c}h1{font-size:2.2rem}h2{margin-top:2.6rem}p{max-width:90ch}.lead{font-size:1.15rem}.status{padding:18px 22px;border-left:5px solid #aa752b;background:#fff3dc}.links a{margin-right:1.4em}a{color:#225e50;overflow-wrap:anywhere}.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;background:white;margin:20px 0;font-size:.92rem}td,th{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #d8dfd7}th{background:#dde8dc}.source-block{white-space:pre-wrap;overflow-wrap:anywhere}.scroll{max-width:100%}.quiet{color:#53675d}
</style></head><body><main>'''
html+='<p class="quiet">AL20 / 3 NOVEMBER 2026 / RESEARCH DISCUSSION PACKAGE</p><h1>A small trial before a park</h1><p class="lead">Evidence, assumptions and decisions for the Cortijo Conjuro demonstrator.</p><p class="status"><strong>Funding case not established.</strong> The retained saved subtotal is 57.49 with two unresolved criteria. The reviewed provisional subtotal is 48.00, below the 60-point threshold, and remaining claims still require evidence. No grant-dependent work is authorised by this report.</p>'
html+='<p class="links"><a href="Cortijo%20Conjuro%20-%20A%20Small%20Trial%20Before%20a%20Park.epub">Listening EPUB</a><a href="Scenario%20and%20scoring.json">Scenario and calculations</a><a href="Baseline%20and%20retained%20rules.json">Retained baseline</a><a href="Site%20and%20partner%20evidence.json">Site and partner checks</a></p>'
html+='<h2>Readiness and evidence checklist</h2>'+check_table+'<h2>Proposed working budget</h2>'+budget_table
html+='<p><strong>Working cost: EUR '+budget['working_cost_eur']+'.</strong> Private contingency: EUR '+budget['private_contingency_10pct_eur']+'; later coordination: EUR '+budget['later_coordination_reserve_eur']+'; later hosting: EUR '+budget['post_six_month_hosting_reserve_eur']+'. No-advance cash model: EUR '+budget['no_advance_peak_cash_eur']+'. These are unconfirmed cash allowances, not approved eligible expenditure or quotations.</p>'
html+='<h2>Reviewed provisional scoring</h2>'+score_table+'<h2>Sources and detailed review by listening chapter</h2>'+''.join(sections)+'</main></body></html>'
(HERE/'Evidence and review.html').write_text(html,encoding='utf-8')
words=len(re.findall(r"\b[\w]+(?:['’-][\w]+)*\b",text))
validation={'created_on':'2026-11-03','epub':EPUB.name,'epub_sha256':hashlib.sha256(EPUB.read_bytes()).hexdigest(),'narration_sha256':hashlib.sha256(NARRATION.read_bytes()).hexdigest(),'chapters':len(chapters),'words':words,'estimated_minutes_at_130_to_160_wpm':[round(words/160,1),round(words/130,1)],'checks':['ZIP integrity','EPUB mimetype position/compression','all XML parsed','manifest targets','reading order','EPUB3 navigation','NCX compatibility navigation','complete source-text readback','no narration links or citation clutter'],'direct_elevenreader_playback_checked':False,'baseline_save_sha256':baseline['save_sha256']}
(HERE/'Publication validation.json').write_text(json.dumps(validation,indent=2)+'\n',encoding='utf-8')
print(json.dumps(validation,indent=2))
