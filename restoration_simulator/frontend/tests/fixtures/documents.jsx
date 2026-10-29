// Exercise the real app components, including a guide that owns a native dialog.
import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import {DocumentProvider,DocumentLink} from "../../src/DocumentLink.jsx";
import {PlantingExplorer} from "../../src/PlantingExplorer.jsx";
import "../../src/styles.css";

function Fixture(){
  const [note,setNote]=useState("");
  return <DocumentProvider><main className="panel"><h1>Document integration fixture</h1><label>Unfinished note<input value={note} onChange={e=>setNote(e.target.value)}/></label><PlantingExplorer/>
    <p><DocumentLink documentId="FOREST-002" page={125}>Handbook 125</DocumentLink></p>
    <p><DocumentLink documentId="FOREST-002" page={128}>Handbook photograph 128</DocumentLink></p>
    <p><DocumentLink href="/api/sources/plant-supply#page=5">Plant supply page 5</DocumentLink></p>
    <p><DocumentLink documentId="FOREST-004">One-page factsheet</DocumentLink></p>
    <p><DocumentLink documentId="FOREST-002" page={999}>Invalid page</DocumentLink></p>
    <p><DocumentLink documentId="FOREST-002" page={1} pageBasis="printed">Unmapped printed page</DocumentLink></p>
    <p><DocumentLink documentId="FOREST-004" expectedSha256={"0".repeat(64)}>Changed edition</DocumentLink></p>
    <p><DocumentLink href="https://example.org/unregistered.pdf#page=9">External PDF</DocumentLink></p>
  </main></DocumentProvider>;
}
createRoot(document.getElementById("root")).render(<Fixture/>);
