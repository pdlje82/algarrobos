import test from "node:test";
import assert from "node:assert/strict";
import {documentCatalogue,documentRecord,documentTarget,documentFileUrl,resolveDocumentPage,printedLabel,validateDocumentCatalogue,validateDocumentMetadata,validPdfPage,pdfZoomScale,pdfDefaults} from "../src/documentLibrary.js";
import guide from "../src/carob-planting-guide.json" with {type:"json"};

test("registered PDF aliases open the right document; external PDFs and images remain ordinary links",()=>{
  assert.equal(documentTarget({href:"/api/sources/plant-supply#page=5"}).pdfPage,5);
  assert.equal(documentTarget({href:guide.source.url+"#page=128"}).id,"FOREST-002");
  assert.equal(documentTarget({href:"/api/sources/land-poster"}),null);
  assert.equal(documentTarget({href:"https://example.org/unregistered.pdf#page=12"}),null);
  assert.equal(documentTarget({href:guide.source.publication_url}),null);
  assert.equal(documentTarget({href:"/api/sources/plant-supply"}).pdfPage,1);
  assert.throws(()=>documentTarget({href:"/api/sources/plant-supply#page=99"}),/outside/);
  assert.throws(()=>documentTarget({href:"/api/sources/plant-supply#page=abc"}),/unsupported/);
});

test("zoom stays in the requested direction even when fit-to-width starts beyond button limits",()=>{
  assert.equal(pdfZoomScale(1,1,pdfDefaults),1.25);
  assert.equal(pdfZoomScale(.1,-1,pdfDefaults),.1);
  assert.equal(pdfZoomScale(.1,1,pdfDefaults),.125);
  assert.equal(pdfZoomScale(8,1,pdfDefaults),8);
  assert.ok(pdfZoomScale(8,-1,pdfDefaults)<8);
  assert.equal(pdfZoomScale(pdfDefaults.min_scale,-1,pdfDefaults),pdfDefaults.min_scale);
  assert.throws(()=>pdfZoomScale(1,0,pdfDefaults),/Invalid/);
});

test("printed pages use verified mappings only; an explicit target wins over previous reading state",()=>{
  const book=documentRecord("FOREST-002");assert.equal(resolveDocumentPage(book,125,"printed"),125);
  assert.throws(()=>resolveDocumentPage(book,1,"printed"),/not been mapped/);
  const example={...book,printed_pages:{"91":94}};
  assert.equal(resolveDocumentPage(example,91,"printed"),94);
  assert.equal(printedLabel(example,94),"91");assert.equal(printedLabel(example,1),null);
  for(const n of [0,-1,169,1.5,NaN])assert.equal(validPdfPage(n,168),false);
  function references(value){if(Array.isArray(value))value.forEach(references);else if(value!==null&&typeof value==="object"){if(Object.hasOwn(value,"pages"))for(const page of value.pages)assert.equal(resolveDocumentPage(book,page,"printed"),page);Object.values(value).forEach(references);}}
  references(guide);
});

test("saved edition checks and catalogue schema cannot silently substitute documents",()=>{
  assert.equal(documentCatalogue.documents.length,28);
  assert.equal(documentRecord("FUND-012").pages,15);
  const target=documentTarget({href:"/api/designer/sources/FOREST-004#page=1",expectedSha256:"0".repeat(64)});
  assert.match(documentFileUrl(target.id,target.expectedSha256),/expected_sha256=000/);
  const actual=documentRecord(target.id);
  const data={version:1,...actual,media_type:"application/pdf",file_url:"/api/documents/FOREST-004/file"};
  assert.throws(()=>validateDocumentMetadata(data,target),/edition/);
  assert.equal(validateDocumentMetadata(data,{...target,expectedSha256:actual.sha256}).pages,1);
  for(const mutate of [c=>delete c.viewer.initial_page,c=>c.documents[0].pages=0,c=>c.documents[0].printed_pages={"2":9999},c=>c.documents.push(structuredClone(c.documents[0]))]){const c=structuredClone(documentCatalogue);mutate(c);assert.throws(()=>validateDocumentCatalogue(c));}
});
