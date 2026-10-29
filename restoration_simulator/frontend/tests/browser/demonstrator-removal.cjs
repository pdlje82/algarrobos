const assert=require('node:assert/strict');
const productionAssets=require('./productionAssets.cjs');
for(const key of ['PLAYWRIGHT_MODULE','DESIGNER_TEST_API','DESIGNER_APP_URL'])if(!process.env[key])throw Error('Set '+key);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE),root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert.notEqual(new URL(root).port,'8000','Use an isolated API');
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<200;i++){if(await fn())return;await new Promise(r=>setTimeout(r,40));}throw Error('Browser assertion timed out');}
(async()=>{
 let p=await api('project');p=await api('project/new',{revision:p.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Demonstrator removal fixture'});
 async function land(name){const fields=await api('land/form',{revision:p.revision,route_id:'existing',parcel_id:'new'});const inputs=Object.fromEntries(fields.fields.map(f=>[f.name,f.default]));Object.assign(inputs,{route_id:'existing',parcel_id:'new',parcel_name:name,parcel_area:4500,covered_area:4500});p=await api('commit',{revision:p.revision,request_id:crypto.randomUUID(),action_id:'establish_access',inputs});}
 await land('Keep first finca');let w=await api('designer');let draft=(await api('designer/preview',{revision:p.revision,draft:w.evaluation.draft,command:{kind:'plant',id:'carob',enabled:true}})).draft;
 draft=(await api('designer/preview',{revision:p.revision,draft,command:{kind:'patch',section:'physical',values:{parcel_id:'parcel-1'}}})).draft;
 w=await api('designer/save',{revision:p.revision,design_revision:w.design_revision,request_id:crypto.randomUUID(),draft,mode:'create',design_id:null,name:'Preserve this site design'});
 let planning=await api('designer/handoff',{revision:p.revision,design_revision:w.design_revision,planning_revision:p.planning.planning_revision,request_id:crypto.randomUUID()});
 p=await api('commit',{revision:p.revision,planning_revision:planning.planning_revision,action_id:'demonstrator',inputs:planning.draft.inputs,request_id:crypto.randomUUID()});
 await land('Keep later finca');const before=p.project,saved=await api('export');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true});const errors=[],requests=[];
  let failPreview=false,blockPreview=false,deleteMode='normal';
  await context.route('**/api/**',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.pathname==='/api/demonstrator/removal-preview'&&failPreview){failPreview=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Test removal preview unavailable'})});}
   if(u.pathname==='/api/demonstrator/delete'){
    requests.push(req.postDataJSON());
    if(deleteMode==='fail'){deleteMode='normal';return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Test removal save unavailable'})});}
   }
   const response=await route.fetch({url:new URL(u.pathname+u.search,new URL(root).origin).href});
   if(u.pathname==='/api/demonstrator/removal-preview'&&blockPreview){blockPreview=false;const value=await response.json();return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...value,can_remove:false,blocked_reason:'Resolve the dependent land record first.'})});}
   if(u.pathname==='/api/demonstrator/delete'&&deleteMode==='lost'){deleteMode='normal';assert.equal(response.status(),200);return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Test response lost after saving'})});}
   return route.fulfill({response});
  });
  if(process.env.DESIGNER_PRODUCTION_DIR)await productionAssets(context,url,process.env.DESIGNER_PRODUCTION_DIR);
  const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
  const remove=page.getByRole('button',{name:'Remove demonstrator…',exact:true}),panel=page.locator('.demonstrator-removal');
  await remove.click();await page.locator('#demonstrator-removal-preview').waitFor();assert.equal(await page.evaluate(()=>document.activeElement.id),'demonstrator-removal-title');
  assert.match(await panel.innerText(),/planning draft stays available/);assert.match(await panel.innerText(),/Choices to remove \(1\)/);assert.equal(JSON.stringify((await api('project')).project),JSON.stringify(before));
  await page.keyboard.press('Escape');assert.equal(await remove.evaluate(n=>n===document.activeElement),true);assert.equal(await page.locator('#demonstrator-removal-preview').count(),0);
  blockPreview=true;await remove.click();await poll(async()=>await panel.innerText().then(t=>t.includes('Resolve the dependent land')));assert.equal(await panel.getByRole('button',{name:'Confirm removal',exact:true}).isDisabled(),true);await panel.getByRole('button',{name:'Cancel',exact:true}).click();
  failPreview=true;await remove.click();await panel.getByText('Test removal preview unavailable',{exact:true}).waitFor();await panel.getByRole('button',{name:'Retry removal preview',exact:true}).click();await page.locator('#demonstrator-removal-preview').waitFor();
  for(const theme of ['light','dark'])for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:1000});await page.getByRole('combobox',{name:'Theme',exact:true}).selectOption(theme);await panel.getByRole('button',{name:'Confirm removal',exact:true}).scrollIntoViewIfNeeded();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const colours=await panel.getByRole('button',{name:'Confirm removal',exact:true}).evaluate(n=>getComputedStyle(n).backgroundColor.match(/\d+/g).map(Number));assert.ok(colours[0]>colours[1]);
   await page.screenshot({path:`../test-artifacts/demonstrator-removal-${theme}-${width}.png`});
  }
  deleteMode='fail';await panel.getByRole('button',{name:'Confirm removal',exact:true}).click();await panel.getByText('Test removal save unavailable',{exact:true}).waitFor();assert.equal(JSON.stringify((await api('project')).project),JSON.stringify(before));
  deleteMode='lost';await panel.getByRole('button',{name:'Confirm removal',exact:true}).click();await panel.getByText('Test response lost after saving',{exact:true}).waitFor();assert.equal((await api('project')).project.demonstrator,null);
  await panel.getByRole('button',{name:'Confirm removal',exact:true}).click();await remove.waitFor({state:'detached'});const after=await api('export');
  assert.ok(requests.length>=3);assert.ok(requests.every(r=>r.request_id===requests[0].request_id));
  assert.deepEqual(after.project.parcels,before.parcels);assert.deepEqual(after.designer.designs,saved.designer.designs);assert.deepEqual(after.planning,saved.planning);assert.deepEqual(after.designer.applied,[]);assert.equal(after.undo,null);
  await poll(async()=>await page.getByRole('button',{name:'Undo deletion',exact:true}).evaluate(n=>n===document.activeElement));
  await page.getByRole('button',{name:'Open demonstrator planning',exact:true}).click();await page.getByRole('button',{name:'Plant order list',exact:true}).click();assert.match(await page.locator('.plant-order-list').innerText(),/Draft/);
  await page.reload();await page.getByRole('button',{name:'Undo deletion',exact:true}).click();await remove.waitFor();const restored=(await api('project')).project;assert.deepEqual(restored.demonstrator,before.demonstrator);
  await remove.click();await page.locator('#demonstrator-removal-preview').waitFor();const current=await api('project');await api('commit',{revision:current.revision,request_id:crypto.randomUUID(),action_id:'advance',inputs:{target_year:0.1}});
  await panel.getByRole('button',{name:'Confirm removal',exact:true}).click();await poll(async()=>await panel.innerText().then(t=>t.includes('out of date')));assert.notEqual((await api('project')).project.demonstrator,null);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,production:!!process.env.DESIGNER_PRODUCTION_DIR,checks:'preview/cancel, dependency blocker, failures/retry, lost response idempotency, preserved land/designs/draft, reload/Undo, stale revision, themes and phones'}));
 }finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,1800))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
