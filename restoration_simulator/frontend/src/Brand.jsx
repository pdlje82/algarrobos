import React, { useState } from "react";

function BrandImage({ asset, className, width, height, tileClassName = null }) {
  const [failed, setFailed] = useState(false);
  const source = `/branding/algarroba-${asset}.png`;
  const image = (
    <img
      className={className}
      src={source}
      alt=""
      aria-hidden="true"
      width={width}
      height={height}
      onError={() => setFailed(true)}
    />
  );
  return (
    <>
      {tileClassName === null ? image : <span className={tileClassName}>{image}</span>}
      {failed && (
        <span className="brand-error" role="alert">
          Logo asset could not load: {source}. Reload the application.
        </span>
      )}
    </>
  );
}

export function BrandLockup() {
  return (
    <a className="brand" href="/" aria-label="Algarroba home — Restoration planning">
      <BrandImage asset="symbol" className="brand-symbol" tileClassName="brand-symbol-tile" width={1254} height={1254} />
      <span className="brand-name">
        <BrandImage asset="wordmark" className="brand-wordmark" width={2172} height={724} />
        <span className="brand-sub">Restoration planning</span>
      </span>
    </a>
  );
}

export function BrandFooter() {
  return (
    <span className="footer-brand">
      <BrandImage asset="symbol" className="footer-symbol" tileClassName="brand-symbol-tile brand-symbol-tile-small" width={1254} height={1254} />
      <span>Algarroba <span aria-hidden="true">/</span> Restoration planning</span>
    </span>
  );
}

export function LandscapeMotif() {
  return (
    <svg className="landscape-motif" viewBox="0 0 260 132" aria-hidden="true" focusable="false">
      <g className="motif-branches" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M46 93C88 92 104 65 128 26M102 65C84 55 74 39 73 22M115 46C138 49 155 37 168 20M90 78C105 80 124 76 142 65" />
        <path d="M123 96C125 105 117 113 111 120M125 103C137 106 147 109 152 118M120 111L121 128M135 109L135 123" />
      </g>
      <g className="motif-leaves" fill="currentColor">
        <path d="M74 26C58 26 54 12 57 7C69 9 77 16 74 26ZM84 52C94 42 92 29 88 26C77 32 75 42 84 52ZM124 33C112 23 118 10 126 6C135 19 132 27 124 33ZM147 42C150 25 165 23 174 25C169 39 159 44 147 42ZM105 68C111 56 125 54 134 57C127 68 116 71 105 68ZM141 67C148 54 164 54 170 60C162 70 152 71 141 67Z" />
      </g>
      <path className="motif-pod" d="M27 91C77 123 171 131 234 73C221 110 187 129 141 129C90 128 50 113 27 91Z" />
      <path className="motif-pod-line" d="M52 105C109 128 181 119 218 92" fill="none" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
