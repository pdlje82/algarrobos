const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port!=='8000','Use an isolated backend');
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<300;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('AL20 browser state timed out');}
(async()=>{
 let project=await api('project');project=await api('project/new',{revision:project.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'AL20 annex fixture'});
 const before=JSON.stringify(project.project),planning=JSON.stringify(project.planning.draft);
 const browser=await chromium.launch({channel:'msedge',headless:true});let page;
 try{
  page=await browser.newPage({viewport:{width:1500,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
  await page.goto(url);await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();
  const visual=page.getByLabel('Live funding consequences',{exact:true}),graph=visual.locator('.funding-diagram-scroll');
  const settled=()=>poll(async()=>!/Updating/.test(await visual.locator('.funding-visual-status').innerText()));await settled();
  await page.getByRole('button',{name:'Choose activity',exact:true}).click();await page.locator('#funding-activity').selectOption('business');await settled();
  await page.getByRole('button',{name:'2. People and land',exact:true}).click();
  const parent=graph.locator('.funding-circumstance[data-question-id="selection_score"]');await parent.click();
  assert.equal(await page.locator('#funding-selection_score').count(),0);
  const route=page.getByLabel('AL20 assessment route',{exact:true});await route.selectOption('LEADER-AL20-3.4');await settled();
  assert.equal(await graph.locator('.funding-annex-group').count(),14);assert.equal(await graph.locator('.funding-annex-choice').count(),0);
  const options=()=>graph.locator('.funding-graph-option').evaluateAll(ns=>ns.map(n=>[n.dataset.optionId,n.style.top]));
  const optionPositions=await options();
  const group=id=>graph.locator(`.funding-annex-group[data-annex-criterion="${id}"]`);
  const editor=page.getByRole('dialog',{name:'Edit AL20 criterion',exact:true});
  async function openCriterion(id){if(await group(id).getAttribute('aria-expanded')!=='true')await group(id).click();await graph.locator(`.funding-annex-choice[data-annex-criterion="${id}"]`).first().click();await editor.waitFor();}
  async function close(){await page.getByRole('button',{name:'Close question editor',exact:true}).click();await settled();}
  await openCriterion('AT.3');
  await editor.getByText(/The published 2025 table lists a median of 539 inhabitants/).waitFor();
  assert.match(await editor.innerText(),/Do not mix a 2023 settlement figure with the 2025 median/);
  assert.equal(await editor.getByRole('link',{name:'https://www.ine.es/nomen2/index.do?L=1',exact:true}).getAttribute('href'),'https://www.ine.es/nomen2/index.do?L=1');
  const medianSource=editor.getByRole('link',{name:'FUND-010 · AL20 median (2025) · PDF page 113',exact:true});
  await medianSource.click();await page.locator('dialog.document-viewer').waitFor();await poll(async()=>!await page.getByLabel('PDF page',{exact:true}).isDisabled());assert.equal(await page.getByLabel('PDF page',{exact:true}).inputValue(),'113');
  await page.keyboard.press('Escape');assert(await medianSource.evaluate(n=>document.activeElement===n));
  await editor.locator('[id="al20-AT.3.1"]').check();
  await editor.getByLabel('Supporting reference (optional)',{exact:true}).fill('Assumed settlement population comparison');
  await settled();await poll(async()=>/Partial subtotal: 10 points/.test(await graph.locator('.funding-annex-total').innerText()));
  await editor.locator('.funding-selection-choice').first().getByText('Spanish wording and sources',{exact:true}).click();
  const source=editor.locator('.funding-selection-choice').first().getByRole('link',{name:'FUND-004 · PDF page 16',exact:true});await source.click();
  await page.locator('dialog.document-viewer').waitFor();await poll(async()=>!await page.getByLabel('PDF page',{exact:true}).isDisabled());assert.equal(await page.getByLabel('PDF page',{exact:true}).inputValue(),'16');
  await page.keyboard.press('Escape');assert(await source.evaluate(n=>document.activeElement===n));await close();
  await group('AT.3').click();assert.equal(await graph.locator('.funding-annex-choice[data-annex-criterion="AT.3"]').count(),0);
  // Complete the whole nonproductive annex through its nodes, explicitly rejecting unclaimed rows.
  const ids=await graph.locator('.funding-annex-group').evaluateAll(ns=>ns.map(n=>n.dataset.annexCriterion));
  for(const id of ids){await openCriterion(id);
   if(id==='CO.1'){
    assert.equal(await editor.getByRole('link',{name:'https://alpujarraalmeria.es/edll-version-1/',exact:true}).getAttribute('href'),'https://alpujarraalmeria.es/edll-version-1/');
    const priorities='https://alpujarraalmeria.es/wp-content/uploads/2026/06/Necesidades-priorizadas-ALPUJARRA_SN_ALMERIENSE_EDLL_Epig_4-2.pdf';
    assert.equal(await editor.getByRole('link',{name:priorities,exact:true}).getAttribute('href'),priorities);
    assert.match(await editor.innerText(),/they are not the CO.1 grant-selection points/);
   }
   await editor.getByRole('button',{name:'None of these applies',exact:true}).click();await close();}
  await poll(async()=>/Calculated score: 0 points/.test(await graph.locator('.funding-annex-total').innerText()));
  const positives={'AT.3':['AT.3.1'],'CO.1':['CO.1.3'],'RD.5':['RD.5.1'],'CC.2':['CC.2.1'],'PT.1':['PT.1.1'],'IN.1':['IN.1.1','IN.1.2','IN.1.3']};
  for(const [id,choices] of Object.entries(positives)){
   await openCriterion(id);
   for(const choice of choices){const input=editor.locator(`[id="al20-${choice}"]`);if(await input.getAttribute('type')==='radio')await input.check();else await input.selectOption('yes');}
   await close();
  }
  await poll(async()=>/Calculated score: 63 points/.test(await graph.locator('.funding-annex-total').innerText()));assert.deepEqual(await options(),optionPositions);
  await page.screenshot({path:'test-artifacts/funding-selection-desktop.png'});
  for(const short of ['1.11','2.6','2.7','3.5']){
   await route.selectOption('LEADER-AL20-'+short);assert.match(await graph.locator('.funding-annex-total').innerText(),/Partial subtotal: 0 points/);
   await openCriterion('AT.3');await editor.locator('[id="al20-AT.3.2"]').check();await close();
   await poll(async()=>/Partial subtotal: 8 points/.test(await graph.locator('.funding-annex-total').innerText()));
  }
  await route.selectOption('LEADER-AL20-3.4');assert.match(await graph.locator('.funding-annex-total').innerText(),/Calculated score: 63 points/);
  // Failed autosave keeps the draft and retries the same mutation explicitly.
  let fail=true;await page.route('**/api/funding/save',r=>fail?(fail=false,r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Annex test save unavailable'})})):r.continue());
  await openCriterion('AT.3');await editor.getByLabel('Assessment notes (optional)',{exact:true}).fill('Keep this note across failed save and restart');
  await page.getByText(/Annex test save unavailable/).waitFor();assert.equal(await editor.getByLabel('Assessment notes (optional)',{exact:true}).inputValue(),'Keep this note across failed save and restart');
  await page.getByRole('button',{name:'Retry failed save',exact:true}).click();await poll(async()=>!(await page.getByRole('button',{name:'Retry failed save',exact:true}).count()));await close();
  await visual.getByRole('button',{name:'Matrix',exact:true}).click();const summary=visual.locator('.funding-selection-matrix-summary');assert.match(await summary.innerText(),/Calculated score: 63 points/);
  await summary.locator('p').filter({hasText:'LEADER-AL20-3.5'}).getByRole('button',{name:'Open in graph',exact:true}).click();assert.equal(await route.inputValue(),'LEADER-AL20-3.5');
  await route.selectOption('LEADER-AL20-3.4');
  for(const theme of ['light','dark']){
   await page.getByLabel('Theme',{exact:true}).selectOption(theme);await page.setViewportSize({width:390,height:844});await openCriterion('AT.3');
   const box=await editor.boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=390&&box.y+box.height<=844);
   await page.screenshot({path:`test-artifacts/funding-selection-${theme}-phone.png`});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await close();
  }
  await page.setViewportSize({width:1500,height:1000});await poll(async()=>(await api('funding')).attachment.draft.selection_assessments['LEADER-AL20-3.4'].criteria['AT.3'].notes.includes('Keep this note'));
  const saved=(await api('funding')).attachment.draft.selection_assessments;
  await page.reload();await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();await settled();await page.getByRole('button',{name:'2. People and land',exact:true}).click();await parent.click();await route.selectOption('LEADER-AL20-3.4');
  assert.match(await graph.locator('.funding-annex-total').innerText(),/Calculated score: 63 points/);assert.deepEqual((await api('funding')).attachment.draft.selection_assessments,saved);
  await page.getByRole('button',{name:'6. Review and use',exact:true}).click();
  const reviewRow=page.locator('.funding-main .funding-check').filter({hasText:'AL20 selection assessment · LEADER-AL20-3.4'});
  await reviewRow.getByText(/Calculated score: 63 points/).waitFor();
  await reviewRow.getByRole('button',{name:'Review in Funding Navigator',exact:true}).click();
  assert.equal(await route.inputValue(),'LEADER-AL20-3.4');
  const after=await api('project');assert.equal(JSON.stringify(after.project),before);assert.equal(JSON.stringify(after.planning.draft),planning);assert.deepEqual(errors,[]);
  console.log('AL20 branch: complete 63-point assessment, all five routes, route isolation, sources/focus, stable funding nodes, explicit zero, matrix navigation, save failure/retry, reload, and phone themes passed.');
 }catch(e){console.error(e);if(page)await page.screenshot({path:'test-artifacts/funding-selection-failure.png'});throw e;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,3000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
