import {createContext,useContext,useSyncExternalStore} from "react";
export const ExplorerNavigation=createContext(null);
export function useExplorerNavigation(){
  const value=useContext(ExplorerNavigation);
  if(value===null)throw Error("Knowledge navigation requires its application provider.");
  return value;
}
export function useExplorationPaused(){
  const {gate}=useExplorerNavigation();
  return useSyncExternalStore(gate.subscribe,()=>gate.paused);
}
