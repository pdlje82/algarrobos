// Run against an isolated backend/dev frontend. See PDF_VIEWER.md for environment variables.
const assert=require('node:assert/strict');
const fs=require('node:fs');
for(const key of ['PLAYWRIGHT_MODULE','PDF_TEST_API','PDF_APP_URL'])if(!process.env[key])throw Error('Set '+key+' before running PDF browser tests.');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const base=process.env.PDF_APP_URL,apiBase=process.env.PDF_TEST_API;
const api=async(path,body)=>{const r=await fetch(apiBase+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();};

(async()=>{
 // Explicitly refuse the normal application port for mutations in this fixture.
 assert.notEqual(new URL(apiBase).port,'8000','Use an isolated test backend, never the active project.');
 let project=await api('project');project=await api('project/new',{revision:project.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'PDF browser fixture'});
 const land=await api('land/form',{revision:project.revision,route_id:'existing',parcel_id:'new'});
 const inputs=Object.fromEntries(land.fields.map(f=>[f.name,f.default]));Object.assign(inputs,{route_id:'existing',parcel_id:'new',parcel_area:4500,covered_area:4500});
 await api('commit',{revision:project.revision,request_id:crypto.randomUUID(),action_id:'establish_access',inputs});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true});const errors=[],calls=[];
  let failMetadata=false,delayMetadata=false,failFile=false;
  await context.route('**/api/**',async route=>{
   const url=new URL(route.request().url());calls.push(url.pathname);
   if(failMetadata&&/^\/api\/documents\/[^/]+$/.test(url.pathname)){failMetadata=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Simulated unavailable document'})});return;}
   if(delayMetadata&&/^\/api\/documents\/[^/]+$/.test(url.pathname)){delayMetadata=false;await new Promise(r=>setTimeout(r,600));}
   if(failFile&&url.pathname.endsWith('/file')){failFile=false;await route.fulfill({status:200,contentType:'application/pdf',body:'This is not PDF data'});return;}
   const response=await route.fetch({url:new URL(url.pathname+url.search,new URL(apiBase).origin).href});await route.fulfill({response});
  });
  const page=await context.newPage();page.setDefaultTimeout(16000);page.on('pageerror',e=>errors.push(e.message));
  const dialog=()=>page.locator('dialog.document-viewer');
  const pageInput=()=>dialog().getByRole('textbox',{name:'PDF page',exact:true});
  async function ready(n){await dialog().locator('.document-reading-area[aria-busy="false"]').waitFor();await page.waitForFunction(n=>document.querySelector('dialog.document-viewer input[aria-label="PDF page"]').value===String(n)&&!document.querySelector('dialog.document-viewer button[aria-label="Zoom in PDF"]').disabled,n);assert.equal(await pageInput().inputValue(),String(n));assert.equal(errors.length,0,errors.join('\n'));}
  async function open(name,n){await page.getByRole('link',{name,exact:true}).click();await ready(n);}
  async function close(){await dialog().getByRole('button',{name:'Close PDF',exact:true}).click();await dialog().waitFor({state:'detached'});}
  async function jump(n){await pageInput().fill(String(n));await pageInput().press('Enter');await ready(n);await dialog().locator(`.page[data-page-number="${n}"] canvas`).first().waitFor();}
  await page.goto(base+'/tests/fixtures/documents.html');
  await page.getByLabel('Unfinished note',{exact:true}).fill('Keep my unfinished note');
  await open('Handbook 125',125);
  await dialog().locator('.page[data-page-number="125"] .textLayer span').first().waitFor();
  assert.ok((await dialog().locator('.page[data-page-number="125"]').innerText()).includes('otoño'));
  const selected=await dialog().locator('.page[data-page-number="125"] .textLayer span').first().evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);return selection.toString();});assert.ok(selected.length>0,'PDF text cannot be selected');
  const downloadPromise=page.waitForEvent('download');await dialog().getByRole('link',{name:'Download PDF',exact:true}).click();const download=await downloadPromise;console.log('Downloaded filename:',download.suggestedFilename());assert.ok(download.suggestedFilename().includes('FOREST-002'));assert.equal(await download.failure(),null);
  const popupPromise=context.waitForEvent('page');await dialog().getByRole('link',{name:'Open in new tab',exact:true}).click();const popup=await popupPromise;await popup.waitForURL(/\/api\/documents\/FOREST-002\/file.*#page=125/);await popup.close();
  await jump(128);await dialog().getByRole('button',{name:'Next PDF page'}).click();await ready(129);await dialog().getByRole('button',{name:'Previous PDF page'}).click();await ready(128);
  await pageInput().fill('999');await pageInput().press('Enter');await dialog().getByRole('alert').filter({hasText:'Enter a whole PDF page'}).waitFor();assert.equal(await pageInput().inputValue(),'999');
  await jump(125);
  const beforeScale=await dialog().locator('.document-zoom-controls span').innerText();await dialog().getByRole('button',{name:'Zoom in PDF'}).click();assert.notEqual(await dialog().locator('.document-zoom-controls span').innerText(),beforeScale);await dialog().getByRole('button',{name:'Fit to width'}).click();
  const find=()=>dialog().getByRole('searchbox');await find().fill('algarrobo');await find().press('Enter');await dialog().locator('.document-search [role="status"]').filter({hasText:/\d+ of \d+ matches/}).waitFor();
  await find().fill('zzzzNoSuchText99999');await find().press('Enter');await dialog().getByText(/No text matches/).waitFor();
  await jump(125);
  for(const theme of ['light','dark'])for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.waitForTimeout(120);
   const dimensions=await dialog().evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));assert.ok(dimensions.scroll<=dimensions.width+1,'Toolbar overflows '+theme+width);
   const closeBox=await dialog().getByRole('button',{name:'Close PDF'}).boundingBox();assert.ok(closeBox.y>=0&&closeBox.y+closeBox.height<=1000,'Close hidden '+width);
   if(width===390){await dialog().getByRole('button',{name:'Next PDF page'}).tap();await ready(126);await dialog().getByRole('button',{name:'Previous PDF page'}).tap();await ready(125);}
   await page.screenshot({path:`../test-artifacts/pdf-viewer-${theme}-${width}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});await dialog().getByRole('button',{name:'Close PDF'}).focus();await page.keyboard.press('Shift+Tab');assert.ok(await page.evaluate(()=>document.activeElement.closest('dialog.document-viewer')!==null));
  await page.keyboard.press('Escape');await dialog().waitFor({state:'detached'});assert.equal(await page.getByLabel('Unfinished note',{exact:true}).inputValue(),'Keep my unfinished note');assert.equal(await page.getByRole('link',{name:'Handbook 125',exact:true}).evaluate(el=>el===document.activeElement),true);
  const modifiedPopup=context.waitForEvent('page');await page.getByRole('link',{name:'Handbook 125',exact:true}).click({modifiers:['Control']});const modified=await modifiedPopup;await modified.waitForURL(/#page=125/);assert.equal(await dialog().count(),0);await modified.close();
  await open('Handbook photograph 128',128);await close();await open('Plant supply page 5',5);await close();await open('One-page factsheet',1);assert.equal(await dialog().getByRole('button',{name:'Next PDF page'}).isDisabled(),true);await close();
  for(const [name,pattern] of [['Invalid page',/outside/],['Unmapped printed page',/not been mapped/],['Changed edition',/different document edition/]]){await page.getByText(name,{exact:true}).click();await dialog().getByRole('alert').filter({hasText:pattern}).waitFor();assert.equal(await dialog().locator('canvas').count(),0);await close();}
  assert.equal(await page.getByRole('link',{name:'External PDF'}).getAttribute('href'),'https://example.org/unregistered.pdf#page=9');
  failMetadata=true;await page.getByRole('link',{name:'One-page factsheet',exact:true}).click();await dialog().getByText(/Simulated unavailable document/).waitFor();await dialog().getByRole('button',{name:'Retry PDF'}).click();await ready(1);await close();
  failFile=true;await page.getByRole('link',{name:'One-page factsheet',exact:true}).click();await dialog().getByRole('alert').filter({hasText:'PDF could not be loaded'}).waitFor();await dialog().getByRole('button',{name:'Retry PDF'}).click();await ready(1);await close();
  delayMetadata=true;await page.getByRole('link',{name:'Handbook 125',exact:true}).click();await close();await open('One-page factsheet',1);await page.waitForTimeout(800);assert.equal(await pageInput().inputValue(),'1');assert.equal(await dialog().count(),1);await close();
  // A PDF above a real guide must not close/remount that guide or move its scroll.
  await page.getByRole('button',{name:'Planting information for Algarrobo'}).click();const guide=page.locator('dialog.planting-explorer');await guide.getByRole('tab',{name:'Examples and evidence'}).click();
  const photo=guide.getByRole('link',{name:/Landscape photographs · book p. 128/});await photo.scrollIntoViewIfNeeded();const guideScroll=await guide.locator('.explorer-body').first().evaluate(el=>el.scrollTop);
  await photo.click();await ready(128);assert.equal(await page.locator('dialog[open]').count(),2);await page.keyboard.press('Escape');await dialog().waitFor({state:'detached'});
  assert.equal(await guide.getByRole('tab',{name:'Examples and evidence'}).getAttribute('aria-selected'),'true');assert.equal(await guide.locator('.explorer-body').first().evaluate(el=>el.scrollTop),guideScroll);assert.equal(await photo.evaluate(el=>el===document.activeElement),true);
  await guide.getByRole('button',{name:'Explore restoration models',exact:true}).click();await guide.getByRole('tab',{name:'Compare models',exact:true}).click();
  const modelSource=guide.getByRole('link',{name:/Read handbook page/}).first();const modelPage=Number((await modelSource.getAttribute('href')).split('#page=')[1]);await modelSource.click();await ready(modelPage);await close();assert.equal(await guide.getByRole('tab',{name:'Compare models'}).getAttribute('aria-selected'),'true');await guide.getByRole('button',{name:/Back to planting information/}).click();await page.keyboard.press('Escape');await guide.waitFor({state:'detached'});
  // Real designer inputs and the persistent SVG survive opening and closing PDFs.
  await page.goto(base+'/');await page.getByRole('button',{name:'Site Designer',exact:true}).click();await page.getByRole('button',{name:'Plants',exact:true}).click();
  const preview=page.waitForResponse(r=>r.url().endsWith('/api/designer/preview'));await page.getByRole('checkbox',{name:'Select Algarrobo',exact:true}).click();await preview;
  // Valid values now commit on blur; use an invalid unfinished value to test retention.
  await page.getByRole('button',{name:'Edit diameter · Algarrobo',exact:true}).click();const crown=page.locator('.crown-editor');await crown.getByLabel('Crown / plant diameter (m)',{exact:true}).fill('0');await crown.getByLabel('Note (optional)',{exact:true}).fill('Unapplied diameter');
  const coreBefore=JSON.stringify((await api('project')).project),workspaceBefore=JSON.stringify(await api('designer'));
  const svg=await page.locator('.designer-svg').evaluateHandle(el=>el);await page.getByRole('button',{name:'Algarrobo Planting Explorer',exact:true}).click();
  const inspector=page.locator('.designer-inspector');await inspector.getByRole('tab',{name:'Buying plants'}).click();const bookLink=inspector.getByRole('link',{name:/Read handbook page 75/}).first();
  await bookLink.scrollIntoViewIfNeeded();const requestsBefore=calls.filter(p=>p.includes('/designer/preview')||p.includes('/designer/save')).length;
  await bookLink.click();await ready(75);await close();assert.equal(await inspector.getByRole('tab',{name:'Buying plants'}).getAttribute('aria-selected'),'true');
  await inspector.getByRole('button',{name:'Back to selection'}).click();assert.equal(await crown.getByLabel('Crown / plant diameter (m)',{exact:true}).inputValue(),'0');assert.equal(await crown.getByLabel('Note (optional)',{exact:true}).inputValue(),'Unapplied diameter');assert.equal(await page.getByRole('button',{name:'Save',exact:true}).isDisabled(),true);assert.equal(await svg.evaluate(el=>el.isConnected),true);
  assert.equal(calls.filter(p=>p.includes('/designer/preview')||p.includes('/designer/save')).length,requestsBefore);
  assert.equal(JSON.stringify((await api('project')).project),coreBefore);assert.equal(JSON.stringify(await api('designer')),workspaceBefore);
  // Incomplete checklist prices retain their entered text through the same flow.
  const invalid=page.waitForResponse(r=>r.url().endsWith('/api/designer/preview'));await page.getByLabel('Unit price for Algarrobo',{exact:true}).fill('');await invalid;
  await page.getByRole('button',{name:'Algarrobo Planting Explorer',exact:true}).click();await inspector.getByRole('link',{name:/Read handbook page 95/}).first().click();await ready(95);await close();assert.equal(await page.getByLabel('Unit price for Algarrobo',{exact:true}).inputValue(),'');
  await inspector.getByRole('button',{name:'Back to selection'}).click();
  const season=inspector.locator('.designer-guide > details').filter({has:page.locator('summary').filter({hasText:/^Planting season and young algarrobo plants$/})});await season.locator('summary').first().click();await season.getByText('Sources and details',{exact:true}).click();
  const ruleSource=season.getByRole('link').filter({hasText:'FOREST-002'}).first();assert.ok((await ruleSource.getAttribute('href')).includes('expected_sha256='));const rulePage=Number((await ruleSource.getAttribute('href')).split('#page=')[1]);await ruleSource.click();await ready(rulePage);await close();
  await page.getByLabel('Find a plant',{exact:true}).fill('Coscoja');await page.getByText('Details for Coscoja',{exact:true}).click();const botanic=page.locator('.plant-checklist a[href*="/api/documents/FOREST-003/file"]').first();await botanic.click();await ready(1);assert.ok((await dialog().getByRole('heading').innerText()).includes('Kermes'));await close();
  await page.getByRole('button',{name:'Project',exact:true}).click();await page.getByRole('button',{name:/^Plan the demonstrator/}).click();await page.getByText('Source documents and funding conditions',{exact:true}).click();
  await page.getByRole('link',{name:/Níjar native-plant specification/}).click();await ready(1);await close();
  await page.getByRole('button',{name:/^Establish land access/}).click();await page.getByRole('button',{name:'I already own this land',exact:true}).click();await page.getByText('Site details and unresolved restrictions',{exact:true}).click();await page.getByText('Category sources',{exact:true}).click();
  const landSource=page.locator('.category-sources').getByRole('link').filter({hasText:/FOREST-001|Ferreira|Silvicultural/}).first();await landSource.click();await ready(1);await close();
  assert.equal(errors.length,0,errors.join('\n'));
  fs.writeFileSync('../test-artifacts/pdf-browser-results.json',JSON.stringify({passed:true,errors,documentRequests:calls.filter(p=>p.startsWith('/api/documents/')).length},null,2));
  console.log('PDF pages, text/search, navigation/download, errors/retry, cancellation, nested dialogs/focus, designer input preservation, touch-capable phone layouts and both themes passed.');
 }finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,1500))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
