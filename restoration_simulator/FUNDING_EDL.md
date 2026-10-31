# AL20 strategy content library

The Funding Navigator uses `scenarios/funding-edl-v1.json` for inline
descriptions, optional supporting references and the EDL explorer. It is separate
from scoring rules and Site Designer. EDL means *Estrategia de Desarrollo Local*;
EDLL adds LEADER.

## Stored source

**FUND-013** is the full 544-page *Estrategia de Desarrollo Local LEADER
2023–2027 — Alpujarra-Sierra Nevada Almeriense*, V1 (19 November 2024), published
by ADR Alpujarra-Sierra Nevada de Almería. Its unchanged PDF is stored in
`doc_library/`, registered in `scenarios/documents.json` and catalogued in
`doc_library/CATALOG.md` and `RENAME_LOG.csv`.

- [Download the full strategy PDF — ADR, V1, 19 November 2024](https://drive.google.com/uc?export=download&id=1OafTeCsmgjmGcOzNumeyZvvFyW6_pLpK)
- [ADR publication page](https://alpujarraalmeria.es/edll-version-1/)
- [Junta de Andalucía AL20 promoter/source listing](https://www.juntadeandalucia.es/organismos/agriculturapescaaguaydesarrollorural/areas/desarrollo-rural/tramitacion-ayudas-dr-2023-2027/paginas/ayudas-leader-intervencion-7119-2-promotores-al-al20.html)

The download was verified on 31 October 2026; PDF SHA-256:
`1c5b293d640dd3c8213aa314d6b791754ba8e82c3a0db32639236402adc4c796`.
The two existing shorter EDL extracts remain linked in the annex guidance;
they do not contain the full consultation and innovation provisions.

## Coverage

There are 109 distinct references in ten topics. Topic membership can repeat
an item where it is relevant to multiple subjects. All 14 bindings are validated.

| Nodes | Content | PDF pages |
| --- | --- | --- |
| CO.1.1–CO.1.3 | All 50 NPL needs in published priority order | 395–397 |
| IN.1.1 | Explicit absence of designated innovative sectors | 383, 398 |
| IN.1.2 | Five innovative themes | 398 |
| IN.1.3 | Twelve innovative aspects, including local restrictions | 399–401 |
| IG.8.2, IG.11.7 | Women's priorities and relevant strategy responses | 186–187, 275–276, 332–333, 473 |
| DRI.3.3 | Exclusion context and relevant NPL needs | 191, 395–397 |
| JR.3.8 | Youth priorities and responses | 187, 276, 333, 476 |
| PT.1.2 | Trade examples and generational renewal | 283, 372 |
| PT.1.3 | Heritage themes and conservation/tourism needs | 336, 395–396 |
| PS.1.2 | Gender, youth and climate objectives | 393, 472–479, 527 |
| LEADER-AL20-2.6 | Prioritised needs and innovation context | 383, 395–401 |

English summaries retain material conditions. Spanish labels are short source
keywords; the cited PDF carries the full wording. NPL codes and innovation
numbering follow the source; Women/Youth/Trade/Heritage/OT are stable application
reference IDs. Source text was checked against extracted pages, with rendered
checks of tables and relevant passages. Links use PDF positions matching the
printed numbers listed in the document registry.

The strategy chooses themes/aspects instead of innovative sectors. The app must
not invent sectors. Existing manual positive claims are not silently rewritten;
the description calls for documented GDR clarification. Consultation priorities
are not blanket eligibility certificates. DRI.3.3 requires a specifically
identified population/need; PT.1.2's trade examples are not an exhaustive
catalogue; a heritage asset alone does not prove a qualifying preservation
action. NPL ranking values and programme-wide 20/10/30% gender/youth/climate
targets are not grant-selection points. PS.1.2 retains its annex conditions.

## Persistence and compatibility

`GET /api/funding/edl` returns version 1, validated content and its canonical JSON
hash. It does not create or mutate a project store. Document ID/hash must match
the registered PDF edition.

An assessment criterion row may optionally contain:

```json
{
  "edl_evidence": {
    "version": 1,
    "library_id": "al20-edl-v1-2024-11-19",
    "library_hash": "<canonical library SHA-256 returned by the API>",
    "selections": {"IN.1.2": ["IN-T3"]}
  }
}
```

Absence means no recorded references (historical/manual contract). An empty
selection records no checked references for that binding; it does not reject a
scoring answer. Metadata is optional and strictly validated when present,
independent of `answers`, `inputs`, `reference` and `notes`. Only applicable
subcriteria and related topic items are accepted. Unknown, unrelated, duplicate
or incompatible IDs/editions fail before atomic saving. Backend scoring never
awards points from this annotation. Selections remain route-specific and survive
the existing autosave, alternative, duplication and export/import flows.
Explorer/search/editor state is transient. Existing evaluators and snapshots
retain their semantics; additional citations use the explicit guidance-review
adapter.

Never edit a published library edition after saved evidence uses its hash.
Retain old editions and add an explicit reviewed migration for updates. Never
reinterpret old IDs, infer references from totals or copy another route's
references. Missing content and fetch failures are visible and retryable.

## Verification

`tests/test_funding_edl.py` covers bindings/sources, constraints, isolation,
reference/scoring separation, malformed data, atomic saves, historical
snapshots, export/import and reviewed updates. `frontend/tests/fundingEdl.test.mjs`
covers the API guard, bilingual search and reference edits preserving answers.
`frontend/tests/browser/funding-edl.cjs` covers graph editing, reference-only zero,
explicit fractional score, sources/focus, search, failure/retry, autosave/reload,
route isolation and phone themes. Run only against isolated API 8013.

Run Python unittest discovery, frontend tests and the production build alongside
`funding-selection.cjs`. Never mutate active API 8000 or the user's project save.
