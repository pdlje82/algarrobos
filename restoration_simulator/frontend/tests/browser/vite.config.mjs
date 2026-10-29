import {mergeConfig} from "vite";
import application from "../../vite.config.js";

// Native PDF downloads/new tabs bypass Playwright routes: isolate the proxy too.
export default mergeConfig(application,{
  server:{proxy:{"/api":{target:"http://127.0.0.1:8013"}}},
  preview:{proxy:{"/api":{target:"http://127.0.0.1:8013"}}}
});
