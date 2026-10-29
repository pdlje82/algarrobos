import * as pdfjs from "pdfjs-dist/build/pdf.mjs";
import {EventBus,PDFViewer,PDFLinkService,PDFFindController,LinkTarget,FindState} from "pdfjs-dist/web/pdf_viewer.mjs";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "pdfjs-dist/web/pdf_viewer.css";
import {pdfZoomScale} from "./documentLibrary.js";

pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;

export function createPdfEngine({container,url,page,expectedPages,defaults,onReady,onPage,onScale,onSearch,onError}){
  const abort=new AbortController(),bus=new EventBus();
  let disposed=false,ready=false;
  const listen=(event,callback)=>bus.on(event,callback,{signal:abort.signal});
  const links=new PDFLinkService({eventBus:bus,externalLinkTarget:LinkTarget.BLANK,externalLinkRel:"noopener noreferrer"});
  const find=new PDFFindController({eventBus:bus,linkService:links});
  const assets=`/pdfjs-assets/${pdfjs.version}/`;
  const viewer=new PDFViewer({container,eventBus:bus,linkService:links,findController:find,
    abortSignal:abort.signal,annotationMode:pdfjs.AnnotationMode.ENABLE,
    imageResourcesPath:assets+"images/",enableScripting:false,enableAutoLinking:true});
  links.setViewer(viewer);
  const resize=new ResizeObserver(()=>{
    if(!disposed&&ready&&viewer.currentScaleValue===defaults.initial_scale){viewer.currentScaleValue=defaults.initial_scale;viewer.update();}
  });
  resize.observe(container);
  listen("pagesinit",()=>{
    if(disposed)return;
    viewer.currentScaleValue=defaults.initial_scale;
    viewer.scrollPageIntoView({pageNumber:page});
  });
  listen("pagerendered",event=>{
    if(disposed)return;
    if(event.error){onError(`PDF page ${event.pageNumber} could not be rendered: ${event.error.message}`);return;}
    if(!ready&&event.pageNumber===page){ready=true;onReady(viewer.currentPageNumber);}
  });
  listen("pagechanging",event=>{if(ready&&!disposed)onPage(event.pageNumber);});
  listen("scalechanging",event=>{if(!disposed)onScale(event.scale);});
  listen("updatefindmatchescount",event=>{if(!disposed)onSearch(event.matchesCount.total?`${event.matchesCount.current} of ${event.matchesCount.total} matches`:"Searching…");});
  listen("updatefindcontrolstate",event=>{
    if(disposed)return;
    if(event.state===FindState.NOT_FOUND)onSearch("No text matches. Scanned images are not searched; this viewer does not perform OCR.");
    else if(event.state===FindState.PENDING)onSearch("Searching…");
    else if(event.matchesCount.total)onSearch(`${event.matchesCount.current} of ${event.matchesCount.total} matches`);
    else onSearch("");
  });
  const task=pdfjs.getDocument({url,cMapUrl:assets+"cmaps/",cMapPacked:true,standardFontDataUrl:assets+"standard_fonts/",
    wasmUrl:assets+"wasm/",iccUrl:assets+"iccs/",enableXfa:false,isEvalSupported:false});
  task.promise.then(doc=>{
    if(disposed)return;
    if(doc.numPages!==expectedPages){onError("PDF page count differs from the registered edition. Verify the document catalogue.");return;}
    viewer.setDocument(doc);links.setDocument(doc);
  }).catch(error=>{if(!disposed)onError("PDF could not be loaded: "+error.message);});
  return {
    go(n){viewer.scrollPageIntoView({pageNumber:n});},
    zoom(direction){viewer.currentScale=pdfZoomScale(viewer.currentScale,direction,defaults);},
    fit(){viewer.currentScaleValue=defaults.initial_scale;},
    search(query,previous=false){bus.dispatch("find",{source:find,type:"again",query,phraseSearch:true,caseSensitive:false,entireWord:false,highlightAll:true,findPrevious:previous,matchDiacritics:false});},
    destroy(){disposed=true;resize.disconnect();abort.abort();viewer.setDocument(null);links.setDocument(null);return task.destroy();}
  };
}
