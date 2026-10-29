const assert=require('node:assert/strict');
const productionAssets=require('./productionAssets.cjs');
for(const key of ['PLAYWRIGHT_MODULE','DESIGNER_TEST_API','DESIGNER_APP_URL'])if(!process.env[key])throw Error('Set '+key);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert.notEqual(new URL(root).port,'8000','Use isolated project data');
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<200;i++){if(await fn())return;await new Promise(r=>setTimeout(r,40));}throw Error('Timed out waiting for browser assertion');}
(async()=>{
 let p=await api('project');p=await api('project/new',{revision:p.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Planning handoff fixture'});
 const f=await api('land/form',{revision:p.revision,route_id:'existing',parcel_id:'new'});
 const inputs=Object.fromEntries(f.fields.map(f=>[f.name,f.default]));Object.assign(inputs,{route_id:'existing',parcel_id:'new',parcel_area:4500,covered_area:4500});
 p=await api('commit',{revision:p.revision,request_id:crypto.randomUUID(),action_id:'establish_access',inputs});
 const before=JSON.stringify(p.project),defaults=p.planning.draft.inputs;
 let w=await api('designer'),draft=w.evaluation.draft;
 for(const command of [{kind:'plant',id:'carob',enabled:true},{kind:'plant',id:'holm_oak',enabled:true},{kind:'custom',density:50,entry:{id:'custom-shrub',label:'Mi arbusto',group:'shrub',quantity:1,unit_cost:3.25,price_confirmed:true}},{kind:'patch',section:'physical',values:{parcel_id:p.project.parcels[0].id}}])draft=(await api('designer/preview',{revision:p.revision,draft,command})).draft;
 await api('designer/save',{revision:p.revision,design_revision:w.design_revision,request_id:crypto.randomUUID(),draft,mode:'create',design_id:null,name:'My site'});
 const server=await chromium.launchServer({channel:'msedge',headless:true});
 const browser=await chromium.connect(server.wsEndpoint());
 try{
  const context=await browser.newContext({viewport:{width:1680,height:1000},hasTouch:true});
  let calls=0,failSave=false;const errors=[];
  await context.route('**/api/**',async route=>{
   calls++;const req=route.request(),u=new URL(req.url());
   if(failSave&&u.pathname==='/api/demonstrator/draft'&&req.method()==='POST'){failSave=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Test planning save unavailable'})});}
   const response=await route.fetch({url:new URL(u.pathname+u.search,new URL(root).origin).href});return route.fulfill({response});
  });
  if(process.env.DESIGNER_PRODUCTION_DIR)await productionAssets(context,url,process.env.DESIGNER_PRODUCTION_DIR);
  const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>{errors.push(e.message);console.error('Page error:',e.message);});
  await page.goto(url);await page.getByRole('button',{name:'Open demonstrator planning',exact:true}).click();
  await page.getByRole('button',{name:'Timing',exact:true}).click();
  const note=page.getByLabel('Additional site / custom-method notes (optional)',{exact:true});
  await note.fill('Keep my demonstration choices');await poll(async()=>(await api('demonstrator/draft')).draft.inputs.notes==='Keep my demonstration choices');
  failSave=true;await note.fill('Retain after failed save');await page.getByText('Test planning save unavailable',{exact:true}).waitFor();assert.equal(await note.inputValue(),'Retain after failed save');
  await page.getByRole('button',{name:'Retry saving draft',exact:true}).click();await poll(async()=>(await api('demonstrator/draft')).draft.inputs.notes==='Retain after failed save');
  await page.getByRole('button',{name:'Site Designer',exact:true}).click();await page.getByRole('button',{name:'Plants',exact:true}).click();
  console.log('Checking grouped checklist');
  const rows=page.locator('.plant-checklist [data-plant-row]');assert.equal(await rows.count(),24);
  for(const [id,label] of [['carob','Trees'],['holm_oak','Trees'],['cork_oak','Trees'],['kermes_oak','Shrubs'],['esparto','Grasses / herbaceous plants'],['custom-shrub','Shrubs']])assert.equal(await page.locator(`[data-plant-row="${id}"]`).evaluate(n=>n.closest('fieldset').querySelector('legend').textContent),label);
  assert.equal(await page.locator('.plant-checklist legend').filter({hasText:/system [2345]/}).count(),0);
  const search=page.getByRole('searchbox',{name:'Find a plant'});await search.fill('carrasca');assert.equal(await page.locator('[data-plant-row="holm_oak"]').count(),1);assert.match(await page.locator('[data-plant-row="holm_oak"]').innerText(),/Encina \/ Carrasca/);
  console.log('Checking filtered selection');
  await search.fill('romero');const count=calls;const scroll=await page.evaluate(()=>window.scrollY);
  const tree=page.locator('[data-instance="holm_oak:0"]');await tree.evaluate(n=>n.focus({preventScroll:true}));await tree.press('Enter');console.log('Selected oak from drawing');
  await poll(async()=>await page.locator('[data-plant-row="holm_oak"]').count()===1);
  await poll(async()=>await page.locator('[data-plant-row="holm_oak"] .plant-checkbox').evaluate(n=>{const a=n.getBoundingClientRect(),b=n.closest('.designer-controls').getBoundingClientRect();return a.top>=Math.max(0,b.top)&&a.bottom<=Math.min(innerHeight,b.bottom);}));
  assert.equal(calls,count);assert.equal(await search.inputValue(),'romero');assert.equal(await page.evaluate(()=>document.activeElement.dataset.instance),'holm_oak:0');assert.equal(await page.evaluate(()=>window.scrollY),scroll);
  await page.locator('.designer-controls').evaluate(n=>n.scrollTop=0);await tree.press('Enter');
  await poll(async()=>await page.locator('[data-plant-row="holm_oak"] .plant-checkbox').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));
  assert.match(await page.locator('.plant-checklist').innerText(),/Showing selected Encina \/ Carrasca despite/);
  const custom=page.locator('[data-instance="custom-shrub:0"]');await custom.evaluate(n=>n.focus({preventScroll:true}));await custom.press('Enter');await page.locator('[data-plant-row="custom-shrub"]').waitFor();assert.equal(await page.locator('[data-plant-row="holm_oak"]').count(),0);
  await page.getByRole('button',{name:'Approaches',exact:true}).click();await tree.evaluate(n=>n.focus({preventScroll:true}));await tree.press('Enter');assert.equal(await page.getByRole('button',{name:'Plants',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await search.inputValue(),'romero');
  console.log('Checking planning transfer');
  await page.getByRole('button',{name:'Use in demonstrator planning',exact:true}).click();await page.getByRole('region',{name:'Design transfer review'}).waitFor();
  await page.getByRole('button',{name:'Use design in planning',exact:true}).click();await note.waitFor();assert.equal(await note.inputValue(),'Retain after failed save');
  assert.equal(JSON.stringify((await api('project')).project),before);
  assert.match(await page.locator('.plant-order-list').innerText(),/Draft/);assert.match(await page.locator('.plant-order-list').innerText(),/Mi arbusto/);
  await page.reload();await page.getByRole('button',{name:'Open demonstrator planning',exact:true}).click();await page.getByRole('button',{name:'Timing',exact:true}).click();assert.equal(await note.inputValue(),'Retain after failed save');
  await page.getByRole('button',{name:'Budget',exact:true}).click();const labour=page.getByLabel('Planting labour (days)',{exact:true});
  await labour.fill('');await labour.press('Tab');await poll(async()=>(await api('demonstrator/draft')).draft.inputs.labour_days===null);
  assert.equal(await page.getByRole('button',{name:'Review demonstrator plan',exact:true}).isDisabled(),true);
  await labour.fill(String(defaults.labour_days));await labour.press('Tab');await poll(async()=>await page.getByRole('button',{name:'Review demonstrator plan',exact:true}).isEnabled());
  await page.getByRole('button',{name:'Review demonstrator plan',exact:true}).click();await page.getByRole('dialog').waitFor();assert.equal((await api('project')).project.demonstrator,null);
  await page.getByRole('button',{name:'Commit demonstrator plan',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});
  await poll(async()=>(await api('project')).project.demonstrator!==null);await poll(async()=>await page.locator('.plant-order-list').innerText().then(t=>t.includes('Committed')));
  for(const theme of ['light','dark'])for(const width of [1680,390,320]){
   await page.setViewportSize({width,height:1000});await page.getByRole('combobox',{name:'Theme',exact:true}).selectOption(theme);await page.getByRole('button',{name:'Site Designer',exact:true}).click();await page.getByRole('button',{name:'Plants',exact:true}).click();await search.fill('');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`../test-artifacts/planning-${theme}-${width}.png`});await page.getByRole('button',{name:'Project',exact:true}).click();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'passed',checks:'draft autosave/retry, grouping, filtered selection scroll/focus, transfer, reload, validation, explicit commit, themes and phones',calls}));
 }catch(e){process.exitCode=1;console.error('Browser check failed:',e);throw e;}finally{
  // Bound Windows Edge/Playwright shutdown after terminating this owned server.
  await Promise.race([server.kill(),new Promise(resolve=>setTimeout(resolve,3000))]);
  setTimeout(()=>process.exit(process.exitCode===undefined?0:process.exitCode),500);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
