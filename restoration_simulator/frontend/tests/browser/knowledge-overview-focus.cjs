// Read-only complement to knowledge-explorer.cjs; use only the isolated preview/API.
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
for(const key of ['PLAYWRIGHT_MODULE','DESIGNER_TEST_API','DESIGNER_APP_URL'])assert(process.env[key],`Set ${key}`);
assert.equal(new URL(process.env.DESIGNER_TEST_API).port,'8013');assert.equal(new URL(process.env.DESIGNER_APP_URL).port,'4174');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE),folder='../test-artifacts/knowledge-unified/browser-focus';
function luminance(rgb){return rgb.slice(0,3).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);}
(async()=>{
  await fs.mkdir(folder,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});
  const errors=[],mutations=[];
  try{
    for(const theme of ['light','dark'])for(const width of [1440,390,320]){
      const page=await browser.newPage({viewport:{width,height:1050}});let exploring=false;
      page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(exploring&&new URL(request.url()).pathname.startsWith('/api/')&&request.method()!=='GET')mutations.push(request.url());});
      await page.goto(process.env.DESIGNER_APP_URL);await page.getByRole('button',{name:'Knowledge Explorer',exact:true}).waitFor();await page.getByLabel('Theme',{exact:true}).selectOption(theme);exploring=true;
      await page.getByRole('button',{name:'Knowledge Explorer',exact:true}).click();await page.getByText('Registered knowledge only.',{exact:true}).waitFor();
      const colours=await page.locator('[data-workspace="knowledge"]').evaluate(node=>{const s=getComputedStyle(node);return [s.color,s.backgroundColor].map(c=>c.match(/[\d.]+/g).map(Number));});
      const [ink,paper]=colours.map(luminance);assert((Math.max(ink,paper)+.05)/(Math.min(ink,paper)+.05)>=4.5,'Active Knowledge Explorer navigation label must remain readable');
      const root=page.locator('#knowledge-main:visible'),stage=root.locator('.explorer-stage'),panel=root.getByRole('complementary',{name:'Knowledge record details'});
      assert.equal(await root.getByRole('button',{name:'Topic detail',exact:true}).count(),0);
      assert.equal(await root.getByRole('button',{name:width<900?'Outline':'Map',exact:true}).getAttribute('aria-pressed'),'true');
      assert.equal(await root.locator('[data-presentation-card^="view:"]').count(),4);assert.equal(await root.locator('.explorer-edge-label').count(),0);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(width===1440){
        await root.getByRole('button',{name:'Maximize graph',exact:true}).click();await page.screenshot({path:`${folder}/overview-${theme}-1440.png`});
        await root.locator('[data-display-group="view:sources"]').click();const web=root.locator('[data-presentation-card^="view:web:"] .explorer-card-title').first();await web.click();
        assert.match(await panel.innerText(),/Supplementary web reference/);assert.match(await panel.innerText(),/Registered context/);assert.match(await panel.innerText(),/checked/);
        await panel.getByRole('button',{name:'Close record details',exact:true}).click();assert(await web.evaluate(n=>document.activeElement===n));
        await root.getByRole('button',{name:'Restore workspace',exact:true}).click();
        await root.getByRole('navigation',{name:'Starting topics'}).getByRole('button',{name:'Algarrobo',exact:true}).click();
        await root.getByRole('button',{name:'Maximize graph',exact:true}).click();
        assert(await stage.evaluate(n=>n.contains(document.activeElement)),'Maximized controls must retain focus within the visible workspace');
        const advanced=root.locator('.explorer-advanced');await advanced.locator('summary').click();await advanced.getByRole('button',{name:'Advanced Network',exact:true}).click();
        const canvas=root.locator('.explorer-network');await canvas.focus();const before=await canvas.evaluate(n=>n.scrollLeft);await page.keyboard.press('ArrowRight');assert(await canvas.evaluate(n=>n.scrollLeft)>before);
        await root.getByRole('button',{name:'Pan right',exact:true}).click();await root.getByRole('button',{name:'Zoom in',exact:true}).click();await root.getByRole('button',{name:'Zoom out',exact:true}).click();
        await root.getByRole('button',{name:'Map',exact:true}).click();await page.screenshot({path:`${folder}/grouped-topic-${theme}-1440.png`});
        await root.getByRole('button',{name:'Restore workspace',exact:true}).click();assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
      }else await page.screenshot({path:`${folder}/overview-${theme}-${width}.png`});
      await page.close();
    }
    assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);
    const result={passed:true,errors,mutations,themes:['light','dark'],widths:[1440,390,320],checks:['four-layer default and responsive outline','supplementary web owner/context','maximized Overview focus','Advanced Network keyboard/pan/zoom','no label boxes or project mutations']};
    await fs.writeFile(`${folder}/focus-summary.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
