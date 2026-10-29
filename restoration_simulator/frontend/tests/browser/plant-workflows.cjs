const assert=require('node:assert/strict');
const productionAssets=require('./productionAssets.cjs');
for(const key of ['PLAYWRIGHT_MODULE','DESIGNER_TEST_API','DESIGNER_APP_URL'])if(!process.env[key])throw Error('Set '+key);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const apiBase=process.env.DESIGNER_TEST_API,base=process.env.DESIGNER_APP_URL;
assert.notEqual(new URL(apiBase).port,'8000','Use an isolated test project.');
const api=async(path,body)=>{const r=await fetch(apiBase+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();};
const poll=async(fn)=>{for(let i=0;i<160;i++){if(await fn())return;await new Promise(r=>setTimeout(r,30));}throw Error('Browser assertion timed out');};
(async()=>{
 let p=await api('project');p=await api('project/new',{revision:p.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Plant workflow fixture'});
 const f=await api('land/form',{revision:p.revision,route_id:'existing',parcel_id:'new'}),inputs=Object.fromEntries(f.fields.map(x=>[x.name,x.default]));Object.assign(inputs,{route_id:'existing',parcel_id:'new',parcel_area:4500,covered_area:4500});
 await api('commit',{revision:p.revision,request_id:crypto.randomUUID(),action_id:'establish_access',inputs});
 const beforeProject=JSON.stringify((await api('project')).project);
 const browser=await chromium.launch({channel:'msedge',headless:true});let page;
 try{
  const context=await browser.newContext({viewport:{width:1680,height:1050},hasTouch:true}),errors=[],commands=[];
  let last=null,failReload=false,calls=0;
  await context.route('**/api/**',async route=>{
   calls++;const req=route.request(),url=new URL(req.url()),body=req.method()==='POST'?req.postDataJSON():null;
   if(url.pathname==='/api/designer/preview')commands.push(body.command);
   if(failReload&&url.pathname==='/api/designer/library'&&body.operation==='load'){failReload=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Test reload unavailable'})});}
   const response=await route.fetch({url:new URL(url.pathname+url.search,new URL(apiBase).origin).href});
   if(url.pathname==='/api/designer/preview'&&response.ok())last=await response.json();
   await route.fulfill({response});
  });
  if(process.env.DESIGNER_PRODUCTION_DIR)await productionAssets(context,base,process.env.DESIGNER_PRODUCTION_DIR);
  page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error'&&!msg.text().includes('503')&&!msg.text().includes('Failed to load resource'))errors.push(msg.text());});
  await page.goto(base);await page.getByRole('button',{name:'Site Designer',exact:true}).click();await page.locator('.designer-svg').waitFor();
  const idle=()=>poll(async()=>!await page.locator('.designer-status').innerText().then(t=>t.includes('Updating')));
  const panel=()=>page.getByRole('region',{name:'Transfer requirements'});
  async function edit(fn){const n=commands.length;await fn();await poll(()=>commands.length>n);await idle();assert.deepEqual(errors,[]);}
  async function clear(){await page.getByText('Design actions',{exact:true}).click();await edit(()=>page.getByRole('button',{name:'Clear planting zone',exact:true}).click());}
  async function save(name){await page.getByRole('button',{name:'Save',exact:true}).click();if(name!==undefined){await page.getByRole('dialog').getByLabel('Design name',{exact:true}).fill(name);await page.getByRole('dialog').getByRole('button',{name:'Save',exact:true}).click();}await idle();await poll(async()=>await page.locator('.designer-status.app-alert--success').count()===1);}
  await page.getByRole('button',{name:'Why unavailable?',exact:true}).click();assert.match(await panel().innerText(),/positive quantity/);assert.match(await panel().innerText(),/pilot parcel/);assert.match(await panel().innerText(),/under a name/);
  const hintsBefore=calls;await page.keyboard.press('Escape');await page.getByRole('button',{name:'Plants',exact:true}).focus();await page.getByRole('button',{name:'Why unavailable?',exact:true}).focus();await panel().waitFor();assert.equal(calls,hintsBefore);await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button',{name:'Reload saved design',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Approaches',exact:true}).click();await edit(()=>page.getByRole('checkbox',{name:/Warm lentisco series/}).click());assert.equal(last.summary.plants,7);assert.equal(last.summary.placed,7);assert.equal(last.summary.trees,0);
  await page.getByRole('button',{name:'Plants',exact:true}).click();
  const row=page.locator('[data-plant-row="lentisk"]');await row.getByRole('button',{name:'Open Lentisco',exact:true}).click();
  assert.match(await row.innerText(),/Lentisco/);assert.match(await row.innerText(),/Mastixstrauch/);assert.match(await row.innerText(),/Pistacia lentiscus/);assert.match(await row.innerText(),/Shrubs/);assert.equal((await row.innerText()).includes('Lentisk'),false);
  const positions=JSON.stringify(last.draft.positions),n=commands.length;
  await row.locator('.plant-identity').click({position:{x:200,y:8}});await row.getByRole('button',{name:'Open Lentisco',exact:true}).press('Enter');assert.equal(commands.length,n);assert.equal(JSON.stringify(last.draft.positions),positions);assert.equal(await row.getByRole('checkbox',{name:'Select Lentisco',exact:true}).isChecked(),true);
  await row.locator('.plant-portrait-open').click();await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();assert.equal(commands.length,n);
  await edit(()=>row.getByRole('checkbox',{name:'Select Lentisco',exact:true}).press('Space'));assert.equal(last.summary.plants,0);
  await edit(()=>page.getByRole('button',{name:'Undo',exact:true}).click());assert.equal(JSON.stringify(last.draft.positions),positions);
  await page.getByRole('searchbox',{name:'Find a plant',exact:true}).fill('Johannisbrotbaum');assert.equal(await page.locator('[data-plant-row]').count(),1);
  await edit(()=>page.getByRole('button',{name:'Open Algarrobo',exact:true}).click());assert.equal(last.summary.plants,14);
  assert.ok(Object.entries(JSON.parse(positions)).every(([id,pos])=>JSON.stringify(last.draft.positions[id])===JSON.stringify(pos)));
  await page.getByRole('searchbox',{name:'Find a plant',exact:true}).fill('Thymus hyemalis');assert.match(await page.locator('[data-plant-row="thyme"]').innerText(),/German name not established/);
  await page.getByRole('searchbox',{name:'Find a plant',exact:true}).fill('');
  await save('Checkpoint');const checkpoint=(await api('designer')).evaluation.draft;
  await page.getByRole('button',{name:'Why unavailable?',exact:true}).click();assert.match(await panel().innerText(),/Choose a pilot parcel/);assert.doesNotMatch(await panel().innerText(),/under a name|latest design changes/);
  await panel().getByRole('button',{name:'Choose pilot parcel',exact:true}).click();await poll(async()=>await page.evaluate(()=>document.activeElement.id)==='field-parcel_id');
  await edit(()=>page.getByLabel('Pilot parcel',{exact:true}).selectOption('parcel-1'));await save();assert.equal(await page.getByRole('button',{name:'Use in demonstrator planning',exact:true}).isEnabled(),true);
  await page.getByRole('button',{name:'Ready to review',exact:true}).click();assert.match(await panel().innerText(),/Ready to review/);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Use in demonstrator planning',exact:true}).click();await page.getByRole('region',{name:'Design transfer review'}).waitFor();await page.getByRole('region',{name:'Design transfer review'}).getByRole('button',{name:'Cancel',exact:true}).click();
  const saved=(await api('designer')).evaluation.draft;
  await clear();assert.equal(last.summary.plants,0);await page.getByRole('button',{name:'Reload saved design',exact:true}).click();assert.match(await page.getByRole('dialog').innerText(),/Discard changes and reload/);
  await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(last.summary.plants,0);
  await page.getByRole('button',{name:'Reload saved design',exact:true}).click();failReload=true;await page.getByRole('dialog').getByRole('button',{name:'Reload saved version',exact:true}).click();await poll(async()=>await page.getByRole('dialog').innerText().then(t=>t.includes('Test reload unavailable')));assert.equal(last.summary.plants,0);
  await page.getByRole('dialog').getByRole('button',{name:'Reload saved version',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});await idle();
  assert.deepEqual((await api('designer')).evaluation.draft,saved);assert.equal(await page.getByRole('button',{name:'Undo',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Zone',exact:true}).getAttribute('aria-pressed'),'true');
  // Incomplete fields are guarded by Reload and survive cancellation.
  await page.getByRole('button',{name:'Plants',exact:true}).click();await page.getByRole('button',{name:'Edit diameter · Algarrobo',exact:true}).click();
  const diameter=page.locator('.crown-editor').getByLabel('Crown / plant diameter (m)',{exact:true});await diameter.fill('0');await diameter.press('Enter');
  await page.getByRole('button',{name:'Reload saved design',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await diameter.inputValue(),'0');
  await page.getByRole('button',{name:'Reload saved design',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Reload saved version',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});await idle();
  await clear();await page.getByRole('button',{name:'Approaches',exact:true}).click();await edit(()=>page.getByRole('checkbox',{name:/Semi-arid coscoja series/}).click());assert.equal(last.summary.plants,14);assert.equal(last.summary.placed,14);assert.equal(last.summary.trees,0);
  await clear();await save();await page.getByRole('button',{name:'Reload saved design',exact:true}).click();await idle();assert.equal((await api('designer')).evaluation.summary.plants,0,'Save after Clear overwrites the checkpoint');
  // Recreate a visible plant for layout checks without touching Project state.
  await page.getByRole('button',{name:'Plants',exact:true}).click();await edit(()=>page.getByRole('button',{name:'Open Algarrobo',exact:true}).click());
  for(const theme of ['light','dark'])for(const width of [1680,390,320]){
   await page.setViewportSize({width,height:1000});await page.getByRole('combobox',{name:'Theme',exact:true}).selectOption(theme);
   const key=page.locator('.plant-symbol-species-key');if(!await key.evaluate(node=>node.open))await key.locator('summary').click();assert.match(await key.innerText(),/Johannisbrotbaum/);assert.match(await key.innerText(),/Ceratonia siliqua/);
   await page.getByRole('button',{name:'Why unavailable?',exact:true}).tap();await panel().waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,theme+' '+width+' overflow');
   await page.screenshot({path:`../test-artifacts/plant-workflows-${theme}-${width}.png`,fullPage:true});await page.keyboard.press('Escape');
  }
  assert.equal(JSON.stringify((await api('project')).project),beforeProject);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,production:!!process.env.DESIGNER_PRODUCTION_DIR,commands:commands.length,names:23,series:'standalone only without trees',checkpointPlants:checkpoint.selection.entries.reduce((sum,r)=>sum+r.quantity,0)}));
 }catch(error){if(page)await page.screenshot({path:'../test-artifacts/plant-workflows-failure.png',fullPage:true});throw error;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,1800))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
