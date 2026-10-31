const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port!=='8000','Use isolated test servers');
async function api(p,body){const r=await fetch(root+p,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(fn){for(let i=0;i<250;i++){if(await fn())return;await new Promise(r=>setTimeout(r,40));}throw Error('Funding visual state timed out');}
(async()=>{
  let project=await api('project');project=await api('project/new',{revision:project.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Visual feedback fixture'});
  const before=JSON.stringify(project.project);
  const browser=await chromium.launch({channel:'msedge',headless:true,timeout:20000});
  try{
    const context=await browser.newContext({viewport:{width:1500,height:1000},hasTouch:true,reducedMotion:'reduce'});
    let hold=false,fail=false,release=null,held=null;
    await context.route('**/api/funding/visualise',async route=>{
      if(fail){fail=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Assessment temporarily unavailable'})});}
      if(hold){hold=false;const response=await route.fetch();held=response;await new Promise(r=>{release=r;});return route.fulfill({response});}
      return route.continue();
    });
    const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();
    const question=page.locator('.funding-question'),visual=page.getByLabel('Live funding consequences',{exact:true});
    const settled=()=>poll(async()=>!/Updating/.test(await visual.locator('.funding-visual-status').innerText()));
    await page.getByRole('button',{name:'Choose activity',exact:true}).click();
    await question.waitFor();await settled();
    assert.equal(await page.getByText('Choose an answer for this exploration. Unknown is allowed.',{exact:true}).count(),0);
    const label=await question.locator('label').evaluate(n=>({size:parseFloat(getComputedStyle(n).fontSize),weight:Number(getComputedStyle(n).fontWeight)}));
    assert(label.size>=20&&label.weight>=600);
    assert.equal(await visual.getByRole('button',{name:'Graph',exact:true}).getAttribute('aria-pressed'),'true');
    await visual.getByRole('button',{name:'Graph',exact:true}).click();
    const workspace=await visual.boundingBox();
    assert(workspace.width>1400,'Visual workspace uses the screen width');
    await page.getByLabel('What would you like support for?',{exact:true}).selectOption('business');await settled();
    await page.getByRole('button',{name:'2. People and land',exact:true}).click();
    assert.equal(await page.locator('.funding-main').count(),0,'People and land has no static question panel');
    await visual.getByRole('button',{name:'Answer questions',exact:true}).click();
    while(await question.locator('select,input').getAttribute('id')!=='funding-applicant_choice')await page.getByRole('button',{name:'Next question',exact:true}).click();
    const applicant=page.locator('#funding-applicant_choice');
    const editor=page.locator('.funding-question-editor');assert((await editor.boundingBox()).width<=560);
    const graphSize=await visual.locator('.funding-diagram-scroll').evaluate(n=>({available:n.clientWidth,diagram:n.firstElementChild.getBoundingClientRect().width,viewport:n.clientHeight}));
    assert(Math.abs(graphSize.available-graphSize.diagram)<2&&graphSize.viewport>=700,'Graph fills the wider, taller workspace');
    for(const width of [1920,1024,1500]){
      await page.setViewportSize({width,height:1000});
      await poll(async()=>visual.locator('.funding-diagram-scroll').evaluate(n=>Math.abs(n.clientWidth-n.firstElementChild.getBoundingClientRect().width)<2));
      const panel=await visual.boundingBox();assert(panel.width>width-50);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
    await page.locator('.funding-layout').evaluate(n=>n.scrollIntoView({block:'start'}));
    await page.screenshot({path:'test-artifacts/funding-layout-graph-desktop.png'});
    const positions=await visual.locator('.funding-graph-option').evaluateAll(nodes=>nodes.map(n=>[n.dataset.optionId,n.style.top,n.style.left]));
    await applicant.selectOption('recorded:individual');await settled();
    const applicantNode=visual.locator('.funding-circumstance[data-question-id="applicant_choice"]');
    assert.equal(await applicantNode.getAttribute('data-condition-status'),'pass');
    assert.match(await applicantNode.locator('.funding-node-status').innerText(),/Linked conditions met/);
    await applicant.selectOption('planned:company');await settled();assert.equal(await applicantNode.getAttribute('data-condition-status'),'mixed');
    assert(await applicantNode.locator('.funding-node-count-pass').count()>0&&await applicantNode.locator('.funding-node-count-fail').count()>0);
    await visual.locator('.funding-graph-option[data-option-id="LEADER-AL20-2.7"]').click();assert.equal(await applicantNode.getAttribute('data-condition-status'),'mixed','Inspecting keeps the current colour basis');
    await visual.locator('.funding-graph-option[data-option-id="LEADER-AL20-2.7"]').getByRole('radio',{name:'Work on LEADER-AL20-2.7',exact:true}).check();assert.equal(await applicantNode.getAttribute('data-condition-status'),'fail','The working control sets the colour basis');
    await visual.getByRole('button',{name:'Clear working option',exact:true}).click();
    await visual.getByRole('button',{name:'Clear inspection',exact:true}).click();assert.equal(await applicantNode.getAttribute('data-condition-status'),'mixed');
    await applicant.selectOption('recorded:individual');await settled();assert.equal(await applicantNode.getAttribute('data-condition-status'),'pass');
    await visual.locator('.funding-change-label').first().waitFor();
    assert.deepEqual(await visual.locator('.funding-graph-option').evaluateAll(nodes=>nodes.map(n=>[n.dataset.optionId,n.style.top,n.style.left])),positions);
    assert(await visual.locator('.funding-affected').count()>0);
    const graphRows=await visual.locator('.funding-graph-option').evaluateAll(nodes=>nodes.map(n=>n.dataset.optionId));assert(graphRows.length<=12);
    const graphStatuses=await visual.locator('.funding-graph-option').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.optionId,status:n.querySelector('span').textContent,count:n.querySelector('small').textContent})));
    await visual.getByRole('button',{name:'Matrix',exact:true}).click();
    await page.screenshot({path:'test-artifacts/funding-layout-matrix-desktop.png'});
    assert.deepEqual(await visual.locator('.funding-matrix tr[data-option-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.optionId)),graphRows);
    const matrixStatuses=await visual.locator('.funding-matrix tr[data-option-id]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.optionId,status:n.querySelector('td').textContent,count:n.querySelectorAll('td')[2].textContent})));
    for(let i=0;i<graphStatuses.length;i++){assert(matrixStatuses[i].status.includes(graphStatuses[i].status));assert.equal(matrixStatuses[i].count,graphStatuses[i].count.startsWith('Assessment')?'Not modelled':graphStatuses[i].count.split(' ')[0]);}
    assert.equal(await applicant.inputValue(),'recorded:individual');
    await visual.getByRole('button',{name:'Graph',exact:true}).click();
    hold=true;await applicant.selectOption('planned:nonprofit');await poll(async()=>release!==null);
    assert.equal(await applicantNode.getAttribute('data-condition-status'),'pass','Pending node colours retain the previous assessment');
    await visual.getByText('Updating—showing previous assessment',{exact:true}).waitFor();
    assert.deepEqual(await visual.locator('.funding-graph-option').evaluateAll(nodes=>nodes.map(n=>[n.dataset.optionId,n.style.top,n.style.left])),positions);
    // A later successful answer wins even if the older request finishes last.
    await applicant.selectOption('planned:company');await settled();const newest=await visual.locator('.funding-graph-option').allTextContents();release();release=null;held=null;
    await page.waitForTimeout(150);assert.deepEqual(await visual.locator('.funding-graph-option').allTextContents(),newest);
    fail=true;await applicant.selectOption('planned:nonprofit');await visual.getByText('Assessment failed—showing previous assessment',{exact:true}).waitFor();
    assert.equal(await applicant.inputValue(),'planned:nonprofit');assert.deepEqual(await visual.locator('.funding-graph-option').allTextContents(),newest);
    await visual.getByRole('button',{name:'Retry assessment',exact:true}).click();await settled();
    assert.equal(await applicantNode.getAttribute('data-condition-status'),'fail');
    assert.equal(await visual.getByText('Assessment temporarily unavailable',{exact:true}).count(),0);
    await question.getByRole('button',{name:'Restore initial: Unknown / I don’t know yet',exact:true}).click();await settled();assert.equal(await applicant.inputValue(),'unknown');
    assert.equal(await applicantNode.getAttribute('data-condition-status'),'unknown');
    // Family/paging and research entries stay available without invented rules.
    await visual.getByRole('button',{name:'Next options',exact:true}).click();
    assert(await visual.locator('.funding-graph-option').count()<=12);
    await visual.getByRole('button',{name:'Previous options',exact:true}).click();
    await visual.getByLabel('Funding family',{exact:true}).selectOption({index:4});
    const research=visual.locator('.funding-graph-option').first();await research.click();
    await visual.getByText('Assessment not implemented. Programme requirements must be verified and modelled before this option can be assessed. Answering more questions cannot resolve this gap.',{exact:true}).waitFor();
    assert.equal(await visual.locator('.funding-inspection input[type=checkbox]').isChecked(),false,'Inspecting does not shortlist');
    await visual.getByRole('button',{name:'Clear inspection',exact:true}).click();
    await page.getByRole('button',{name:'3. Explore options',exact:true}).click();await page.getByLabel('Search mechanisms',{exact:true}).fill('LEADER-AL20-2.7');
    await visual.getByLabel('Funding family',{exact:true}).selectOption({index:0});
    await visual.locator('.funding-graph-option').click();
    const option=visual.locator('.funding-option');await option.locator('input[type=checkbox]').check();
    // Complete network includes both inputs of income comparisons and amount-only bonuses.
    const net=visual.locator('.funding-circumstance').filter({hasText:'SMI'});assert(await net.count()>=2);
    await visual.getByRole('button',{name:'Matrix',exact:true}).click();assert.equal(await visual.locator('.funding-option input[type=checkbox]').isChecked(),true);
    await visual.getByRole('button',{name:'Graph',exact:true}).click();
    const circumstances=visual.locator('.funding-circumstance');
    const target=circumstances.filter({hasText:'unemployed'}).first();await target.click();
    assert.equal(await question.locator('select,input').getAttribute('id'),'funding-unemployed');assert.equal(await question.locator('select,input').inputValue(),'');
    assert.equal(await page.locator(':focus').getAttribute('id'),'funding-unemployed');
    const floating=await editor.boundingBox();assert(floating.y>=0&&floating.y+floating.height<=1000,'Floating question remains in the viewport');
    await target.scrollIntoViewIfNeeded();const graphWindowY=await page.evaluate(()=>scrollY);await target.click();
    assert(Math.abs(await page.evaluate(()=>scrollY)-graphWindowY)<2,'Inspecting a question keeps the graph in view');
    const source=visual.getByRole('link',{name:'Official requirements · PDF page 112',exact:true}).first();
    await source.click();await page.locator('dialog.document-viewer').waitFor();await poll(async()=>!await page.getByLabel('PDF page',{exact:true}).isDisabled());
    assert.equal(await page.getByLabel('PDF page',{exact:true}).inputValue(),'112');await page.keyboard.press('Escape');
    assert.equal(await question.locator('select,input').getAttribute('id'),'funding-unemployed');
    assert.equal(await visual.locator('.funding-option input[type=checkbox]').isChecked(),true);
    assert(await source.evaluate(n=>n===document.activeElement),'PDF restores focus to source');
    await page.screenshot({path:'test-artifacts/funding-visual-desktop.png',fullPage:true});
    const afterSource=await editor.boundingBox();assert(afterSource.y>=0&&afterSource.y+afterSource.height<=1001,'Editor remains reachable after PDF viewing and full-page capture: '+JSON.stringify(afterSource));
    await page.getByRole('button',{name:'Close question editor',exact:true}).click();
    for(const theme of ['light','dark']){
      await page.getByLabel('Theme',{exact:true}).selectOption(theme);await page.setViewportSize({width:390,height:844});
      assert(await visual.getByRole('button',{name:'Expand funding visual workspace',exact:true}).isVisible());
      await visual.getByRole('button',{name:'Expand funding visual workspace',exact:true}).click();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await visual.getByRole('button',{name:'Answer questions',exact:true}).click();
      const helpSize=await question.locator('label').evaluate(n=>parseFloat(getComputedStyle(n).fontSize));assert(helpSize>=20);
      await page.getByRole('button',{name:'Close question editor',exact:true}).click();
      await visual.getByRole('button',{name:'Matrix',exact:true}).click();
      await page.screenshot({path:`test-artifacts/funding-visual-${theme}-390.png`,fullPage:true});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      const graph=visual.getByRole('button',{name:'Graph',exact:true});await graph.focus();await page.keyboard.press('Enter');assert.equal(await graph.getAttribute('aria-pressed'),'true');
      await visual.getByRole('button',{name:'Collapse funding visual workspace',exact:true}).click();
    }
    await page.getByText('Saved explorations, context and funding projects',{exact:true}).click();
    const save=page.getByRole('button',{name:'Save exploration',exact:true});await poll(async()=>!await save.isDisabled());await save.click();
    await page.getByRole('button',{name:'Load / rename',exact:true}).click();
    await page.getByRole('button',{name:'2. People and land',exact:true}).click();await settled();
    assert.equal(await visual.locator('.funding-affected').count(),0);
    const refresh=page.getByRole('button',{name:'Update assessment / refresh baseline',exact:true});await poll(async()=>!await refresh.isDisabled());await refresh.click();await settled();
    assert.equal(await visual.locator('.funding-affected').count(),0);
    assert.equal(JSON.stringify((await api('project')).project),before,'Visual interactions changed simulation');
    assert.deepEqual(errors,[]);await context.close();
    console.log('Funding visuals: question hierarchy, stable graph/matrix scope, stale/failure/retry, dependencies, unknowns, keyboard, 390px themes and no simulation effects passed.');
  }finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,5000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
