export const FUNDING_STEPS = ["Activity", "People and land", "Explore options", "Compare alternatives", "Build a funding plan", "Review and use"];
export function effectiveFacts(draft) { return {...draft.baseline.facts, ...draft.overrides}; }
export function overrideAnswer(draft, field, value) {
  return {...draft, overrides: {...draft.overrides, [field]: value}};
}
export function resetAnswer(draft, field) {
  const overrides = {...draft.overrides}; delete overrides[field]; return {...draft, overrides};
}
export const FUNDING_HELP = {
  matches:"All modelled fit conditions are satisfied by the current recorded or hypothetical answers. Eligibility and call availability still require verification. Zero does not mean that funding is unavailable.",
  needs_answers:"This option has modelled requirements, but some remain unknown. Answer the relevant questions or obtain the missing evidence. Inherited values may come from planning defaults; they are not necessarily answers you entered here.",
  unimplemented:"This option is included for research, but its programme-specific assessment is not implemented. Completing more questions cannot resolve this. Supporting rules and source passages must first be verified and modelled.",
  conflicts:"At least one modelled condition conflicts with the current scenario, including inherited values and hypothetical assumptions. Inspect the conditions for the reason. This is not an official rejection.",
  fit_changes:"Options whose overall assessment changed since the previous successful assessment, for example from needing answers to meeting the modelled conditions.",
  resolved:"Previously unknown conditions now have a definite result: satisfied or conflicting. Resolved does not necessarily mean eligible. Other unknowns can leave the overall fit unchanged.",
  amount_changes:"Conditional funding estimates or previewed payment schedules changed, for example through a bonus or an eligible-cost answer. These are not awards or received cash. An amount condition can change without changing the estimate when a cap applies.",
};
export function statusLabel(status) {
  const labels={"Needs information":"Needs your answers","Does not match these facts":"Conflicts with current scenario","Possible match — eligibility unverified":"Meets modelled fit conditions — eligibility unverified"};
  if(!Object.hasOwn(labels,status))throw Error(`Unsupported funding status: ${status}`);
  return labels[status];
}
export function fundingClass(result) {
  if(!Array.isArray(result.checks)||!result.checks.length)throw Error("Funding requirements are missing. Reload the app and backend.");
  if(result.checks.every(c=>c.field===null))return "unimplemented";
  if(result.status==="Needs information")return "needs_answers";
  if(result.status==="Does not match these facts")return "conflicts";
  if(result.status==="Possible match — eligibility unverified")return "matches";
  throw Error(`Unsupported funding status: ${result.status}`);
}
export function fundingStatus(result) {
  return fundingClass(result)==="unimplemented" ? "Assessment not implemented" : statusLabel(result.status);
}
export function fundingCounts(results) {
  const counts={matches:0,needs_answers:0,conflicts:0,unimplemented:0};
  for(const r of results)counts[fundingClass(r)]++;
  return counts;
}
export function fundingResults(results, {query = "", group = "", requireChanges = false, all = false}) {
  const text = query.trim().toLowerCase();
  return results.filter(r => (all || r.relevant) && (!group || r.group === group) && (requireChanges || r.status !== "Does not match these facts") && (!text || `${r.id} ${r.title} ${r.description}`.toLowerCase().includes(text)));
}
export function answerLabel(question, value, parties) {
  if (value === null) return "Unknown / not yet recorded";
  if (question.type === "choice") return question.options.find(([id]) => id === value)?.[1] ?? String(value);
  if (question.type === "party") return parties.find(p => p.id === value)?.name ?? String(value);
  return String(value);
}
