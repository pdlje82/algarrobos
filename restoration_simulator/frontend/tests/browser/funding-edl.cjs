const {selectProgramme}=require('./funding-programme-helper.cjs');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port==='8013','Use the documented isolated backend on 8013');
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<300;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('EDL browser state timed out');}
(async()=>{
 let project=await api('project');project=await api('project/new',{revision:project.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'AL20 EDL fixture'});
 const before=JSON.stringify(project.project),planning=JSON.stringify(project.planning.draft);
 const browser=await chromium.launch({channel:'msedge',headless:true});let page;
 try{
  page=await browser.newPage({viewport:{width:1500,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();
  const visual=page.getByLabel('Live funding consequences',{exact:true}),graph=visual.locator('.funding-diagram-scroll');
  const settled=()=>poll(async()=>!/Updating/.test(await visual.locator('.funding-visual-status').innerText()));await settled();
  await page.getByRole('button',{name:'Choose activity',exact:true}).click();await page.locator('#funding-activity').selectOption('business');await settled();
  await page.getByRole('button',{name:'2. People and land',exact:true}).click();await selectProgramme(page,'LEADER-AL20');await graph.locator('.funding-graph-option[data-option-id="LEADER-AL20-3.4"]').getByRole('radio',{name:'Work on LEADER-AL20-3.4',exact:true}).check();await graph.locator('.funding-circumstance[data-question-id="selection_score"]').click();
  const route=page.getByLabel('AL20 assessment route',{exact:true});await route.selectOption('LEADER-AL20-3.4');await settled();
  const editor=page.getByRole('dialog',{name:'Edit AL20 criterion',exact:true});
  const region=id=>editor.getByRole('region',{name:`EDL information for ${id}`,exact:true});
  async function open(id,choice){const group=graph.locator(`.funding-annex-group[data-annex-criterion="${id}"]`);if(await group.getAttribute('aria-expanded')!=='true')await group.click();await graph.locator(`.funding-annex-choice[data-annex-choice="${choice}"]`).click();await editor.waitFor();}
  async function close(){await page.getByRole('button',{name:'Close question editor',exact:true}).click();await settled();}
  const draft=async()=> (await api('funding')).attachment.draft;
  const row=async(id,option='LEADER-AL20-3.4')=>(await draft()).selection_assessments[option].criteria[id];
  await open('IN.1','IN.1.2');
  assert.match(await region('IN.1.1').innerText(),/does not designate|no.*sector/i);assert.equal(await region('IN.1.1').getByRole('checkbox').count(),0);
  assert.equal(await region('IN.1.2').getByRole('checkbox').count(),5);assert.equal(await region('IN.1.3').getByRole('checkbox').count(),12);
  for(const id of ['IN-T1','IN-T3'])await region('IN.1.2').locator(`[data-edl-item="${id}"] input`).check();
  await editor.getByLabel('Assessment notes (optional)',{exact:true}).fill('Explain the proposed senior cohousing connection.');
  await poll(async()=>{const saved=await draft();return saved!==null&&Object.hasOwn(saved.selection_assessments['LEADER-AL20-3.4'].criteria['IN.1'],'edl_evidence');});
  assert.equal((await row('IN.1')).answers['IN.1.2'],null);assert.match(await graph.locator('.funding-annex-total').innerText(),/Partial subtotal: 0 points/);
  await editor.locator('[id="al20-IN.1.2"]').selectOption('yes');await settled();
  await poll(async()=>/Partial subtotal: 2.49 points/.test(await graph.locator('.funding-annex-total').innerText()));
  const opener=region('IN.1.2').getByRole('button',{name:'Explore EDL for IN.1.2',exact:true});await opener.click();
  const explorer=page.locator('dialog.funding-edl-explorer');await explorer.waitFor();
  const search=explorer.getByRole('searchbox',{name:'Search EDL content',exact:true});assert(await search.evaluate(n=>document.activeElement===n));
  await search.fill('sénior');assert.equal(await explorer.locator('[data-edl-item]').count(),1);await explorer.locator('[data-edl-item="IN-T3"]').waitFor();
  const cited=explorer.locator('[data-edl-item="IN-T3"]').getByRole('link',{name:'EDL §4.4 · page 398',exact:true});
  await cited.click();await page.locator('dialog.document-viewer').waitFor();await poll(async()=>!await page.getByLabel('PDF page',{exact:true}).isDisabled());assert.equal(await page.getByLabel('PDF page',{exact:true}).inputValue(),'398');
  await page.keyboard.press('Escape');assert(await cited.evaluate(n=>document.activeElement===n));assert(await explorer.isVisible());
  await explorer.getByLabel('EDL content scope',{exact:true}).selectOption('all');await search.fill('NPL17');await explorer.locator('[data-edl-item="NPL17"]').first().waitFor();
  await search.fill('no-match-xyz');await explorer.getByText(/No strategy content matches/).waitFor();
  await page.keyboard.press('Escape');await explorer.waitFor({state:'detached'});assert(await editor.isVisible());assert(await opener.evaluate(n=>document.activeElement===n));
  await close();
  await open('IG.8','IG.8.2');const women=region('IG.8.2');assert.match(await women.innerText(),/Active leisure and cultural activities for women/);await women.locator('[data-edl-item="W2"] input').check();await close();
  await open('IG.11','IG.11.7');assert.match(await region('IG.11.7').innerText(),/association|vocational/i);await close();
  await open('DRI.3','DRI.3.3');assert.match(await region('DRI.3.3').innerText(),/exclusion/);await close();
  await route.selectOption('LEADER-AL20-2.6');await settled();assert(!Object.hasOwn(await row('IN.1','LEADER-AL20-2.6'),'edl_evidence'));await route.selectOption('LEADER-AL20-3.4');await settled();
  await poll(async()=>{const value=await row('IG.8');return Object.hasOwn(value,'edl_evidence')&&value.edl_evidence.selections['IG.8.2'].includes('W2');});
  const saved=await row('IN.1');
  // A failed library fetch is visible and retryable; saved answers stay intact.
  let fail=true;await page.route('**/api/funding/edl',r=>fail?(fail=false,r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'EDL fixture unavailable'})})):r.continue());
  await page.reload();await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();await settled();await page.getByRole('button',{name:'2. People and land',exact:true}).click();await selectProgramme(page,'LEADER-AL20');await graph.locator('.funding-graph-option[data-option-id="LEADER-AL20-3.4"]').getByRole('radio',{name:'Work on LEADER-AL20-3.4',exact:true}).check();await graph.locator('.funding-circumstance[data-question-id="selection_score"]').click();await route.selectOption('LEADER-AL20-3.4');await open('IN.1','IN.1.2');
  await editor.getByRole('alert').filter({hasText:'EDL fixture unavailable'}).first().waitFor();assert.deepEqual(await row('IN.1'),saved);
  await editor.getByRole('button',{name:'Retry EDL content',exact:true}).first().click();await region('IN.1.2').waitFor();
  assert(await region('IN.1.2').locator('[data-edl-item="IN-T3"] input').isChecked());assert.equal(await editor.getByLabel('Assessment notes (optional)',{exact:true}).inputValue(),saved.notes);
  for(const theme of ['light','dark']){
   await page.getByLabel('Theme',{exact:true}).selectOption(theme);await page.setViewportSize({width:390,height:844});
   await region('IN.1.2').getByRole('button',{name:'Explore EDL for IN.1.2',exact:true}).click();await explorer.waitFor();
   const box=await explorer.boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=390&&box.y+box.height<=844);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:`test-artifacts/funding-edl-${theme}-phone.png`});await page.keyboard.press('Escape');assert(await editor.isVisible());
  }
  await close();await page.setViewportSize({width:1500,height:1000});await page.getByRole('button',{name:'Explore AL20 EDL',exact:true}).click();await explorer.waitFor();assert.equal(await explorer.locator('[data-edl-item]').evaluateAll(nodes=>new Set(nodes.map(n=>n.dataset.edlItem)).size),109);await page.screenshot({path:'test-artifacts/funding-edl-desktop.png'});await page.keyboard.press('Escape');
  const after=await api('project');assert.equal(JSON.stringify(after.project),before);assert.equal(JSON.stringify(after.planning.draft),planning);assert.deepEqual(errors,[]);
  console.log('EDL inline content, 5 themes/12 aspects/no invented sectors, references without points, explicit score, route isolation, autosave/reload, explorer/search, PDF/focus, retry and phone themes passed.');
 }catch(e){if(page)await page.screenshot({path:'test-artifacts/funding-edl-failure.png'});throw e;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,3000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
