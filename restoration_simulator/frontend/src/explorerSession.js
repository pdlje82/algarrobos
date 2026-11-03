// A gate pauses work that has not started, never abandons a submitted mutation.
export function createExplorationGate(){
  let paused=false;const listeners=new Set(),waiting=new Set();
  return {
    get paused(){return paused;},
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    pause(){if(paused)return;paused=true;for(const listener of listeners)listener();},
    resume(){if(!paused)return;paused=false;for(const listener of listeners)listener();for(const resolve of waiting)resolve();waiting.clear();},
    wait(){return paused?new Promise(resolve=>waiting.add(resolve)):Promise.resolve();},
  };
}
