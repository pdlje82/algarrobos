const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port!=='8000','Use isolated test servers');
// Parse once: fetch bodies are single-use.
async function request(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const text=await r.text();assert(r.ok,text);return JSON.parse(text);}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let stage='initialise';
const watchdog=setTimeout(()=>{console.error('Funding guides browser timeout at '+stage);process.exit(1);},120000);
(async()=>{
  let p=await request('project');
  p=await request('project/new',{revision:p.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Funding introductions fixture'});
  const projectBefore=JSON.stringify(p.project);
  // Own the disposable browser process. Stop it directly after assertions so
  // Windows PDF-worker teardown cannot block on application unload handling.
  const server=await chromium.launchServer({channel:'msedge',headless:true});
  const browser=await chromium.connect(server.wsEndpoint());
  let page,context;
  const errors=[];
  try{
    context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    let failGuides=false,guideRequests=0;
    await context.route('**/api/funding/guides',async route=>{
      guideRequests++;
      if(failGuides)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Guide library temporarily unavailable'})});
      return route.continue();
    });
    page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);
    await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();
    await page.getByRole('button',{name:'Choose activity',exact:true}).click();
    await page.getByRole('button',{name:'Close question editor',exact:true}).click();
    const visual=page.getByLabel('Live funding consequences',{exact:true});
    const family=page.getByRole('combobox',{name:'Funding family',exact:true});
    await visual.locator('.funding-graph-option').first().waitFor();
    const samples={public:'LEADER-AL20-3.1',donations:'NATURE-03',contracts:'FIN-PROCUREMENT-WORKS',ecosystem:'NATURE-01',capital:'NATURE-09',support:'EU-GREEN-ASSIST-ADVISORY'};
    async function open(group,id,keyboard=false){
      await family.selectOption(group);
      const card=visual.locator(`.funding-graph-option[data-option-id="${id}"]`);
      assert.match(await card.innerText(),/Explore this option/);
      assert.match(await card.innerText(),/Automated assessment unavailable/);
      const trigger=card.locator('.funding-option-open');
      await trigger.scrollIntoViewIfNeeded();
      if(keyboard){await trigger.focus();await page.keyboard.press('Enter');}else await trigger.click();
      const guide=page.getByRole('region',{name:`Introduction to ${id}`,exact:true});
      await guide.getByRole('heading',{name:'What is it?',exact:true}).waitFor();
      assert.equal(await guide.locator('section').count(),5);
      assert.match(await guide.innerText(),/Current reference information/);
      const heading=guide.locator('h3');
      const box=await heading.boundingBox();assert(box.y>=-1&&box.y<page.viewportSize().height,'Introduction heading is brought into view');
      assert(await heading.evaluate(n=>n===document.activeElement),'Keyboard focus moves to the introduction');
      return guide;
    }
    for(const [group,id] of Object.entries(samples)){stage='open '+id;console.log(stage);await open(group,id,true);}
    await page.screenshot({path:'test-artifacts/funding-guides-desktop.png',fullPage:false});
    await delay(1700);
    const savedBefore=(await request('funding')).attachment;
    stage='mobile viewport';console.log(stage);await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Expand funding visual workspace',exact:true}).click();
    const guide=await open('ecosystem','NATURE-06');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page-wide overflow on mobile');
    stage='PDF sources';console.log(stage);await guide.getByText(/^Sources and verification/).click();
    await guide.getByRole('link',{name:/FUND-014/}).click();
    await page.getByRole('dialog').waitFor();
    assert.match(await page.getByRole('dialog').innerText(),/Roadmap towards Nature Credits/);
    await page.getByRole('textbox',{name:'PDF page',exact:true}).waitFor({state:'visible'});
    await page.waitForFunction(()=>!document.querySelector('input[aria-label="PDF page"]').disabled);
    assert.equal(await page.getByRole('textbox',{name:'PDF page',exact:true}).inputValue(),'5');
    await page.keyboard.press('Escape');
    await guide.locator('h3').evaluate(n=>n.scrollIntoView({block:'start'}));
    await page.screenshot({path:'test-artifacts/funding-guides-mobile.png',fullPage:false});
    assert.equal(JSON.stringify((await request('project')).project),projectBefore,'Inspecting leaves the recorded project unchanged');
    assert.deepEqual((await request('funding')).attachment,savedBefore,'Inspecting leaves draft, shortlist and saved assessments unchanged');
    assert.equal(guideRequests,1,'Guide library is loaded once, not on every node click');

    stage='failure and retry';console.log(stage);failGuides=true;
    await page.reload();
    await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();
    await page.getByRole('button',{name:'Choose activity',exact:true}).click();
    await page.getByRole('button',{name:'Close question editor',exact:true}).click();
    await page.getByRole('button',{name:'Expand funding visual workspace',exact:true}).click();
    await family.selectOption('public');
    await visual.locator('.funding-graph-option[data-option-id="LEADER-AL20-3.1"] .funding-option-open').click();
    await page.getByRole('alert').filter({hasText:'Guide library temporarily unavailable'}).waitFor();
    const afterFailure=(await request('funding')).attachment;
    failGuides=false;
    await page.getByRole('button',{name:'Retry reference information',exact:true}).click();
    await page.getByRole('heading',{name:'What is it?',exact:true}).waitFor();
    assert.deepEqual((await request('funding')).attachment,afterFailure,'Retry does not mutate the exploration');
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('Funding guides: six families, keyboard/mobile, PDF viewer, state isolation and explicit retry passed.');
  }catch(e){console.error('Failed at '+stage,e);if(page){console.error(await page.locator('body').innerText());console.error(errors);}throw e;}finally{
    stage='stop disposable test browser';
    assert(server.process().kill('SIGKILL'),'Could not stop the disposable test browser');
    clearTimeout(watchdog);
  }
})().then(()=>process.exit(0),e=>{console.error(e);process.exit(1);});
