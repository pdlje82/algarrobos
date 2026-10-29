export function initialCrownEditor(facts) {
  return {diameter:facts.value===null?"":String(facts.value),basis:facts.basis,note:facts.note};
}

export function sameCrownEditor(a,b) {
  return a.diameter===b.diameter&&a.basis===b.basis&&a.note===b.note;
}

export function validCrownEditor(value) {
  return value.diameter.trim()!==""&&Number.isFinite(Number(value.diameter))&&Number(value.diameter)>0&&Number(value.diameter)<=200&&["assumption","measured"].includes(value.basis)&&value.note.length<=500;
}
