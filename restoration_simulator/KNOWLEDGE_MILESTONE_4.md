# Shared evidence in existing features

Completed 3 November 2026. Funding and Designer integration passed acceptance.

## Delivered integration

One schema-1 feature-consumer registry declares four consumers and six ordered
display contexts. Membership is explicit: three funding/strategy claims in route
guidance and project concepts, the individual novelty/publication requirement in
delivery planning, eight MR2 claims in the Designer guide and seven carob claims
in its inspector. All twelve claims, eleven entities and nine relationships are
represented across these projections. No source or claim was added or corrected.

Funding integration preceded Designer integration. A reusable Current evidence
section loads each consumer lazily and provides explicit Refresh/Retry, with
request-generation checks for abandoned results. Response validation is registered
at the central frontend API boundary. The panels display shared wording directly,
source pages, context, limitations, assumptions and unresolved issues. They do not
copy their statements into presentation JSON or modify underlying form controls.

Call availability remains not assessed. The example activity is an illustration,
not a created activity or a claim of local novelty/eligibility. Both stock passages
remain together, with no selected default. The water gap remains bounded. Current
configuration values are separate from the retained design's rules and starting
assumptions; historical missing values remain unknown. Drawing width/length are
distinct from excavation and plant installation depth.

## Interfaces and ownership

`backend.knowledge_graph.feature_evidence(consumer_id)`,
`python -m backend.knowledge_graph --feature-evidence CONSUMER_ID` and
`GET /api/knowledge/feature-evidence/{consumer_id}` expose the same version-1
projection without opening project state. Each response contains dataset identity,
hash, review date, pilot coverage, consumer identity, separate registration hash,
explicit context ordering and resolved content. CLI exit statuses remain 0/1/2;
the endpoint uses existing error handling and no-store middleware.

Impact responses advance explicitly to version 2, retaining their existing fields
and adding registration hash and shared-evidence dependency paths. Call-only
entity/relation dependencies are included. Checked citation mirrors, displayed
evidence and manual review targets for retained text/rules/calculations remain
distinct. Other query responses remain version 1. Existing domain loaders do not
call the graph, so the new projection cannot create a circular loading dependency.

The [knowledge README](knowledge/README.md) documents schemas, commands and the
editing workflow. Native adapters, allowed widgets and frontend placements require
explicit code registration and tests. A missing registry, unsupported field/type,
invalid binding, incomplete issue group, source drift or failed read fails clearly.
No old projection or alternate owner substitutes for the required data.

The citation registry still owns 14 uses, four citation consumers and 25 mirrors.
The new registry describes display consumption and introduces no additional
mirrors. Its original five FUND-008 uses, existing consumer memberships and labels
remain unchanged. Retained help, educational explorers, library hashes, reports,
exports, calculations and save/adoption contracts stay with their existing owners.

## Verification record

Start revision: `dad99d1c4c911b79e01debd1c2a8d097e49afe1c`, with the existing
Milestone 2/3 implementation and unrelated staged irrigation research. The revision
advanced through concurrent commits to `8cbb6b5df26b5628bdaa467785e6c5b9a39f7328`.
Fingerprints compare actual starting file bytes independently of those commits.
This task issued no staging or commit commands and preserved unrelated work.

The existing `restoration-simulator` Conda environment supplies the backend.
It contains Python 3.12.16, FastAPI 0.120.0, HTTPX 0.28.1 and Uvicorn 0.38.0;
its Node/npm versions are 22.23.4/10.9.9. React is 19.2.0 and Vite 7.3.7. The
existing system Node/npm 24.14.0/11.9.0 ran the first build and browser runners;
the final build also passed inside Conda. No dependencies were installed.
Tests use isolated fixtures. Browser checks use a separately owned save under
ignored `test-artifacts/knowledge-features/`, API 8013 and production preview 4174;
they never target the normal API or active project. Logs, command results,
screenshots and fingerprints are in that ignored directory.

| Check | Recorded result |
| --- | --- |
| `python -m unittest discover -s tests -p 'test_knowledge*.py' -v` through `conda run -n restoration-simulator --no-capture-output` | Exit 0; 44 tests passed in 28.215 s, 17:39:11–17:39:42 CET. |
| `python -m unittest discover -s tests -v` through the same environment | Exit 0; 336 tests passed in 283.734 s, 17:41:01–17:45:51 CET. |
| `npm.cmd test` through the same environment | Exit 0; 115 tests passed, zero failures/skips, 32.248 s test duration; 17:41:01–17:41:44 CET. |
| `npm.cmd run build` | Exit 0; Vite 7.3.7 built in 7.69 s, 17:41:01–17:41:11 CET. Existing warning: minified chunks exceed 500 kB. |
| `conda run -n restoration-simulator --no-capture-output npm.cmd run build` | Exit 0; 5.92 s build time, 18:04:30–18:04:44 CET. All 363 output files are byte-identical to the production build used by the browser checks. Same existing bundle-size warning. |
| Shared-citation check, pilot check, four feature projection commands | All six exited 0, 17:44:36–17:44:42 CET, using the environment's exact Python executable. Shared check: 14 uses/four consumers/25 mirrors; PDF bytes verified. |
| `node tests/browser/knowledge-evidence.cjs` | Exit 0, 17:59:46–18:00:22 CET. Six contexts/twelve claims; every placement in both themes at 1440/390/320 px; PDF pages 120/395/134 and restored focus; no API commands from evidence interactions; failed data/contract retry preserves unfinished notes, concepts and crown inputs. |
| `node tests/browser/designer-interactions.cjs` | Exit 0, 18:02:18–18:02:41 CET. Existing regression passed, including 25 preview requests, both themes and 1680/390/320 px. The runner's optional production-asset interception was off; it accessed the actual built app on preview 4174. |

Nine new backend tests cover six projections, complete membership/order, real
owner values, issue groups, native adapters, source and registration failures,
current consumption/impact paths, CLI determinism/nonmutation and endpoint
independence. Eight frontend tests cover response contracts and failure states,
lazy shared loading, refresh/retry, late responses, disposal and retained values.
The original citation, report, save/import/export, historical replay and explicit
adoption suites remain included in the full passing backend run.

Browser runners used the existing Playwright 1.57.0 module under
`C:/Users/JanEngelke/AppData/Local/OpenAI/Codex/runtimes/cua_node/1fb7137c46617d50/bin/node_modules/playwright`
and the installed Microsoft Edge channel. Set `PLAYWRIGHT_MODULE` to that module,
`DESIGNER_TEST_API=http://127.0.0.1:8013/api/` and
`DESIGNER_APP_URL=http://127.0.0.1:4174/`; use the documented isolated backend and
preview configuration. Mutation fixtures run sequentially.

Debug attempts are not counted as passing checks. One initial browser diagnostic
was terminated with exit -1. Three subsequent attempts exited 1: an obsolete
navigation label, an assertion made before the fixture's existing autosave had
settled, and a selector requiring a child of a collapsed guide to be visible.
The test now uses the current navigation, waits for confirmed save completion,
and opens the parent guide before its evidence. These fixes changed the test,
not application behavior. The final complete run passed; earlier logs/results
remain in the artifact directory. Older funding browser scripts still reference
the obsolete navigation label and were not claimed as passing in this milestone.

### Integrity and compatibility

All 22 scenario files, nine Designer library files, seven frontend educational
JSON files and 42 existing PDF/PNG documents retain their start-of-task hashes.
The full citation and connected-pilot JSON files are unchanged, not merely their
original five records. All eight real save/backup files retain their hashes.
Frozen evaluators and the three funding-owner loaders are unchanged. The original
funding-library hashes remain:

| Library | SHA-256 |
| --- | --- |
| Selection guidance | `4a55f602ea8279264afcb8c3135908e4b96ffe2d3b9017559dcec95ae660c03d` |
| Project concepts | `19d260ade0296e99dc2ffc678ae93f49b513f45d959253bd20baddcd4fc7d542` |
| Delivery planning | `bbfd549874c6f0152c7a5b13ae5edef5e43a416785ea3afd72ea44b43faa6ca2` |

Browser checks also compare the complete retained Designer workspace, simulation
project and funding attachment around evidence reading. Deliberate fixture input
edits remain separate. No save migration, rule adoption, source correction,
dependency change or new eligibility calculation was introduced.

Final review checked 23 local documentation links/heading anchors, whitespace and
final newlines in all 22 affected files, Python syntax in four files and browser
script syntax. `git diff --check` exited 0; existing LF-to-CRLF notices are not
failed checks. Of 405 starting file fingerprints, 391 are unchanged and fourteen
match the intended code/test/documentation edits, with eight new implementation,
data, test and report files. There are no unexpected source/save changes.
The pilot dataset hash remains
`2f1c65ace5d2c962e921a6f347f7c9decc8d0f0b0b3e0c2005b5186e71230f04`;
the feature registry hash is
`1da729fd96ecda53fe26cdde010b0b6f685b6dd7bd2cb39c527069990c20b0bc`.
Both isolated test servers were stopped after checks. Restart an already-running
application backend and reload the frontend to load the new endpoint and sections.

## Remaining coverage and handoff

The six registered contexts display current evidence only. Existing source-backed
paragraphs and standalone educational explorers still have their own retained
wording; this milestone does not claim to eliminate all duplication. Older source
retrieval, current call assessment, other funding/ecological subjects and unknown
project dependencies remain outside coverage. The two research issues remain open.

Milestone 5 will plan the focused visual explorer using these declared knowledge
identities and read-only projections. Milestone 6 will establish research intake
and gradual expansion. Both remain pending.
