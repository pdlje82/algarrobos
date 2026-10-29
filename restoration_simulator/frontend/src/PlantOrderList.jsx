import React from "react";
import { plantIllustration } from "./PlantPortrait.jsx";
import { money } from "./format.js";
import { plantOrderRows } from "./plantOrderList.js";

export function PlantOrderList({demonstrator}) {
  const {state,rows}=plantOrderRows(demonstrator);
  return <section className="panel plant-order-list" aria-labelledby="plant-order-title"><h2 id="plant-order-title">Plant order list</h2>
    {state==="empty"?<p>Apply a site design to generate the plant order list.</p>:state==="unavailable"?<p>This older plan has no plant-level ordering records. Species, purchasing quantities and prices are unavailable.</p>:<>
      <p className="muted">Purchasing quantities and recorded prices from the applied demonstrator plan.</p>
      <table><thead><tr><th scope="col">Plant</th><th scope="col">Price per plant</th><th scope="col">Quantity</th></tr></thead><tbody>{rows.map(row=>{
        const names=row.custom?null:plantIllustration(row.id);
        return <tr key={row.id}><th scope="row">{row.label}{names!==null&&<><small lang="es">{names.spanish_name}</small><small><i>{names.scientific_name}</i></small></>}</th><td>{money(row.unit_cost)}{row.price_confirmed!==true&&<small className="order-price-status">{row.price_confirmed===false?"Estimate · not confirmed":"Confirmation not recorded"}</small>}</td><td>{row.quantity}</td></tr>;
      })}</tbody></table>
    </>}
  </section>;
}
