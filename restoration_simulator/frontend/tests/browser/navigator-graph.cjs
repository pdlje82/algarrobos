const assert=require('node:assert/strict');
const {selectProgramme}=require('./funding-programme-helper.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port==='8013','Use the isolated backend');
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<400;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Navigator graph state timed out');}
(async()=>{
 const initial=(await api('funding')).attachment;assert.equal(initial.version,2,'Run navigator-versions first');const project=JSON.stringify((await api('project')).project);
 const browser=await chromium.launch({channel:'msedge',headless:true});let page;
 try{
  page=await browser.newPage({viewport:{width:1500,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
  await page.goto(url);await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();await page.locator('.funding-steps').getByRole('button',{name:'Explore and score',exact:true}).click();
  const graph=page.locator('.funding-diagram-scroll'),editor=page.locator('#funding-answer-editor');
  const saved=()=>poll(async()=>/Saved to this computer/.test(await page.getByRole('status',{name:'Funding save status',exact:true}).locator('strong').innerText()));
  for(const short of ['3.4','3.5','1.11','2.6','2.7']){
   const route='LEADER-AL20-'+short;await selectProgramme(page,'LEADER-AL20');await graph.getByRole('radio',{name:`Work on ${route}`,exact:true}).check();await poll(async()=>!/Updating/.test(await page.locator(".funding-visual-status").innerText()));if(await graph.locator('[data-question-id="selection_score"]').count()===0)await graph.getByRole("button",{name:/^Requirements met/}).click();await graph.locator('[data-question-id="selection_score"]').click();await graph.locator('.funding-annex-group[data-annex-criterion="AT.3"]').click();const opener=graph.locator('[data-annex-choice="AT.3.1"]');await opener.click();const checkbox=editor.getByRole('checkbox',{name:'Selected AT.3.1',exact:true});await checkbox.check();if(await editor.getByRole('group',{name:'Related scoring changes',exact:true}).count())await editor.getByRole('button',{name:'Confirm selection and related changes',exact:true}).click();await editor.getByLabel('Item notes (optional)',{exact:true}).fill(`Independent notes for ${route}`);
   if(short==='3.4'){
    const summary=editor.getByText('Criterion overview, limitations and sources',{exact:true});await summary.click();const cited=summary.locator('..').locator('.funding-sources').getByRole('link').first();await cited.click();await page.locator('dialog.document-viewer').waitFor();await poll(async()=>!await page.getByLabel('PDF page',{exact:true}).isDisabled());await page.keyboard.press('Escape');assert(await cited.evaluate(n=>document.activeElement===n));
   }
   await page.getByRole('button',{name:'Close question editor',exact:true}).click();assert(await opener.evaluate(n=>document.activeElement===n));await saved();assert.equal((await api('funding')).attachment.draft.selection_assessments[route].criteria['AT.3'].choice_context.items['AT.3.1'].notes,`Independent notes for ${route}`);
  }
  const context=page.locator('.funding-answers');if(await context.getAttribute('open')===null)await context.locator(':scope > summary').click();await context.getByText(/^Inputs to add/).click();await context.locator('.funding-answer-row[data-question-id="applicant_choice"]').getByRole('button',{name:'Edit',exact:true}).click();const applicant=editor.getByRole('combobox',{name:'Applicant type',exact:true});assert.equal(await applicant.locator('option[value="type:nonprofit"]').count(),1);assert.equal(await applicant.locator('option[value="type:public"]').count(),1);await applicant.selectOption('type:nonprofit');await page.getByRole('button',{name:'Close question editor',exact:true}).click();await saved();
  const headers=page.locator('.funding-column-headers');assert.equal(await graph.locator('.funding-column-headers').count(),0);const top=(await headers.boundingBox()).y;await graph.evaluate(n=>{n.scrollTop=1200;});assert(Math.abs((await headers.boundingBox()).y-top)<2);
  await graph.evaluate(n=>{n.scrollTop=0;});await graph.getByRole('separator',{name:'Resize Programme and Route requirements columns',exact:true}).focus();await page.keyboard.press('ArrowRight');
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'test-artifacts/navigator-graph-phone.png'});
  await page.setViewportSize({width:1500,height:1000});await selectProgramme(page,'EU-LIFE');const lifeRoute=(await api('funding/catalogue')).entries.find(e=>e.id.startsWith('EU-LIFE')).id;await graph.getByRole('radio',{name:`Work on ${lifeRoute}`,exact:true}).check();await page.locator('.funding-steps').getByRole('button',{name:'Project overview',exact:true}).click();await page.getByText('This route has no AL20 scoring assessment.',{exact:true}).waitFor();
  assert.equal(JSON.stringify((await api('project')).project),project);assert.deepEqual(errors,[]);console.log('Navigator graph: all five AL20 routes, checkbox editors, independent notes, source viewer/focus, graph focus, pinned headers, resizing, mobile and non-AL20 overview passed.');
 }catch(e){if(page)await page.screenshot({path:'test-artifacts/navigator-graph-failure.png'});throw e;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,3000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
