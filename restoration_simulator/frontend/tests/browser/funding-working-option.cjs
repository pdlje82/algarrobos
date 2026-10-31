const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port!=='8000','Use isolated test servers');
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(check){for(let i=0;i<250;i++){if(await check())return;await new Promise(r=>setTimeout(r,40));}throw Error('Working funding option timed out');}
(async()=>{
 let p=await api('project');p=await api('project/new',{revision:p.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Working option fixture'});
 const projectBefore=JSON.stringify(p.project),planningBefore=JSON.stringify(p.planning.draft);
 const browser=await chromium.launch({channel:'msedge',headless:true});let page;
 try{
  const context=await browser.newContext({viewport:{width:1500,height:1000},hasTouch:true,reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(12000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();
  const visual=page.getByLabel('Live funding consequences',{exact:true}),summary=visual.getByLabel('Working funding option',{exact:true});
  const settled=()=>poll(async()=>!/Updating/.test(await visual.locator('.funding-visual-status').innerText()));
  await page.getByRole('button',{name:'Choose activity',exact:true}).click();await page.locator('#funding-activity').selectOption('business');await settled();
  await page.getByRole('button',{name:'2. People and land',exact:true}).click();
  const applicant=visual.locator('.funding-circumstance[data-question-id="applicant_choice"]');await applicant.click();await page.locator('#funding-applicant_choice').selectOption('planned:company');await settled();await page.getByRole('button',{name:'Close question editor',exact:true}).click();
  await page.getByText('Exploration draft saved.',{exact:true}).waitFor();
  const savedBefore=JSON.stringify((await api('funding')).attachment);
  const startup=visual.locator('.funding-graph-option[data-option-id="LEADER-AL20-2.7"]'),services=visual.locator('.funding-graph-option[data-option-id="LEADER-AL20-1.11"]');
  const work=(node,id)=>node.getByRole('radio',{name:`Work on ${id}`,exact:true});
  const colours=()=>visual.locator('.funding-circumstance').evaluateAll(nodes=>nodes.map(n=>[n.dataset.questionId,n.dataset.conditionStatus,n.style.top]));
  assert.equal(await applicant.getAttribute('data-condition-status'),'mixed');
  await startup.locator('.funding-option-open').click();assert.equal(await work(startup,'LEADER-AL20-2.7').isChecked(),false);assert.equal(await applicant.getAttribute('data-condition-status'),'mixed');
  await startup.locator('.funding-working-control>span').click();assert.equal(await work(startup,'LEADER-AL20-2.7').isChecked(),false,'Only the input can check the working control');
  const graphTop=(await visual.locator('.funding-diagram-scroll').boundingBox()).y;
  await work(startup,'LEADER-AL20-2.7').check();assert.equal(await applicant.getAttribute('data-condition-status'),'fail');assert(Math.abs((await visual.locator('.funding-diagram-scroll').boundingBox()).y-graphTop)<2,'Choosing a working option keeps the graph in place');
  const basis=await colours();await services.locator('.funding-option-open').click();assert.deepEqual(await colours(),basis,'Reading another option must not recolour or rearrange nodes');
  assert.equal(await work(startup,'LEADER-AL20-2.7').isChecked(),true);assert.equal(await work(services,'LEADER-AL20-1.11').isChecked(),false);
  assert(await visual.locator('.funding-connection-active').evaluateAll(nodes=>nodes.every(n=>n.dataset.connectionOption==='LEADER-AL20-2.7')));
  await work(services,'LEADER-AL20-1.11').check();assert.equal(await applicant.getAttribute('data-condition-status'),'pass');
  const family=visual.getByLabel('Funding family',{exact:true}),originalFamily=await family.inputValue();await family.selectOption({index:4});assert.equal(await applicant.getAttribute('data-condition-status'),'pass','Working colours survive family filters');assert.match(await summary.innerText(),/outside the displayed/);
  await summary.getByRole('button',{name:'View working option',exact:true}).click();assert.notEqual(await family.inputValue(),originalFamily,'Reading details does not switch the browsing family');
  await family.selectOption(originalFamily);await startup.locator('.funding-option-open').click();
  const source=visual.getByRole('link',{name:'Official requirements · PDF page 112',exact:true}).first();await source.click();await page.locator('dialog.document-viewer').waitFor();await poll(async()=>!await page.getByLabel('PDF page',{exact:true}).isDisabled());await page.keyboard.press('Escape');assert.equal(await applicant.getAttribute('data-condition-status'),'pass');assert(await source.evaluate(n=>n===document.activeElement));
  assert.equal(JSON.stringify((await api('funding')).attachment),savedBefore,'Working and inspection controls must not save/adopt funding records');
  await visual.getByRole('button',{name:'Matrix',exact:true}).click();
  const row=visual.locator('tr[data-option-id="LEADER-AL20-2.7"]'),serviceRow=visual.locator('tr[data-option-id="LEADER-AL20-1.11"]');assert.equal(await work(serviceRow,'LEADER-AL20-1.11').isChecked(),true);
  await work(row,'LEADER-AL20-2.7').focus();await page.keyboard.press('Space');assert.equal(await work(row,'LEADER-AL20-2.7').isChecked(),true);assert.equal(await work(serviceRow,'LEADER-AL20-1.11').isChecked(),false);
  const detail=visual.locator('.funding-inspection'),shortlist=detail.getByRole('checkbox',{name:'Shortlist LEADER-AL20-2.7',exact:true});
  assert.equal(await shortlist.isChecked(),false);await detail.locator('.funding-option .funding-pick strong').click();assert.equal(await shortlist.isChecked(),false,'Clicking the title does not shortlist');
  await shortlist.check();assert.equal(await shortlist.isChecked(),true);assert.equal(await work(row,'LEADER-AL20-2.7').isChecked(),true);
  await visual.getByRole('button',{name:'Graph',exact:true}).click();assert.equal(await applicant.getAttribute('data-condition-status'),'fail');
  await visual.getByRole('button',{name:'Next options',exact:true}).click();assert.match(await summary.innerText(),/LEADER-AL20-2.7/);assert.equal(await applicant.getAttribute('data-condition-status'),'fail');await visual.getByRole('button',{name:'Previous options',exact:true}).click();
  for(const theme of ['light','dark'])for(const width of [390,320]){
   await page.getByLabel('Theme',{exact:true}).selectOption(theme);await page.setViewportSize({width,height:900});
   const expand=visual.getByRole('button',{name:'Expand funding visual workspace',exact:true});if(await expand.isVisible())await expand.click();
   await services.locator('.funding-option-open').tap();assert.equal(await work(startup,'LEADER-AL20-2.7').isChecked(),true);
   await work(services,'LEADER-AL20-1.11').tap();assert.equal(await applicant.getAttribute('data-condition-status'),'pass');
   await page.screenshot({path:`test-artifacts/funding-working-${theme}-${width}.png`});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await work(startup,'LEADER-AL20-2.7').tap();assert.equal(await applicant.getAttribute('data-condition-status'),'fail');
  }
  await page.setViewportSize({width:1500,height:1000});await visual.getByRole('button',{name:'Clear working option',exact:true}).click();assert.equal(await applicant.getAttribute('data-condition-status'),'mixed');
  await work(services,'LEADER-AL20-1.11').check();
  await page.getByText('Saved explorations, context and funding projects',{exact:true}).click();const save=page.getByRole('button',{name:'Save exploration',exact:true});await poll(async()=>!await save.isDisabled());await save.click();await page.getByRole('button',{name:'Load / rename',exact:true}).click();
  await page.getByRole('button',{name:'2. People and land',exact:true}).click();await settled();assert.match(await summary.innerText(),/Choose the circle/);
  const after=await api('project');assert.equal(JSON.stringify(after.project),projectBefore);assert.equal(JSON.stringify(after.planning.draft),planningBefore);assert.deepEqual((await api('funding')).attachment.plans,[]);assert.deepEqual(errors,[]);
  console.log('Working option: direct radio/checkbox clicks, independent inspection/shortlist, colours/connections, filters/paging, Graph/Matrix, keyboard/touch, PDF focus, context reset and no simulation/adoption effects passed.');
 }catch(e){if(page)await page.screenshot({path:'test-artifacts/funding-working-failure.png'});throw e;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,3000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
