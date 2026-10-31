const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port!=='8000','Use isolated test servers');
async function api(p,body){const r=await fetch(root+p,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<250;i++){if(await fn())return;await new Promise(r=>setTimeout(r,40));}throw Error('Merged applicant browser state timed out');}
(async()=>{
 let p=await api('project');p=await api('project/new',{revision:p.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Merged applicant fixture'});
 const land=await api('land/form',{revision:p.revision,route_id:'existing',parcel_id:'new'});
 const inputs=Object.fromEntries(land.fields.map(f=>[f.name,f.default]));Object.assign(inputs,{route_id:'existing',parcel_id:'new',parcel_area:4500,covered_area:4500});
 p=await api('commit',{revision:p.revision,request_id:crypto.randomUUID(),action_id:'establish_access',inputs});
 const physical=new Set(['parcel_id','restoration_area','vegetation_system','objective','water_plan','planting_method','plant_selection']);
 await api('demonstrator/draft',{revision:p.revision,planning_revision:p.planning.planning_revision,request_id:crypto.randomUUID(),administration:Object.fromEntries(Object.entries(p.planning.draft.inputs).filter(([k])=>!physical.has(k)))});
 p=await api('project');const before=JSON.stringify(p.project),planningBefore=JSON.stringify(p.planning.draft);
 const d=await api('funding/context',{revision:p.revision,planning_revision:p.planning.planning_revision,design_revision:p.designer_revision,target:'demonstrator',parcel_ids:[p.project.parcels[0].id]});
 d.version=2;delete d.applicant_choice;d.name='Legacy split applicant';d.overrides={applicant_id:'individual',applicant_kind:'nonprofit'};
 const w=await api('funding');const saved=await api('funding/save',{revision:p.revision,funding_revision:w.funding_revision,planning_revision:p.planning.planning_revision,design_revision:p.designer_revision,request_id:crypto.randomUUID(),operation:'save',draft:d,record_id:null});
 const oldAssessment=JSON.stringify(saved.attachment.scenarios[0].assessment);
 const browser=await chromium.launch({channel:'msedge',headless:true,timeout:20000});
 try{
  const context=await browser.newContext({viewport:{width:1500,height:1000},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();
  const visual=page.getByLabel('Live funding consequences',{exact:true}),review=page.getByLabel('Legacy applicant review',{exact:true});
  const settled=()=>poll(async()=>!/Updating/.test(await visual.locator('.funding-visual-status').innerText()));
  await review.getByRole('heading',{name:'Previous assessment—applicant selection needs review',exact:true}).waitFor();
  await review.getByRole('button',{name:'Keep saved assessment',exact:true}).click();assert.equal((await api('funding')).attachment.draft.version,2);
  await review.getByRole('button',{name:'Review applicant choice',exact:true}).click();await review.locator('#funding-applicant_choice').selectOption('recorded:individual');await settled();
  await page.getByRole('button',{name:'2. People and land',exact:true}).click();
  const applicant=page.locator('#funding-applicant_choice');await applicant.waitFor();assert.equal(await page.locator('#funding-applicant_kind').count(),0);assert.equal(await page.locator('#funding-applicant_id').count(),0);
  assert.equal(await visual.getByRole('button',{name:'Matrix',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await page.getByText('What changed',{exact:true}).count(),0);
  const row=visual.locator('tr[data-option-id="LEADER-AL20-3.4"]');await row.getByText('Conflicts with current scenario',{exact:true}).waitFor();
  const evaluation=page.waitForResponse(r=>r.url().endsWith('/funding/visualise')&&r.request().method()==='POST'&&r.request().postDataJSON().draft.applicant_choice?.party_id==='partner');
  await applicant.selectOption('recorded:partner');await evaluation;await settled();await row.getByText('Needs your answers',{exact:true}).waitFor();assert(await row.locator('.funding-cell-changed').count()>0);
  await applicant.selectOption('planned:nonprofit');await settled();await applicant.selectOption('potential:nonprofit');await settled();
  await row.getByText('Input affected · result unchanged',{exact:true}).waitFor();
  const effectHelp=row.getByRole('button',{name:'About answer effect on LEADER-AL20-3.4',exact:true});await effectHelp.hover();await page.getByRole('tooltip').getByText(/Fit remains Needs your answers/).waitFor();await page.keyboard.press('Escape');
  await row.getByRole('button',{name:'Inspect effects for LEADER-AL20-3.4',exact:true}).click();await visual.getByLabel('Answer effects for LEADER-AL20-3.4',{exact:true}).getByText(/Input affected.*result unchanged/).waitFor();
  const source=visual.getByRole('link',{name:/Official requirements? · PDF page 120/}).first();await source.click();await page.getByRole('dialog').waitFor();await poll(async()=>!await page.getByLabel('PDF page',{exact:true}).isDisabled());assert.equal(await page.getByLabel('PDF page',{exact:true}).inputValue(),'120');await page.keyboard.press('Escape');assert(await source.evaluate(n=>n===document.activeElement));
  await page.keyboard.press('Escape');await visual.getByLabel('Answer effects for LEADER-AL20-3.4',{exact:true}).waitFor({state:'detached'});assert.equal(await row.getByRole('button',{name:/^LEADER-AL20-3.4/}).evaluate(n=>n===document.activeElement),true);
  await row.getByRole('button',{name:'Inspect effects for LEADER-AL20-3.4',exact:true}).click();await page.locator('.funding-question label').first().click();await visual.getByLabel('Answer effects for LEADER-AL20-3.4',{exact:true}).waitFor();
  await applicant.selectOption('potential:');await page.locator('#funding-applicant-other-form').selectOption('public_company');await settled();
  await applicant.selectOption('recorded:individual');await settled();assert.equal(await page.locator('#funding-applicant-other-form').count(),0);
  await page.locator('.funding-answers>summary').click();const appAnswer=page.locator('.funding-answer-row[data-question-id="applicant_choice"]');
  await appAnswer.locator('.funding-answer-reset>summary').click();await appAnswer.getByRole('button',{name:'Set to Unknown',exact:true}).click();await settled();assert.equal(await applicant.inputValue(),'unknown');
  await page.locator('.funding-answers').getByText(/^Unknown questions/).click();await appAnswer.locator('.funding-answer-reset>summary').click();await appAnswer.getByRole('button',{name:/^Restore initial:/}).click();await settled();assert.equal(await applicant.inputValue(),'recorded:individual');
  const municipality=page.locator('.funding-answer-row[data-question-id="municipality"]');await municipality.getByRole('button',{name:'Edit',exact:true}).click();await page.locator('#funding-municipality').selectOption('Alhama de Almería');await settled();
  assert.equal(await page.locator(':focus').getAttribute('id'),'funding-municipality');await municipality.locator('.funding-answer-reset>summary').click();await municipality.getByRole('button',{name:'Set to Unknown',exact:true}).click();await settled();assert.equal(await page.locator('#funding-municipality').inputValue(),'__unknown__');
  await municipality.locator('.funding-answer-reset>summary').click();await municipality.getByRole('button',{name:/^Restore initial:/}).click();await settled();assert.equal(await page.locator('#funding-municipality').inputValue(),'__other__');
  const activity=page.locator('.funding-answer-row[data-question-id="activity"]');await activity.getByRole('button',{name:'Edit',exact:true}).click();await page.locator('#funding-activity').selectOption('business');await settled();
  const income=page.locator('.funding-answer-row[data-question-id="net_year1"]');await income.getByRole('button',{name:'Edit',exact:true}).click();await page.locator('#funding-net_year1').fill('10000');await settled();
  await activity.getByRole('button',{name:'Edit',exact:true}).click();await page.locator('#funding-activity').selectOption('demonstration');await settled();await page.locator('.funding-answers').getByText(/^Other activity answers/).click();await income.getByText('10000',{exact:true}).waitFor();
  await income.getByRole('button',{name:'Edit',exact:true}).click();await page.getByText('Retained answer—outside the current activity’s question flow',{exact:true}).waitFor();assert.equal(await page.locator('#funding-net_year1').inputValue(),'10000');
  await page.getByRole('button',{name:'Return to current questions',exact:true}).click();await applicant.selectOption('recorded:partner');await settled();
  await page.locator('.funding-answers>summary').click();await visual.getByRole('button',{name:'Clear inspection',exact:true}).click();
  const compactIds=await visual.locator('.funding-matrix tr[data-option-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.optionId));assert.equal(compactIds.length,12);
  await visual.getByRole('button',{name:'Expand view',exact:true}).click();const fullCount=await visual.locator('.funding-matrix tr[data-option-id]').count();assert(fullCount>12);
  await visual.getByRole('button',{name:'Graph',exact:true}).click();assert.equal(await visual.locator('.funding-graph-option').count(),fullCount);assert.equal(await visual.locator('.funding-circumstance').filter({hasText:'Applicant legal / economic form'}).count(),0);
  await visual.getByRole('button',{name:'Compact view',exact:true}).click();await visual.getByRole('button',{name:'Matrix',exact:true}).click();assert.deepEqual(await visual.locator('.funding-matrix tr[data-option-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.optionId)),compactIds);
  await page.locator('.funding-layout').evaluate(n=>n.scrollIntoView({block:'start'}));await page.screenshot({path:'test-artifacts/funding-simplified-desktop.png'});
  for(const theme of ['light','dark']){
   await page.getByLabel('Theme',{exact:true}).selectOption(theme);await page.setViewportSize({width:390,height:844});
   const help=visual.getByRole('button',{name:'About need your answers',exact:true});await help.scrollIntoViewIfNeeded();const b=await help.boundingBox();await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);await page.getByRole('tooltip').waitFor();const tip=await page.getByRole('tooltip').boundingBox();assert(tip.x>=0&&tip.x+tip.width<=391);await page.keyboard.press('Escape');
   await visual.getByRole('button',{name:'Expand funding visual workspace',exact:true}).click();await visual.getByRole('button',{name:'Matrix',exact:true}).focus();await page.keyboard.press('Enter');await page.screenshot({path:`test-artifacts/funding-simplified-${theme}-phone.png`});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await visual.getByRole('button',{name:'Collapse funding visual workspace',exact:true}).click();
  }
  await page.getByText('Saved explorations, context and funding projects',{exact:true}).click();await page.getByRole('button',{name:'Save draft',exact:true}).click();await poll(async()=>(await api('funding')).attachment.draft.version===3);
  const current=(await api('funding')).attachment.draft;assert.equal(current.applicant_choice.party_id,'partner');assert(!Object.hasOwn(current.overrides,'applicant_kind'));assert.equal(JSON.stringify((await api('funding')).attachment.scenarios[0].assessment),oldAssessment);
  await page.reload();await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();await page.getByRole('button',{name:'2. People and land',exact:true}).click();await settled();assert.equal(await applicant.inputValue(),'recorded:partner');
  await page.getByRole('button',{name:'Project',exact:true}).click();await page.getByRole('button',{name:'Open demonstrator planning',exact:true}).click();const editor=page.locator('.demo-editor');assert.equal(await editor.getByRole('button',{name:'Funding route',exact:true}).count(),0);assert.equal(await editor.getByRole('button',{name:'Explore funding',exact:true}).count(),1);await editor.getByRole('button',{name:'Explore funding',exact:true}).click();await page.getByRole('heading',{name:'Funding Navigator',exact:true}).waitFor();
  const after=await api('project');assert.equal(JSON.stringify(after.project),before);assert.equal(JSON.stringify(after.planning.draft),planningBefore);assert.equal((await api('export')).format_version,8);assert.deepEqual(errors,[]);await context.close();
  console.log('Merged funding browser: legacy review, atomic applicants, direct overview/reset, retained answers, matrix effects, PDF, graph/expanded views, phones and unchanged project passed.');
 }finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,5000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
