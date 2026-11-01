const {selectProgramme}=require('./funding-programme-helper.cjs');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port!=='8000','Use an isolated project save');
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<300;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Funding focus state timed out');}
(async()=>{
 let p=await api('project');p=await api('project/new',{revision:p.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Funding focus fixture'});
 const before=JSON.stringify(p.project),r34='LEADER-AL20-3.4',r35='LEADER-AL20-3.5';
 const browser=await chromium.launch({channel:'msedge',headless:true});let page;
 try{
  page=await browser.newPage({viewport:{width:1500,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const graph=page.locator('.funding-diagram-scroll'),programme=()=>graph.locator('[data-programme-id="LEADER-AL20"] .funding-programme-select');
  const work=id=>graph.locator(`.funding-graph-option[data-option-id="${id}"]`).getByRole('radio',{name:`Work on ${id}`,exact:true});
  const status=page.getByRole('status',{name:'Funding save status',exact:true}).locator('strong');
  const saved=()=>poll(async()=>/Saved to this computer/.test(await status.innerText()));
  const open=async()=>{await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();await page.getByRole('heading',{name:'Funding Navigator',exact:true}).waitFor();};
  const admin=page.locator('.funding-admin');
  async function openAdmin(){if(await admin.getAttribute('open')===null)await admin.locator(':scope > summary').click();}
  async function saveAlternative(){await saved();await openAdmin();await admin.getByRole('button',{name:'Save exploration',exact:true}).click();await saved();}
  async function checkFocus(route){await programme().waitFor();assert.equal(await programme().getAttribute('aria-pressed'),'true');await poll(()=>work(route).isChecked());}
  await page.goto(url);await open();await page.getByLabel('Exploration name',{exact:true}).fill('AL20 Alhama');
  await selectProgramme(page,'LEADER-AL20');await work(r34).check();await saved();await checkFocus(r34);
  let draft=(await api('funding')).attachment.draft;
  assert.deepEqual(draft.navigator_focus,{version:1,programme_id:'LEADER-AL20',route_id:r34});assert.deepEqual(draft.selected,[]);
  const answers=structuredClone(draft.selection_assessments);await saveAlternative();
  await page.getByRole('button',{name:'Project',exact:true}).click();await open();await checkFocus(r34);
  await page.reload();await open();await checkFocus(r34);
  await selectProgramme(page,'LEADER-AL20');await work(r35).check();await page.getByLabel('Exploration name',{exact:true}).fill('AL20 alternative');await saveAlternative();
  async function loadAlternative(name,route){await openAdmin();await admin.getByText(name,{exact:true}).locator('..').getByRole('button',{name:'Load / rename',exact:true}).click();await poll(async()=>(await api('funding')).attachment.draft.name===name);await page.getByRole('button',{name:'2. People and land',exact:true}).click();await checkFocus(route);await saved();}
  await loadAlternative('AL20 Alhama',r34);await loadAlternative('AL20 alternative',r35);
  let fail=true;await page.route('**/api/funding/save',request=>{if(fail){fail=false;return request.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Focus test save unavailable'})});}return request.continue();});
  await selectProgramme(page,'LEADER-AL20');await work(r34).check();await page.getByText(/Focus test save unavailable/).waitFor();await checkFocus(r34);
  assert.equal((await api('funding')).attachment.draft.navigator_focus.route_id,r35);
  await page.getByRole('button',{name:'Retry failed save',exact:true}).click();await saved();assert.equal((await api('funding')).attachment.draft.navigator_focus.route_id,r34);
  await page.getByRole('button',{name:'Clear working option',exact:true}).click();await saved();await page.reload();await open();
  assert.equal(await programme().getAttribute('aria-pressed'),'true');assert.equal(await graph.getByRole('radio',{checked:true}).count(),0);
  draft=(await api('funding')).attachment.draft;assert.deepEqual(draft.navigator_focus,{version:1,programme_id:'LEADER-AL20',route_id:null});assert.deepEqual(draft.selection_assessments,answers);
  const exported=await api('export');assert.deepEqual(exported.funding.draft.navigator_focus,draft.navigator_focus);
  assert.equal(JSON.stringify((await api('project')).project),before);assert.deepEqual(errors,[]);
  console.log('Funding focus: programme/route autosave, workspace return, reload, distinct named alternatives, failed-save retention/retry, explicit route clearing and export passed.');
 }catch(e){if(page)await page.screenshot({path:'test-artifacts/funding-focus-failure.png'});throw e;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,3000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
