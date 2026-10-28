import React, { useState } from "react";
import { evidenceLabels, handbookPageUrl } from "./plantingGuide.js";

export function Evidence({ kind }) {
  return <span className={`explorer-evidence explorer-evidence-${kind}`}>{evidenceLabels[kind]}</span>;
}

export function References({ guide, pages }) {
  return (
    <span className="explorer-references">
      Handbook {pages.length === 1 ? "p." : "pp."}{" "}
      {pages.map((page, index) => (
        <React.Fragment key={page}>
          {index > 0 && ", "}
          <a href={handbookPageUrl(guide.source, page)} target="_blank" rel="noreferrer" aria-label={`Read handbook page ${page} (opens in a new tab)`}>{page}</a>
        </React.Fragment>
      ))}
    </span>
  );
}

export function GuideCard({ guide, card, heading = "h3" }) {
  const Heading = heading;
  return (
    <article className="explorer-card">
      <Evidence kind={card.kind} />
      <Heading>{card.title}</Heading>
      <p>{card.text}</p>
      <References guide={guide} pages={card.pages} />
    </article>
  );
}

export function GuidePhotograph({ guide, photo, page, subject, sourceLabel }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="explorer-photo">
      <div className="explorer-photo-frame" style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
        {failed ? (
          <div role="alert" className="explorer-photo-error">
            <p>Photograph of {subject} could not be loaded.</p>
            <button type="button" onClick={() => setFailed(false)}>Retry photograph</button>
          </div>
        ) : (
          <a href={photo.src} target="_blank" rel="noreferrer" aria-label={`Open original photograph of ${subject}`}>
            <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" onError={() => setFailed(true)} />
          </a>
        )}
      </div>
      <figcaption>
        <a href={handbookPageUrl(guide.source, page)} target="_blank" rel="noreferrer">{sourceLabel} · book p. {page} ↗</a>
        <span>{photo.figure} · {photo.credit} · <a href={photo.license_url} target="_blank" rel="noreferrer">{photo.license}</a></span>
      </figcaption>
    </figure>
  );
}
