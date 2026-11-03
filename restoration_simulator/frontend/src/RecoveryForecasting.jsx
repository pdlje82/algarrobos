import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { Alert } from "./Alert.jsx";
import roadmap from "../../../doc_library/LEARN-015 - Dryland Recovery - Prediction Science and Forecasting Roadmap - 2026-11-03.md?raw";
import roadmapUrl from "../../../doc_library/LEARN-015 - Dryland Recovery - Prediction Science and Forecasting Roadmap - 2026-11-03.md?url";
import "./RecoveryForecasting.css";

function SourceLink({ href, children }) {
  if (typeof href === "string" && /^(https?:\/\/|chatgpt-conversation:\/\/|#)/i.test(href)) {
    return <a href={href}>{children}</a>;
  }
  // The supplied report includes Windows paths. Browsers cannot open those
  // repository files; retain the reference visibly without inventing a URL.
  if (typeof href === "string" && /^[a-z]:\//i.test(href)) {
    return <span>{children} <small className="forecasting-local-reference">(Local repository file: {decodeURI(href)})</small></span>;
  }
  return <span>{children} <strong role="alert">Unsupported source link: {href}. Review this reference in LEARN-015.</strong></span>;
}

const components = {
  a: SourceLink,
  table: ({ children }) => <div className="forecasting-table-scroll" role="region" aria-label="Roadmap table; scroll horizontally on a small screen" tabIndex={0}><table>{children}</table></div>,
};

export function RecoveryForecasting() {
  return (
    <main id="forecasting-main" className="recovery-forecasting" tabIndex={-1}>
      <header className="forecasting-header">
        <p className="eyebrow">Future workspace</p>
        <h1>Dryland Recovery Forecasting</h1>
        <Alert variant="info" title="Planned functionality" announce={false}>
          This workspace currently holds the research and implementation roadmap.
          Recovery forecasts and prediction tools are not implemented yet.
        </Alert>
        <p><a href={roadmapUrl} download="LEARN-015 - Dryland Recovery - Prediction Science and Forecasting Roadmap - 2026-11-03.md">Download the roadmap (Markdown)</a></p>
      </header>
      {roadmap.trim() === "" ? (
        <Alert variant="error" title="Recovery forecasting roadmap is empty">
          Restore the content of LEARN-015 in doc_library, then rebuild and reload the application.
        </Alert>
      ) : (
        <article className="forecasting-document" aria-label="Dryland ecological recovery prediction roadmap">
          <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={components} urlTransform={url => url}>
            {roadmap}
          </Markdown>
        </article>
      )}
    </main>
  );
}
