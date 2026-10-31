const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port!=='8000','Use isolated test servers');
async function api(p,body){const r=await fetch(root+p,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<250;i++){if(await fn())return;await new Promise(r=>setTimeout(r,40));}throw Error('Refinement browser state timed out');}
(async()=>{
  let p=await api('project');p=await api('project/new',{revision:p.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Funding refinements fixture'});
  const land=await api('land/form',{revision:p.revision,route_id:'existing',parcel_id:'new'});
  const inputs=Object.fromEntries(land.fields.map(f=>[f.name,f.default]));Object.assign(inputs,{route_id:'existing',parcel_id:'new',parcel_area:4500,covered_area:4500});
  p=await api('commit',{revision:p.revision,request_id:crypto.randomUUID(),action_id:'establish_access',inputs});
  const physical=new Set(['parcel_id','restoration_area','vegetation_system','objective','water_plan','planting_method','plant_selection']);
  await api('demonstrator/draft',{revision:p.revision,planning_revision:p.planning.planning_revision,request_id:crypto.randomUUID(),administration:Object.fromEntries(Object.entries(p.planning.draft.inputs).filter(([k])=>!physical.has(k)))});
  p=await api('project');const before=JSON.stringify(p.project),planningBefore=JSON.stringify(p.planning.draft);
  const d=await api('funding/context',{revision:p.revision,planning_revision:p.planning.planning_revision,design_revision:p.designer_revision,target:'demonstrator',parcel_ids:[p.project.parcels[0].id]});
  d.version=1;d.overrides.applicant_id='municipality';
  const w=await api('funding');
  const saved=await api('funding/save',{revision:p.revision,funding_revision:w.funding_revision,planning_revision:p.planning.planning_revision,design_revision:p.designer_revision,request_id:crypto.randomUUID(),operation:'save',draft:d,record_id:null});
  const oldAssessment=JSON.stringify(saved.attachment.scenarios[0].assessment);
  assert.equal(saved.attachment.scenarios[0].assessment.facts.applicant_kind,'individual');
  const browser=await chromium.launch({channel:'msedge',headless:true,timeout:20000});
  try{
    const context=await browser.newContext({viewport:{width:1500,height:1000},hasTouch:true,reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();
    await page.getByText(/Editing copy updated: inherited legal form/).waitFor();
    const visual=page.getByLabel('Live funding consequences',{exact:true});
    const settled=()=>poll(async()=>!/Updating/.test(await visual.locator('.funding-visual-status').innerText()));
    await settled();await page.getByRole('button',{name:'2. People and land',exact:true}).click();
    assert.equal(await page.locator('#funding-applicant_id').inputValue(),'municipality');
    await page.getByRole('button',{name:'Next question',exact:true}).click();
    const form=page.locator('#funding-applicant_kind');await poll(async()=>!await form.isDisabled());
    assert.equal(await form.inputValue(),'public');await page.getByText(/Inherited from selected applicant: Fictional municipality/).waitFor();
    const metrics=visual.locator('.funding-visual-status');assert.match(await metrics.innerText(),/3 need your answers/);assert.match(await metrics.innerText(),/83 assessments not implemented/);
    await form.selectOption('nonprofit');await settled();await page.getByText(/explicit legal-form assumption differs from Fictional municipality/).waitFor();
    await page.getByRole('button',{name:'Previous question',exact:true}).click();await page.locator('#funding-applicant_id').selectOption('individual');await settled();
    await page.getByRole('button',{name:'Next question',exact:true}).click();assert.equal(await form.inputValue(),'nonprofit','An explicit hypothetical form survives applicant changes');
    await page.getByRole('button',{name:'Use selected applicant’s legal form',exact:true}).click();await settled();assert.equal(await form.inputValue(),'individual');
    await page.getByRole('button',{name:'Previous question',exact:true}).click();await page.locator('#funding-applicant_id').selectOption('municipality');await settled();
    await page.getByRole('button',{name:'Next question',exact:true}).click();await poll(async()=>!await form.isDisabled());assert.equal(await form.inputValue(),'public');
    // Help is available through mouse, keyboard and touch, without changing answers.
    const help=visual.getByRole('button',{name:'About need your answers',exact:true});await help.hover();await page.getByRole('tooltip').getByText(/some remain unknown/).waitFor();
    await page.keyboard.press('Escape');await page.getByRole('tooltip').waitFor({state:'detached'});
    await help.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await page.getByRole('tooltip').waitFor();await page.keyboard.press('Escape');
    const ids=await visual.locator('.funding-graph-option').evaluateAll(nodes=>nodes.map(n=>n.dataset.optionId));assert.equal(ids.length,12);
    await visual.getByRole('button',{name:'Expand view',exact:true}).click();assert(await visual.locator('.funding-graph-option').count()>12);
    const allIds=await visual.locator('.funding-graph-option').evaluateAll(nodes=>nodes.map(n=>n.dataset.optionId));
    assert.equal(await visual.getByRole('button',{name:'Next options',exact:true}).count(),0);
    assert(await visual.locator('.funding-diagram-scroll').evaluate(n=>n.scrollHeight<=n.clientHeight+1),'Expanded graph uses page scrolling');
    await visual.getByRole('button',{name:'Matrix',exact:true}).click();assert.deepEqual(await visual.locator('.funding-matrix tr[data-option-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.optionId)),allIds);
    assert(await visual.locator('.funding-matrix').evaluate(n=>n.scrollHeight<=n.clientHeight+1));
    await visual.getByRole('button',{name:'Compact view',exact:true}).click();assert.equal(await visual.locator('.funding-matrix tr[data-option-id]').count(),12);
    await visual.getByRole('button',{name:'Graph',exact:true}).click();assert.deepEqual(await visual.locator('.funding-graph-option').evaluateAll(nodes=>nodes.map(n=>n.dataset.optionId)),ids);
    assert.equal(await form.inputValue(),'public');
    assert.equal(await visual.getByText('Does not match these facts',{exact:true}).count(),0);assert.equal(await visual.getByText('Requirements not yet modelled',{exact:true}).count(),0);
    await page.locator('.funding-layout').evaluate(n=>n.scrollIntoView({block:'start'}));await page.screenshot({path:'test-artifacts/funding-refinements-desktop.png'});
    for(const theme of ['light','dark']){
      await page.getByLabel('Theme',{exact:true}).selectOption(theme);await page.setViewportSize({width:390,height:844});
      await help.scrollIntoViewIfNeeded();const box=await help.boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await page.getByRole('tooltip').waitFor();
      const popup=await page.getByRole('tooltip').boundingBox();assert(popup.x>=0&&popup.x+popup.width<=391&&popup.y>=0&&popup.y+popup.height<=845,'Help fits phone viewport');
      await page.evaluate(()=>window.scrollBy(0,10));await page.getByRole('tooltip').waitFor();
      await page.screenshot({path:`test-artifacts/funding-refinements-${theme}-help.png`});assert(await page.getByRole('tooltip').isVisible());await page.keyboard.press('Escape');
      await visual.getByRole('button',{name:'Expand funding visual workspace',exact:true}).click();await visual.getByRole('button',{name:'Expand view',exact:true}).click();
      await visual.getByRole('button',{name:'Matrix',exact:true}).click();assert.equal(await visual.locator('.funding-matrix tr[data-option-id]').count(),allIds.length);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await visual.getByRole('button',{name:'Compact view',exact:true}).click();await visual.getByRole('button',{name:'Collapse funding visual workspace',exact:true}).click();
    }
    await page.getByText('Saved explorations, context and funding projects',{exact:true}).click();await page.getByRole('button',{name:'Save draft',exact:true}).click();
    await poll(async()=>(await api('funding')).attachment.draft.version===2);
    assert.equal(JSON.stringify((await api('funding')).attachment.scenarios[0].assessment),oldAssessment);
    await page.getByRole('button',{name:'1. Activity',exact:true}).click();await page.getByLabel('Exploration name',{exact:true}).fill('Revised municipality exploration');
    const saveAlternative=page.getByRole('button',{name:'Save exploration',exact:true});await poll(async()=>!await saveAlternative.isDisabled());await saveAlternative.click();
    await page.getByRole('button',{name:'4. Compare alternatives',exact:true}).click();await page.getByLabel('Revised municipality exploration',{exact:true}).check();
    const comparison=page.locator('.funding-main article').filter({has:page.getByRole('heading',{name:'Revised municipality exploration',exact:true})});
    await comparison.getByText('Applicant: public · Activity: demonstration',{exact:true}).waitFor();
    await page.reload();await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();await page.getByRole('button',{name:'2. People and land',exact:true}).click();await page.getByRole('button',{name:'Next question',exact:true}).click();await settled();
    assert.equal(await form.inputValue(),'public','Derived form survives save and reload');
    await page.getByRole('button',{name:'Project',exact:true}).click();await page.getByRole('button',{name:'Open demonstrator planning',exact:true}).click();
    const editor=page.locator('.demo-editor');assert.equal(await editor.getByRole('button',{name:'Funding route',exact:true}).count(),0);assert.equal(await editor.getByRole('button',{name:'Explore funding',exact:true}).count(),1);
    await editor.getByText('Current funding:',{exact:true}).waitFor();await editor.getByRole('button',{name:'Explore funding',exact:true}).click();await page.getByRole('heading',{name:'Funding Navigator',exact:true}).waitFor();
    const after=await api('project');assert.equal(JSON.stringify(after.project),before);assert.equal(JSON.stringify(after.planning.draft),planningBefore);
    assert.equal((await api('export')).format_version,8);assert.deepEqual(errors,[]);await context.close();
    console.log('Funding refinements: applicant inheritance/overrides/history, four outcome categories, accessible help, expanded graph/matrix, phone themes and direct demonstrator entry passed.');
  }finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,5000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
