const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port==='8013','Use the isolated backend');
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<400;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Legacy Navigator state timed out');}
(async()=>{
 const fixture=JSON.parse(await fs.readFile('../test-artifacts/navigator-legacy-fixture.json','utf8')),state=await api('project');await api('import',{revision:state.revision,request_id:crypto.randomUUID(),save:fixture,confirm_replace:true});
 const before=(await api('funding')).attachment.draft,project=JSON.stringify((await api('project')).project);
 const browser=await chromium.launch({channel:'msedge',headless:true});let page;
 try{
  page=await browser.newPage({viewport:{width:1400,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();await page.getByRole('button',{name:'Review applicant type',exact:true}).waitFor();assert.deepEqual((await api('funding')).attachment.draft,before);
  await page.getByRole('button',{name:'Review applicant type',exact:true}).click();const review=page.getByRole('region',{name:'Review editing format',exact:true});await review.waitFor();assert.deepEqual((await api('funding')).attachment.draft,before);await review.getByRole('button',{name:'Use updated editing format',exact:true}).click();await poll(async()=>(await api('funding')).attachment.draft.version===3);
  await page.getByRole('button',{name:'Review workspace update',exact:true}).click();await page.getByRole('region',{name:'Workspace update review',exact:true}).getByRole('button',{name:'Use autosaved versions and selected-items scoring',exact:true}).click();await poll(async()=>(await api('funding')).attachment.version===2);assert.equal((await api('funding')).attachment.draft.bundle.selection.version,3);assert.equal(JSON.stringify((await api('project')).project),project);assert.deepEqual(errors,[]);
  console.log('Navigator legacy: original editing format stays readable/unchanged until explicit applicant-format and workspace reviews; source project preserved.');
 }catch(e){if(page)await page.screenshot({path:'test-artifacts/navigator-legacy-failure.png'});throw e;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,3000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
