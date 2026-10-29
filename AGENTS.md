# Repository instructions

These instructions apply to work in this repository, including research and
code changes in Python, React, scenario configuration, persistence and migrations.

## Internet research: provide downloadable document links

When the user requests internet research and relevant downloadable documents
are found, include their links explicitly in the final response so they can be
downloaded and added to the repository's `doc_library/`. Include the same links
in any research report produced for the task.

- Provide clearly labelled Markdown links with the document title, issuing
  organisation or authors, and date when verified.
- Prefer verified direct download links, such as publisher-hosted PDFs. Where
  useful, also provide the stable publication or repository page.
- Do not substitute a search-results link or a DOI landing page for an available
  direct download. If only a landing page is available, label it accordingly and
  state any known login, payment or access limitation. Never invent a download
  URL or describe an unverified link as a confirmed download.
- Distinguish documents already stored in `doc_library/` from documents offered
  for addition. Research citations and temporary download caches do not mean a
  document has been added to the library.
- When documents are actually added, follow the naming and cataloguing workflow
  in `doc_library/CATALOG.md`.

## Strictly avoid silent fallbacks

Missing, invalid, incompatible or unexpected data must produce a clear,
actionable error. Do not conceal it by substituting another value, skipping work
or returning a result that looks successful.

In particular:

- Do not use hardcoded substitutes for required configuration or state, such as
  `settings.get("default_parcel_area", 4500)`, `value or default`, or
  `value ?? default` when the value is required by the contract.
- Do not replace failed reads, requests, validation or calculations with empty
  collections, zero, `null`, stale data or fabricated success.
- Do not swallow exceptions, silently ignore unsupported fields or silently
  drop actions that cannot be replayed. Dependency removal must be an explicit editing operation with a readable
  explanation. In the exploratory Site Designer it applies immediately with
  session Undo/Redo; transferring a design to Project planning, committing a
  demonstrator or adopting updated rules requires a review before confirmation.
- Do not silently try a different file, configuration, implementation or data
  source when the intended one is unavailable.
- Do not guess a save version or repair missing fields implicitly during normal
  execution. Use explicit, validated, version-specific migrations. Unsupported
  or malformed saves must be rejected without replacing the existing save.
- Do not hide an API/frontend incompatibility by rendering plausible substitute
  values or omitting required controls. Show the incompatibility and the action
  needed to resolve it.

### Defaults, optional values and recovery

Form defaults are intentional product inputs, not substitutes for broken data.
Define them in the authoritative configuration, validate them, and apply them
explicitly when creating a draft. Required defaults must not be duplicated as
fallback constants elsewhere.

Optional fields must have an explicit contract: what absence means, which
values are valid, and how absence is represented. Preserve distinctions between
missing, unknown, zero, empty and false. A documented optional value does not
justify treating required data as optional.

Recovery must be explicit and visible. Preserve the last confirmed project and
the user's draft when an operation fails; show the error and provide an explicit
retry or recovery action. Logging a problem alone does not justify substituting
behavior or values.

### Implementation and review

1. Identify required inputs and validate them at the appropriate boundary.
2. Propagate failures with useful context; present them clearly in the UI.
3. Keep failed mutations atomic: no partial state changes or successful-looking
   response after failure.
4. When behavior needs tests, check failure paths as well as successful inputs:
   missing configuration, malformed data, unsupported versions and failed I/O.
5. Treat existing silent fallbacks as defects. Remove those in a changed code
   path within the task's scope and explicitly identify remaining ones; do not
   copy them into new code or claim the repository is compliant without an audit.

These rules are mandatory for future changes. They do not imply that existing
code has already been audited or corrected.

The current audit scope, JSON configuration layout and intentional optional or
legacy cases are documented in `restoration_simulator/FALLBACK_AUDIT.md`. Preserve
the frozen replay contracts; do not use their historical prefills as a reason
to reintroduce silent recovery into current code.


## Site Designer: one traceable rule library

All current Site Designer decisions affecting generated species, starter quantities,
placement, assumed dimensions or treatments must be declared in
`restoration_simulator/design_rules/`, or registered there with an explicit Python
handler. Do not introduce ecological heuristics or substitute defaults in React.
Read that directory's README before changing designer behaviour. Every rule needs
stable identity, evidence classification, limitations and document/page references.
Source evidence and project layout assumptions are different. Mulch is a treatment
category: each material has its own stable type and rule; never reinterpret an old
stone-mulch design as another material.

Rule updates require validation, a changelog entry and relevant tests. Saved designs
retain their rules snapshot until the user reviews and adopts an update. Scenario
JSON owns simulation/funding assumptions; plant-prices.json owns current catalogue
price defaults. Frozen historical replay data is not an active designer rule source.

The designer-v1 and designer-v2 evaluators are frozen for historical snapshots.
New editing policy belongs in the registered designer-v3 handlers; do not change
historical replay semantics. Representative diameters, growth-form density and
tree–shrub placement policy live in the central rules library. Do not encode
plant compatibility or substitute diameters in React.
