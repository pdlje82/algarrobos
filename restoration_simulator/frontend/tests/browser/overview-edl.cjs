const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port==='8013','Use the isolated backend on 8013');
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let n=0;n<400;n++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Overview references timed out');}
(async()=>{
 let state=await api('project');state=await api('project/new',{revision:state.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Overview EDL fixture'});
 const route='LEADER-AL20-3.4',project=JSON.stringify(state.project),planning=JSON.stringify(state.planning.draft);
 const draft=await api('funding/context',{revision:state.revision,planning_revision:state.planning.planning_revision,design_revision:state.designer_revision,target:'activity',parcel_ids:[]});
 const edl=await api('funding/edl'),library=edl.library,expected={};
 draft.navigator_focus={version:1,programme_id:'LEADER-AL20',route_id:route};
 for(const row of Object.values(draft.selection_assessments[route].criteria)){
  const selections={};
  for(const id of Object.keys(row.answers))if(Object.hasOwn(library.bindings,id)){
   const ids=[...new Set(library.bindings[id].topic_ids.flatMap(t=>library.topics.find(topic=>topic.id===t).item_ids))];
   if(ids.length)selections[id]=id==='CO.1.3'?ids:ids.slice(0,2);
  }
  if(Object.keys(selections).length){row.edl_evidence={version:1,library_id:library.id,library_hash:edl.library_hash,selections};Object.assign(expected,selections);}
 }
 draft.selection_assessments[route].criteria['CO.1'].answers['CO.1.3']=true;
 const versionId=crypto.randomUUID(),review=await api('funding/workspace-preview',{revision:state.revision,draft,version_id:versionId});
 await api('funding/save',{revision:state.revision,funding_revision:state.funding_revision,planning_revision:state.planning.planning_revision,design_revision:state.designer_revision,request_id:crypto.randomUUID(),operation:'upgrade_workspace',draft,record_id:versionId,preview_hash:review.preview_hash});
 const initial=(await api('funding')).attachment.draft,browser=await chromium.launch({channel:'msedge',headless:true});let page;
 try{
  page=await browser.newPage({viewport:{width:1500,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const overview=page.getByRole('region',{name:'Project overview',exact:true}),item=id=>overview.locator(`[data-overview-item="${id}"]`),refs=id=>item(id).locator('.funding-overview-edl');
  const open=async()=>{await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();await refs('CO.1.3').waitFor();};
  await page.goto(url);await open();
  const score=await overview.locator('.funding-overview-score').innerText();
  for(const [id,ids] of Object.entries(expected)){
   assert.equal(await refs(id).getAttribute('open'),'');assert.equal(await refs(id).locator('[data-overview-edl]').count(),ids.length);
   const text=await refs(id).innerText();
   for(const rid of ids){const ref=library.items.find(i=>i.id===rid);assert(text.includes(`${rid} · ${ref.label}`),id+' lost '+rid);assert(text.includes(ref.summary),id+' lost reference text');}
  }
  assert.equal(await refs('CO.1.3').locator('[data-overview-edl]').count(),50);
  assert(!await item('CO.1.1').getByRole('checkbox',{name:'Selected CO.1.1',exact:true}).isChecked());
  const summary=refs('CO.1.3').locator('summary');await summary.click();assert.equal(await refs('CO.1.3').locator('li').first().isVisible(),false);await summary.focus();await page.keyboard.press('Enter');assert(await refs('CO.1.3').locator('li').last().isVisible());
  const source=refs('CO.1.3').locator('li').first().getByRole('link');await source.click();await page.locator('dialog.document-viewer').waitFor();await poll(async()=>!await page.getByLabel('PDF page',{exact:true}).isDisabled());assert.equal(await page.getByLabel('PDF page',{exact:true}).inputValue(),String(library.items.find(i=>i.id===expected['CO.1.3'][0]).page));await page.keyboard.press('Escape');assert(await source.evaluate(n=>n===document.activeElement));
  await overview.getByText('Readable overview and export',{exact:true}).click();const markdown=await overview.locator('.funding-overview-markdown').innerText();assert.match(markdown,/CO\.1\.3/);assert(markdown.includes(library.items.find(i=>i.id==='NPL50').summary));
  assert.deepEqual((await api('funding')).attachment.draft,initial,'Reading and collapsing must not edit selections');
  await item('IN.1.2').getByRole('button',{name:/^Open IN\.1\.2/}).click();const editor=page.locator('#funding-answer-editor');await editor.getByRole('checkbox',{name:/^EDL reference IN-T3:/}).check();await page.getByRole('button',{name:'Close question editor',exact:true}).click();await poll(async()=>await refs('IN.1.2').locator('[data-overview-edl]').count()===3);assert.equal(await overview.locator('.funding-overview-score').innerText(),score);
  await poll(async()=>(await api('funding')).attachment.draft.selection_assessments[route].criteria['IN.1'].edl_evidence.selections['IN.1.2'].length===3);
  await page.reload();await open();assert.equal(await refs('IN.1.2').locator('[data-overview-edl]').count(),3);
  const saved=(await api('funding')).attachment.draft;
  let corrupt=true;await page.route('**/api/funding/overview',async request=>{if(!corrupt)return request.continue();corrupt=false;const response=await request.fetch(),body=await response.json();delete body.criteria.find(c=>c.id==='CO.1').items.find(i=>i.id==='CO.1.3').edl[0].summary;return request.fulfill({response,json:body});});
  await page.reload();await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();await overview.getByRole('alert').filter({hasText:'overview EDL reference.summary'}).waitFor();assert.deepEqual((await api('funding')).attachment.draft,saved);await overview.getByRole('button',{name:'Retry overview',exact:true}).click();await refs('CO.1.3').waitFor();
  for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.setViewportSize({width:390,height:844});await refs('CO.1.3').locator('summary').click();await item('CO.1.1').scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`test-artifacts/overview-edl-${theme}-phone.png`});if(theme==='light')await refs('CO.1.3').locator('summary').click();}
  await page.setViewportSize({width:1500,height:1000});await item('CO.1.1').scrollIntoViewIfNeeded();await page.screenshot({path:'test-artifacts/overview-edl-desktop.png'});
  const after=await api('project');assert.equal(JSON.stringify(after.project),project);assert.equal(JSON.stringify(after.planning.draft),planning);assert.deepEqual(errors,[]);
  console.log('Overview: complete selected references in every subnode, all 50 needs, independent unscored selections, collapse/keyboard, PDF/focus, export, edit/reload, invalid response/retry and phone themes passed.');
 }catch(e){console.error(e);if(page)await page.screenshot({path:'test-artifacts/overview-edl-failure.png'});throw e;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,3000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
