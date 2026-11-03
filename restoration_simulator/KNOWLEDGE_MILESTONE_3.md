# Connected knowledge pilot implementation

Completed 3 November 2026. All acceptance checks passed on the final implementation.

Milestone 3 connects AL20 3.4, carob, MR2 and their evidence through a curated,
read-only Python/query layer. Feature adoption remains Milestone 4 and the visual
explorer remains Milestone 5. The [knowledge README](knowledge/README.md) documents
the commands, ownership and update contracts.

## Dataset and source review

`knowledge/connected-pilot-v1.json` contains 12 claims, 11 typed entities, nine
relationships, two unresolved issues and 19 registered bindings. The dataset ID
is `algarroba-connected-pilot-v1`, schema 1, reviewed on 3 November 2026.

The local source files were checked against their registered checksums before
reviewing these passages. No new internet research, document imports or automatic
claim extraction was performed.

| Claim IDs after the `claim:` prefix | Classification and inspected source |
| --- | --- |
| `al20-34-novel-demonstration`, `al20-34-results-publication` | Official requirements in FUND-008 PDF 120–121: demonstration definition and publication/retention obligations. These record the registered edition, not an award or current availability finding. |
| `npl3-heritage-need` | Official strategy need in FUND-013 PDF 395, section 4.3. The strategy ranking does not become a grant score. |
| `mr2-runoff-capture` | Technical guidance in FOREST-002 PDF 131–132 on suitable runoff capture around planting groups, subject to site assessment. |
| `mr2-preparation-depth` | FOREST-002 PDF 134 preparation dimensions, distinguished from plant/root-collar installation depth. |
| `mr2-stone-mulch` | FOREST-002 PDF 134 describes a microcatchment and stone mulch. It does not quantify a water-saving effect or another material's behaviour. |
| `mr2-density-area-basis` | FOREST-002 PDF 132/134: low overall tree densities and approximate local group spacing have different area bases. No uniform grid or Designer default is inferred. |
| `mr2-stock-narrative`, `mr2-stock-table` | FOREST-002 PDF 133 prefers stock above 1,000 cm3 while allowing ordinary stock above 200 cm3; table 5.19 on PDF 134 lists 200–300 cm3 stock. Both contexts remain unresolved source tension, not a logically proven contradiction or a selected stock default. |
| `designer-carob-density-assumption`, `designer-mr2-layout-assumption` | Project assumptions resolved from current central Designer configuration. The claim text does not duplicate the operational numbers or imply ecological optimality. |
| `mr2-establishment-water-gap` | Bounded gap in FOREST-002 PDF 135–137 concerning original seedling establishment-water volumes. The Nijar account includes a naturalised population; no zero-water establishment protocol or literature-wide absence is inferred. |

The published-call entity uses FUND-009 PDF 1: the resolution dated 13 April 2026,
published in BOJA on 22 April 2026. Its current availability is explicitly
`not_assessed`. Programme, route and call identities remain distinct.

## Citation and domain ownership

The existing citation registry now has four document editions, 14 passage/use
records and four consumers. `knowledge_pilot` reuses the FUND-008 page-120/121
uses and adds nine `pilot:` uses for the handbook, strategy and call. Its 11
mirrors bring the total checked source records to 25. The original five FUND-008
records, original three consumer memberships and original 14 funding mirrors
remain unchanged.

Native identifiers come from existing domain owners: the programme/route
catalogues, plant identities/names, Designer rule bundle, registered documents,
EDL needs and educational reference models. Adapters resolve selected stable
records and expose their authoritative record hashes. The illustrative activity
is explicitly authored project context rather than an existing saved activity.

The current density binding returns the central carob density with its unit and
ruleset ID. The geometry binding returns the existing MR2 centres and capture
drawing settings. Those current values remain labelled `project_assumption`;
saved designs can retain earlier snapshots. No biological, placement, pricing,
funding or scoring rule is authored in the knowledge layer.

Schema validation rejects unsupported fields/types/versions, dangling IDs,
invalid review dates, incompatible source editions, incorrect relationship
endpoints and invalid authoritative bindings. Programme/route membership,
approach/palette association and starter-species membership are checked against
their existing owners. A document must already be a call source in the funding
catalogue to be bound as a published call. Unused bindings/sources and unresolved
claims without issue records are errors.

## Query and impact contracts

`backend/knowledge_graph.py` provides search, entity detail, claim/passage impact
and unresolved-issue queries with matching read-only commands. All results carry
response version 1, dataset identity/hash, review date and explicit
`registered-pilot-only` coverage with exclusions. Search normalises Unicode and
case, returns ambiguous candidates without selecting one, and distinguishes a
valid empty result from unavailable data or an unknown identity.

The dataset hash includes raw pilot data, the validated citation registry and
resolved authoritative bindings. Each query reads the required inputs anew;
the local resolver snapshot is reused only inside that one load. A missing input
never reuses a prior successful result. Queries do not open project saves or call
the live application API.

`impact` returns explicit paths, not inferred causal effects:

- `citation_validation_dependency` means a consumer actually validates a cited
  passage's metadata mirrors. It is reported for passage targets.
- `review_required` means a curated claim-to-feature binding identifies content
  to review. Existing features do not yet consume these new claims automatically.
- Entity/relation IDs identify pilot records that directly cite the selected
  passage, including the call-context relation even when no claim cites it.

Unsupported or out-of-pilot impact targets fail explicitly. Unindexed research,
other subjects, unregistered feature dependencies, current eligibility and saved
project editions remain outside coverage. Relationships do not imply species
compatibility, permitted works, criterion selection or funding eligibility.

Both stock claims and the water gap remain queryable with their original pages,
contexts and limitations. Issue records have no preferred-value or automatic
resolution field. Commands emit deterministic UTF-8 JSON only after success,
with exit statuses 0/1/2 for success, data failure and usage error. `--check`
additionally verifies original PDF bytes. No command writes data.

## Verification

The implementation baseline was revision
`83e17d0b980d8048efc021fc0628f79e3d339a26` plus the existing uncommitted
Milestone 2 implementation: three checked feature loaders, shared-citation
service/data/tests, the Milestone 2 plan and roadmap/fallback entries. The revision
remained unchanged. Unrelated catalogue and irrigation-research work was preserved;
it is not part of this milestone's diff.

Backend checks use the existing `restoration-simulator` Conda environment:
Python 3.12.16, FastAPI 0.120.0, HTTPX 0.28.1 and Uvicorn 0.38.0. The frontend
toolchain is Node 22.23.4 and npm 10.9.9. No dependencies were installed. Python
commands below run from `restoration_simulator`; npm commands run from its
`frontend` directory. Test project state uses isolated temporary fixtures.

| Command | Result on 3 November 2026 (CET) |
| --- | --- |
| `python -m unittest discover -s tests -v` | Exit 0; 327 passed in 334.339 s; 16:04:52–16:10:35. |
| `python -m unittest discover -s tests -p 'test_knowledge*.py' -v` | Exit 0; 35 passed in 30.211 s; 16:06:04–16:06:39. Includes the original 19 citation tests and 16 pilot tests. |
| `npm.cmd test` | Exit 0; 107 passed, zero failures/skips; test duration 46.663 s; 15:58:24–15:59:27 through `conda run -n restoration-simulator --no-capture-output`. |
| `npm.cmd run build` | Exit 0; Vite production build succeeded in 11.87 s; 16:04:52–16:05:08. Existing warning: some minified chunks exceed 500 kB. |
| `python -m backend.knowledge_citations --check` | Exit 0; 14 uses, four consumers, 25 mirrors; all four original PDF editions verified; 16:07:03–16:07:05. |
| `python -m backend.knowledge_citations --project knowledge_pilot` | Exit 0; 11 expected source records with consumer-owned labels; 16:07:05–16:07:07. |
| `python -m backend.knowledge_graph --check` | Exit 0; 12 claims, 11 entities, nine relationships, two issues, 19 bindings and 11 sources; PDF bytes verified; 16:07:07–16:07:09. |

The Python test commands were prefixed with
`conda run -n restoration-simulator --no-capture-output`; individual command
checks used that environment's exact Python executable. The remaining six
command examples in the README (search, detail, claim impact, passage impact,
all issues and filtered issues) all exited 0 at 16:07:09–16:07:20. The passage
check used the full FOREST-002 edition-qualified PDF-134 identity shown there.
All JSON command results carry the coverage boundary and dataset hash
`2f1c65ace5d2c962e921a6f347f7c9decc8d0f0b0b3e0c2005b5186e71230f04`.

One test invocation failed before the final discovery run:
`python -m unittest tests.test_knowledge_citations tests.test_knowledge_graph -v`
exited 1 because the existing citation fixture imports `test_project_concepts`
from the discovery test directory. It ran 16 pilot tests successfully plus one
failed module import (17 reported tests). The discovery command above supplies
the intended import context and passes all 35. This invocation failure is retained
in `targeted-invocation-error.log`; it is not counted as a passing check.

### Coverage and compatibility evidence

The pilot tests cover all four query capabilities; Unicode/case/alias ambiguity;
valid empty searches; unknown identities and filters; source/edition resolution;
closed schemas, dates, typed endpoints and native membership; invalid bindings;
both stock contexts and unresolved issues; bounded water evidence; current
configuration projection and changed hashes; deterministic results; failed reads,
duplicate/corrupt files and successful retry; command statuses and nonmutation.
They reject retyping a handbook as a call or a retained poster preset as a palette.

The retained citation tests still assert the exact original five citation records,
three memberships, labels and complete library values. Their isolated API/save
fixtures cover reports, concept/delivery hashes, import/export, failed transfer
and save atomicity, draft preservation and successful retry. Existing full-suite
tests additionally cover malformed saves, historical funding/Designer replay and
explicit rule adoption. No browser workflow or live project API was used.

SHA-256 comparison against the start-of-task fingerprint confirms that all 22
scenario files, nine Designer library files, 236 frontend files, 58 original
PDF/PNG documents and eight existing save/backup files remain byte-identical.
The original three feature-loader files also match the Milestone 3 baseline;
their checked-mirror integration already belonged to Milestone 2. All original
registry edition, passage, citation and consumer objects are deeply unchanged.
The three semantic library hashes remain:

| Library | SHA-256 |
| --- | --- |
| Selection guidance | `4a55f602ea8279264afcb8c3135908e4b96ffe2d3b9017559dcec95ae660c03d` |
| Project concepts | `19d260ade0296e99dc2ffc678ae93f49b513f45d959253bd20baddcd4fc7d542` |
| Delivery planning | `bbfd549874c6f0152c7a5b13ae5edef5e43a416785ea3afd72ea44b43faa6ca2` |

Final review checked 19 local documentation links and heading anchors, parsed all
four affected Python files and checked whitespace/final newlines in ten affected
files. `git diff --check` exited 0. Git emitted its existing LF-to-CRLF notices;
these are not failed checks. Of 416 start-of-task file fingerprints, 410 match
exactly and six differ only in the intended citation registration, tests and
knowledge documentation. Four new pilot implementation/data/test/report files
complete the change. No unrelated file was edited by this milestone.

Raw local logs, source-review extracts, command outputs and integrity records
are under ignored `test-artifacts/knowledge-pilot/`. They are supplementary to
the durable completion evidence in this document.

## Remaining scope and handoff

Unindexed research prose, other programmes/species, publication metadata, older
document retrieval, saved-project dependency queries and other independent
citations remain outside this pilot. Call availability was not researched. The
stock tension and water gap remain unresolved. No claim automatically changes a
rule, eligibility, score, educational paragraph or saved project.

The next bounded task is a Milestone 4 implementation plan: select a small set
of current editorial consumers, enumerate the projections they would adopt and
their exact compatibility contracts, and separate any deliberate content
correction from unchanged calculations and frozen snapshots. Feature integration
and visualisation have not started; Milestones 4–6 remain pending.
