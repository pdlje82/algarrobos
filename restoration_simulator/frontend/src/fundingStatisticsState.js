// Validate the lookup interface; all comparison and scoring math stays in Python.
export function validateStatisticsResponse(value){
  function require(test){if(!test)throw Error("Incompatible AL20 statistics response. Restart Python and reload the lookup.");}
  require(value!==null&&typeof value==="object"&&value.version===1&&typeof value.dataset_hash==="string"&&/^[0-9a-f]{64}$/.test(value.dataset_hash));
  const data=value.dataset;
  require(data!==null&&typeof data==="object"&&data.version===1&&data.status==="provisional"&&Number.isInteger(data.year));
  require(Array.isArray(data.municipalities)&&data.municipalities.length===32&&new Set(data.municipalities.map(r=>r.name)).size===32);
  require(data.municipalities.every(r=>typeof r.name==="string"&&r.name&&Number.isInteger(r.population)&&r.population>=0&&Number.isInteger(r.businesses)&&r.businesses>=0));
  require(Array.isArray(data.sources)&&data.sources.length>0&&Array.isArray(data.limitations)&&data.limitations.every(t=>typeof t==="string"));
  require(data.defaults!==null&&typeof data.defaults==="object"&&data.defaults.municipality===null&&data.defaults.population_mode==="unconfirmed"&&data.defaults.settlement_name===null&&data.defaults.population===null&&data.defaults.population_year===null);
  require(data.benchmarks!==null&&typeof data.benchmarks==="object"&&["population_zrl_median","population_zrl_mean","population_andalusia_median","population_andalusia_mean","businesses_zrl_median","businesses_zrl_mean"].every(k=>typeof data.benchmarks[k]==="string"&&/^\d+(\.\d+)?$/.test(data.benchmarks[k])));
  return value;
}
