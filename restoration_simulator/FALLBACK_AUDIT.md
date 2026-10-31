# Silent-fallback audit · 28 October 2026

Scope: current Python engine/API/configuration/persistence/deletion code, React
components, formatting, theme initialization, HTML startup and Vite configuration.
Dependencies, generated output and saved user projects are outside the source audit.
The frozen replay modules were reviewed for compatibility boundaries and preserved.

## Changes

AL20 scoring (31 October 2026): catalogue edition 3 and funding draft v4 require
all route/profile/criterion definitions and structured answers. No manual total,
missing answer, unavailable source instruction or financial estimate substitutes
for an annex selection. Incomplete assessments report a partial subtotal and keep
their threshold result unknown. PE.2 duration/UTA confirmation is required for
positive claims; undocumented part-time graduation is explicitly unimplemented.
PE.4 requires explicit grant/job inputs. Invalid combinations, malformed inputs,
unsupported editions and failed writes are rejected before save publication.
Old manual totals survive only as historical information after reviewed upgrade.
Historical evaluators and intentional optional catalogue fields (`retired`,
legacy activity restrictions) retain their edition-specific contracts. Existing
funding allocation summaries that omit explicitly unknown amounts still carry
their separate incompleteness warnings/unknown balance; that wider presentation
policy was not changed or audited here. This is not a repository-wide compliance
claim.

Named Site Designs (29 October 2026): envelope 6 explicitly migrates envelope-5
attachments to a validated project-local library. Naming defaults are required
from `scenarios/designer-library-defaults.json`. Create/update and library commands
are explicit, revision-checked, idempotent and atomic; duplicate names, missing
IDs, incompatible versions and failed writes are errors. There is no automatic
overwrite or silent layout regeneration when loading a saved alternative.

| Area | Result |
| --- | --- |
| Normal defaults | Form values, budgets, quantities, timings, renewal terms, client initial values and the default save path are in `scenarios/defaults.json`; required keys are validated. |
| New projects | Form schema 2 requires a complete `input_defaults` snapshot. Removing a required field/version produces an error; it does not switch to an older form definition. |
| Earlier v4 forms | A specific adapter reads immutable `legacy-form-defaults-v1.json`. The API and UI identify that mode. Existing entered values and history are preserved. |
| Plant examples | The existing v1 catalogue/mixes were moved unchanged into a required, validated JSON file. Missing or malformed catalogue data is rejected. |
| API responses | The frontend checks required view/form/preview fields and versions before accepting responses. Missing access area is not replaced by total area; missing records are not replaced with empty lists. |
| Form inputs | Missing inputs are errors. Explicitly cleared numeric drafts still display blank. Saved plan fields must exist before editing; defaults do not repair incomplete plans. |
| Labels and references | Unknown parcel/party/plant references fail visibly instead of displaying a raw ID. Missing funding assessments, form sections and demonstrator records cannot silently disappear. |
| Numbers | Zero remains zero. Only explicit `null` means unknown; undefined, strings, booleans, NaN and infinity are formatting errors. |
| Errors and retries | API errors remain visible and preserve the last confirmed project and draft. Land-form loading has an explicit retry. A render boundary reports contract errors instead of a blank UI. |
| Theme storage | Missing preferences use the configured initial theme. Invalid preferences or blocked/failed storage show a warning; they are not silently ignored. |
| Save path | Explicit argument, then environment setting, then configured default is a declared precedence rule. An empty explicit/environment path is rejected. |
| Exploration deletion | Unreplayable dependent choices are listed in the confirmation preview. No unknown action kind is replaced with an empty string. |

## Intentional cases retained

- `null` measurements and unentered counts, empty optional references/notes, a
  grant payment without an agreement reference, no active project/selection,
  and `end: null` for indefinite access have explicit meanings. They do not
  supply substitute simulation values.
- An empty organization list is displayed as an individual initiative. Optional
  explanatory text, category button labels and HTML numeric step metadata are
  presentation conventions, not fabricated state or configuration recovery.
- `get()` used to validate a possibly missing field, look up an optional receipt,
  or inspect an optional legacy discriminator is not a default-value fallback.
  Required state/configuration still fails validation.
- A validated custom category is displayed as the user's text when it is not a
  preset. An older aggregate planting plan explicitly requests a new species
  selection and shows a notice rather than inventing species quantities.
- Theme recovery uses the configured value **and displays why**. Network/HTTP
  failures may have a generic error message when the server supplies no usable
  detail; they never become successful results.
- Frozen `legacy.py`, `engine_v2.py`, `engine_v3.py` and
  `parcel_removal_legacy.py` retain historical behavior for exact validation and
  replay. Their old prefills are not the authority for current forms: the
  current form adapter supplies validated JSON prefills for new inputs, while
  existing parcels/proposals supply their recorded values. Changing frozen
  history rules would risk corrupting compatible saves.
- Constraints, formatting precision, the supported 30-year timeline axis,
  semantic empty-state UI values, CSS theme colors and explicit development
  ports are not missing-data recovery values.

## Verification

Final checks: **84 Python tests and 11 frontend tests passed**, production Vite
build passed, and the changed Python files passed Ruff checks. No runtime
dependencies were added.

Backend checks cover required/malformed/duplicate JSON, invalid versions and
defaults, missing catalogues/adapters, zero prices, snapshot stability and
invalid imports preserving both memory and disk. Frontend tests cover numeric
and form contracts, broken references, incomplete responses and missing
demonstrator data. Existing migration, deletion, funding and persistence suites
remain required.

The isolated browser playtest loaded a copy of an earlier save with its adapter
notice, created a new JSON-backed project, verified 4,500 m²/200 m² ownership
prefills and a zero tree price, then completed baseline/planting and reload/undo.
A controlled Python-server outage produced a visible error and retained the
zero-price draft; explicitly retrying the same request after restart succeeded.
The 390-pixel form layout also remained usable. The user's active save was not
modified by this audit or these playtests.

## Per-plant pricing follow-up · 28 October 2026

Current price prefills are required configuration in `scenarios/plant-prices.json`,
editable through the checklist with a separate explicit save action. The historical
shared tree/shrub rates in form snapshots remain solely for v1/aggregate replay.
Selection version 2 requires every unit price and boolean confirmation flag; a
missing amount/flag is never supplied from defaults. Existing plans retain their
amounts when mutable defaults change. The labelled v1 editing adapter uses recorded
group rates, not today’s price file; old confirmation is explicitly not recorded.
New selections start unconfirmed, and a price edit clears confirmation. Default
updates do not write the active project, carry confirmations across projects or
create history entries. Configuration reads, concurrent edits and write failures
are explicit, with atomic replacement and retry/reload controls.

## Demonstrator preparation · 29 October 2026

Envelope 7 adds an independent planning draft and revision. A missing attachment
explicitly means no saved draft: initial inputs come from the existing committed
plan/form configuration, not hardcoded recovery values. Incomplete administrative
values are intentionally retained as entered (`null` means an unentered numeric
field); simulation validation remains mandatory at Project review/commit. No
configured starter list is presented as an actual selected physical plan before
handoff. Only the explicit handoff copies a named design and its embedded evidence;
Save/Load never do so. Required fields, source snapshots, revisions and finite JSON
are validated, failed writes remain atomic and retries retain their request IDs.
Unsupported old designer apply calls return an explicit refresh instruction.
