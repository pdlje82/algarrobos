import React,{useId} from "react";
import { PlantNames } from "./PlantNames.jsx";
import { money } from "./format.js";
import { plantOrderRows } from "./plantOrderList.js";

export function PlantOrderList({demonstrator,planning=null}) {
  const {state,rows}=plantOrderRows(demonstrator,planning);
  const draft=planning!==null&&planning.saved&&!planning.committed;
  const heading=useId();
  return <section className="panel plant-order-list" aria-labelledby={heading}><h2 id={heading}>Plant order list</h2>
    {state==="empty"?<p>Use a site design in demonstrator planning to generate the plant order list.</p>:state==="unavailable"?<p>This older plan has no plant-level ordering records. Species, purchasing quantities and prices are unavailable.</p>:<>
      <p className="muted"><strong>{draft?"Draft":"Committed"}</strong> · Purchasing quantities and recorded prices {draft?"for the planning draft. No demonstrator is created until you commit its plan.":"from the committed demonstrator plan."}</p>
      <table><thead><tr><th scope="col">Plant</th><th scope="col">Price per plant</th><th scope="col">Quantity</th></tr></thead><tbody>{rows.map(row=>{
        return <tr key={row.id}><th scope="row">{row.custom?row.label:<PlantNames id={row.id}/>}</th><td>{money(row.unit_cost)}{row.price_confirmed!==true&&<small className="order-price-status">{row.price_confirmed===false?"Estimate · not confirmed":"Confirmation not recorded"}</small>}</td><td>{row.quantity}</td></tr>;
      })}</tbody></table>
    </>}
  </section>;
}
