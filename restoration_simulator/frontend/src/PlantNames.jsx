import React from "react";
import { germanName, plantNames } from "./plantNames.js";

export function PlantNames({id}){
  const p=plantNames(id);
  return <><span lang="es">{p.spanish}</span><small lang={p.german===null?"en":"de"}>{germanName(p)}</small><small><i>{p.scientific}</i></small></>;
}
