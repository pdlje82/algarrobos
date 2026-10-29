const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

// Serve unchanged build bytes only in this browser, with the isolated API route
// retained. This avoids starting or changing any production application server.
module.exports=async function productionAssets(context,appUrl,directory){
 directory=path.resolve(directory);assert.ok(fs.existsSync(path.join(directory,'index.html')),'Build the production app first.');
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==new URL(appUrl).origin||url.pathname.startsWith('/api/'))return route.fallback();
  const filename=path.resolve(directory,url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1)));
  const relative=path.relative(directory,filename);assert.ok(!relative.startsWith('..')&&!path.isAbsolute(relative),'Invalid production asset path');
  if(!fs.existsSync(filename)||!fs.statSync(filename).isFile())return route.fulfill({status:404,body:'Production asset unavailable'});
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.ico':'image/x-icon'};
  const extension=path.extname(filename);assert.ok(Object.hasOwn(types,extension),'Register production test MIME type for '+extension);
  return route.fulfill({status:200,contentType:types[extension],body:fs.readFileSync(filename)});
 });
};
