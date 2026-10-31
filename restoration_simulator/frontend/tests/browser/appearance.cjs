const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const root=process.env.DESIGNER_TEST_API,url=process.env.DESIGNER_APP_URL;
assert(root&&url&&new URL(root).port!=='8000','Use isolated project data');
async function api(path,body){const r=await fetch(root+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(await r.text());return r.json();}
async function poll(check){for(let i=0;i<250;i++){if(await check())return;await new Promise(r=>setTimeout(r,40));}throw Error('Appearance state timed out');}
const rgb=hex=>`rgb(${hex.slice(1).match(/../g).map(n=>parseInt(n,16)).join(', ')})`;
(async()=>{
 let p=await api('project');p=await api('project/new',{revision:p.revision,request_id:crypto.randomUUID(),confirm_replace:true,name:'Carob and Clay appearance fixture'});
 const form=await api('land/form',{revision:p.revision,route_id:'existing',parcel_id:'new'}),inputs=Object.fromEntries(form.fields.map(f=>[f.name,f.default]));Object.assign(inputs,{route_id:'existing',parcel_id:'new',parcel_area:4500,covered_area:4500});
 p=await api('commit',{revision:p.revision,request_id:crypto.randomUUID(),action_id:'establish_access',inputs});
 let designer=await api('designer'),draft=designer.evaluation.draft;
 for(const command of [{kind:'plant',id:'carob',enabled:true},{kind:'patch',section:'physical',values:{parcel_id:p.project.parcels[0].id}}])draft=(await api('designer/preview',{revision:p.revision,draft,command})).draft;
 designer=await api('designer/save',{revision:p.revision,design_revision:designer.design_revision,request_id:crypto.randomUUID(),draft,mode:'create',design_id:null,name:'Appearance design'});
 await api('designer/handoff',{revision:p.revision,planning_revision:p.planning.planning_revision,design_revision:designer.design_revision,request_id:crypto.randomUUID()});
 p=await api('project');const before=JSON.stringify(p.project),planningBefore=JSON.stringify(p.planning.draft);
 const browser=await chromium.launch({channel:'msedge',headless:true});let page;
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true,reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(12000);const errors=[],contrast=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.locator('.brand-symbol').waitFor();await page.locator('.brand img').evaluateAll(ns=>Promise.all(ns.map(n=>n.decode())));
  const fits=async label=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' overflows the page');
  const palette={light:{page:'#f8f3e9',panel:'#fffdf7',raised:'#ffffff',control:'#ffffff',ground:'#f8f3e9'},dark:{page:'#23211f',panel:'#302d29',raised:'#403b34',control:'#292621',ground:'#292621'}};
  for(const theme of ['light','dark']){
   await page.getByLabel('Theme',{exact:true}).selectOption(theme);
   const pairs=await page.evaluate(()=>{
    const css=getComputedStyle(document.documentElement),read=key=>css.getPropertyValue('--'+key).trim();
    function lum(hex){if(hex.length===4)hex='#'+hex.slice(1).split('').map(c=>c+c).join('');const a=hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;}
    const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05),rows=[];
    for(const fg of ['text','muted','link','positive','needs-answers','conflict','research','assumption-text','water','mixed'])for(const bg of ['page','panel','raised','selected-bg','control','inset','positive-bg','needs-answers-bg','conflict-bg','research-bg','mixed-bg','water-bg'])rows.push({fg,bg,ratio:ratio(read(fg),read(bg)),minimum:4.5});
    for(const [fg,bg] of [['primary-text','primary'],['primary-text','primary-hover'],['positive','result-bg'],['warning-text','warning-bg'],['error-text','error-bg'],['danger-text','danger-bg']])rows.push({fg,bg,ratio:ratio(read(fg),read(bg)),minimum:4.5});
    for(const fg of ['focus','input-border','positive','needs-answers','conflict','research'])for(const bg of ['page','panel','raised','control'])rows.push({fg,bg,ratio:ratio(read(fg),read(bg)),minimum:3});
    for(const fg of ['focus','positive','needs-answers','conflict','research','mixed'])for(const bg of ['positive-bg','needs-answers-bg','conflict-bg','research-bg','mixed-bg'])rows.push({fg,bg,ratio:ratio(read(fg),read(bg)),minimum:3});
    const hex=c=>'#'+c.match(/\d+/g).slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join('');
    for(const button of document.querySelectorAll('.workspace-nav button')){const s=getComputedStyle(button);rows.push({fg:button.textContent,bg:'workspace button',ratio:ratio(hex(s.color),hex(s.backgroundColor)),minimum:4.5});}
    return rows;
   });
   for(const check of pairs)assert(check.ratio>=check.minimum,`${theme} ${check.fg} / ${check.bg}: ${check.ratio}`);contrast.push({theme,minimumText:Math.min(...pairs.filter(p=>p.minimum===4.5).map(p=>p.ratio))});
   for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1000});await page.getByRole('button',{name:'Project',exact:true}).click();await fits(`${theme} Project ${width}`);
    const brand=await page.evaluate(()=>{const css=getComputedStyle(document.documentElement),mark=document.querySelector('.brand-symbol'),footer=document.querySelector('.footer-symbol'),name=document.querySelector('.brand-wordmark');return {page:css.getPropertyValue('--page').trim(),meta:document.querySelector('meta[name=theme-color]').content,symbolFilter:getComputedStyle(mark).filter,footerFilter:getComputedStyle(footer).filter,wordmarkFilter:getComputedStyle(name).filter,symbolWidth:mark.getBoundingClientRect().width,footerWidth:footer.getBoundingClientRect().width,tile:getComputedStyle(mark.parentElement).backgroundColor,portrait:css.getPropertyValue('--plant-portrait-bg').trim()};});
    assert.equal(brand.page,palette[theme].page);assert.equal(brand.meta,brand.page);assert.equal(brand.symbolFilter,'none');assert.equal(brand.footerFilter,'none');assert.equal(brand.tile,rgb('#fff9ef'));assert.equal(brand.symbolWidth,width>650?60:48);assert.equal(brand.footerWidth,28);assert.equal(brand.wordmarkFilter.includes('invert'),theme==='dark');if(theme==='dark')assert.equal(brand.portrait,'#000');
    const nav=await page.locator('.workspace-nav button').evaluateAll(nodes=>nodes.map(n=>({bg:getComputedStyle(n).backgroundColor,fg:getComputedStyle(n).color})));assert.equal(new Set(nav.map(n=>n.bg)).size,3,'Workspaces have distinct accent colours');
    await page.screenshot({path:`test-artifacts/carob-clay-project-${theme}-${width}.png`});
    await page.getByRole('button',{name:'Open demonstrator planning',exact:true}).click();await page.locator('.demo-editor').waitFor();await fits(`${theme} demonstrator ${width}`);
    await page.getByRole('button',{name:'Site Designer',exact:true}).click();await page.locator('.designer-svg').waitFor();await fits(`${theme} designer ${width}`);assert.equal(await page.locator('.designer-ground').evaluate(n=>getComputedStyle(n).fill),rgb(palette[theme].ground));
    if(width===1440)await page.screenshot({path:`test-artifacts/carob-clay-designer-${theme}.png`});
    await page.getByRole('button',{name:'Funding Navigator',exact:true}).click();const visual=page.getByLabel('Live funding consequences',{exact:true});await visual.locator('.funding-metric').first().waitFor();await page.getByRole('button',{name:'2. People and land',exact:true}).click();
    if(width<=800&&await visual.getByRole('button',{name:'Expand funding visual workspace',exact:true}).isVisible())await visual.getByRole('button',{name:'Expand funding visual workspace',exact:true}).click();
    await visual.getByRole('button',{name:'Graph',exact:true}).click();await fits(`${theme} funding ${width}`);await visual.getByRole('button',{name:'Answer questions',exact:true}).click();
    const editor=page.getByRole('dialog',{name:'Edit funding answer',exact:true});assert.equal(await editor.evaluate(n=>getComputedStyle(n).backgroundColor),rgb(palette[theme].raised));assert.equal(await editor.locator('select').first().evaluate(n=>getComputedStyle(n).backgroundColor),rgb(palette[theme].control));
    await editor.locator('.funding-question-heading .funding-help>button').click();assert.equal(await page.locator('.funding-help-popup').evaluate(n=>getComputedStyle(n).backgroundColor),rgb(palette[theme].raised));await page.keyboard.press('Escape');assert(await editor.isVisible());
    await page.screenshot({path:`test-artifacts/carob-clay-funding-${theme}-${width}.png`});await editor.getByRole('button',{name:'Close question editor',exact:true}).click();await fits(`${theme} funding editor ${width}`);
   }
  }
  await page.getByRole('button',{name:'Project',exact:true}).click();await page.setViewportSize({width:1440,height:1000});await page.keyboard.press('Tab');await page.locator('.brand').focus();assert.equal(await page.locator('.brand').evaluate(n=>getComputedStyle(n).outlineStyle),'solid');
  await page.getByLabel('Theme',{exact:true}).selectOption('system');
  const pixels=[];for(const scheme of ['light','dark']){await page.emulateMedia({colorScheme:scheme});await page.waitForFunction(t=>document.documentElement.dataset.theme===t,scheme);pixels.push(await page.evaluate(async()=>{const icon=new Image();icon.src=document.querySelector('link[rel=icon]').href;await icon.decode();const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');ctx.drawImage(icon,0,0,128,128);const data=ctx.getImageData(0,0,128,128).data;let green=0,brown=0;for(let i=0;i<data.length;i+=4){if(data[i+3]<200)continue;const [r,g,b]=data.slice(i,i+3);if(g>r*1.15&&g>b*1.15)green++;if(r>g*1.2&&g>b*1.2&&r<200)brown++;}return {pixels:Array.from(data),green,brown};}));}
  assert.deepEqual(pixels[0].pixels,pixels[1].pixels);assert(pixels.every(p=>p.green>100&&p.brown>100),'Favicon lost its original green/brown');
  await page.getByLabel('Theme',{exact:true}).selectOption('light');await page.reload();assert.equal(await page.getByLabel('Theme',{exact:true}).inputValue(),'light');
  assert.equal(JSON.stringify((await api('project')).project),before,'Appearance interactions changed the project');assert.equal(JSON.stringify((await api('project')).planning.draft),planningBefore,'Appearance interactions changed planning');
  await page.route('**/branding/*.png',r=>r.abort());await page.setViewportSize({width:320,height:1000});await page.reload();await page.getByText(/Logo asset could not load:/).first().waitFor();await fits('Visible logo-load errors');
  assert(await page.getByRole('alert').count()>=2);assert(await page.getByRole('link',{name:'Algarroba home — Restoration planning',exact:true}).isVisible());assert.deepEqual(errors,[]);
  console.log('Appearance: original-colour logos/favicon, all workspaces at 1440/390/320 in both themes, contrast, system/storage, visible asset failures and unchanged project passed.',contrast);
 }catch(e){if(page)await page.screenshot({path:'test-artifacts/carob-clay-appearance-failure.png'});throw e;}finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,5000))]);}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
