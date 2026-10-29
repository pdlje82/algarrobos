import React from "react";
import { required } from "./contracts.js";

const symbols={warning:"⚠",error:"!",danger:"!",success:"✓",info:"i"};

export function Alert({variant,title,children,announce=true,className="",...props}){
  required(Object.hasOwn(symbols,variant),`Unknown alert variant: ${variant}.`);
  required(typeof title==="string"&&title.trim()!=="","An alert needs a clear title.");
  return <div className={`app-alert app-alert--${variant} ${className}`} role={announce?(variant==="error"?"alert":"status"):undefined} {...props}>
    <strong className="app-alert-title"><span aria-hidden="true" className="app-alert-icon">{symbols[variant]}</span>{title}</strong>
    {children!==undefined&&<div className="app-alert-content">{children}</div>}
  </div>;
}
