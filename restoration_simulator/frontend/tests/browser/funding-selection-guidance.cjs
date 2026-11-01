const {selectProgramme}=require('./funding-programme-helper.cjs');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port==='8013','Use the documented isolated backend on 8013');
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<300;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Selection guidance browser state timed out');}
(async()=>{
  let project=await api('project');project=await api('project/new',{revision:project.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Selection guidance fixture'});
  const before=JSON.stringify(project.project),planning=JSON.stringify(project.planning.draft);
  const browser=await chromium.launch({channel:'msedge',headless:true});let page;
  try{
    page=await browser.newPage({viewport:{width:1500,height:1050},reducedMotion:'reduce'});page.setDefaultTimeout(15000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();
    const visual=page.getByLabel('Live funding consequences',{exact:true}),graph=visual.locator('.funding-diagram-scroll');
    const settled=()=>poll(async()=>!/Updating/.test(await visual.locator('.funding-visual-status').innerText()));await settled();
    await page.getByRole('button',{name:'Choose activity',exact:true}).click();await page.locator('#funding-activity').selectOption('business');await settled();
    async function enter(){await page.getByRole('button',{name:'2. People and land',exact:true}).click();await selectProgramme(page,'LEADER-AL20');await graph.locator('.funding-graph-option[data-option-id="LEADER-AL20-3.4"]').getByRole('radio',{name:'Work on LEADER-AL20-3.4',exact:true}).check();await graph.locator('.funding-circumstance[data-question-id="selection_score"]').click();}
    await enter();
    const route=page.getByLabel('AL20 assessment route',{exact:true}),editor=page.locator('#funding-answer-editor');
    async function open(group,choice){const node=graph.locator(`.funding-annex-group[data-annex-criterion="${group}"]`);if(await node.getAttribute('aria-expanded')!=='true')await node.click();await graph.locator(`.funding-annex-choice[data-annex-choice="${choice}"]`).click();await editor.waitFor();await editor.getByRole('region',{name:`Selection guidance for ${choice}`,exact:true}).waitFor();}
    async function close(){await editor.getByRole('button',{name:'Close question editor',exact:true}).click();await settled();await poll(async()=>await page.getByRole('status',{name:'Funding save status',exact:true}).locator('strong').innerText()==='Saved to this computer');}
    const draft=async()=>(await api('funding')).attachment.draft;
    const savedRow=async(group,selected='3.4')=>(await draft()).selection_assessments['LEADER-AL20-'+selected].criteria[group];
    await route.selectOption('LEADER-AL20-3.4');await settled();
    await poll(async()=>await draft()!==null);
    const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
    const draftBefore=fingerprint(await draft());
    await open('PT.1','PT.1.1');
    let content=editor.getByRole('region',{name:'Selection guidance for PT.1.1',exact:true});
    const disclosure=editor.getByText('Requirements and restoration recommendations · PT.1.1',{exact:true});await disclosure.focus();await page.keyboard.press('Space');assert(!await content.isVisible());await page.keyboard.press('Enter');await content.waitFor();
    await content.locator('[data-guidance-recommendation="demonstration-design"]').waitFor();
    assert.equal(await content.locator('[data-guidance-recommendation="heritage-recovery-design"]').count(),0);
    assert.match(await content.innerText(),/13 points.*cap: 15 points/);
    await content.getByText('Required evidence · application, payment and later controls',{exact:true}).click();assert.match(await content.innerText(),/basic project/);
    await content.getByText('Official sources and documentation',{exact:true}).click();
    const cited=content.getByRole('link',{name:'FUND-010 · PDF page 104',exact:true}).first();await cited.click();await page.locator('dialog.document-viewer').waitFor();await poll(async()=>!await page.getByLabel('PDF page',{exact:true}).isDisabled());assert.equal(await page.getByLabel('PDF page',{exact:true}).inputValue(),'104');await page.keyboard.press('Escape');assert(await cited.evaluate(n=>document.activeElement===n));
    assert.equal(fingerprint(await draft()),draftBefore);
    await editor.getByLabel('Item notes (optional)',{exact:true}).fill('Restoration baseline and public use to document.');await poll(async()=>(await savedRow('PT.1')).choice_context?.items['PT.1.1']?.notes==='Restoration baseline and public use to document.');
    await content.getByRole('heading',{name:'Official requirements',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:'test-artifacts/selection-guidance-desktop.png'});await close();
    await open('IG.8','IG.8.1');
    const spaces=editor.locator('[data-choice-information="IG.8.1"]'),other=editor.locator('[data-choice-information="IG.8.2"]');
    assert(await spaces.evaluate(n=>n.open));assert.equal(await other.count(),0);assert.equal(await editor.locator('.funding-selection-choice').count(),1);
    await spaces.locator(':scope > summary').focus();await page.keyboard.press('Space');assert(!await spaces.evaluate(n=>n.open));assert(!await spaces.locator('.funding-selection-node-guidance').isVisible());
    assert(await editor.locator('[id="al20-IG.8.1"]').isVisible());assert(await editor.locator('label[for="al20-IG.8.1"]').isVisible());
    await page.setViewportSize({width:390,height:844});await editor.locator('[id="al20-IG.8.1"]').scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'test-artifacts/selection-choice-collapsed-phone.png'});await page.setViewportSize({width:1500,height:1050});await close();
    await open('IN.1','IN.1.2');
    await editor.getByRole('button',{name:'Previous item',exact:true}).click();assert.match(await editor.locator('[data-guidance-node="IN.1.1"]').textContent(),/does not designate/);await editor.getByRole('button',{name:'Next item',exact:true}).click();
    const edl=editor.getByRole('region',{name:'EDL information for IN.1.2',exact:true});
    await edl.locator('[data-edl-item="IN-T1"] input').check();await poll(async()=>Object.hasOwn(await savedRow('IN.1'),'edl_evidence'));
    assert.equal((await savedRow('IN.1')).answers['IN.1.2'],null);
    const info=editor.locator('[data-choice-information="IN.1.2"]');await info.locator(':scope > summary').click();assert(!await edl.isVisible());assert(!await info.locator('.funding-selection-node-guidance').isVisible());
    await editor.locator('[id="al20-IN.1.2"]').selectOption('yes');await settled();await poll(async()=>(await savedRow('IN.1')).answers['IN.1.2']===true);assert(!await info.evaluate(n=>n.open));
    await info.locator(':scope > summary').focus();await page.keyboard.press('Enter');await edl.waitFor();assert(await edl.locator('[data-edl-item="IN-T1"] input').isChecked());const innovation=await savedRow('IN.1');await close();
    await route.selectOption('LEADER-AL20-3.5');await settled();await open('PT.1','PT.1.1');content=editor.getByRole('region',{name:'Selection guidance for PT.1.1',exact:true});
    await content.locator('[data-guidance-recommendation="heritage-recovery-design"]').waitFor();assert.equal(await content.locator('[data-guidance-recommendation="demonstration-design"]').count(),0);assert.equal((await savedRow('PT.1','3.5')).notes,'');await close();
    await route.selectOption('LEADER-AL20-2.6');await settled();const group=graph.locator('.funding-annex-group[data-annex-criterion="IN.1"]');if(await group.getAttribute('aria-expanded')!=='true')await group.click();await graph.locator('.funding-annex-choice[data-annex-choice="IN.1.2"]').click();await editor.waitFor();assert.equal(await editor.locator('.funding-selection-node-guidance').count(),0);await close();
    await route.selectOption('LEADER-AL20-3.4');await settled();await open('DRI.3','DRI.3.1');assert.match(await editor.getByRole('region',{name:'Selection guidance for DRI.3.1',exact:true}).innerText(),/beyond the minimum/);
    for(const theme of ['light','dark']){await page.getByLabel('Theme',{exact:true}).selectOption(theme);await page.setViewportSize({width:390,height:844});await editor.getByRole('region',{name:'Selection guidance for DRI.3.1',exact:true}).getByRole('heading',{name:'Official requirements',exact:true}).scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const box=await editor.boundingBox();assert(box.x>=0&&box.x+box.width<=390&&box.y>=0&&box.y+box.height<=844);await page.screenshot({path:`test-artifacts/selection-guidance-${theme}-phone.png`});}
    await close();
    let fail=true;await page.route('**/api/funding/selection-guidance',r=>fail?(fail=false,r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Selection guidance fixture unavailable'})})):r.continue());
    await page.setViewportSize({width:1500,height:1050});await page.reload();await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();await settled();await enter();await route.selectOption('LEADER-AL20-3.4');await settled();
    const node=graph.locator('.funding-annex-group[data-annex-criterion="IN.1"]');if(await node.getAttribute('aria-expanded')!=='true')await node.click();await graph.locator('.funding-annex-choice[data-annex-choice="IN.1.2"]').click();await editor.getByRole('alert').filter({hasText:'Selection guidance fixture unavailable'}).waitFor();assert.deepEqual(await savedRow('IN.1'),innovation);
    await editor.getByRole('button',{name:'Retry selection guidance',exact:true}).click();await editor.getByRole('region',{name:'Selection guidance for IN.1.2',exact:true}).waitFor();assert.deepEqual(await savedRow('IN.1'),innovation);assert.equal((await savedRow('PT.1')).choice_context.items['PT.1.1'].notes,'Restoration baseline and public use to document.');
    await close();const after=await api('project');assert.equal(JSON.stringify(after.project),before);assert.equal(JSON.stringify(after.planning.draft),planning);assert.deepEqual(errors,[]);
    console.log('Selection guidance: shared/route-specific advice, evidence/source PDF and focus, unchanged scores on reading, notes/EDL/route persistence, other routes, failures/retry and mobile themes passed.');
  }catch(e){if(page)await page.screenshot({path:'test-artifacts/selection-guidance-failure.png'});throw e;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,3000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
