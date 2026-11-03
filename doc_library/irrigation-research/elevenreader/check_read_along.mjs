// Optional local browser verification. Requires Node 22+ and Chrome on Windows.
import {readFile, writeFile, mkdir, mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';

const here=dirname(fileURLToPath(import.meta.url));
const publication=JSON.parse(await readFile(join(here,'Publication checks.json'),'utf8'));
const expectedImages=publication.total_embedded_illustrations;
const expectedReferences=publication.product_component_pictures_embedded;
const contract=JSON.parse(await readFile(join(here,'Edition contract.json'),'utf8'));
if(expectedImages!==contract.original_figure_numbers.length+contract.drone_figure_numbers.length+contract.reference_picture_ids.length||expectedReferences!==contract.reference_picture_ids.length)throw Error('Publication does not match the explicit edition contract');
const review=await mkdtemp(join(tmpdir(),'algarrobos-reader-review-'));
const profile=join(review,'profile');
await mkdir(profile);
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
  '--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'
],{windowsHide:true,stdio:'ignore'});
let socket;
try {
  let portFile;
  for(let i=0;i<100;i++){
    try{portFile=await readFile(join(profile,'DevToolsActivePort'),'utf8');break;}
    catch(e){if(e.code!=='ENOENT')throw e; await new Promise(r=>setTimeout(r,100));}
  }
  if(!portFile)throw Error('Chrome did not expose its inspection endpoint');
  const port=Number(portFile.split('\n')[0]);
  const tabs=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page=tabs.find(t=>t.type==='page');
  if(!page)throw Error('Missing headless inspection page');
  socket=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0;const pending=new Map();
  socket.addEventListener('message',event=>{
    const data=JSON.parse(event.data);
    if(data.id&&pending.has(data.id)){
      const {resolve,reject,timer}=pending.get(data.id);clearTimeout(timer);pending.delete(data.id);
      data.error?reject(Error(JSON.stringify(data.error))):resolve(data.result);
    }
  });
  function call(method,params={}){return new Promise((resolve,reject)=>{
    const current=++id;
    const timer=setTimeout(()=>{pending.delete(current);reject(Error('CDP timeout: '+method));},20000);
    pending.set(current,{resolve,reject,timer});socket.send(JSON.stringify({id:current,method,params}));
  });}
  async function evaluate(expression){
    const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:1100,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:pathToFileURL(join(here,'Irrigation - Read Along.html')).href});
  let ready=false;
  for(let i=0;i<100;i++){
    ready=await evaluate(`document.readyState==='complete'&&document.querySelectorAll('main img').length===${expectedImages}&&[...document.querySelectorAll('main img')].every(i=>i.complete&&i.naturalWidth>0)`);
    if(ready)break;
    await new Promise(r=>setTimeout(r,100));
  }
  if(!ready)throw Error('Read-along images did not finish loading');
  const checks=await evaluate(`(()=>{const button=document.querySelector('.reference .figure-open');button.click();const opened=document.getElementById('diagram-dialog').open;const enlarged=!!document.querySelector('#enlarged img');document.getElementById('close-diagram').click();return {chapters:document.querySelectorAll('main section').length,imageCount:document.querySelectorAll('main img').length,captionedReferencePictures:document.querySelectorAll('main figure.reference figcaption').length,allImagesLoaded:[...document.querySelectorAll('main img')].every(i=>i.complete&&i.naturalWidth>0),horizontalOverflow:document.documentElement.scrollWidth>innerWidth,dialogOpened:opened,enlargedImage:enlarged,dialogClosed:!document.getElementById('diagram-dialog').open};})()`);
  if(checks.chapters!==contract.chapter_count||checks.imageCount!==expectedImages||checks.captionedReferencePictures!==expectedReferences||!checks.allImagesLoaded||checks.horizontalOverflow||!checks.dialogOpened||!checks.enlargedImage||!checks.dialogClosed)throw Error(JSON.stringify(checks));
  async function capture(name,width,height,target){
    await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
    await evaluate(`document.querySelector(${JSON.stringify(target)}).scrollIntoView({block:'start'});new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
    await new Promise(r=>setTimeout(r,250));
    const dimensions=await evaluate(`({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,target:document.querySelector(${JSON.stringify(target)}).getBoundingClientRect().toJSON()})`);
    if(dimensions.overflow)throw Error('Viewport overflow: '+name);
    const result=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
    await writeFile(join(review,name+'.png'),Buffer.from(result.data,'base64'));
    return dimensions;
  }
  checks.desktop=await capture('desktop',1280,1100,'#figure-3');
  checks.products=await capture('products',1280,1100,'#figure-photo-p01');
  checks.mobile=await capture('mobile',390,1000,'#figure-photo-p11');
  checks.passive=await capture('passive',390,1000,'#figure-photo-p27');
  checks.droneSurvey=await capture('drone-survey',1280,1100,'#figure-photo-p42');
  checks.droneWater=await capture('drone-water',390,1000,'#figure-17');
  checks.droneResearch=await capture('drone-research',390,1000,'#figure-photo-p50');
  await writeFile(join(here,'Browser checks.json'),JSON.stringify(checks,null,2)+'\n');
  console.log(JSON.stringify({reviewDirectory:review,checks},null,2));
  await call('Browser.close');
} finally {
  if(socket)socket.close();
  if(!browser.killed)browser.kill();
}
