import React from "react";
import {FundingHelp} from "./FundingHelp.jsx";
import {DocumentLink} from "./DocumentLink.jsx";

export function FundingQuestionHelp({question:q}){
  const g=q.guidance;
  return <FundingHelp label={q.short_label} details={<>
    <p><strong>Why it matters</strong><br/>{g.why}</p>
    <p><strong>What to check</strong><br/>{g.verify}</p>
    {g.requirements.map((r,i)=><span className="funding-question-rule" key={i}><strong>{r.programme_ids.join(" · ")}</strong><span>{r.explanation}</span><small>{r.evidence==="verified"?"Passage verified":r.evidence==="gap"?"Evidence gap":"Planning guidance"} · {r.verified_on}</small><span className="funding-sources">{r.sources.map((s,j)=><span key={j}><DocumentLink documentId={s.document_id} page={s.page} expectedSha256={s.sha256}>{s.label}</DocumentLink><small> · {s.document_id} · edition {s.sha256.slice(0,8)} · verified {s.verified_on}</small></span>)}</span></span>)}
    {g.requirements.length===0&&<small>Practical input guidance; no question-specific verified legal passage is asserted.</small>}
  </>}>{g.summary}</FundingHelp>;
}
