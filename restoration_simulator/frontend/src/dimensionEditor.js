export function initialCrownEditor(facts) {
  return {diameter:facts.value===null?"":String(facts.value),basis:facts.basis,note:facts.note};
}

export function sameCrownEditor(a,b) {
  const diameterEqual=a.diameter===b.diameter||(a.diameter.trim()!==""&&b.diameter.trim()!==""&&Number.isFinite(Number(a.diameter))&&Number(a.diameter)===Number(b.diameter));
  return diameterEqual&&a.basis===b.basis&&a.note===b.note;
}

export function validCrownEditor(value) {
  return value.diameter.trim()!==""&&Number.isFinite(Number(value.diameter))&&Number(value.diameter)>0&&Number(value.diameter)<=200&&["assumption","measured"].includes(value.basis)&&value.note.length<=500;
}

// Every completed edit runs against the latest accepted draft, including after
// a previous failure. Callers retain their own input and error/retry state.
export function createEditQueue() {
  let tail=Promise.resolve();
  return task=>{
    const result=tail.then(task);
    tail=result.then(()=>undefined,()=>undefined);
    return result;
  };
}
