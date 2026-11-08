// Whole-card activation and popup resizing; read-only, isolated API/production only.
const assert=require('node:assert/strict'),fs=require('node:fs/promises');
for(const key of ['PLAYWRIGHT_MODULE','DESIGNER_TEST_API','DESIGNER_APP_URL'])assert(process.env[key],`Set ${key}`);
assert.equal(new URL(process.env.DESIGNER_TEST_API).port,'8013');assert.equal(new URL(process.env.DESIGNER_APP_URL).port,'4174');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE),folder='../test-artifacts/knowledge-unified/browser';
(async()=>{
  await fs.mkdir(folder,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[],mutations=[];let failurePage=null;
  try{
    const {branchGroupId,categoryGroupId,typeGroupId,SOURCE_GROUP}=await import('../../src/knowledgeExplorerPresentation.js');
    for(const theme of ['light','dark']){
      const page=await browser.newPage({viewport:{width:1440,height:1050}});failurePage=page;page.setDefaultTimeout(16000);let exploring=false,fail=false;
      page.on('pageerror',error=>errors.push(error.message));page.on('request',r=>{if(exploring&&new URL(r.url()).pathname.startsWith('/api/')&&r.method()!=='GET')mutations.push(r.url());});
      await page.route('**/api/knowledge/explorer',r=>fail?r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Fixture unavailable'})}):r.continue());
      await page.goto(process.env.DESIGNER_APP_URL);await page.getByRole('button',{name:'Knowledge Explorer',exact:true}).waitFor();await page.getByLabel('Theme',{exact:true}).selectOption(theme);exploring=true;
      await page.getByRole('button',{name:'Knowledge Explorer',exact:true}).click();await page.getByText('Registered knowledge only.',{exact:true}).waitFor();
      const root=page.locator('#knowledge-main:visible'),stage=root.locator('.explorer-stage'),panel=root.getByRole('complementary',{name:'Knowledge record details'});
      const card=id=>root.locator(`[data-presentation-card="${id}"]`),record=id=>root.locator(`[data-explorer-node="${id}"],[data-explorer-list-node="${id}"]`);
      async function padding(id){const target=card(id),size=await target.boundingBox();await target.click({position:{x:size.width-6,y:size.height-6}});}
      async function close(){if(await panel.isVisible())await panel.getByRole('button',{name:'Close record details',exact:true}).click();}
      async function dragResize(delta){const grip=panel.getByRole('button',{name:'Resize record details',exact:true}),rect=await grip.boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2+delta,{steps:10});await page.mouse.up();}
      await root.getByRole('button',{name:'Maximize graph',exact:true}).click();
      await padding('view:sources');assert.equal(await root.locator('[data-display-group="view:sources"]').getAttribute('aria-expanded'),'true');
      const document=root.locator('[data-display-group^="view:document:"]').first(),documentId=await document.getAttribute('data-display-group');
      const parentRect=await card('view:sources').boundingBox(),documentRect=await card(documentId).boundingBox();assert(documentRect.x>parentRect.x);assert.equal(await root.locator(`[data-tree-child="${documentId}"]`).count(),1);
      await padding(documentId);const passage=root.locator(`[data-tree-parent="${documentId}"]`).first(),passageId=await passage.getAttribute('data-tree-child');assert((await card(passageId).boundingBox()).x>documentRect.x);
      await padding(documentId);assert.equal(await card(passageId).count(),0);await padding('view:sources');assert.equal(await card(documentId).count(),0);
      // Nested area shortcuts must activate once without toggling the layer twice.
      await root.getByRole('button',{name:/^Ecology\s/}).click();assert.equal(await root.locator('[data-display-group="view:knowledge"]').getAttribute('aria-expanded'),'true');
      assert.equal(await card('species:carob').count(),0);await padding(typeGroupId('species'));
      assert.equal(await card('species:carob').count(),1);assert.equal(await card(typeGroupId('irrigation_profile')).count(),1);assert.equal(await root.getByRole('button',{name:'Topic detail',exact:true}).count(),0);
      await padding('species:carob');await panel.waitFor();assert.match(await panel.innerText(),/Species/);await close();
      assert.equal(await root.getByRole('button',{name:'Collapse selected record',exact:true}).count(),0);
      const scope=root.getByRole('status',{name:'Visible knowledge records'}),initial=await scope.innerText();
      await padding('species:carob');assert.notEqual(await scope.innerText(),initial);await close();await padding('species:carob');assert.equal(await scope.innerText(),initial);await close();
      await padding(typeGroupId('restoration_approach'));await padding('approach:mr2');await close();assert.equal(await card('species:carob').count(),1);assert.equal(await card('view:projects').count(),1);
      const mr2Sources=branchGroupId('approach:mr2',SOURCE_GROUP);assert.equal(await card(mr2Sources).count(),1);
      const group=branchGroupId('species:carob',categoryGroupId('guidance'));await padding(group);const claim=branchGroupId(group,'claim:mr2-stock-table');assert((await card(claim).boundingBox()).x>(await card(group).boundingBox()).x);assert.equal(await root.locator(`[data-tree-child="${claim}"]`).count(),1);
      await padding(group);assert.equal(await card(claim).count(),0);await root.locator(`[data-display-group="${group}"]`).focus();await page.keyboard.press('Space');await padding(claim);await panel.waitFor();assert.match(await panel.innerText(),/1000 cm3/);assert.match(await panel.innerText(),/200-300 cm3/);
      const start=await panel.boundingBox(),scroll=await root.locator('.explorer-canvas').evaluate(n=>n.scrollTop);await dragResize(100);let resized=await panel.boundingBox();assert(resized.height>start.height+60);assert.equal(resized.y,start.y);assert.equal(await root.locator('.explorer-canvas').evaluate(n=>n.scrollTop),scroll);
      await dragResize(-140);assert((await panel.boundingBox()).height<resized.height-100);
      const resize=panel.getByRole('button',{name:'Resize record details',exact:true});await resize.focus();await page.keyboard.press('Home');assert(Math.abs((await panel.boundingBox()).height-180)<2);await page.keyboard.press('End');resized=await panel.boundingBox();const bounds=await stage.boundingBox();assert(resized.y+resized.height<=bounds.y+bounds.height-7);
      await page.screenshot({path:`${folder}/resized-${theme}-1440.png`});
      const link=panel.locator('a[href*="/documents/FOREST-002/file"][href$="#page=134"]').first();await link.click();await page.locator('dialog.document-viewer').waitFor();await page.getByLabel('PDF page',{exact:true}).waitFor();await page.waitForFunction(()=>{const input=document.querySelector('input[aria-label="PDF page"]');return input!==null&&!input.disabled;});assert.equal(await page.getByLabel('PDF page',{exact:true}).inputValue(),'134');await page.keyboard.press('Escape');await page.locator('dialog.document-viewer').waitFor({state:'detached'});assert(await link.evaluate(n=>document.activeElement===n));
      await resize.focus();await page.keyboard.press('Home');await page.keyboard.press('Shift+ArrowDown');await page.keyboard.press('Shift+ArrowDown');await page.keyboard.press('Shift+ArrowDown');const chosen=(await panel.boundingBox()).height;await close();await root.getByRole('button',{name:'Record details',exact:true}).click();assert(Math.abs((await panel.boundingBox()).height-chosen)<2);
      await root.getByRole('button',{name:'Restore workspace',exact:true}).click();fail=true;await root.getByRole('button',{name:'Refresh explorer',exact:true}).click();await root.getByRole('alert').waitFor();fail=false;await root.getByRole('button',{name:'Retry explorer',exact:true}).click();await panel.waitFor();assert(Math.abs((await panel.boundingBox()).height-chosen)<2);
      await close();for(const width of [390,320]){await page.setViewportSize({width,height:1000});await root.getByRole('button',{name:'Outline',exact:true}).click();const child=card(claim),parent=card(group);assert((await child.boundingBox()).x>(await parent.boundingBox()).x);await padding(claim);assert.equal(await panel.getByRole('button',{name:'Resize record details',exact:true}).count(),0);assert.match(await panel.innerText(),/200-300 cm3/);await close();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`${folder}/outline-${theme}-${width}.png`});}
      await page.close();
    }
    assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);const summary={passed:true,errors,mutations,themes:['light','dark'],widths:[1440,390,320],checks:['whole-card toggles; exact type groups; topics expand inline with surrounding hierarchy retained','whole records open details','indented map and outline branches','bottom-edge mouse and keyboard resizing','bounds, close/reopen, PDF focus and failed-refresh retry','phone panel and read-only requests']};await fs.writeFile(`${folder}/summary.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
  }catch(error){if(failurePage!==null&&!failurePage.isClosed())await failurePage.screenshot({path:`${folder}/failure.png`});throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
