import {useCallback,useEffect,useRef,useState} from "react";
import settings from "./planning-ui.json";
import {required} from "./contracts.js";
import {DESIGNER_FIELDS} from "./SiteDesigner.jsx";

required(Object.keys(settings).sort().join(",")==="autosave_delay_ms,version"&&settings.version===1&&Number.isInteger(settings.autosave_delay_ms)&&settings.autosave_delay_ms>0,"Invalid planning autosave configuration.");

export function usePlanningDraft(data,request){
  const [value,setValue]=useState(null),[saving,setSaving]=useState(false),[error,setError]=useState("");
  const server=useRef(null),inputs=useRef(null),flight=useRef(null),timer=useRef(null),context=useRef(data),attempt=useRef(null),epoch=useRef(0),identity=useRef(null);
  context.current=data;
  const dirty=()=>server.current!==null&&JSON.stringify(inputs.current)!==JSON.stringify(server.current.draft.inputs);
  const adopt=useCallback(result=>{
    clearTimeout(timer.current);server.current=result;inputs.current=result===null?null:result.draft.inputs;
    attempt.current=null;setValue(result);setError("");
  },[]);
  useEffect(()=>{
    const id=data===null||data.project===null?null:data.project.id;
    if(id!==identity.current){epoch.current++;identity.current=id;adopt(data===null?null:data.planning);}
    else if(data!==null&&data.planning!==null&&(server.current===null||data.planning.planning_revision!==server.current.planning_revision||data.revision!==server.current.project_revision)){
      if(dirty())setError("The project changed while planning edits were unsaved. Your inputs are retained; reload the project before retrying.");
      else adopt(data.planning);
    }
  },[data?.project?.id,data?.revision,data?.planning?.planning_revision,adopt]);
  const flush=useCallback(async()=>{
    clearTimeout(timer.current);
    if(flight.current!==null)return flight.current;
    if(server.current===null)return false;
    if(!dirty()&&attempt.current===null)return server.current;
    const token=epoch.current;
    const run=async()=>{
      setSaving(true);setError("");
      try{
        while(dirty()||attempt.current!==null){
          if(attempt.current===null)attempt.current={revision:context.current.revision,planning_revision:server.current.planning_revision,request_id:crypto.randomUUID(),administration:Object.fromEntries(Object.entries(inputs.current).filter(([k])=>!DESIGNER_FIELDS.has(k)))};
          const result=await request("demonstrator/draft",attempt.current);
          if(token!==epoch.current)return false;
          attempt.current=null;server.current=result;
          setValue({...result,draft:{...result.draft,inputs:inputs.current}});
        }
        setValue(server.current);return server.current;
      }catch(e){if(token===epoch.current)setError(e.message);return false;}
      finally{flight.current=null;if(token===epoch.current)setSaving(false);}
    };
    flight.current=run();return flight.current;
  },[request]);
  const edit=useCallback(next=>{
    required(server.current!==null,"Open a project before editing demonstrator planning.");
    inputs.current=next;setValue({...server.current,committed:false,draft:{...server.current.draft,inputs:next}});
    clearTimeout(timer.current);timer.current=setTimeout(flush,settings.autosave_delay_ms);
  },[flush]);
  useEffect(()=>{
    const warn=e=>{if(dirty()||flight.current!==null||attempt.current!==null){e.preventDefault();e.returnValue="";}};
    window.addEventListener("beforeunload",warn);
    return()=>{clearTimeout(timer.current);window.removeEventListener("beforeunload",warn);};
  },[]);
  return {value,inputs:value===null?null:value.draft.inputs,edit,adopt,flush,saving,error,dirty:dirty()||attempt.current!==null};
}
