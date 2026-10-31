const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port!=='8000','Use isolated test servers');
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<250;i++){if(await fn())return;await new Promise(r=>setTimeout(r,40));}throw Error('Node height assertion timed out');}
(async()=>{
 let p=await api('project');p=await api('project/new',{revision:p.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Node height fixture'});
 const before=JSON.stringify(p.project),browser=await chromium.launch({channel:'msedge',headless:true});let page;
 try{
  page=await browser.newPage({viewport:{width:1440,height:2560},hasTouch:true,reducedMotion:'reduce'});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();await page.getByRole('button',{name:'2. People and land',exact:true}).click();
  const visual=page.getByLabel('Live funding consequences',{exact:true}),graph=visual.locator('.funding-diagram-scroll'),bar=visual.locator('.funding-node-height-toggle'),expand=visual.getByRole('button',{name:'Expand node area',exact:true});
  await graph.waitFor();await poll(async()=>/Saved to this computer/.test(await page.getByRole('status',{name:'Funding save status',exact:true}).locator('strong').innerText()));
  const savedDraft=JSON.stringify((await api('funding')).attachment.draft),initial=(await graph.boundingBox()).height;
  assert(initial<=902,'Default canvas retains its normal height cap');
  assert.equal(await visual.getByRole('separator',{name:'Resize node area height',exact:true}).count(),0,'No vertical drag control remains');
  const options=await graph.locator('.funding-graph-option').evaluateAll(ns=>ns.map(n=>n.dataset.optionId));
  let fundingRequests=0;page.on('request',r=>{if(/funding\/(visualise|evaluate|save)$/.test(new URL(r.url()).pathname))fundingRequests++;});
  await graph.evaluate(n=>{n.scrollTop=200;});await bar.click();
  await poll(async()=>await graph.evaluate(n=>n.scrollHeight<=n.clientHeight+1));
  assert.equal(await bar.getAttribute('aria-expanded'),'true');assert((await graph.boundingBox()).height>initial);
  assert.deepEqual(await graph.locator('.funding-graph-option').evaluateAll(ns=>ns.map(n=>n.dataset.optionId)),options);
  await page.screenshot({path:'test-artifacts/funding-node-height-portrait.png'});
  await visual.getByRole('button',{name:'Collapse node area',exact:true}).click();
  await poll(async()=>Math.abs((await graph.boundingBox()).height-initial)<3);assert.equal(await graph.evaluate(n=>n.scrollTop),200);assert(await bar.evaluate(n=>n===document.activeElement));
  await expand.focus();await page.keyboard.press('Enter');await poll(async()=>await graph.evaluate(n=>n.scrollHeight<=n.clientHeight+1));
  await visual.getByRole('button',{name:'Focus current question',exact:true}).click();await visual.getByRole('button',{name:'All fit requirements',exact:true}).click();assert.equal(await bar.getAttribute('aria-expanded'),'true');
  await bar.focus();await page.keyboard.press('Space');await poll(async()=>Math.abs((await graph.boundingBox()).height-initial)<3);
  // On narrow screens, click/tap toggles full height and horizontal graph scroll remains available.
  await page.setViewportSize({width:390,height:844});await visual.getByRole('button',{name:'Expand funding visual workspace',exact:true}).click();const phone=(await graph.boundingBox()).height;
  await bar.click();await poll(async()=>await graph.evaluate(n=>n.scrollHeight<=n.clientHeight+1));await bar.click();await poll(async()=>Math.abs((await graph.boundingBox()).height-phone)<3);
  assert(await graph.evaluate(n=>n.scrollWidth>n.clientWidth));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.equal(fundingRequests,0,'Canvas height is a transient display preference');assert.equal(JSON.stringify((await api('funding')).attachment.draft),savedDraft);assert.equal(JSON.stringify((await api('project')).project),before);assert.deepEqual(errors,[]);
  console.log('Funding node area: portrait click/keyboard expansion, complete height, collapse/focus, unchanged option scope, requirement-scope preservation, mobile scrolling and no funding mutations passed.');
 }catch(e){if(page)await page.screenshot({path:'test-artifacts/funding-node-height-failure.png'});throw e;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,3000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
