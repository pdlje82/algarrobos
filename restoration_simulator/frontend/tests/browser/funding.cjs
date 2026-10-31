const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE);
const root = process.env.DESIGNER_TEST_API, url = process.env.DESIGNER_APP_URL;
assert(root && url && new URL(root).port !== '8000', 'Use isolated servers');
async function api(p, body) {const r = await fetch(root+p, body === undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); if(!r.ok) throw Error(await r.text()); return r.json();}
async function poll(fn) {for(let i=0;i<200;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Timed out waiting for funding state');}
(async()=>{
  let p = await api('project'); p = await api('project/new',{revision:p.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Funding browser fixture'});
  const before = JSON.stringify(p.project);
  const browser=await chromium.launch({channel:'msedge',headless:true,timeout:20000});
  try {
    const context=await browser.newContext({viewport:{width:1500,height:1000},hasTouch:true});
    let failSave=false,failPdf=false;
    await context.route('**/api/**',async route=>{
      const req=route.request(),u=new URL(req.url());
      if(failSave && u.pathname==='/api/funding/save'){failSave=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Test funding save unavailable'})});}
      if(failPdf && u.pathname.includes('/documents/')){failPdf=false;return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({detail:'Test document edition changed'})});}
      return route.continue();
    });
    const errors=[],page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>{errors.push(e.message);console.error(e);});
    await page.goto(url);
    await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();
    await page.getByRole('heading',{name:'Funding Navigator',exact:true}).waitFor();
    await page.getByLabel('What would you like support for?',{exact:true}).selectOption('business');
    await page.getByLabel('Exploration name',{exact:true}).fill('My rural business');
    await page.getByRole('button',{name:'2. People and land',exact:true}).click();
    const answers={applicant_id:'individual',applicant_kind:'individual',municipality:'Alhama de Almería',territory_verified:'yes',sector:'general',unemployed:'yes',new_activity:'yes',no_same_reta:'yes',resident:'yes',exclusive:'yes',start_after_application:'yes',plan_24_months:'yes',retention:'yes',unemployment_percent:'50',net_year1:'10000',smi_year1:'20000',net_year2:'20000',smi_year2:'20000',other_aid:'no',bonus_location:'yes',bonus_young:'yes',bonus_woman:'yes',bonus_job:'yes',bonus_climate:'yes'};
    for(let i=0;i<60;i++){
      const field=page.locator('.funding-question select,.funding-question input').first();
      const id=(await field.getAttribute('id')).replace('funding-','');
      if(Object.hasOwn(answers,id)){
        await field.waitFor({state:'visible'});
        await poll(async()=>!await field.isDisabled());
        if(await field.evaluate(n=>n.tagName)==='SELECT')await field.selectOption(answers[id]);else await field.fill(answers[id]);
      }
      const next=page.getByRole('button',{name:'Next question',exact:true});if(await next.isDisabled())break;await next.click();
    }
    await page.getByRole('button',{name:'3. Explore options',exact:true}).click();
    await page.getByLabel('Search mechanisms',{exact:true}).fill('LEADER-AL20-2.7');
    await page.locator('.funding-graph-option[data-option-id="LEADER-AL20-2.7"]').click();
    const card=page.locator('.funding-option').filter({hasText:'LEADER-AL20-2.7'}).first();
    await card.waitFor();
    await poll(async()=>/50[,.\s]?000/.test(await card.innerText()));
    await card.locator('input[type=checkbox]').check();
    await card.getByText('Why this result? Definitions and conditions',{exact:true}).click();
    const source=card.getByRole('link',{name:'Official requirements · PDF page 112'}).first();
    await source.click();
    await page.getByRole('dialog').waitFor();
    const pdfPage=page.getByLabel('PDF page',{exact:true});
    await poll(async()=>!await pdfPage.isDisabled());
    assert.equal(await pdfPage.inputValue(),'112');
    await page.screenshot({path:'test-artifacts/funding-source-desktop.png',fullPage:false});
    await page.keyboard.press('Escape');
    assert(await card.locator('input[type=checkbox]').isChecked());
    failPdf=true;await source.click();
    await page.getByText(/Test document edition changed/).waitFor();
    await page.getByRole('button',{name:'Retry PDF',exact:true}).click();
    await poll(async()=>!await page.getByLabel('PDF page',{exact:true}).isDisabled());
    assert.equal(await page.getByLabel('PDF page',{exact:true}).inputValue(),'112');
    await page.keyboard.press('Escape');
    await page.getByText('Saved explorations, context and funding projects',{exact:true}).click();
    await page.getByRole('button',{name:'Save exploration',exact:true}).click();
    await poll(async()=>(await api('funding')).attachment.scenarios.length===1);
    await page.getByRole('button',{name:'6. Review and use',exact:true}).click();
    await poll(async()=>!await page.getByRole('button',{name:'Review selected funding plan',exact:true}).isDisabled());
    await page.getByRole('button',{name:'Review selected funding plan',exact:true}).click();
    await page.getByRole('button',{name:'Use this funding plan',exact:true}).click();
    await poll(async()=>(await api('funding')).attachment.plans.length===1);
    assert.equal(JSON.stringify((await api('project')).project),before,'Funding changed simulation');
    await page.reload();
    await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();
    await page.getByRole('heading',{name:'Funding Navigator',exact:true}).waitFor();
    await page.getByLabel('Exploration name',{exact:true}).fill('Retained after failed save');failSave=true;
    await page.getByText('Test funding save unavailable',{exact:false}).waitFor();
    assert.equal(await page.getByLabel('Exploration name',{exact:true}).inputValue(),'Retained after failed save');
    await page.getByRole('button',{name:'Retry failed save',exact:true}).click();
    await poll(async()=>(await api('funding')).attachment.draft.name==='Retained after failed save');
    for(const theme of ['light','dark']){
      await page.getByLabel('Theme',{exact:true}).selectOption(theme);
      await page.setViewportSize({width:390,height:844});
      await page.getByRole('button',{name:'3. Explore options',exact:true}).click();
      await page.getByLabel('Search mechanisms',{exact:true}).fill('LEADER-AL20-2.7');
      if(await page.getByRole('button',{name:'Expand funding visual workspace',exact:true}).isVisible())await page.getByRole('button',{name:'Expand funding visual workspace',exact:true}).click();
      await page.screenshot({path:`test-artifacts/funding-${theme}-mobile.png`,fullPage:true});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Funding page overflows phone width');
    }
    const activity=page.getByRole('button',{name:'1. Activity',exact:true});
    await activity.scrollIntoViewIfNeeded();
    const box=await activity.boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
    await page.getByLabel('What would you like support for?',{exact:true}).waitFor();
    const explore=page.getByRole('button',{name:'3. Explore options',exact:true});await explore.focus();await page.keyboard.press('Enter');
    await page.getByRole('heading',{name:'Explore options',exact:true}).waitFor();
    // Entry points use the selected parcel / demonstrator without depending on funding adoption.
    p=await api('project');
    const land=await api('land/form',{revision:p.revision,route_id:'existing',parcel_id:'new'});
    const inputs=Object.fromEntries(land.fields.map(f=>[f.name,f.default]));
    Object.assign(inputs,{route_id:'existing',parcel_id:'new',parcel_name:'Navigator parcel',parcel_area:4500,covered_area:4500});
    await api('commit',{revision:p.revision,request_id:crypto.randomUUID(),action_id:'establish_access',inputs});
    await page.reload();await page.getByRole('button',{name:'Explore funding',exact:true}).click();
    await page.getByRole('heading',{name:'Funding Navigator',exact:true}).waitFor();
    await page.getByText('activity · 1 linked parcel(s)',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Project',exact:true}).click();
    await page.getByRole('button',{name:'Open demonstrator planning',exact:true}).click();
    assert.equal(await page.locator('.demo-editor').getByRole('button',{name:'Funding route',exact:true}).count(),0);
    assert.equal(await page.locator('.demo-editor').getByRole('button',{name:'Explore funding',exact:true}).count(),1);
    assert.equal(await page.locator('.demo-editor').getByLabel('Planned funding route',{exact:true}).count(),0);
    await page.locator('.demo-editor').getByRole('button',{name:'Explore funding',exact:true}).click();
    await page.getByText('demonstrator · 1 linked parcel(s)',{exact:true}).waitFor();
    assert.deepEqual(errors,[]);
    console.log('Funding browser: guided business assumptions, €50k cap, source PDF, saved plan, reload, retry and phone themes passed.');
    await context.close();
  } catch(e) {console.error('Browser assertion:',e); throw e;} finally {await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,5000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
