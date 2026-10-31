const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port!=='8000','Use an isolated project save');
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<300;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Funding resume state timed out');}
(async()=>{
 let p=await api('project');p=await api('project/new',{revision:p.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Funding resume fixture'});
 const form=await api('land/form',{revision:p.revision,route_id:'existing',parcel_id:'new'}),inputs=Object.fromEntries(form.fields.map(f=>[f.name,f.default]));
 Object.assign(inputs,{route_id:'existing',parcel_id:'new',parcel_name:'Resume parcel',parcel_area:4500,covered_area:4500,location:'Alhama de Almería'});
 p=await api('commit',{revision:p.revision,request_id:crypto.randomUUID(),action_id:'establish_access',inputs});const parcelId=p.project.parcels[0].id;
 let w=await api('designer'),design=w.evaluation.draft;
 for(const command of [{kind:'plant',id:'carob',enabled:true},{kind:'patch',section:'physical',values:{parcel_id:parcelId}}])design=(await api('designer/preview',{revision:p.revision,draft:design,command})).draft;
 w=await api('designer/save',{revision:p.revision,design_revision:w.design_revision,request_id:crypto.randomUUID(),draft:design,mode:'create',design_id:null,name:'Resume design'});
 await api('designer/handoff',{revision:p.revision,design_revision:w.design_revision,planning_revision:p.planning.planning_revision,request_id:crypto.randomUUID()});p=await api('project');
 const before=JSON.stringify(p.project),route='LEADER-AL20-3.4';
 const d=await api('funding/context',{revision:p.revision,planning_revision:p.planning.planning_revision,design_revision:p.designer_revision,target:'demonstrator',parcel_ids:[parcelId]});
 d.overrides={novelty:'yes',dissemination:'yes',publication_three_years:'yes'};
 const row=d.selection_assessments[route].criteria['CO.1'];row.answers={'CO.1.1':false,'CO.1.2':true,'CO.1.3':false};row.reference='NPL evidence retained';row.notes='Previously saved demonstrator notes';
 let fw=await api('funding');fw=await api('funding/save',{revision:p.revision,funding_revision:fw.funding_revision,planning_revision:p.planning.planning_revision,design_revision:p.designer_revision,request_id:crypto.randomUUID(),operation:'draft',draft:d,record_id:null});
 const browser=await chromium.launch({channel:'msedge',headless:true});let page;
 try{
  page=await browser.newPage({viewport:{width:1500,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
  const status=page.getByRole('status',{name:'Funding save status',exact:true}),saveIndicator=status.locator('strong');
  async function openDemo(){await page.getByRole('button',{name:'Open demonstrator planning',exact:true}).click();await page.locator('.demo-editor').getByRole('button',{name:'Explore funding',exact:true}).click();await page.getByRole('heading',{name:'Funding Navigator',exact:true}).waitFor();await poll(async()=>/Saved to this computer/.test(await saveIndicator.innerText()));}
  async function openCO1(){await page.getByRole('button',{name:'2. People and land',exact:true}).click();const graph=page.locator('.funding-diagram-scroll');await graph.locator('.funding-circumstance[data-question-id="selection_score"]').click();await page.getByLabel('AL20 assessment route',{exact:true}).selectOption(route);await graph.locator('.funding-annex-group[data-annex-criterion="CO.1"]').click();await graph.locator('.funding-annex-choice[data-annex-criterion="CO.1"]').first().click();}
  const editor=page.getByRole('dialog',{name:'Edit AL20 criterion',exact:true}),notes=editor.getByLabel('Assessment notes (optional)',{exact:true});
  await page.goto(url);await openDemo();assert.equal(await page.getByRole('region',{name:'Funding context review',exact:true}).count(),0);
  assert.deepEqual((await api('funding')).attachment.draft,d,'Opening the same direct context must not replace saved answers');
  await openCO1();assert(await editor.locator('[id="al20-CO.1.2"]').isChecked());assert.equal(await notes.inputValue(),row.notes);
  let saveStarted=0,failNext=false,holdLatest=false,releaseLatest=null;
  await page.route('**/api/funding/save',async request=>{
   const body=request.request().postDataJSON();saveStarted=Date.now();
   if(failNext){failNext=false;return request.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Resume test save unavailable'})});}
   if(holdLatest&&body.draft.selection_assessments[route].criteria['CO.1'].notes==='Latest notes entered after failure')await new Promise(resolve=>{releaseLatest=resolve;});
   return request.continue();
  });
  const editAt=Date.now();await notes.fill('Autosaved demonstrator notes');assert.match(await saveIndicator.innerText(),/Unsaved changes/);
  await poll(async()=>/Saved to this computer/.test(await saveIndicator.innerText()));assert(saveStarted-editAt>=1000,'Autosave waits for the idle interval');
  assert.equal((await api('funding')).attachment.draft.selection_assessments[route].criteria['CO.1'].notes,'Autosaved demonstrator notes');
  await page.reload();await openDemo();await openCO1();assert.equal(await notes.inputValue(),'Autosaved demonstrator notes');assert(await editor.locator('[id="al20-CO.1.2"]').isChecked());
  await editor.getByLabel('Supporting reference (optional)',{exact:true}).fill('Manually saved reference');await page.getByRole('button',{name:'Save now',exact:true}).click();await poll(async()=>/Saved to this computer/.test(await saveIndicator.innerText()));
  assert.equal((await api('funding')).attachment.draft.selection_assessments[route].criteria['CO.1'].reference,'Manually saved reference');
  failNext=true;await notes.fill('Older notes in failed request');await page.getByText(/Resume test save unavailable/).waitFor();
  await notes.fill('Latest notes entered after failure');holdLatest=true;await page.getByRole('button',{name:'Retry failed save',exact:true}).click();
  await poll(async()=>releaseLatest!==null);assert.doesNotMatch(await saveIndicator.innerText(),/Saved to this computer/);
  assert.equal((await api('funding')).attachment.draft.selection_assessments[route].criteria['CO.1'].notes,'Older notes in failed request');assert.equal(await notes.inputValue(),'Latest notes entered after failure');
  holdLatest=false;releaseLatest();await poll(async()=>/Saved to this computer/.test(await saveIndicator.innerText()));
  const confirmed=(await api('funding')).attachment.draft;assert.equal(confirmed.selection_assessments[route].criteria['CO.1'].notes,'Latest notes entered after failure');
  await page.getByRole('button',{name:'Close question editor',exact:true}).click();await page.getByRole('button',{name:'Project',exact:true}).click();
  async function openParcel(){await page.locator(`[data-parcel-id="${parcelId}"]`).getByRole('button',{name:'Explore funding',exact:true}).click();}
  await openParcel();const review=page.getByRole('region',{name:'Funding context review',exact:true});await review.waitFor();
  assert.deepEqual((await api('funding')).attachment.draft,confirmed);await review.getByRole('button',{name:'Continue saved exploration',exact:true}).click();
  await page.getByRole('button',{name:'Project',exact:true}).click();await openParcel();await review.getByRole('button',{name:'Save and open requested exploration',exact:true}).click();
  await poll(async()=>(await api('funding')).attachment.draft.baseline.target==='activity');
  fw=await api('funding');assert.deepEqual(fw.attachment.scenarios[0].draft,confirmed,'Switching context must preserve a named copy');
  await page.getByLabel('Exploration name',{exact:true}).fill('Parcel edits flushed on navigation');await page.getByRole('button',{name:'Project',exact:true}).click();
  await page.locator('.project-workspace').waitFor({state:'visible'});
  assert.equal((await api('funding')).attachment.draft.name,'Parcel edits flushed on navigation');
  await page.reload();await openParcel();await page.getByLabel('Exploration name',{exact:true}).waitFor();assert.equal(await page.getByLabel('Exploration name',{exact:true}).inputValue(),'Parcel edits flushed on navigation');assert.equal(await review.count(),0);
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'test-artifacts/funding-resume-phone.png'});
  assert.equal(JSON.stringify((await api('project')).project),before);assert.deepEqual(errors,[]);
  console.log('Funding resume: direct demonstrator/parcel reload, saved notes/selections, 1.2-second autosave, Save now, older-request retry with newer edits, explicit context preservation, navigation flush and phone status passed.');
 }catch(e){if(page)await page.screenshot({path:'test-artifacts/funding-resume-failure.png'});throw e;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,3000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
