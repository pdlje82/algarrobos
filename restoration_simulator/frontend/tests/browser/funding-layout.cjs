const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port!=='8000','Use isolated project data');
async function api(p,body){const r=await fetch(root+p,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<250;i++){if(await fn())return;await new Promise(r=>setTimeout(r,40));}throw Error('Floating editor state timed out');}
(async()=>{
 let project=await api('project');project=await api('project/new',{revision:project.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Floating funding editor fixture'});
 const before=JSON.stringify(project.project),planningBefore=JSON.stringify(project.planning.draft);
 const browser=await chromium.launch({channel:'msedge',headless:true});let page;
 try{
  const context=await browser.newContext({viewport:{width:1500,height:1000},hasTouch:true,reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(12000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();
  const visual=page.getByLabel('Live funding consequences',{exact:true}),editor=page.getByRole('dialog',{name:'Edit funding answer',exact:true});
  const settled=()=>poll(async()=>!/Updating/.test(await visual.locator('.funding-visual-status').innerText()));await settled();
  await page.getByRole('button',{name:'Choose activity',exact:true}).click();await page.locator('#funding-activity').selectOption('business');await settled();await page.getByText('Exploration draft saved.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'2. People and land',exact:true}).click();assert.equal(await page.locator('.funding-main').count(),0);assert.equal(await editor.count(),0);
  assert.equal(await visual.getByRole('button',{name:'Graph',exact:true}).getAttribute('aria-pressed'),'true','Graph opens by default');await visual.evaluate(n=>n.scrollIntoView({block:'start'}));
  const graph=visual.locator('.funding-diagram-scroll'),node=visual.locator('[data-question-id="applicant_choice"]');
  const positions=()=>visual.locator('.funding-circumstance,.funding-graph-option').evaluateAll(ns=>ns.map(n=>[n.dataset.questionId||n.dataset.optionId,n.style.left,n.style.top,n.style.width]));
  async function belowPair(selected){
   const geometry=await selected.evaluate(n=>{const nodes=[...n.closest('.funding-diagram-scroll').querySelectorAll('.funding-circumstance')],index=nodes.indexOf(n),pair=nodes.slice(index===nodes.length-1?Math.max(0,index-1):index,index+2),panel=n.closest('.funding-diagram-scroll').getBoundingClientRect();return {pair:pair.map(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}),panel:{top:panel.top,bottom:panel.bottom}};});
   const box=await editor.boundingBox(),bottom=Math.max(...geometry.pair.map(r=>r.bottom));
   assert(box.y>=bottom+11,'Editor leaves both circumstance nodes and their connections above it');
   const height=page.viewportSize().height;
   assert(box.y+box.height<=height+1&&box.height>=200,'Editor stays reachable below the nodes');
   for(const rect of geometry.pair){assert(rect.top>=Math.max(0,geometry.panel.top)-1&&rect.bottom<=Math.min(height,geometry.panel.bottom)+1,'Both context nodes remain in view');}
  }
  const initial=await positions();
  await node.click();await belowPair(node);
  const next=visual.locator('.funding-circumstance').nth(1);await next.click();await belowPair(next);assert.equal(await page.locator(':focus').getAttribute('id'),'funding-municipality');
  await page.screenshot({path:'test-artifacts/funding-editor-below-two-nodes.png'});
  await page.setViewportSize({width:1280,height:720});await belowPair(next);
  await page.setViewportSize({width:1500,height:1000});
  await node.click();await belowPair(node);const opening=await editor.boundingBox();
  assert.equal(await page.locator(':focus').getAttribute('id'),'funding-applicant_choice');
  const handle=editor.getByRole('button',{name:'Move question editor',exact:true});let grip=await handle.boundingBox();
  await page.mouse.move(grip.x+80,grip.y+20);await page.mouse.down();await page.mouse.move(100,100,{steps:10});await page.mouse.up();
  let moved=await editor.boundingBox();assert(Math.abs(moved.x-opening.x)>100);assert.deepEqual(await positions(),initial);
  await page.locator('#funding-applicant_choice').selectOption('planned:nonprofit');await settled();assert(Math.abs((await editor.boundingBox()).x-moved.x)<2);
  const colours=await node.evaluate(n=>{const s=getComputedStyle(n),status=getComputedStyle(document.querySelector('.funding-metric.funding-outcome-conflicts'));return {bg:s.backgroundColor,expected:status.backgroundColor,outline:s.outlineWidth,shadow:s.boxShadow};});
  assert.equal(await node.getAttribute('data-condition-status'),'fail');assert.equal(colours.bg,colours.expected,'Selection retains the conflict fill');assert.equal(colours.outline,'3px');assert.notEqual(colours.shadow,'none','Changed-answer highlights remain visible');
  await editor.getByRole('button',{name:'Next question',exact:true}).click();assert.equal(await page.locator('#funding-municipality').count(),1);assert.equal(await page.locator('#funding-municipality optgroup option').count(),32);
  await page.locator('#funding-municipality').selectOption('Terque');await settled();assert(Math.abs((await editor.boundingBox()).x-moved.x)<2);
  const about=editor.getByRole('button',{name:'About Municipality',exact:true});await about.click();
  const help=page.getByRole('dialog',{name:'About Municipality',exact:true}),source=help.getByRole('link',{name:'Official AL20 municipalities · PDF page 3',exact:true});await source.click();
  await page.locator('dialog.document-viewer').waitFor();await poll(async()=>!await page.getByLabel('PDF page',{exact:true}).isDisabled());assert.equal(await page.getByLabel('PDF page',{exact:true}).inputValue(),'3');await page.keyboard.press('Escape');assert(await source.evaluate(n=>n===document.activeElement));assert(await editor.isVisible());
  await page.keyboard.press('Escape');assert(await editor.isVisible());assert(await about.evaluate(n=>n===document.activeElement));
  await handle.focus();const beforeKey=await editor.boundingBox();await page.keyboard.press('ArrowRight');assert(Math.abs((await editor.boundingBox()).x-beforeKey.x-10)<2);
  grip=await handle.boundingBox();await page.mouse.move(grip.x+60,grip.y+15);await page.mouse.down();await page.mouse.move(-100,-100,{steps:8});await page.mouse.up();moved=await editor.boundingBox();assert(moved.x>=8&&moved.y>=8);
  await page.keyboard.press('Escape');assert.equal(await editor.count(),0);assert(await node.evaluate(n=>n===document.activeElement));
  // Both dividers resize HTML nodes and their SVG connectors without funding requests.
  let assessments=0;page.on('request',r=>{if(r.url().endsWith('/funding/visualise'))assessments++;});
  const first=graph.getByRole('separator',{name:'Resize exploration and circumstances columns',exact:true}),second=graph.getByRole('separator',{name:'Resize circumstances and funding options columns',exact:true});
  await graph.evaluate(n=>{n.scrollTop=0;});const pane=await graph.boundingBox();
  const firstBefore=Number(await first.getAttribute('aria-valuenow')),firstBox=await first.boundingBox();
  await page.mouse.move(firstBox.x+9,pane.y+20);await page.mouse.down();await page.mouse.move(firstBox.x+79,pane.y+20,{steps:8});await page.mouse.up();
  assert(Math.abs(Number(await first.getAttribute('aria-valuenow'))-firstBefore-70)<2);assert.notDeepEqual(await positions(),initial);
  const path=await graph.locator('svg path').first().getAttribute('d');assert(!path.includes('NaN'));
  await second.focus();const secondBefore=Number(await second.getAttribute('aria-valuenow'));await page.keyboard.press('Shift+ArrowLeft');assert.equal(Number(await second.getAttribute('aria-valuenow')),secondBefore-40);
  const resized=await positions();await visual.getByRole('button',{name:'Matrix',exact:true}).click();await visual.getByRole('button',{name:'Graph',exact:true}).click();assert.deepEqual(await positions(),resized);
  await second.focus();await page.keyboard.press('Home');assert.equal(await second.getAttribute('aria-valuenow'),await second.getAttribute('aria-valuemin'));await page.keyboard.press('End');assert.equal(await second.getAttribute('aria-valuenow'),await second.getAttribute('aria-valuemax'));
  await visual.getByRole('button',{name:'Reset column widths',exact:true}).click();assert.deepEqual(await positions(),initial);assert.equal(assessments,0);
  // Clicking another node re-anchors even after a manual drag. The last node
  // retains the preceding node as its second piece of context.
  const last=visual.locator('.funding-circumstance').last();await last.click();await belowPair(last);
  await page.screenshot({path:'test-artifacts/funding-editor-below-last-node.png'});
  await page.getByRole('button',{name:'Close question editor',exact:true}).click();
  await visual.getByRole('button',{name:'Expand view',exact:true}).click();await last.click();await belowPair(last);
  await page.getByRole('button',{name:'Close question editor',exact:true}).click();await visual.getByRole('button',{name:'Compact view',exact:true}).click();
  const municipality=visual.locator('[data-question-id="municipality"]');await municipality.click();await belowPair(municipality);
  await page.getByRole('button',{name:'Close question editor',exact:true}).click();
  await visual.getByRole('button',{name:'Answer questions',exact:true}).click();assert.equal(await page.locator('#funding-municipality').inputValue(),'Terque');
  await page.screenshot({path:'test-artifacts/funding-floating-editor-desktop.png'});
  for(const theme of ['light','dark']){
   await page.getByRole('button',{name:'Close question editor',exact:true}).click();await page.getByLabel('Theme',{exact:true}).selectOption(theme);await page.setViewportSize({width:390,height:844});
   assert.equal(await graph.getByRole('separator').count(),0);
   await visual.getByRole('button',{name:'Expand funding visual workspace',exact:true}).click();await visual.getByRole('button',{name:'Answer questions',exact:true}).click();
   const bounds=await editor.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.y>=0&&bounds.y+bounds.height<=844);
   await page.locator('#funding-municipality').selectOption('Ohanes');await settled();assert.equal(await page.locator('#funding-municipality optgroup option').count(),32);
   await page.screenshot({path:`test-artifacts/funding-floating-editor-${theme}-phone.png`});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.getByRole('button',{name:'Close question editor',exact:true}).click();await visual.getByRole('button',{name:'Collapse funding visual workspace',exact:true}).click();
   // Reopen for the next iteration, exercising the same editor from Matrix too.
   await visual.getByRole('button',{name:'Expand funding visual workspace',exact:true}).click();await visual.getByRole('button',{name:'Matrix',exact:true}).click();await visual.getByRole('button',{name:'Answer questions',exact:true}).click();await visual.getByRole('button',{name:'Collapse funding visual workspace',exact:true}).click();
  }
  await page.getByRole('button',{name:'Close question editor',exact:true}).click();
  await poll(async()=>!(await api('funding')).attachment.draft.overrides.municipality.includes('Terque'));
  const after=await api('project');assert.equal(JSON.stringify(after.project),before);assert.equal(JSON.stringify(after.planning.draft),planningBefore);assert.deepEqual(errors,[]);
  console.log('Floating funding editor: default Graph, below-pair anchoring/re-anchoring, last-node context, drag/keyboard movement, resets, PDF focus, column drag/keyboard/reset, Matrix and phone themes passed.');
 }catch(e){if(page)await page.screenshot({path:'test-artifacts/funding-floating-editor-failure.png'});throw e;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,5000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
