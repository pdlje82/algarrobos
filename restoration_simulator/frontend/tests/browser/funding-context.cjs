const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port!=='8000','Use isolated project data');
async function api(p,body){const r=await fetch(root+p,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<250;i++){if(await fn())return;await new Promise(r=>setTimeout(r,40));}throw Error('Funding context assertion timed out');}
(async()=>{
 let p=await api('project');p=await api('project/new',{revision:p.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Funding context fixture'});
 const f=await api('land/form',{revision:p.revision,route_id:'existing',parcel_id:'new'});
 const inputs=Object.fromEntries(f.fields.map(f=>[f.name,f.default]));assert(Object.hasOwn(inputs,'location'));
 Object.assign(inputs,{route_id:'existing',parcel_id:'new',parcel_name:'Context parcel',parcel_area:4500,covered_area:4500,location:'Alhama de Almeria'});
 p=await api('commit',{revision:p.revision,request_id:crypto.randomUUID(),action_id:'establish_access',inputs});
 const parcelId=p.project.parcels[0].id;
 let w=await api('designer'),draft=w.evaluation.draft;
 for(const command of [{kind:'plant',id:'carob',enabled:true},{kind:'patch',section:'physical',values:{parcel_id:parcelId}}])draft=(await api('designer/preview',{revision:p.revision,draft,command})).draft;
 w=await api('designer/save',{revision:p.revision,design_revision:w.design_revision,request_id:crypto.randomUUID(),draft,mode:'create',design_id:null,name:'Context design'});
 const sourceId=w.active_design_id;
 let planning=await api('designer/handoff',{revision:p.revision,design_revision:w.design_revision,planning_revision:p.planning.planning_revision,request_id:crypto.randomUUID()});
 const physical=new Set(['parcel_id','restoration_area','vegetation_system','objective','water_plan','planting_method','plant_selection']);
 const administration=Object.fromEntries(Object.entries(planning.draft.inputs).filter(([k])=>!physical.has(k)));
 Object.assign(administration,{municipality:'outside',public_participation:'open_days'});
 planning=await api('demonstrator/draft',{revision:p.revision,planning_revision:planning.planning_revision,request_id:crypto.randomUUID(),administration});
 p=await api('project');const before=JSON.stringify(p.project),snapshot=JSON.stringify(planning.draft);
 const old=await api('funding/context',{revision:p.revision,planning_revision:planning.planning_revision,design_revision:w.design_revision,target:'business',parcel_ids:[]});
 old.version=3;delete old.selection_assessments;delete old.legacy_selection_score;old.bundle=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../scenarios/funding-v1.json'),'utf8'));old.baseline.facts=Object.fromEntries(old.bundle.questions.map(q=>[q.id,Object.hasOwn(old.baseline.facts,q.id)?old.baseline.facts[q.id]:null]));old.name='Original source edition';old.overrides={public_access:'yes',territory_verified:'yes'};
 const fw=await api('funding');const saved=await api('funding/save',{revision:p.revision,funding_revision:fw.funding_revision,planning_revision:planning.planning_revision,design_revision:w.design_revision,request_id:crypto.randomUUID(),operation:'save',draft:old,record_id:null});
 const originalAssessment=JSON.stringify(saved.attachment.scenarios[0].assessment);
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1500,height:1000},hasTouch:true,reducedMotion:'reduce'});var page=await context.newPage();const errors=[];
  page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.getByRole('button',{name:'Open demonstrator planning',exact:true}).click();
  const summary=page.getByRole('region',{name:'Demonstrator parcel and design context',exact:true});await summary.getByText('Context parcel',{exact:true}).waitFor();assert.match(await summary.innerText(),/Record existing ownership/);assert.match(await summary.innerText(),/Alhama de Almeria/);assert.match(await summary.innerText(),/differs from the parcel/);
  await summary.getByRole('button',{name:'Context parcel',exact:true}).click();assert.equal(await page.locator(`[data-parcel-id="${parcelId}"]`).evaluate(n=>n===document.activeElement),true);
  await page.locator('.demo-editor').getByRole('button',{name:'Explore funding',exact:true}).click();
  const visual=page.getByLabel('Live funding consequences',{exact:true}),question=page.locator('.funding-question');
  const settled=()=>poll(async()=>!/Updating/.test(await visual.locator('.funding-visual-status').innerText()));await settled();
  await page.getByRole('button',{name:'2. People and land',exact:true}).click();
  await visual.getByRole('button',{name:'Answer questions',exact:true}).click();
  assert.equal(await visual.getByRole('button',{name:'Graph',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await visual.getByRole('button',{name:'All fit requirements',exact:true}).getAttribute('aria-pressed'),'true');
  const nodes=()=>visual.locator('.funding-circumstance').evaluateAll(ns=>ns.map(n=>[n.dataset.questionId,n.style.top,n.style.left]));
  const initialNodes=await nodes();assert(initialNodes.some(n=>n[0]==='applicant_choice'));assert(!initialNodes.some(n=>n[0]==='eligible_cost'));
  await page.getByRole('button',{name:'Next question',exact:true}).click();assert.deepEqual(await nodes(),initialNodes);
  await visual.getByRole('button',{name:'Next options',exact:true}).click();assert.deepEqual(await nodes(),initialNodes);await visual.getByRole('button',{name:'Previous options',exact:true}).click();
  await visual.getByLabel('Show amount conditions',{exact:true}).check();assert((await nodes()).some(n=>n[0]==='eligible_cost'));assert.deepEqual((await nodes()).slice(0,initialNodes.length),initialNodes);await visual.getByLabel('Show amount conditions',{exact:true}).uncheck();
  await visual.getByRole('button',{name:'Focus current question',exact:true}).click();assert.equal(await visual.locator('.funding-circumstance').count(),1);await visual.getByRole('button',{name:'All fit requirements',exact:true}).click();assert.deepEqual(await nodes(),initialNodes);
  await page.locator('.funding-answers>summary').click();const answers=page.locator('.funding-answers');
  const city=answers.locator('[data-question-id="municipality"]');await city.getByRole('button',{name:'Edit',exact:true}).click();assert.equal(await page.locator('#funding-municipality').inputValue(),'Alhama de Almería');
  const listedMunicipalities=page.locator('#funding-municipality optgroup option');assert.equal(await listedMunicipalities.count(),32);assert((await listedMunicipalities.allTextContents()).includes('Terque'));
  await page.locator('#funding-municipality-search').fill('alhama');assert.equal(await listedMunicipalities.count(),1);
  await question.getByRole('button',{name:'Show all municipalities',exact:true}).click();assert.equal(await listedMunicipalities.count(),32);assert.equal(await page.locator('#funding-municipality').inputValue(),'Alhama de Almería');
  await page.locator('#funding-municipality-search').fill('canjayar');await page.locator('#funding-municipality').selectOption('Canjáyar');await settled();assert.equal(await listedMunicipalities.count(),32);assert.equal(await page.locator('#funding-municipality-search').inputValue(),'');assert.equal(await page.locator('#funding-municipality').inputValue(),'Canjáyar');
  await page.locator('#funding-municipality').selectOption('__other__');await page.locator('#funding-municipality-other').fill('A location to be verified');await settled();
  await visual.getByRole('button',{name:'Matrix',exact:true}).click();const demo=visual.locator('tr[data-option-id="LEADER-AL20-3.4"]');await demo.getByRole('button',{name:'Inspect effects for LEADER-AL20-3.4',exact:true}).click();await visual.getByLabel('Answer effects for LEADER-AL20-3.4',{exact:true}).getByText('Municipality coverage has not been verified. An unrecognised name is not treated as outside the programme area.',{exact:true}).waitFor();
  await page.locator('#funding-municipality').selectOption('__outside__');await settled();await visual.getByLabel('Answer effects for LEADER-AL20-3.4',{exact:true}).getByText('The location is confirmed outside AL20; category 3.4 requires an operation/study within its LEADER area.',{exact:true}).waitFor();
  await city.locator('.funding-answer-reset>summary').click();await city.getByRole('button',{name:'Set to Unknown',exact:true}).click();await settled();assert.equal(await page.locator('#funding-municipality').inputValue(),'__unknown__');
  await answers.getByText(/^Unknown questions/).click();await city.locator('.funding-answer-reset>summary').click();await city.getByRole('button',{name:/^Restore initial:/}).click();await settled();assert.equal(await page.locator('#funding-municipality').inputValue(),'Alhama de Almería');
  const info=question.getByRole('button',{name:'About Municipality',exact:true});await info.hover();await page.getByRole('tooltip').getByText(/Listed municipalities/).waitFor();await page.keyboard.press('Escape');
  await info.click();const explanation=page.getByRole('dialog',{name:'About Municipality',exact:true});await explanation.waitFor();
  const source=explanation.getByRole('link',{name:'Official AL20 municipalities · PDF page 3',exact:true});await source.click();await page.locator('dialog.document-viewer').waitFor();await poll(async()=>!await page.getByLabel('PDF page',{exact:true}).isDisabled());assert.equal(await page.getByLabel('PDF page',{exact:true}).inputValue(),'3');await page.keyboard.press('Escape');assert(await source.evaluate(n=>n===document.activeElement));assert(await explanation.isVisible());await page.keyboard.press('Escape');assert(await info.evaluate(n=>n===document.activeElement));assert.equal(await page.locator('.funding-help-popup').count(),0);
  await info.click();await page.getByRole('heading',{name:'Funding Navigator',exact:true}).click();assert.equal(await explanation.count(),0);
  await poll(async()=>!await page.locator('#funding-municipality-search').isDisabled());await page.locator('#funding-municipality-search').focus();assert.equal(await page.locator('#funding-municipality-search').evaluate(n=>n===document.activeElement),true);await page.keyboard.press('Shift+Tab');await poll(async()=>await page.getByRole('tooltip').count()>0);await page.keyboard.press('Escape');
  if(!await answers.locator(':scope>details').first().evaluate(n=>n.open))await answers.getByText(/^Unknown questions/).click();const rights=answers.locator('[data-question-id="rights_sufficient"]');await rights.getByRole('button',{name:'Edit',exact:true}).click();assert.equal(await page.locator('#funding-rights_sufficient').inputValue(),'');
  await question.getByRole('button',{name:/About Applicant.*land rights/}).click();await page.getByRole('dialog',{name:/About Applicant.*land rights/}).getByText(/personal ownership/).waitFor();await page.keyboard.press('Escape');
  await visual.getByRole('button',{name:'Graph',exact:true}).click();await page.getByRole('button',{name:'Next question',exact:true}).click();assert.deepEqual(await nodes(),initialNodes);
  await page.locator('.funding-layout').evaluate(n=>n.scrollIntoView({block:'start'}));await page.screenshot({path:'test-artifacts/funding-context-desktop.png'});
  for(const theme of ['light','dark']){
   await page.getByLabel('Theme',{exact:true}).selectOption(theme);await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const qHelp=question.getByRole('button',{name:/^About /}).first();await qHelp.scrollIntoViewIfNeeded();const box=await qHelp.boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);const dialog=page.locator('.funding-help-popup[role="dialog"]');await dialog.waitFor();const bounds=await dialog.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=391);await page.keyboard.press('Escape');
   await page.screenshot({path:`test-artifacts/funding-context-${theme}-phone.png`});
  }
  await page.setViewportSize({width:1500,height:1000});await page.getByText('Saved explorations, context and funding projects',{exact:true}).click();await page.getByRole('button',{name:'Save draft',exact:true}).click();await poll(async()=>!await page.getByRole('button',{name:'Load / rename',exact:true}).isDisabled());
  await page.getByRole('button',{name:'Load / rename',exact:true}).click();await page.getByRole('button',{name:'Review catalogue and baseline update',exact:true}).click();const review=page.getByRole('region',{name:'Catalogue and baseline update review',exact:true});await review.getByText('Edition 1 → 3',{exact:true}).waitFor();await review.getByRole('button',{name:'Keep current assessment',exact:true}).click();
  await page.getByRole('button',{name:'Review catalogue and baseline update',exact:true}).click();await review.getByRole('button',{name:'Apply baseline and catalogue update',exact:true}).click();await poll(async()=>(await api('funding')).attachment.draft.bundle.version===3);
  assert.equal(JSON.stringify((await api('funding')).attachment.scenarios[0].assessment),originalAssessment);
  assert.equal(JSON.stringify((await api('project')).project),before);assert.equal(JSON.stringify((await api('demonstrator/draft')).draft),snapshot);
  // A changed or deleted source never rewrites the transferred planning snapshot.
  w=await api('designer');let changed=(await api('designer/preview',{revision:p.revision,draft:w.evaluation.draft,command:{kind:'density',id:'carob',value:120}})).draft;
  w=await api('designer/save',{revision:p.revision,design_revision:w.design_revision,request_id:crypto.randomUUID(),draft:changed,mode:'update',design_id:sourceId,name:null});
  w=await api('designer/save',{revision:p.revision,design_revision:w.design_revision,request_id:crypto.randomUUID(),draft:changed,mode:'create',design_id:null,name:'Another active design'});await page.reload();await page.getByRole('button',{name:'Open demonstrator planning',exact:true}).click();await summary.getByText('· Design changed since transfer',{exact:true}).waitFor();
  const loadingSource=page.waitForResponse(r=>r.url().endsWith('/designer/library')&&r.request().method()==='POST');await summary.getByRole('button',{name:'Context design',exact:true}).click();assert.equal((await loadingSource).status(),200);await page.getByRole('heading',{name:'Site Designer',exact:true}).waitFor();await poll(async()=>await page.locator('.designer-library-toolbar select').inputValue()===sourceId);
  w=await api('designer');await api('designer/library',{revision:p.revision,design_revision:w.design_revision,request_id:crypto.randomUUID(),operation:'delete',design_id:sourceId,name:null,confirm:true});
  await page.reload();await page.getByRole('button',{name:'Open demonstrator planning',exact:true}).click();await summary.getByText('· Source design deleted; transferred snapshot retained',{exact:true}).waitFor();
  assert.equal(JSON.stringify((await api('demonstrator/draft')).draft),snapshot);assert.equal(JSON.stringify((await api('project')).project),before);assert.deepEqual(errors,[]);await context.close();
  console.log('Funding context browser: municipality modes, exact source PDF, compact resets, persistent graph, phone help, explicit edition review and design/parcel context passed.');
 }catch(e){await page.screenshot({path:'test-artifacts/funding-context-failure.png'});fs.writeFileSync('test-artifacts/funding-context-failure.txt',await page.locator('body').innerText());console.error('Context workflow:',e);throw e;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,5000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
