# Front-end representation guidelines for Codex

Version 1.0 · 27 October 2026

Suggested repository location: `docs/FRONTEND_REPRESENTATION_GUIDELINES.md`

## 1. Purpose and scope

Use this document as a reusable presentation reference when implementing a function requested by the user. It describes how to select visual representations, coordinate them and connect them to the Python simulation.

**Referencing this file does not authorize implementing every representation, installing every listed library, redesigning the application or adding simulation features.** Implement the function named in the user's prompt. Use the smallest representation that communicates its choices, requirements and consequences clearly.

The project is a restoration-initiative simulator with an approximately 30-year development horizon. Its initial actions and outcomes may be preconfigured placeholders. Preserve that full-horizon context as individual functions become richer.

Example user prompt:

> Implement the land-access selection function. Follow `docs/FRONTEND_REPRESENTATION_GUIDELINES.md` for presentation guidelines.

This file is a presentation guide, not a complete function specification or a legal/ecological rulebook. Follow the current user prompt and applicable repository instructions. Flag a material conflict instead of silently expanding scope.

## 2. Agreed architecture

| Part | Technology | Responsibility |
| --- | --- | --- |
| Simulation engine | Python | Authoritative project state, prerequisites, costs, time progression and outcomes |
| Backend API | Python with FastAPI | Expose definitions, previews and committed state; validate and save/load projects |
| Browser interface | React with semantic HTML/CSS and SVG where appropriate | Display information, manage presentation state, collect inputs and explain returned results |

Keep domain rules in Python or editable scenario data consumed by Python. React should not independently recalculate grant eligibility, land rights, cash balances, action durations or simulation outcomes.

React necessarily uses JavaScript or TypeScript in the browser. Keep that code focused on presentation and API integration. Follow the repository's existing language and build conventions; no language migration or new state-management package is required by this guide.

## 3. Choose representations by the user's question

| User question | Representation | Initial implementation | Add a library when… |
| --- | --- | --- | --- |
| What are my alternatives? | Selectable cards or a compact list | React + HTML/CSS with native selection controls | No additional library is required for seven alternatives |
| How do they differ? | Comparison table | Semantic HTML table rendered by React | Use TanStack Table when sorting, filtering or column control materially helps |
| What must I configure? | Conditional form in a panel or dialog | React + labelled native inputs | Reuse existing accessible UI components when present |
| When does this apply or expire? | Timeline aligned to project time | React + CSS or SVG | Use a timeline/chart library only for interactions that justify it |
| Who owns, uses or manages what? | Small relationship/dependency diagram | A focused labelled diagram | Use React Flow for interactive nodes, connections and inspection |
| How do numeric consequences compare? | Relevant chart or small multiples | Show the returned numbers clearly; select an appropriate chart | Use Vega-Lite for interactive quantitative views |
| Why is this stated? What is unresolved? | Explanation/evidence panel | React text, disclosure controls and source links | No additional visualization library is required |

Cards, a comparison table, configuration and a timeline are the default combination for land-access selection. Implement only the views needed for the requested function. Relationship diagrams and financial charts are optional additions, not automatic dependencies.

## 4. Representation behavior

### Alternative cards

Give each option a stable ID, recognizable title, one-sentence explanation and a few decision-relevant attributes. Make selection visible and keyboard accessible; native radio controls are suitable for mutually exclusive choices.

Show availability and its reason when supplied by the backend. An unknown requirement is not the same as an unmet requirement. Do not disable an option solely because information is missing unless the backend says the action cannot yet be committed.

### Comparison table

Use one row per alternative and consistent columns. For land access, candidate columns include ownership, access duration, initial expenditure, recurring expenditure, obligations, termination/expiry and unresolved conditions. Show funding compatibility only where the function has sourced or explicitly hypothetical rules for it.

Use explicit values such as `Unknown`, `Not applicable` or `Pending verification` where appropriate. Distinguish zero from missing data. Keep units and the basis of costs visible. Support sorting/filtering only where useful, and preserve unknown rows when filtering unless the user intentionally excludes them.

### Configuration form

After selection, show only relevant inputs: for example, parcel, parties, duration or payment terms, as defined by that option's data. Preserve the selection while the user reads explanations or compares options.

Label the effect of changing a field. Request a backend preview when domain consequences change. Keep a clear commit action: inspecting or editing a draft must not advance time or modify committed project state. Display validation, loading and error states without losing the draft unnecessarily.

### Timeline

Place actions, rights/access periods and expiries against the same project-time reference. Keep the approximately 30-year horizon understandable. For example, a hypothetical agreement ending in year 10 should visibly end there, while later project years remain visible.

Show any renewal or continuation as an explicit assumption or later action. Do not imply permanent ownership from temporary access. If only dependency order is known, use a sequence/dependency representation rather than inventing dates.

Separate elapsed history, a hypothetical preview and the future outline through labels and visual treatment. A planned milestone is not a completed event. Inspecting past events must not rewind the simulation.

### Relationship diagram

Use React Flow when users need to inspect relationships between landowners, parcels, operators, organizations and agreements. Label each connection, such as ownership, use rights or management responsibility, using definitions supplied by the domain model.

Keep the visible diagram focused on the selected item and its relevant neighbors. Preserve layout stability where practical. Default to inspection rather than an editable diagram; moving or connecting nodes must not modify legal arrangements or project state unless that editing function was explicitly requested. Provide a readable text/list alternative.

### Quantitative charts

Use charts to answer an actual numerical question: initial versus recurring costs, annual expenditure, cash availability or differences between scenarios. Keep comparable quantities on consistent scales and identify units and time periods.

Use Vega-Lite when linked selections, filtering or richer quantitative exploration is needed. Numerical inputs and calculations must come from the backend. Missing values stay missing. Draw uncertainty ranges only when supported by data/model output; do not invent probabilities, confidence percentages or monetary asset valuations.

## 5. Coordinate views without losing context

Representations use the same underlying records and stable IDs. Keep the selected project, parcel, access form and scenario consistent across cards, table, form, diagram and timeline.

Selecting an item in one view should identify the corresponding item in another view where useful. Keep names, units and status meanings stable. Switching views must not apply actions, reset configuration or change assumptions.

Use ordinary shared React state for UI coordination unless the existing application needs something else. Distinguish selected/hovered items and uncommitted draft inputs from authoritative simulation state returned by Python.

Different views may deliberately select different fields. Important qualifications must remain available and decision-changing limitations must remain visible. Avoid rendering all views simultaneously by default; allow focused views and a persistent indication of the current selection.

## 6. Evidence, uncertainty and placeholders

- Label fictional costs, durations and outcomes as illustrative placeholders.
- Distinguish sourced conditions, user assumptions, model outputs and unresolved questions.
- Preserve document/page or section references for researched claims where available.
- Keep critical caveats near the affected option or result; supplemental detail can be expanded.
- Do not convert an unverified condition into a legal conclusion, a rejection or a confirmed entitlement.
- Explain what changed, why it changed and which input/rule caused it after an action.

For land access, show ownership, use/access and management as distinct concepts when the supplied definitions distinguish them. Do not imply that creating an organization automatically transfers land to it.

## 7. Accessibility and responsive presentation

Use semantic headings, labelled native inputs, table headers and real buttons. Make essential content usable with keyboard and touch. Pair color with text or another cue. Do not make explanations or actions available only on hover.

Reflow layouts for narrow screens. Allow a readable comparison-table layout or a contained scroll when necessary. Avoid shrinking a 30-year timeline or a large diagram until its labels become illegible. Keep motion restrained, respect reduced-motion preferences and avoid automatic camera movement.

Keep explanations concise and place labels beside the visual elements they describe. The interface should help users understand choices and consequences without requiring them to remember previously hidden values.

## 8. Applying this to the seven land-access forms

Use the exact seven definitions supplied by the function specification or the project's researched material. This guide does not enumerate or redefine those legal arrangements. Do not substitute an invented list.

The source documents already exist, renamed, in:

`C:\Users\JanEngelke\git_private\algarobos\doc_library`

That is the user's Windows path, not an assurance that the current execution environment can access it. When implementing locally, resolve documents by their current names and content. If definitions are missing, identify the missing domain input explicitly rather than silently manufacturing it.

A suitable interaction is: open Establish land access, browse or compare the seven options, select one, configure the required fields, inspect a backend-calculated preview and timeline, then commit. Retain this structure as placeholders are progressively replaced by researched rules.

## 9. Small implementation and verification checklist

1. Identify the requested function and the question its interface must answer.
2. Reuse existing components and dependencies before adding libraries.
3. Select the smallest useful combination of representations.
4. Obtain definitions and consequences from the backend; keep UI state separate.
5. Verify selection consistency, draft/commit separation and handling of unknowns.
6. Check one phone-sized layout, desktop layout and keyboard operation.
7. Report the implemented views, remaining placeholders and any added dependency with its reason.

Do not expand into unrelated functions, a complete evidence platform or all future visualization modes merely because this document mentions them.

## 10. Official technology references

These describe library capabilities, not evidence that any particular layout is optimal for the user. Check current documentation and the repository's installed versions when implementation requires an API detail.

- React shared UI state: https://react.dev/learn/sharing-state-between-components
- TanStack Table introduction: https://tanstack.com/table/v8/docs/introduction
- React Flow: https://reactflow.dev/learn
- Vega-Lite selections: https://vega.github.io/vega-lite/docs/selection.html
