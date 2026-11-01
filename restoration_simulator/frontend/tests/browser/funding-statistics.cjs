const {selectProgramme}=require('./funding-programme-helper.cjs');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port!=='8000','Use isolated servers');
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let n=0;n<300;n++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Statistics browser assertion timed out');}
(async()=>{
 let project=await api('project');project=await api('project/new',{revision:project.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Statistics fixture'});const before=JSON.stringify(project.project);
 const browser=await chromium.launch({channel:'msedge',headless:true});let page;
 try{
  page=await browser.newPage({viewport:{width:1500,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();
  await page.getByRole('button',{name:'2. People and land',exact:true}).click();
  const graph=page.locator('.funding-diagram-scroll');await selectProgramme(page,'LEADER-AL20');await graph.locator('.funding-graph-option[data-option-id="LEADER-AL20-3.4"]').getByRole('radio',{name:'Work on LEADER-AL20-3.4',exact:true}).check();await graph.locator('.funding-circumstance[data-question-id="selection_score"]').click();
  const routes=page.getByLabel('AL20 assessment route',{exact:true});await routes.selectOption('LEADER-AL20-3.4');
  const editor=page.locator('#funding-answer-editor');
  async function open(id){const group=graph.locator(`.funding-annex-group[data-annex-criterion="${id}"]`);if(await group.getAttribute('aria-expanded')!=='true')await group.click();await graph.locator(`.funding-annex-choice[data-annex-criterion="${id}"]`).first().click();await editor.getByLabel('Lookup municipality',{exact:true}).waitFor();}
  const lookup=editor.getByRole('region',{name:'AL20 population and business lookup',exact:true});
  const saveIndicator=page.getByRole('status',{name:'Funding save status',exact:true}).locator('strong');
  async function saved(){await poll(async()=>/Saved to this computer/.test(await saveIndicator.innerText()));}
  const row=async id=>(await api('funding')).attachment.draft.selection_assessments['LEADER-AL20-3.4'].criteria[id];
  await open('AT.3');await editor.getByLabel('Lookup municipality',{exact:true}).selectOption('Alhama de Almería');
  await lookup.getByText('Alhama de Almería: 4016 inhabitants · 284 businesses (2025).',{exact:true}).waitFor();
  await editor.getByLabel('Population basis for AT.3',{exact:true}).selectOption('municipality_proxy');await lookup.getByRole('button',{name:'Set AT.3 and RD.5 from this location',exact:true}).click();await saved();
  assert.deepEqual((await row('AT.3')).answers,{'AT.3.1':false,'AT.3.2':false});assert.equal((await row('RD.5')).answers['RD.5.1'],false);
  await editor.getByLabel('Item notes (optional)',{exact:true}).fill('Keep my location evidence');
  await editor.getByLabel('Lookup municipality',{exact:true}).selectOption('Almócita');await saved();
  assert.equal((await row('AT.3')).answers['AT.3.1'],true);assert.equal((await row('RD.5')).answers['RD.5.1'],true);assert.equal((await row('AT.3')).choice_context.items['AT.3.1'].notes,'Keep my location evidence');
  assert.match(await graph.locator('.funding-annex-total').innerText(),/25 points.*provisional location data/);
  await editor.getByRole('button',{name:'Next item',exact:true}).click();await editor.locator('[id="al20-AT.3.2"]').selectOption('yes');await editor.getByRole('button',{name:'Confirm selection and related changes',exact:true}).click();await saved();assert.match(await lookup.innerText(),/AT.3 uses manual answers/);
  await editor.getByLabel('Lookup municipality',{exact:true}).selectOption('Alhama de Almería');await saved();assert.equal((await row('AT.3')).answers['AT.3.2'],true);assert.equal((await row('RD.5')).answers['RD.5.1'],false);
  await editor.getByLabel('Population basis for AT.3',{exact:true}).selectOption('settlement');await editor.getByLabel('Settlement name',{exact:true}).fill('A separately verified núcleo');await editor.getByLabel('Settlement population (2025)',{exact:true}).fill('538');
  await lookup.getByRole('button',{name:'Set AT.3 and RD.5 from this location',exact:true}).click();await saved();assert.equal((await row('AT.3')).answers['AT.3.1'],true);
  await page.reload();await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();await page.getByRole('button',{name:'2. People and land',exact:true}).click();await selectProgramme(page,'LEADER-AL20');await graph.locator('.funding-graph-option[data-option-id="LEADER-AL20-3.4"]').getByRole('radio',{name:'Work on LEADER-AL20-3.4',exact:true}).check();await graph.locator('.funding-circumstance[data-question-id="selection_score"]').click();await routes.selectOption('LEADER-AL20-3.4');await open('AT.3');
  assert.equal(await editor.getByLabel('Settlement population (2025)',{exact:true}).inputValue(),'538');assert.equal(await editor.getByLabel('Lookup municipality',{exact:true}).inputValue(),'Alhama de Almería');assert.equal(await editor.getByLabel('Item notes (optional)',{exact:true}).inputValue(),'Keep my location evidence');
  await page.getByRole('button',{name:'Close question editor',exact:true}).click();await routes.selectOption('LEADER-AL20-2.6');await open('AT.3');assert.notEqual(await editor.locator('[id="al20-AT.3.1"]').inputValue(),'yes');
  await page.route('**/api/funding/location-preview',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Location preview unavailable'})}));
  await editor.getByLabel('Lookup municipality',{exact:true}).selectOption('Almócita');await lookup.getByRole('button',{name:'Set AT.3 and RD.5 from this location',exact:true}).click();await editor.getByRole('alert').filter({hasText:'Location preview unavailable'}).waitFor();
  const d=(await api('funding')).attachment.draft;assert(!Object.hasOwn(d.selection_assessments['LEADER-AL20-2.6'],'location_lookup'));
  await page.unroute('**/api/funding/location-preview');await lookup.getByRole('button',{name:'Set AT.3 and RD.5 from this location',exact:true}).click();await saved();assert.equal((await api('funding')).attachment.draft.selection_assessments['LEADER-AL20-2.6'].criteria['AT.3'].answers['AT.3.1'],null);
  await page.setViewportSize({width:390,height:844});await lookup.getByText('All 32 municipalities, sources and limitations',{exact:true}).click();await lookup.getByRole('columnheader',{name:'Businesses',exact:true}).waitFor();assert.equal(await lookup.locator('tbody tr').count(),32);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'test-artifacts/funding-statistics-phone.png'});
  assert.equal(JSON.stringify((await api('project')).project),before);assert.deepEqual(errors,[]);
  console.log('AL20 statistics: 32 municipalities, automatic population/business choices, manual overrides, independent routes, notes and reload, actual núcleo input, unavailable preview recovery, provisional totals and phone table passed.');
 }catch(e){if(page){console.error((await page.locator('.funding-location-lookup').innerText()).slice(-2500));await page.screenshot({path:'test-artifacts/funding-statistics-failure.png'});}throw e;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,3000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
