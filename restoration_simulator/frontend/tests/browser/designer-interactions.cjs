// Requires isolated API on 8013 and Vite using tests/browser/vite.config.mjs.
const assert=require('node:assert/strict');
const productionAssets=require('./productionAssets.cjs');
for(const key of ['PLAYWRIGHT_MODULE','DESIGNER_TEST_API','DESIGNER_APP_URL'])if(!process.env[key])throw Error('Set '+key+' before browser checks.');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const apiBase=process.env.DESIGNER_TEST_API,appUrl=process.env.DESIGNER_APP_URL;
assert.notEqual(new URL(apiBase).port,'8000','Never mutate the active project.');
const api=async(path,body)=>{const response=await fetch(apiBase+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw Error(await response.text());return response.json();};
const poll=async(check)=>{for(let i=0;i<100;i++){if(await check())return;await new Promise(r=>setTimeout(r,40));}throw Error('Browser assertion timed out');};

(async()=>{
 let project=await api('project');project=await api('project/new',{revision:project.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Interaction fixture'});
 const form=await api('land/form',{revision:project.revision,route_id:'existing',parcel_id:'new'});
 const inputs=Object.fromEntries(form.fields.map(f=>[f.name,f.default]));Object.assign(inputs,{route_id:'existing',parcel_id:'new',parcel_area:4500,covered_area:4500});
 project=await api('commit',{revision:project.revision,request_id:crypto.randomUUID(),action_id:'establish_access',inputs});
 let workspace=await api('designer'),last=workspace.evaluation;
 async function seed(command){last=await api('designer/preview',{revision:project.revision,draft:last.draft,command});}
 await seed({kind:'plant',id:'carob',enabled:true});await seed({kind:'density',id:'carob',value:100});
 await seed({kind:'position',id:'carob:0',x:4,y:4});await seed({kind:'position',id:'carob:1',x:10,y:10});
 await seed({kind:'plant',id:'lentisk',enabled:true});
 await seed({kind:'custom',density:50,entry:{id:'custom-browser',label:'Custom shrub',group:'shrub',quantity:1,unit_cost:3,price_confirmed:false}});
 workspace=await api('designer/save',{revision:project.revision,design_revision:workspace.design_revision,request_id:crypto.randomUUID(),mode:'create',design_id:null,name:'Interaction design',draft:last.draft});
 last=workspace.evaluation;const simulation=JSON.stringify((await api('project')).project);
 const browser=await chromium.launch({channel:'msedge',headless:true,timeout:15000});
 try{
  const context=await browser.newContext({viewport:{width:1680,height:1050},hasTouch:true});
  const errors=[],commands=[];let failDimension=false,delayDimension=false;
  await context.route('**/api/**',async route=>{
   const request=route.request(),url=new URL(request.url());const body=request.method()==='POST'?request.postDataJSON():null;
   if(url.pathname==='/api/designer/preview'){
    commands.push(body.command);
    if(body.command?.kind==='dimension'&&body.command.feature==='crown'){
     if(failDimension){failDimension=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Test: diameter service unavailable'})});return;}
     if(delayDimension){delayDimension=false;await new Promise(r=>setTimeout(r,650));}
    }
   }
   const response=await route.fetch({url:new URL(url.pathname+url.search,new URL(apiBase).origin).href});
   if(url.pathname==='/api/designer/preview'&&response.ok())last=await response.json();
   await route.fulfill({response});
  });
  if(process.env.DESIGNER_PRODUCTION_DIR)await productionAssets(context,appUrl,process.env.DESIGNER_PRODUCTION_DIR);
  const page=await context.newPage();page.setDefaultTimeout(3500);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(appUrl);await page.getByRole('button',{name:'Site Designer',exact:true}).click();await page.locator('.designer-svg').waitFor();
  const panel=()=>page.getByRole('complementary',{name:'Selected element and evidence'});
  const crown=()=>page.getByRole('region',{name:'Crown diameter editor'});
  const diameter=()=>crown().getByLabel('Crown / plant diameter (m)',{exact:true});
  const plant=id=>page.locator(`[data-instance="${id}"]`);
  const idle=()=>poll(async()=>!await page.locator('.designer-status').innerText().then(t=>t.includes('Updating')));
  async function edit(action){const before=commands.length;await action();await poll(()=>commands.length>before);await idle();assert.equal(errors.length,0,errors.join('\n'));}
  await page.getByRole('button',{name:'Plants',exact:true}).click();await page.getByRole('checkbox',{name:'Select Algarrobo',exact:true}).waitFor();
  const beforeHover=commands.length;
  await page.locator('[data-plant-row="carob"]').first().hover();await poll(async()=>await page.locator('[data-located-instance]').count()===2);
  assert.match(await page.locator('.designer-locate-status').innerText(),/Algarrobo: 2 shown/);
  const selectedBefore=await page.locator('.designer-plant.is-selected').count();
  await page.locator('[data-plant-row="custom-browser"]').hover();await poll(async()=>await page.locator('[data-located-instance="custom-browser:0"]').count()===1);
  await page.locator('#designer-title').hover();await page.getByRole('checkbox',{name:'Select Lentisco',exact:true}).focus();await poll(async()=>await page.locator('.designer-locate-status').innerText().then(t=>t.startsWith('Lentisco:')));
  await page.locator('[data-plant-row="carob"]').first().hover();assert.match(await page.locator('.designer-locate-status').innerText(),/^Algarrobo:/);
  await page.locator('#designer-title').hover();await poll(async()=>await page.locator('.designer-locate-status').innerText().then(t=>t.startsWith('Lentisco:')));
  assert.equal(commands.length,beforeHover);assert.equal(await page.locator('.designer-plant.is-selected').count(),selectedBefore);
  assert.equal(await page.getByRole('button',{name:'Save',exact:true}).isDisabled(),true);
  await page.getByRole('searchbox',{name:'Find a plant',exact:true}).fill('not a real plant');assert.equal(await page.locator('[data-located-instance]').count(),0);
  await page.getByRole('searchbox',{name:'Find a plant',exact:true}).fill('');
  await page.getByRole('button',{name:'Edit diameter · Algarrobo',exact:true}).click();assert.equal(await diameter().inputValue(),'6');
  assert.equal(await crown().getByRole('button',{name:'Use this diameter',exact:true}).count(),0);
  assert.equal(await panel().getByLabel('Plant x (m)',{exact:true}).count(),0);assert.equal(await panel().getByLabel('Plant y (m)',{exact:true}).count(),0);
  let before=commands.length;await diameter().fill('0');await diameter().press('Enter');assert.match(await crown().innerText(),/greater than 0/);assert.equal(commands.length,before);
  await diameter().press('Escape');assert.equal(await diameter().inputValue(),'6');
  await edit(async()=>{await diameter().fill('7');await diameter().press('Enter');});
  before=commands.length;await diameter().press('Tab');await idle();assert.equal(commands.length,before);assert.equal(last.draft.dimensions.carob.crown.diameter,7);
  await diameter().fill('7.0');await diameter().press('Enter');await idle();assert.equal(commands.length,before);
  delayDimension=true;before=commands.length;
  await diameter().fill('8');await diameter().press('Enter');
  await crown().getByLabel('Note (optional)',{exact:true}).fill('Queued note');await crown().getByLabel('Note (optional)',{exact:true}).press('Enter');
  await crown().getByLabel('Dimension basis',{exact:true}).selectOption('measured');
  await poll(()=>commands.length>=before+3);await idle();assert.equal(commands.length,before+3);
  assert.deepEqual(last.draft.dimensions.carob.crown,{diameter:8,basis:'measured',note:'Queued note'});
  failDimension=true;await edit(async()=>{await diameter().fill('9');await diameter().press('Enter');});
  assert.equal(await diameter().inputValue(),'9');assert.equal(last.draft.dimensions.carob.crown.diameter,8);assert.equal(await page.getByRole('button',{name:'Save',exact:true}).isDisabled(),true);
  await edit(()=>crown().getByRole('button',{name:'Retry diameter edit',exact:true}).click());assert.equal(last.draft.dimensions.carob.crown.diameter,9);
  await edit(()=>crown().getByRole('button',{name:'Reset to default',exact:true}).click());assert.equal(await diameter().inputValue(),'6');
  await edit(()=>page.getByRole('button',{name:'Undo',exact:true}).click());assert.equal(await diameter().inputValue(),'9');
  await edit(()=>page.getByRole('button',{name:'Redo',exact:true}).click());assert.equal(await diameter().inputValue(),'6');
  // Returning to the current default while a different value is in flight is
  // still an edit; a later repeated value must not deduplicate against an old job.
  delayDimension=true;before=commands.length;
  for(const value of ['9','6','9']){await diameter().fill(value);await diameter().press('Enter');}
  await poll(()=>commands.length===before+3);await idle();assert.equal(last.draft.dimensions.carob.crown.diameter,9);
  await edit(()=>crown().getByRole('button',{name:'Reset to default',exact:true}).click());
  const start=last.instances.find(p=>p.id==='carob:0');const childId=Object.keys(last.draft.associations).find(id=>last.draft.associations[id].parent_id==='carob:0');assert.ok(childId);
  const childStart=last.instances.find(p=>p.id===childId);
  await plant('carob:0').focus();before=commands.length;
  await page.keyboard.down('ArrowRight');await page.keyboard.down('ArrowRight');await page.keyboard.down('ArrowRight');assert.equal(commands.length,before);
  await page.keyboard.up('ArrowRight');await poll(()=>commands.length===before+1);await idle();
  assert.ok(Math.abs(last.instances.find(p=>p.id==='carob:0').x-start.x-.3)<1e-8);
  assert.ok(Math.abs(last.instances.find(p=>p.id===childId).x-childStart.x-.3)<1e-8);
  await edit(()=>plant('carob:0').press('Shift+ArrowUp'));assert.ok(Math.abs(last.instances.find(p=>p.id==='carob:0').y-start.y+1)<1e-8);
  before=commands.length;await plant('carob:0').focus();await page.keyboard.down('ArrowLeft');await page.keyboard.press('Escape');await page.keyboard.up('ArrowLeft');assert.equal(commands.length,before);
  await edit(()=>plant(childId).press('ArrowDown'));assert.equal(Object.hasOwn(last.draft.associations,childId),false);
  await edit(()=>page.getByRole('button',{name:'Undo',exact:true}).click());assert.equal(last.draft.associations[childId].parent_id,'carob:0');
  await page.getByRole('button',{name:'Edit diameter · Algarrobo',exact:true}).click();
  failDimension=true;await edit(async()=>{await diameter().fill('11');await diameter().press('Enter');});
  await crown().getByRole('button',{name:'Discard diameter edit',exact:true}).click();assert.equal(await diameter().inputValue(),'6');
  assert.equal(await page.locator('.designer-status ~ .app-alert--error').count(),0);assert.equal(await page.getByRole('button',{name:'Save',exact:true}).isEnabled(),true);
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();await edit(()=>plant('carob:0').press('ArrowRight'));
  const pointerStart=last.instances.find(p=>p.id==='carob:0');
  const point=await plant('carob:0').evaluate(node=>{const c=node.querySelector('.designer-plant-hit'),svg=node.ownerSVGElement,p=svg.createSVGPoint();p.x=c.cx.baseVal.value;p.y=c.cy.baseVal.value;const q=p.matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y};});
  await edit(async()=>{await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+15,point.y+8,{steps:3});await page.mouse.up();});assert.notEqual(last.instances.find(p=>p.id==='carob:0').x,pointerStart.x);
  assert.ok(await page.locator('.designer-status.app-alert--warning').count());
  await page.getByRole('button',{name:'New design',exact:true}).click();assert.ok(await page.locator('dialog.app-alert--warning').count());await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByText('Design actions',{exact:true}).click();await page.getByRole('button',{name:'Delete saved design',exact:true}).click();assert.ok(await page.locator('dialog.app-alert--danger').count());await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Project',exact:true}).click();await page.getByRole('button',{name:'Site Designer',exact:true}).click();assert.equal(await page.locator('[data-located-instance]').count(),0);
  await page.getByRole('button',{name:'Zone',exact:true}).click();
  const countsBeforeResize=JSON.stringify(last.draft.selection);
  await edit(async()=>{const width=page.getByLabel('Zone width (m, area fixed)',{exact:true});await width.fill('7.1');await width.press('Enter');});
  assert.equal(JSON.stringify(last.draft.selection),countsBeforeResize);assert.ok(last.summary.unplaced>0);
  await edit(()=>page.getByRole('button',{name:'Place next in zone',exact:true}).first().click());
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('data-instance')),commands.at(-1).id);
  const positioned=last.instances.find(p=>p.id===commands.at(-1).id);assert.equal(positioned.manual,true);
  await page.getByRole('button',{name:'Establishment',exact:true}).click();
  await edit(()=>page.getByRole('checkbox',{name:'Assumed moisture pocket with example encina',exact:true}).click());
  assert.equal(await page.getByRole('checkbox',{name:'Assumed moisture pocket with example encina',exact:true}).isChecked(),true);
  assert.equal(await page.locator('.designer-dimension-label').count(),0);assert.equal(await page.locator('.designer-pocket').count(),1);
  // Real touch events use the same plant gesture path as mouse dragging.
  await page.getByRole('button',{name:'Fit zone',exact:true}).click();await plant('carob:0').scrollIntoViewIfNeeded();
  const touchPoint=await plant('carob:0').evaluate(node=>{const c=node.querySelector('.designer-plant-hit'),svg=node.ownerSVGElement,p=svg.createSVGPoint();p.x=c.cx.baseVal.value;p.y=c.cy.baseVal.value;const q=p.matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y};});
  const cdp=await context.newCDPSession(page);
  await edit(async()=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touchPoint]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchPoint.x+12,y:touchPoint.y+6}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});});
  await page.getByRole('button',{name:'Plants',exact:true}).click();
  await page.getByRole('button',{name:'Edit diameter · Algarrobo',exact:true}).click();
  await page.getByRole('button',{name:'Save',exact:true}).click();await idle();
  await poll(async()=>await page.locator('.designer-status.app-alert--success').count()===1);
  const persisted=(await api('designer')).evaluation.draft;assert.equal(persisted.pocket.enabled,true);assert.equal(persisted.dimensions.carob.crown,null);
  await page.getByRole('button',{name:'Project',exact:true}).click();await page.getByRole('button',{name:'New project',exact:true}).click();
  await page.getByLabel('New project name',{exact:true}).fill('Replacement preview only');
  await page.getByRole('button',{name:'Start new project',exact:true}).click();assert.equal(await page.locator('.replacement.app-alert--danger').count(),1);
  await page.locator('.replacement').getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Site Designer',exact:true}).click();
  // A fresh draft edit supplies an amber panel for each theme/viewport check.
  await edit(()=>plant('carob:0').press('ArrowRight'));
  for(const theme of ['light','dark'])for(const width of [1680,390,320]){
   await page.setViewportSize({width,height:1000});await page.getByRole('combobox',{name:'Theme',exact:true}).selectOption(theme);
   await page.getByRole('button',{name:'Edit diameter · Algarrobo',exact:true}).scrollIntoViewIfNeeded();await page.getByRole('button',{name:'Edit diameter · Algarrobo',exact:true}).click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,theme+' '+width+' page overflow');
   assert.equal(await diameter().isVisible(),true);assert.equal(await page.locator('.designer-svg').count(),1);
   const ratio=await page.locator('.designer-status.app-alert--warning').evaluate(node=>{
    const style=getComputedStyle(node),lum=value=>{const rgb=value.match(/[\d.]+/g).slice(0,3).map(v=>Number(v)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};const a=lum(style.color),b=lum(style.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
   });assert.ok(ratio>=4.5,`Warning contrast ${ratio} in ${theme}`);
   await page.screenshot({path:`../test-artifacts/designer-interactions-${theme}-${width}.png`,fullPage:true});
  }
  assert.equal(JSON.stringify((await api('project')).project),simulation,'Draft exploration changed simulation');assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,production:!!process.env.DESIGNER_PRODUCTION_DIR,previewRequests:commands.length,themes:['light','dark'],widths:[1680,390,320]}));
 }finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,1800))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
