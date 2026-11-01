const {selectProgramme}=require('./funding-programme-helper.cjs');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port==='8013','Use the documented isolated backend on 8013');
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<300;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Programme browser state timed out');}
(async()=>{
 let project=await api('project');project=await api('project/new',{revision:project.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Programme graph fixture'});
 const before=JSON.stringify(project.project),planning=JSON.stringify(project.planning.draft);
 const browser=await chromium.launch({channel:'msedge',headless:true});let page;
 try{
  page=await browser.newPage({viewport:{width:1500,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
  await page.goto(url);await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();
  const visual=page.getByLabel('Live funding consequences',{exact:true}),graph=visual.locator('.funding-diagram-scroll');
  const picker=visual.getByRole('searchbox',{name:'Find a programme or approach',exact:true});await picker.waitFor();
  const settled=()=>poll(async()=>!/Updating/.test(await visual.locator('.funding-visual-status').innerText()));await settled();
  const nodes=()=>graph.locator('.funding-circumstance').evaluateAll(ns=>ns.map(n=>n.dataset.questionId));
  const card=id=>graph.locator(`.funding-graph-option[data-option-id="${id}"]`),work=id=>card(id).getByRole('radio',{name:`Work on ${id}`,exact:true});
  const editor=page.getByRole('dialog',{name:'Edit funding answer',exact:true});
  const close=async()=>{await page.getByRole('button',{name:'Close question editor',exact:true}).click();await settled();};
  assert.equal(await graph.locator('[data-programme-family]').count(),6);assert.deepEqual(await nodes(),[]);
  await page.getByRole('button',{name:'Choose activity',exact:true}).click();await page.locator('#funding-activity').selectOption('business');await settled();await close();
  await page.getByRole('button',{name:'2. People and land',exact:true}).click();await selectProgramme(page,'LEADER-AL20');
  assert.equal(await graph.locator('.funding-graph-option').count(),12);assert.deepEqual(await nodes(),[]);
  const intro=visual.getByRole('region',{name:'Programme overview: LEADER AL20',exact:true});assert.match(await graph.locator('[data-programme-id="LEADER-AL20"]').innerText(),/5 with modelled fit checks/);
  await work('LEADER-AL20-2.6').check();assert.equal((await nodes()).length,6);assert.equal(await graph.locator('.funding-graph-option').count(),1);
  assert.match(await graph.locator('.funding-graph-origin').innerText(),/LEADER AL20.*LEADER-AL20-2.6/s);
  const notStarted=graph.locator('[data-question-id="not_started"]');await notStarted.click();const initialTop=await notStarted.evaluate(n=>n.style.top);
  await page.locator('#funding-not_started').selectOption('yes');await settled();assert.equal(await notStarted.getAttribute('data-condition-status'),'pass');assert.equal(await notStarted.evaluate(n=>n.style.top),initialTop,'Active question stays in place while editing');
  await close();assert(!(await nodes()).includes('not_started'));assert.equal((await nodes()).length,5);
  const met=graph.getByRole('button',{name:'Requirements met (1) · Show',exact:true});await met.focus();await page.keyboard.press('Enter');assert((await nodes()).includes('not_started'));const metTop=await notStarted.evaluate(n=>n.style.top);await notStarted.click();assert.equal(await notStarted.evaluate(n=>n.style.top),metTop,'Opening a met question preserves its group and position');await close();
  await graph.getByRole('button',{name:'Requirements met (1) · Hide',exact:true}).click();
  await visual.getByRole('button',{name:'Other programme routes (11)',exact:true}).click();await work('LEADER-AL20-2.7').check();
  for(const id of ['net_year1','smi_year1','net_year2','smi_year2'])assert((await nodes()).includes(id));assert.equal((await nodes()).length,18);
  await visual.getByRole('button',{name:'Compare programme routes',exact:true}).click();assert.equal((await nodes()).length,33);assert.equal(await graph.locator('.funding-graph-option').count(),12);
  await visual.getByRole('button',{name:'Route questions',exact:true}).click();assert.equal((await nodes()).length,18);assert.equal(await graph.locator('.funding-graph-option').count(),1);
  // Inspecting a different card leaves the working route alone; editing one of its requirements selects it.
  await visual.getByRole('button',{name:'Other programme routes (11)',exact:true}).click();await card('LEADER-AL20-2.6').locator('.funding-option-open').click();assert(await work('LEADER-AL20-2.7').isChecked());
  const inspection=visual.getByLabel('Requirements for LEADER-AL20-2.6',{exact:true});await inspection.getByRole('button',{name:/Application can precede binding work commitments/}).click();await editor.waitFor();assert(await work('LEADER-AL20-2.6').isChecked());assert.equal(await page.locator('#funding-not_started').inputValue(),'yes');await close();
  await graph.locator('[data-programme-id="LEADER-AL20"]').getByRole('button',{name:/^Read guide for /}).click();
  const source=intro.getByRole('link',{name:'FUND-004 - Alpujarra Sierra Nevada Almeriense - LEADER AL20 Selection Criteria - 2026',exact:true});await source.click();await page.locator('dialog.document-viewer').waitFor();await poll(async()=>!await page.getByLabel('PDF page',{exact:true}).isDisabled());assert.equal(await page.getByLabel('PDF page',{exact:true}).inputValue(),'2');await page.keyboard.press('Escape');assert(await source.evaluate(n=>document.activeElement===n));await page.getByRole('button',{name:'Close programme guide',exact:true}).click();
  await visual.getByRole('button',{name:'Other programme routes (11)',exact:true}).click();await work('LEADER-AL20-3.1').check();assert.deepEqual(await nodes(),[]);await card('LEADER-AL20-3.1').locator('.funding-option-open').click();await visual.getByRole('region',{name:'Introduction to LEADER-AL20-3.1',exact:true}).waitFor();assert.match(await graph.locator('.funding-no-connections').innerText(),/Reference guide only/);
  await selectProgramme(page,'EU-LIFE');assert.equal(await graph.locator('.funding-graph-option').count(),4);assert.deepEqual(await nodes(),[]);await work('EU-LIFE-NATURE').check();assert.deepEqual(await nodes(),[]);
  await selectProgramme(page,'NATURE-01');assert(await work('NATURE-01').isChecked());assert.deepEqual(await nodes(),[]);await card('NATURE-01').locator('.funding-option-open').click();assert.equal(await visual.locator('.funding-guide').count(),0,'Standalone guide is presented once');await visual.locator('.funding-inspection').getByRole('button',{name:'Read programme or approach guide',exact:true}).click();
  await selectProgramme(page,'SELF-FUNDS');assert.deepEqual(await nodes(),[]);assert.match(await graph.locator('.funding-no-connections').innerText(),/Amount calculations are available/);
  await visual.getByLabel('Show amount questions',{exact:true}).check();assert.deepEqual(await nodes(),['available_contribution']);await graph.locator('[data-question-id="available_contribution"]').click();await page.locator('#funding-available_contribution').fill('0');await settled();await close();
  await poll(async()=>{const d=(await api('funding')).attachment.draft;return d!==null&&d.overrides.available_contribution===0&&d.overrides.not_started==='yes';});
  assert.deepEqual(await nodes(),[]);await graph.getByRole('button',{name:'Requirements met (1) · Show',exact:true}).click();await graph.locator('[data-question-id="available_contribution"]').click();assert.equal(await page.locator('#funding-available_contribution').inputValue(),'0');await page.locator('#funding-available_contribution').fill('100');await settled();await close();await graph.getByRole('button',{name:'Requirements met (1) · Hide',exact:true}).click();assert.deepEqual(await nodes(),[]);
  await graph.getByRole('button',{name:'Requirements met (1) · Show',exact:true}).click();await graph.locator('[data-question-id="available_contribution"]').click();await page.locator('#funding-available_contribution').fill('0');await settled();await close();
  await poll(async()=>(await api('funding')).attachment.draft.overrides.available_contribution===0);
  const saved=(await api('funding')).attachment.draft;
  // Registry failures preserve saved answers and are explicit/retryable.
  let registryAttempt=0;const missingMembership=await api('funding/programmes');missingMembership.library.programmes.find(p=>p.id==='LEADER-AL20').entry_ids=missingMembership.library.programmes.find(p=>p.id==='LEADER-AL20').entry_ids.filter(id=>id!=='LEADER-AL20-2.7');
  await page.route('**/api/funding/programmes',r=>{registryAttempt++;if(registryAttempt===1)return r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Programme fixture unavailable'})});if(registryAttempt===2)return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(missingMembership)});return r.continue();});
  await page.reload();await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();await page.getByRole('alert').filter({hasText:'Programme fixture unavailable'}).waitFor();assert.deepEqual((await api('funding')).attachment.draft,saved);
  await page.getByRole('button',{name:'Retry programme list',exact:true}).click();await page.getByRole('alert').filter({hasText:'No programme membership is registered for LEADER-AL20-2.7'}).waitFor();assert.deepEqual((await api('funding')).attachment.draft,saved);
  await page.getByRole('button',{name:'Retry programme list',exact:true}).click();await picker.waitFor();assert.equal(await picker.inputValue(),'');assert.deepEqual(await nodes(),[]);
  await selectProgramme(page,'LEADER-AL20');await work('LEADER-AL20-2.6').check();await settled();assert(!(await nodes()).includes('not_started'));
  // Delayed/failed evaluations cannot replace newer answers or regroup the active editor.
  await graph.getByRole('button',{name:'Requirements met (1) · Show',exact:true}).click();await notStarted.click();
  let hold=true,failEvaluation=false,release=null;
  await page.route('**/api/funding/visualise',async r=>{
   if(failEvaluation){failEvaluation=false;return r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Programme evaluation unavailable'})});}
   if(hold){hold=false;const response=await r.fetch();await new Promise(resolve=>{release=resolve;});return r.fulfill({response});}
   return r.continue();
  });
  await page.locator('#funding-not_started').selectOption('no');await poll(async()=>release!==null);await page.locator('#funding-not_started').selectOption('yes');await settled();release();await page.waitForTimeout(150);assert.equal(await notStarted.getAttribute('data-condition-status'),'pass');assert.equal(await page.locator('#funding-not_started').inputValue(),'yes');
  failEvaluation=true;await page.locator('#funding-not_started').selectOption('no');await visual.getByText('Assessment failed—showing previous assessment',{exact:true}).waitFor();assert.equal(await page.locator('#funding-not_started').inputValue(),'no');
  await visual.getByRole('button',{name:'Retry assessment',exact:true}).click();await settled();assert.equal(await notStarted.getAttribute('data-condition-status'),'fail');await page.locator('#funding-not_started').selectOption('yes');await settled();await close();
  await graph.getByRole('button',{name:'Requirements met (1) · Hide',exact:true}).click();
  await graph.locator('[data-question-id="applicant_choice"]').click();await editor.getByRole('button',{name:'Next question',exact:true}).click();assert.equal(await page.locator('#funding-municipality').count(),1);assert.match(await editor.innerText(),/Route LEADER-AL20-2.6/);await close();
  await poll(async()=>/Saved to this computer/.test(await page.getByRole('status',{name:'Funding save status',exact:true}).locator('strong').innerText()));
  await page.getByRole('button',{name:'5. Build a funding plan',exact:true}).click();await page.getByRole('button',{name:'Edit budget assumptions',exact:true}).click();assert.equal(await page.locator('#funding-budget_total').count(),1);assert.match(await editor.innerText(),/Budget assumptions/);await close();await page.getByRole('button',{name:'2. People and land',exact:true}).click();
  // Hidden routes and global answers remain available; view changes never save/adopt anything.
  const savedBeforeViews=JSON.stringify((await api('funding')).attachment);
  for(const theme of ['light','dark']){
   await page.getByLabel('Theme',{exact:true}).selectOption(theme);await page.setViewportSize({width:390,height:844});
   const expand=visual.getByRole('button',{name:'Expand funding visual workspace',exact:true});if(await expand.isVisible())await expand.click();
   await graph.getByRole('button',{name:'Requirements met (1) · Show',exact:true}).click();await graph.locator('[data-question-id="not_started"]').click();assert.equal(await page.locator('#funding-not_started').inputValue(),'yes');await close();await graph.getByRole('button',{name:'Requirements met (1) · Hide',exact:true}).click();
   await page.screenshot({path:`test-artifacts/funding-programmes-${theme}-phone.png`});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  await page.setViewportSize({width:1500,height:1000});const divider=graph.getByRole('separator',{name:'Resize Route requirements and Funding routes columns',exact:true});await divider.focus();const prior=Number(await divider.getAttribute('aria-valuenow'));await page.keyboard.press('ArrowLeft');assert.equal(Number(await divider.getAttribute('aria-valuenow')),prior-10);
  await visual.getByRole('button',{name:'Expand node area',exact:true}).click();await poll(async()=>await graph.evaluate(n=>n.scrollHeight<=n.clientHeight+1));await visual.getByRole('button',{name:'Collapse node area',exact:true}).click();
  await page.screenshot({path:'test-artifacts/funding-programmes-desktop.png'});
  assert.equal(JSON.stringify((await api('funding')).attachment),savedBeforeViews);const after=await api('project');assert.equal(JSON.stringify(after.project),before);assert.equal(JSON.stringify(after.planning.draft),planning);assert.deepEqual(errors,[]);
  console.log('Programme graph: route-first 34→6 questions, met grouping/pinning, comparison, composite inputs, explicit other-route editing, 99 memberships, guides/sources, cash inputs, reload/retry, keyboard, resizing and phone themes passed.');
 }catch(e){if(page){await page.screenshot({path:'test-artifacts/funding-programmes-failure.png'});require('node:fs').writeFileSync('test-artifacts/funding-programmes-failure.txt',await page.locator('body').innerText());}throw e;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,3000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
