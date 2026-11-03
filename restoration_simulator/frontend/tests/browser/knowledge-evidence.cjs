// Mutates only the explicit isolated fixture on API 8013; never the normal app.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {selectProgramme}=require('./funding-programme-helper.cjs');
for(const key of ['PLAYWRIGHT_MODULE','DESIGNER_TEST_API','DESIGNER_APP_URL'])assert(process.env[key],`Set ${key}`);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert.equal(new URL(root).port,'8013','Evidence checks require the isolated API on 8013');
const folder='../test-artifacts/knowledge-features';
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert(r.ok,await r.clone().text());return r.json();}
async function poll(fn){for(let i=0;i<300;i++){if(await fn())return;await new Promise(r=>setTimeout(r,40));}throw Error('Evidence browser state timed out');}
async function seed(){
  let p=await api('project');p=await api('project/new',{revision:p.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Shared evidence fixture'});
  const form=await api('land/form',{revision:p.revision,route_id:'existing',parcel_id:'new'}),inputs=Object.fromEntries(form.fields.map(f=>[f.name,f.default]));
  Object.assign(inputs,{route_id:'existing',parcel_id:'new',parcel_area:4500,covered_area:4500});
  p=await api('commit',{revision:p.revision,request_id:crypto.randomUUID(),action_id:'establish_access',inputs});
  let w=await api('designer'),evaluation=await api('designer/preview',{revision:p.revision,draft:w.evaluation.draft,command:{kind:'toggle',collection:'approaches',id:'mr2',enabled:true}});
  await api('designer/save',{revision:p.revision,design_revision:w.design_revision,request_id:crypto.randomUUID(),mode:'create',design_id:null,name:'Evidence design',draft:evaluation.draft});
  p=await api('project');
  const draft=await api('funding/context',{revision:p.revision,planning_revision:p.planning.planning_revision,design_revision:p.designer_revision,target:'activity',parcel_ids:[]});
  const concept=await api('funding/project-concept/create',{revision:p.revision,draft,route:'LEADER-AL20-3.4'});
  const delivery=await api('funding/delivery-plan/prepare',{revision:p.revision,concept_id:concept.id,concept,import_execution:false});
  concept.delivery_plan=delivery.plan;draft.project_concepts={'LEADER-AL20-3.4':concept};
  await api('funding/save',{revision:p.revision,funding_revision:p.funding_revision,planning_revision:p.planning.planning_revision,design_revision:p.designer_revision,request_id:crypto.randomUUID(),operation:'draft',draft,record_id:null});
}
(async()=>{
  await fs.mkdir(folder,{recursive:true});await seed();
  const browser=await chromium.launch({channel:'msedge',headless:true});let page;
  const seen=new Set(),claims=new Set(),errors=[],posts=[],calls=[];
  let failConsumer=null,malformed=false,blockSave=false;
  try{
    page=await browser.newPage({viewport:{width:1440,height:1050}});page.setDefaultTimeout(18000);page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/')){calls.push(r.url());if(r.method()!=='GET')posts.push(new URL(r.url()).pathname);}});
    await page.route('**/api/knowledge/feature-evidence/*',async r=>{
      const id=new URL(r.request().url()).pathname.split('/').at(-1);
      if(id===failConsumer)return r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Fixture evidence temporarily unavailable'})});
      if(malformed)return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({version:99})});
      return r.continue();
    });
    await page.route('**/api/funding/save',r=>blockSave?r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Fixture funding draft remains local'})}):r.continue());
    async function noWrites(action){const before=posts.length;await action();await page.waitForTimeout(300);assert.deepEqual(posts.slice(before),[],'Reading evidence submitted an API command');}
    async function settledFunding(){await poll(async()=>await page.getByRole('status',{name:'Funding save status',exact:true}).locator('strong').innerText()==='Saved to this computer');await page.waitForTimeout(600);}
    const pane=key=>page.locator(`[data-evidence-context="${key}"]:visible`);
    async function open(key){
      const target=pane(key);assert.equal(await target.count(),1,key);assert.equal(await target.evaluate(n=>n.open),false);
      await noWrites(async()=>{await target.locator(':scope > summary').focus();await page.keyboard.press('Enter');await target.getByRole('button',{name:'Refresh current evidence',exact:true}).waitFor();});
      seen.add(key);for(const id of await target.locator('[data-knowledge-claim]').evaluateAll(nodes=>nodes.map(n=>n.dataset.knowledgeClaim)))claims.add(id);
      console.log('Evidence opened:',key);
      assert.match(await target.innerText(),/Coverage is limited to registered pilot/);return target;
    }
    async function pdf(target,document,pageNumber){
      const link=target.locator(`a[href*="/documents/${document}/file"][href$="#page=${pageNumber}"]`).first();
      assert.match(await link.getAttribute('href'),/expected_sha256=[a-f0-9]{64}/);
      await noWrites(async()=>{await link.click();await page.locator('dialog.document-viewer').waitFor();await poll(async()=>!await page.getByLabel('PDF page',{exact:true}).isDisabled());assert.equal(await page.getByLabel('PDF page',{exact:true}).inputValue(),String(pageNumber));await page.keyboard.press('Escape');await page.locator('dialog.document-viewer').waitFor({state:'detached'});assert(await link.evaluate(n=>document.activeElement===n));});
    }
    async function layouts(target,prefix){
      for(const theme of ['light','dark'])for(const width of [1440,390,320]){
        await page.setViewportSize({width,height:1000});await page.getByLabel('Theme',{exact:true}).selectOption(theme);await target.scrollIntoViewIfNeeded();
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${prefix} page overflows at ${width}`);
        assert(await target.evaluate(n=>n.scrollWidth<=n.clientWidth+1),`${prefix} evidence overflows at ${width}`);
        await page.screenshot({path:`${folder}/${prefix}-${theme}-${width}.png`});
      }
      await page.setViewportSize({width:1440,height:1050});
    }
    console.log('Fixture seeded; opening funding workspace.');
    await page.goto(url);await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();
    console.log('Funding workspace opened; selecting AL20.');
    await selectProgramme(page,'LEADER-AL20');
    const graph=page.locator('.funding-diagram-scroll');await graph.locator('.funding-graph-option[data-option-id="LEADER-AL20-3.4"]').getByRole('radio',{name:'Work on LEADER-AL20-3.4',exact:true}).check();
    await graph.locator('.funding-circumstance[data-question-id="selection_score"]').click();
    await page.getByLabel('AL20 assessment route',{exact:true}).selectOption('LEADER-AL20-3.4');
    const group=graph.locator('.funding-annex-group[data-annex-criterion="PT.1"]');if(await group.getAttribute('aria-expanded')!=='true')await group.click();
    await graph.locator('.funding-annex-choice[data-annex-choice="PT.1.1"]').click();
    await pane('selection_guidance/route-34').waitFor();await settledFunding();
    assert.equal(calls.filter(s=>s.includes('/knowledge/feature-evidence/')).length,0,'Evidence loaded before opening');
    let target=await open('selection_guidance/route-34');assert.match(await target.innerText(),/Current availability: not assessed/);await pdf(target,'FUND-008',120);await layouts(target,'selection-evidence');
    const draftBefore=(await api('funding')).attachment.draft;
    failConsumer='selection_guidance';blockSave=true;
    const notes=page.getByLabel('Item notes (optional)',{exact:true});await notes.fill('Unfinished source-review note');await page.waitForTimeout(1600);
    await target.getByRole('button',{name:'Refresh current evidence',exact:true}).click();await target.getByRole('alert').waitFor();assert.equal(await notes.inputValue(),'Unfinished source-review note');assert.equal(await target.locator('[data-knowledge-claim]').count(),0);
    failConsumer=null;await noWrites(()=>target.getByRole('button',{name:'Retry current evidence',exact:true}).click());await target.getByRole('button',{name:'Refresh current evidence',exact:true}).waitFor();assert.equal(await notes.inputValue(),'Unfinished source-review note');
    assert.deepEqual((await api('funding')).attachment.draft.selection_assessments,draftBefore.selection_assessments);
    blockSave=false;await page.getByRole('button',{name:'Retry failed save',exact:true}).click();await settledFunding();
    await page.getByRole('button',{name:'Close question editor',exact:true}).click();
    await page.getByRole('button',{name:'Activities and delivery',exact:true}).click();
    await pane('project_concept/restoration-34').waitFor();await settledFunding();target=await open('project_concept/restoration-34');assert.match(await target.innerText(),/Illustrative activity/);
    await pdf(target,'FUND-013',395);await layouts(target,'funding-evidence');
    blockSave=true;const conceptNotes=page.locator('.project-concept-editor').getByLabel(/Context.*notes/i);await conceptNotes.fill('Unfinished concept evidence review');await page.waitForTimeout(1600);
    malformed=true;await target.getByRole('button',{name:'Refresh current evidence',exact:true}).click();await target.getByRole('alert').waitFor();assert.equal(await conceptNotes.inputValue(),'Unfinished concept evidence review');assert.match(await target.innerText(),/incompatible/);
    malformed=false;await target.getByRole('button',{name:'Retry current evidence',exact:true}).click();await target.getByRole('button',{name:'Refresh current evidence',exact:true}).waitFor();assert.equal(await conceptNotes.inputValue(),'Unfinished concept evidence review');
    blockSave=false;await page.getByRole('button',{name:'Retry failed save',exact:true}).click();await settledFunding();
    const novelty=page.locator('[data-delivery-topic="novelty"]');await novelty.locator(':scope > summary').click();target=await open('delivery_plan/novelty-34');await layouts(target,'novelty-evidence');
    const sharing=page.locator('[data-delivery-topic="sharing"]');await sharing.locator(':scope > summary').click();const publication=page.locator('[data-delivery-topic="publication"]');await publication.locator(':scope > summary').click();target=await open('delivery_plan/publication-34');await layouts(target,'publication-evidence');
    const fundingSnapshot=(await api('funding')).attachment;
    await page.getByRole('button',{name:'Site Designer',exact:true}).click();await page.locator('.designer-svg').waitFor();
    const designSnapshot=await api('designer'),projectSnapshot=(await api('project')).project;
    const mr2=page.locator('[data-evidence-context="designer/mr2"]');await mr2.locator('..').locator(':scope > summary').click();await page.waitForTimeout(500);
    target=await open('designer/mr2');assert.match(await target.innerText(),/1000 cm3/);assert.match(await target.innerText(),/200-300 cm3/);assert.match(await target.innerText(),/Your design retains rules/);assert.match(await target.innerText(),/not excavation or planting depth/);await pdf(target,'FOREST-002',134);
    await layouts(target,'designer-evidence');
    await page.getByRole('button',{name:'Plants',exact:true}).click();await page.locator('.designer-svg [data-instance="carob:0"]').click();
    target=await open('designer/carob');assert.match(await target.innerText(),/Current reference assumption/);await layouts(target,'carob-evidence');
    const input=page.getByLabel('Crown / plant diameter (m)',{exact:true});await input.fill('');
    failConsumer='designer';await target.getByRole('button',{name:'Refresh current evidence',exact:true}).click();await target.getByRole('alert').waitFor();assert.equal(await input.inputValue(),'');failConsumer=null;
    await noWrites(()=>target.getByRole('button',{name:'Retry current evidence',exact:true}).click());await target.getByRole('button',{name:'Refresh current evidence',exact:true}).waitFor();assert.equal(await input.inputValue(),'');
    assert.equal(seen.size,6);assert.equal(claims.size,12);assert.deepEqual((await api('funding')).attachment,fundingSnapshot);assert.deepEqual(errors,[]);
    assert.deepEqual(await api('designer'),designSnapshot);assert.deepEqual((await api('project')).project,projectSnapshot);
    await fs.writeFile(`${folder}/browser-evidence-summary.json`,JSON.stringify({contexts:[...seen],claims:[...claims],errors,checks:'Six placements; lazy GETs; no commands from evidence; failure/retry and unfinished inputs; stock tension; assumptions; PDF editions/pages/focus; 1440/390/320 light/dark.'},null,2));
    console.log('Shared evidence browser checks passed: six contexts, twelve claims, read-only interactions, failures/retry, unfinished drafts, PDF pages/focus and responsive themes.');
  }catch(error){console.error(error);if(page)try{await page.screenshot({path:`${folder}/browser-evidence-failure.png`,timeout:5000});}catch(captureError){console.error('Failure screenshot:',captureError.message);}throw error;}finally{await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,3000))]);}
})().then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1);});
