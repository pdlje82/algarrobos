export const FUNDING_STEPS = ["Activity", "People and land", "Explore options", "Compare alternatives", "Build a funding plan", "Review and use"];
export function effectiveFacts(draft) { return {...draft.baseline.facts, ...draft.overrides}; }
export function overrideAnswer(draft, field, value) {
  return {...draft, overrides: {...draft.overrides, [field]: value}};
}
export function resetAnswer(draft, field) {
  const overrides = {...draft.overrides}; delete overrides[field]; return {...draft, overrides};
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
