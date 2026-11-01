const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const {selectProgramme}=require('./funding-programme-helper.cjs');
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port==='8013','Use the isolated backend on 8013');
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<250;i++){if(await fn())return;await new Promise(r=>setTimeout(r,40));}throw Error('Four-column state timed out');}
(async()=>{
 let project=await api('project');project=await api('project/new',{revision:project.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Four column graph fixture'});
 const before=JSON.stringify(project.project),planning=JSON.stringify(project.planning.draft),browser=await chromium.launch({channel:'msedge',headless:true});let page;
 try{
  page=await browser.newPage({viewport:{width:1700,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
  await page.goto(url);await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();
  const visual=page.getByLabel('Live funding consequences',{exact:true}),graph=visual.locator('.funding-diagram-scroll'),range=visual.getByRole('status',{name:'Visible funding columns',exact:true});
  const settled=()=>poll(async()=>!/Updating/.test(await visual.locator('.funding-visual-status').innerText()));await settled();
  await page.getByRole('button',{name:'2. People and land',exact:true}).click();
  assert.equal(await visual.getByRole('combobox',{name:'Programme or funding approach',exact:true}).count(),0);
  assert.deepEqual(await graph.locator('.funding-layer-label').allTextContents(),['Exploration','Programme','Route requirements','Funding routes']);
  assert.equal(await graph.locator('[data-programme-family]').count(),6);assert.equal(await graph.locator('.funding-circumstance').count(),0);
  await poll(async()=>/Columns 1–4/.test(await range.innerText()));
  await selectProgramme(page,'LEADER-AL20');assert.equal(await graph.locator('.funding-graph-option').count(),12);
  const node=graph.locator('[data-programme-id="LEADER-AL20"]');assert.equal(await graph.locator('.funding-programme-node').count(),1);
  await node.getByRole('button',{name:/^Read guide for /}).click();
  const guide=visual.getByRole('region',{name:'Programme overview: LEADER AL20',exact:true});await guide.waitFor();
  const source=guide.getByRole('link',{name:/FUND-004/});await source.click();await page.locator('dialog.document-viewer').waitFor();await poll(async()=>!await page.getByLabel('PDF page',{exact:true}).isDisabled());assert.equal(await page.getByLabel('PDF page',{exact:true}).inputValue(),'2');await page.keyboard.press('Escape');assert(await source.evaluate(n=>n===document.activeElement));
  await guide.getByRole('button',{name:'Close programme guide',exact:true}).click();assert(await node.getByRole('button',{name:/^Read guide for /}).evaluate(n=>n===document.activeElement));
  await graph.locator('[data-option-id="LEADER-AL20-2.6"]').getByRole('radio',{name:'Work on LEADER-AL20-2.6',exact:true}).check();assert.equal(await graph.locator('.funding-graph-option').count(),1);
  const choice=graph.locator('[data-question-id="not_started"]');await choice.click();await page.locator('#funding-not_started').selectOption('yes');await settled();await page.getByRole('button',{name:'Close question editor',exact:true}).click();await settled();
  await poll(async()=>/Saved to this computer/.test(await page.getByRole('status',{name:'Funding save status',exact:true}).locator('strong').innerText()));
  const saved=JSON.stringify((await api('funding')).attachment);
  const search=visual.getByRole('searchbox',{name:'Find a programme or approach',exact:true});await search.fill('EU-LIFE');
  await graph.locator('[data-programme-id="EU-LIFE"]').getByRole('button',{name:/^Read guide for /}).click();
  assert.match(await visual.locator('.funding-programme-intro').innerText(),/Working programme: LEADER AL20/);
  assert(await graph.locator('[data-option-id="LEADER-AL20-2.6"]').getByRole('radio').isChecked(),'Reading another programme keeps the working route');
  await page.getByRole('button',{name:'Close programme guide',exact:true}).click();await search.fill('');await graph.locator('.funding-programme-browse').click();

  await visual.getByRole('combobox',{name:'Column view',exact:true}).selectOption('3');await poll(async()=>/Columns 2–4/.test(await range.innerText()));
  const previous=visual.getByRole('button',{name:'Previous columns',exact:true}),next=visual.getByRole('button',{name:'Next columns',exact:true});assert(await next.isDisabled());
  await graph.evaluate(n=>n.scrollTop=180);const top=await graph.evaluate(n=>n.scrollTop);await previous.click();await poll(async()=>/Columns 1–3/.test(await range.innerText()));assert.equal(await graph.evaluate(n=>n.scrollTop),top);assert(await previous.isDisabled());
  await graph.evaluate(n=>n.scrollTop=0);await poll(async()=>await visual.locator('[data-continuation-side="right"]').count()>0);
  const marker=visual.locator('[data-continuation-side="right"]').first();assert.match(await marker.getAttribute('aria-label'),/Funding routes|Later columns/);await marker.click();await poll(async()=>/Columns 2–4/.test(await range.innerText()));
  await graph.focus();await page.keyboard.press('ArrowLeft');await poll(async()=>/Columns 1–3/.test(await range.innerText()));await page.keyboard.press('ArrowRight');await poll(async()=>/Columns 2–4/.test(await range.innerText()));
  const divider=graph.getByRole('separator',{name:'Resize Route requirements and Funding routes columns',exact:true});await divider.focus();const pos=Number(await divider.getAttribute('aria-valuenow')),left=await graph.evaluate(n=>n.scrollLeft);await page.keyboard.press('ArrowLeft');assert.equal(Number(await divider.getAttribute('aria-valuenow')),pos-10);assert.equal(await graph.evaluate(n=>n.scrollLeft),left);
  await graph.locator('[data-question-id="applicant_choice"]').click();const editor=page.getByRole('dialog',{name:'Edit funding answer',exact:true});await previous.click();assert(await editor.isVisible());await editor.getByRole('button',{name:'Show edited requirement',exact:true}).click();await page.getByRole('button',{name:'Close question editor',exact:true}).click();
  await visual.getByRole('button',{name:'Reset column widths',exact:true}).click();
  await page.screenshot({path:'test-artifacts/funding-four-columns-desktop.png'});
  for(const width of [1000,800,390,320]){
   await page.setViewportSize({width,height:900});const expand=visual.getByRole('button',{name:'Expand funding visual workspace',exact:true});if(await expand.isVisible())await expand.click();
   await poll(async()=>await graph.evaluate(n=>n.clientWidth>224));
   await visual.getByRole('combobox',{name:'Column view',exact:true}).focus();await visual.getByRole('combobox',{name:'Column view',exact:true}).selectOption('4');
   await poll(async()=>/fit at this width/.test(await range.innerText()));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await graph.locator('[data-question-id="applicant_choice"]').focus();
   await poll(async()=>await graph.locator('[data-question-id="applicant_choice"]').evaluate(n=>{const b=n.getBoundingClientRect(),p=n.closest('.funding-diagram-scroll').getBoundingClientRect();return b.left>=p.left-1&&b.right<=p.right+1;}));
  }
  await page.screenshot({path:'test-artifacts/funding-four-columns-phone.png'});
  await selectProgramme(page,'EU-LIFE');assert.equal(await graph.locator('.funding-graph-option').count(),4);assert.equal(await graph.locator('.funding-circumstance').count(),0);
  await graph.locator('[data-programme-id="EU-LIFE"]').getByRole('button',{name:/^Read guide for /}).click();assert.equal(await visual.getByRole('region',{name:/Programme overview: LIFE/}).count(),1);await page.getByRole('button',{name:'Close programme guide',exact:true}).click();
  await selectProgramme(page,'SELF-FUNDS');assert(await graph.locator('[data-option-id="SELF-FUNDS"]').getByRole('radio').isChecked());
  assert.deepEqual((await api('funding')).attachment,JSON.parse(saved));const after=await api('project');assert.equal(JSON.stringify(after.project),before);assert.equal(JSON.stringify(after.planning.draft),planning);assert.deepEqual(errors,[]);
  console.log('Four columns: programme nodes, guide/PDF focus, 3/4/Auto, real continuation arrows, keyboard/pan/resize/editor, phone widths and draft isolation passed.');
 }catch(e){if(page){await page.screenshot({path:'test-artifacts/funding-four-columns-failure.png'});require('node:fs').writeFileSync('test-artifacts/funding-four-columns-failure.txt',await page.locator('body').innerText());}throw e;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,3000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
