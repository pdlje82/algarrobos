// Serve and emit the exact installed PDF.js support assets, without a CDN.
import {readFileSync,readdirSync,statSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {join,resolve,sep} from "node:path";

export function pdfAssets(){
  const root=fileURLToPath(new URL("./node_modules/pdfjs-dist/",import.meta.url));
  const pkg=JSON.parse(readFileSync(join(root,"package.json"),"utf8"));
  const application=JSON.parse(readFileSync(new URL("./package.json",import.meta.url),"utf8"));
  if(application.dependencies["pdfjs-dist"]!==pkg.version)throw new Error("PDF.js assets must match the exact pinned dependency version.");
  const prefix=`/pdfjs-assets/${pkg.version}/`;
  const directories={cmaps:"cmaps",standard_fonts:"standard_fonts",wasm:"wasm",iccs:"iccs",images:"web/images"};
  function files(directory,base=""){
    return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(directory,entry.name),base+entry.name+"/"):[base+entry.name]);
  }
  return {name:"local-pdfjs-assets",
    configureServer(server){server.middlewares.use((req,res,next)=>{
      if(!req.url.startsWith("/pdfjs-assets/"))return next();
      if(!req.url.startsWith(prefix)){res.statusCode=404;res.end("PDF.js asset version unavailable.");return;}
      const parts=decodeURIComponent(req.url.split("?")[0].slice(prefix.length)).split("/"),group=parts.shift();
      if(!Object.hasOwn(directories,group)){res.statusCode=404;res.end("Unknown PDF.js asset group.");return;}
      const base=resolve(root,directories[group]),path=resolve(base,...parts);
      if(!path.startsWith(base+sep)){res.statusCode=400;res.end("Invalid asset path.");return;}
      try{
        if(!statSync(path).isFile()){res.statusCode=404;res.end("PDF.js asset unavailable.");return;}
        res.setHeader("Content-Type",path.endsWith(".wasm")?"application/wasm":path.endsWith(".js")?"text/javascript":path.endsWith(".svg")?"image/svg+xml":path.endsWith(".png")?"image/png":"application/octet-stream");
        res.end(req.method==="HEAD"?undefined:readFileSync(path));
      }catch(error){res.statusCode=error.code==="ENOENT"?404:500;res.end("PDF.js asset could not be read: "+error.message);}
    });},
    generateBundle(){
      for(const [group,directory] of Object.entries(directories))for(const file of files(join(root,directory)))
        this.emitFile({type:"asset",fileName:prefix.slice(1)+group+"/"+file,source:readFileSync(join(root,directory,file))});
      this.emitFile({type:"asset",fileName:prefix.slice(1)+"LICENSE",source:readFileSync(join(root,"LICENSE"))});
    }
  };
}
