# Drone Irrigator — simulator brief and pre-coding research

Status: proposed feature; research and requirements only. Created 4 November 2026.

Research update, 4 November 2026: all eleven packages have a bounded reviewed
findings package and app knowledge integration. See [LEARN-017](../doc_library/LEARN-017%20-%20Drone%20Irrigator%20-%20Research%20Findings%20and%20App%20Knowledge%20Adoption%20-%202026-11-04.md),
the [source/passage review](research/SOURCE_REVIEW.md), and the
[implementation and adoption record](../restoration_simulator/DRONE_IRRIGATOR_RESEARCH.md).
Required measurements, quotes and species-dose evidence remain explicit gaps.
The simulator remains unimplemented; the original brief below is retained.

## 1. Purpose

Build a simulator inside the existing Algarroba app to explore whether **one small
drone can maintain the water supply of many newly planted plants across a remote
1–10 hectare restoration area**. Each plant has its own passive, refillable,
biodegradable reservoir, called a cocoon here. The drone carries water from a base
station and replenishes individual reservoirs. Plant locations stay low-tech:
no powered valves, communications network or permanent irrigation pipes are
required at each plant.

The main question is: **how many plants can one drone reliably attend, and how
quickly can it complete the necessary refills?** A second design objective is to
**minimize cocoon cost**, including the effect of reservoir size, lifespan and
refill design on the whole service cost.

This document defines the first simulator and the research needed before coding.
It does not implement a module, add verified plant attributes, adopt ecological
rules, or establish that an autonomous watering system already exists.

## 2. First-version scope and user flow

1. Open a new app module named **Drone Irrigator**.
2. Create an area between **1 and 10 ha inclusive**; show both hectares and square
   metres. Start with a rectangle with configurable aspect ratio, base-station
   position, exclusions and obstacles. Account for travel if the base is outside
   the planting area. Use metres internally; 1 ha = 10,000 m².
3. Choose or create a few example plant-cluster templates. A cluster specifies
   species, counts, relative positions, spacing and a footprint. Expose the
   evidence, assumptions and limitations behind each template.
4. Randomly distribute a configurable number of those clusters using a saved
   random seed. Preserve internal spacing, area boundaries, access clearances and
   non-overlap constraints. Allow inspection and manual adjustment. An impossible
   density must produce a readable placement failure, never silent omissions.
5. Assign **one reservoir per plant**, with product/material, usable water volume,
   initial fill, refill interface, service life and cost. Shared reservoirs for
   several plants are a later extension, even where commercial products allow it.
6. Set the estimated daily supplemental water requirement for each plant type and
   establishment stage. Start with explicit constant-rate scenarios; allow
   low/central/high estimates and per-instance overrides. Display which values
   are reviewed evidence and which are user assumptions.
7. Calculate reservoir depletion, time to the refill threshold, service deadlines
   and time to empty. Show individual plants and a refill calendar.
8. Configure one small water-carrying drone and one base station. Include tank,
   payload, battery, flight, approach, hose placement, pumping and turnaround.
9. Run, pause, inspect and replay the simulation. Animate flights, water transfer,
   reservoir levels and base visits, with an event log and summary metrics.
10. Compare routes, cluster distributions, reservoir sizes, refill policies and
    cocoon costs on the same saved inputs. Export assumptions and results.

The first version assumes successful hose placement and transfer at every
reachable reservoir, **with configurable nonzero handling time**. This is an
idealized reliability assumption, not a claim about available drone equipment.
Physical reachability, water availability and battery constraints still apply.

V1 uses carried water, one drone and one base. Multi-drone fleets, tethered water
supply, detailed flight control, live sensors and biological survival prediction
are outside the first implementation. Simple terrain/flight-height assumptions
must be declared; a flat demonstration must not be presented as a mountainous
site assessment.

## 3. Existing app knowledge to reuse and extend

Inspect these authorities before designing new data structures:

| Existing asset | Intended use and boundary |
| --- | --- |
| [Plant catalogue](../restoration_simulator/scenarios/planting-catalog-v2.json) and [plant names](../restoration_simulator/scenarios/plant-names.json) | Reuse stable plant IDs and exact taxa; do not duplicate a separate drone plant catalogue. |
| [Central design-rule library](../restoration_simulator/design_rules/README.md) and [vegetation combinations](../restoration_simulator/design_rules/vegetation_combinations.json) | Reuse reviewed palettes and declared geometry where applicable. Palettes do not prove cocoon compatibility or ecological facilitation. |
| [Existing watering evidence review](../doc_library/planting-explorer-examples/SOURCES_AND_WATERING.md) | Start from its explicit gaps in establishment doses; do not turn older-tree irrigation experiments into seedling defaults. |
| [Irrigation research](../doc_library/irrigation-research/README.md) and [drone research](../doc_library/irrigation-research/drones/README.md) | Existing local syntheses, engineering distinctions and source leads; review original passages before adopting values. |
| [Knowledge intake workflow](../restoration_simulator/knowledge/INTAKE_WORKFLOW.md) | Mandatory route for new registered knowledge and shared citations. Explorer publication alone does not adopt operational rules. |

Candidate examples for research, **not approved planting prescriptions**:

- Carob-centred island: `carob`, with selected `wild_olive`, `lentisk` or
  `palmetto` companions, starting from the existing MR2 palette.
- Coscoja-related cluster: `kermes_oak` and `rhamnus_lycioides`, with any optional
  members justified separately from the existing series reference.
- A simple single-species cluster to isolate routing and water-demand effects.

Do not mix species merely because they share an existing palette. Research
site/climate compatibility, nursery stock, establishment spacing, mature
dimensions, competition/facilitation, reservoir footprint, and drone access.
Ground spacing and aerial servicing clearance are separate constraints.

### Plant data to add after research

Extend the app's shared plant information through a validated, versioned profile
linked to the stable species ID. The exact storage/schema is a later design
decision. Each profile needs:

- Cocoon suitability **by reservoir type and plant stage**: supported,
  conditional, unsuitable, or not assessed; explain conditions and evidence.
- Nursery/root-plug dimensions and any planting-depth or reservoir-fit limits.
- Supplemental water requirement in L/plant/day, preferably a bounded range or
  seasonal/stage profile; distinguish recommended dose, measured consumption,
  reservoir release and whole-plant water demand.
- Soil, climate, exposure, planting season, stock size/age and study duration.
- Evidence identity, exact edition/pages, review date, uncertainty and limits of
  transfer to the target site. A trial using a cocoon does not prove it is optimal.
- An explicit unknown state where evidence is absent. Never assign an unknown
  species another species' rate or imply that drought tolerance means zero need.

For exploratory runs, the user may explicitly enter an assumed rate for a species
with no validated rate. Keep that assumption in the run, separate from reviewed
shared knowledge. A run without required rates must be blocked with the missing
species identified.

## 4. Reservoir and water model

### Separate plant need from reservoir release

For plant `i`, record usable capacity `C_i` (L), current stored water `V_i` (L),
initial fill, target fill, warning volume `W_i`, critical reserve `S_i`,
supplemental requirement `d_i` (L/day), reservoir delivery capability and
non-beneficial loss `l_i` (L/day). Validate
`0 <= S_i <= W_i < target_i <= C_i` and `0 <= V_i <= C_i`.

V1 may explicitly assume the reservoir releases water at the required rate. This
must be identified as a model assumption and screened against the product's
delivery mechanism. A sufficiently full reservoir with an inadequate release
rate must not count as adequate plant service. A more detailed release function
requires its own evidence and parameters.

For a constant-rate dry-weather scenario with adequate release, define
`r_i = d_i + l_i`, in L/day. While water remains available:

```text
stored water after dt = V_i - r_i × dt + accepted drone refill
time to critical reserve = (V_i - S_i) / r_i
time to empty = V_i / r_i
```

For a plant already at/below reserve, report an immediate deadline or an overdue
state. If an explicitly valid `r_i = 0`, show no depletion deadline under those
assumptions; never divide by zero. Unknown demand is not zero demand.

Advance to depletion events exactly: stored water cannot become negative. Record
unmet demand after depletion, remaining time without water, overflow and transfer
losses explicitly. Time-varying rates require integration, not the constant-rate
division above. Refill thresholds and reserves are user/design inputs unless
source-backed; they are not biological survival thresholds.

Generate a refill task at the warning threshold, or earlier when forecast travel
and servicing would miss the critical reserve deadline. Recompute levels while
the drone is flying or charging. A refill task remains open until its declared
target is reached; individual partial transfers remain visible.

### Refill, degradation and information assumptions

- A transfer is bounded by free reservoir capacity, remaining usable drone water,
  pump flow, inlet acceptance and available energy. Never assume tank litres are
  identical to useful litres delivered into the reservoir.
- Reservoir functional life, repeated-fill tolerance and biodegradation are
  required inputs. For V1, an explicitly constant capacity is acceptable only
  within the selected supported service period. Runs extending beyond it need an
  explicit replacement/retirement policy and cost, or must be rejected.
- A later degradation curve may change capacity/leakage. Account explicitly for
  water lost when capacity shrinks; do not treat biodegradability as indefinite
  refillability.
- Start with a named **dry-weather scenario**: rainfall, dew and condensation are
  explicitly excluded, not silently assigned measured zero values. Any future
  rain collection model needs catchment, efficiency and overflow accounting.
- In V1 the simulator knows exact modelled levels from its ledger. The field
  concept must estimate levels from fill records and depletion estimates, or
  verify them during servicing. Do not imply every low-tech cocoon has telemetry.
- Empty reservoirs and missed deadlines are service outcomes. Predicting plant
  death or survival requires separate biological evidence and is outside V1.

## 5. Drone, base station and scheduling

### One small drone

Research must define what “small” means for this use: aircraft dimensions,
operating mass, usable water payload and budget. Do not silently substitute a
large agricultural aircraft because it carries more water. It can be a comparison
case. An explicitly hypothetical small-drone profile is allowed if no compatible
commercial system is established.

Required parameters include empty mass, maximum take-off mass, tank capacity,
water density, hose/pump/interface mass, unusable tank residual, battery usable
energy, return reserve, payload-dependent flight/hover consumption, speed,
take-off/landing time, approach/alignment/insertion/retraction time, transfer
flow and operating weather limits. Water mass must fit the remaining payload
after all fitted hardware. Research pumping power and hose forces as well as
flight power.

Represent at least: idle, loading, charging/battery service, take-off, transit,
approach, hose placement, pumping, disengaging, return and landing. Accumulate
energy and time through every state, update payload after transfer, and check
return feasibility before committing to each next visit. Slower inlet acceptance
limits service even if the pump is faster.

If the drone carries less than a requested reservoir refill, support several
sorties or an explicit partial-top-up policy. Count cumulative delivered volume
and task completion; repeated tiny visits must not inflate the success metric.

### Base and dock

One base supplies both water and energy. Record finite water stock or an explicit
external supply contract/rate, loading flow, charging curve or turnaround model,
available batteries, manual handling, pump/charger power and operating hours.
Include resupply logistics, off-grid power/storage and human attendance in the
research and cost comparison.

V1 should support a declared manual-service base and, if useful, a clearly marked
hypothetical automated water-and-power dock. An automatic charger does not prove
automatic water refill or compatibility with the chosen aircraft. If charging and
water loading can run concurrently, turnaround uses their actual shared-resource
constraints; otherwise add their durations. Do not assume free, instantaneous
battery swaps, unlimited precharged batteries or unlimited water.

### Policies to compare

- Baseline: earliest refill deadline first, with a stable distance/ID tie-break.
- Candidate improvement: combine urgent nearby plants into capacity- and
  energy-feasible routes with explicit return legs.
- Compare full fills against partial top-ups and different warning thresholds.
  Preserve critical reserve requirements and account for future revisit cost.
- Prioritize deadline feasibility before distance savings. Report an unreachable
  or infeasible task visibly. A heuristic must not be called a proven optimum.

## 6. What the simulator should optimize and report

**Primary capacity metric:** maximum plant population for which one drone meets
every declared water-service requirement throughout a stated horizon, for a fixed
species mix, planting density, area, operating window and uncertainty scenario.

**Speed metric:** elapsed time to complete the due refill workload, including base
turnaround. Also report useful litres/hour and unique plants serviced per day.
When comparing policies, hold workload and target fills constant; unnecessary
top-ups must not make a policy look better.

Report flight/service/base/wait time, sorties, distance, energy, water delivered
and lost, task lateness, unmet demand, minimum reservoir levels, maintenance,
human interventions and the limiting resource. Distinguish first-fill delivery
from recurring service; a fully prefilled site is not evidence of sustainable
drone capacity. Use a horizon covering multiple depletion/refill cycles and label
any short run as such. The initial-fill labour, water and cost remain visible.

Test capacity across saved layout seeds and low/central/high demand, flight
energy, handling time and weather availability. Report the tested feasible range
and sensitivity, not a universal plants-per-drone figure. Fix planting geometry
when comparing routes; when adding clusters for a capacity search, separate
packing failure from insufficient drone service capacity.

### Cost objective: especially minimize cocoon cost

Research and compare **EUR per installed reservoir** and **EUR per plant served
over the same establishment period**. Include purchase, bulk discounts, minimum
order, shipping/taxes, installation, inlet/marker adaptation, degradation,
replacement, inspection and disposal/retrieval. Report cocoon-only cost separately
from drone/base capital, batteries, water, power, labour and maintenance.

Evaluate the trade-off: a cheaper/smaller cocoon may need more flights; a larger
one may cost more but reduce visits. A cheap inlet may impose slow alignment or
pumping. Reuse needs retrieval/cleaning/storage and a justified number of cycles.
Use a common time horizon and service target. Show cost versus plants supported
and service time; do not hide priorities inside an unexplained combined score.

Biodegradable refillable reservoirs remain the preferred concept. Reusable
reservoirs can be an explicitly labelled cost benchmark, not silently treated as
biodegradable. Any cluster-shared reservoir cost idea is a later scope decision.

## 7. Research required before coding

The following work packages must produce a reviewed input sheet, uncertainty
ranges and explicit unresolved questions. Product names below are research leads,
not approved component choices. No numerical plant demand or equipment preset is
adopted by this brief.

| ID | Questions to resolve | Required output |
| --- | --- | --- |
| R1 — Reservoir shortlist | Which biodegradable products can actually be refilled repeatedly? Compare Growboxx, Land Life Cocoon and other documented products. What are usable capacity, release behaviour, fill-port geometry, cap access, inlet flow, wet-strength and functional life? Can it be serviced without digging or removing a shelter? | Product/edition comparison; repeat-refill evidence; supported service period; accept/reject/unknown verdict for drone refilling. |
| R2 — Minimize cocoon cost | What are current Spain/EU unit and bulk prices, minimum orders, availability, delivery and installation costs? Could simpler moulded-fibre designs, local production or passive inlet adaptations lower cost? What tooling, coatings, wet-strength, biodegradation, licensing and validation would they require? Compare reusable alternatives over realistic cycles. | Dated quotes or price evidence, installed/lifecycle cost ranges, break-even analysis and low-cost candidate shortlist. Keep prototype estimates distinct from purchasable products. |
| R3 — Plant suitability | Which exact catalogue taxa, nursery sizes and root forms fit each cocoon? What field evidence supports use in the intended soil/climate? Does the reservoir change planting depth, root development, disease risk or aftercare? | Species-by-product suitability matrix, conditions and exclusions; reviewed profiles to add to shared app plant data. |
| R4 — Water demand and release | What supplemental water do newly planted individuals require by season/stage? Which studies actually measure relevant stock and conditions? Does reservoir release meet demand, and how do soil, heat, wind, leakage and degradation affect refill interval? | Per-species low/central/high profiles with units, provenance and applicability. Explicit assumption records or a proposed nursery/field measurement plan where evidence is missing. |
| R5 — Cluster rules and access | Which groupings and spacing are supported, and which are only illustrative layouts? Can the drone reach the inlet as plants grow? What rotor, hose and obstacle clearances are needed? | Traceable cluster templates, species/spacing rules and servicing envelopes in the central design-rule library; separate ecological evidence from geometric assumptions. |
| R6 — Drone candidates | Which small aircraft can carry useful water plus delivery hardware? Compare payload-dependent endurance, control/API access, mounting, centre of gravity, water slosh, pump compatibility, repairability, price and regional support. Use agricultural aircraft only as clearly sized benchmarks. | Compatible aircraft/payload shortlist with source conditions, mass/energy budgets and missing capabilities; explicit hypothetical profile if necessary. |
| R7 — Reliable hose placement | Does an existing product demonstrate autonomous insertion into this reservoir? Compare RTK plus visual targeting, passive fiducials, a funnel/guide, compliant nozzle and contact/flow confirmation. How are caps opened, dirt kept out and fill completion detected without powered plant equipment? | Interface concept and time budget; evidence grading: commercial/documented, research-demonstrated, proposed integration or unverified. Treat unverified insertion as a development topic while V1 assumes success. |
| R8 — Automated dock | Which stations support autonomous launch/recovery, charging or battery swap **and water reload on the same compatible aircraft**? Compare charger-only docks, agricultural service equipment and custom integration. What are throughput, tank/power needs, connectors, interlocks and unattended-operation limits? | Aircraft–dock–water-system compatibility matrix, turnaround sequence, human tasks and cost. Mark every missing integration explicitly. |
| R9 — Remote operating conditions | What site-specific terrain, wind/heat, dust, canopy, animal disturbance, GNSS/communication limits and seasonal access affect servicing? Who supplies base water, and how often? | Defined operating envelope, downtime scenarios, water/power logistics and explicit terrain assumptions. |
| R10 — Operational permissions | For the intended Spanish site and water-release concept, which current aviation, autonomy/supervision, environmental and land-access requirements need assessment? | Current official-source checklist and effect on staffing, flight windows and feasible operation. No site clearance is implied by a simulation. |
| R11 — Value and validation | How does the concept compare with practical manual watering, carried-water ground transport or a simple tank/pipe system for the same plants and terrain? Which measurements would materially change the drone conclusion? | Common-service comparison and staged reservoir, interface and field trial plan; thresholds defined before testing. |

Research should especially test whether frequent drone refilling is needed at all
for the selected reservoir and planting context. A product intended for a single
establishment fill may be a poor fit even if it is biodegradable and inexpensive.

### Preliminary source check, 4 November 2026

This limited check helps frame research; it is not the completed R1–R11 study.

- **Groasis Growboxx:** the manufacturer describes a biodegradable reservoir and
  a siphon refill opening (PDF pp. 1 and 5). This makes it a relevant candidate,
  but does not establish autonomous insertion, repeated-fill durability or
  species-specific water demand. See download D1 below.
- **Groasis Waterboxx:** the manufacturer describes a reusable polypropylene
  product with a capped refill opening (PDF p. 2). It is a comparator for cost
  and servicing, not the biodegradable default. The inspected document is
  version 2 with a stated validity date of 31 December 2023; current specifications
  and availability need confirmation. See D2 below.
- **Land Life Cocoon:** [implementation partner Volterra's product description](https://volterra.bio/en/cocoon/cocoon-150.html)
  describes a single fill at planting. Repeated drone refilling is therefore an
  unresolved suitability question, not an assumed feature. This is partner
  documentation, not a current manufacturer approval for modification.
- **Drone scale:** [DJI's AGRAS T25 specifications](https://ag.dji.com/t25/specs)
  describe a 20 L spray tank and 32 kg aircraft mass including battery. It is an
  agricultural comparison case; these specifications do not establish a small
  cocoon-refilling aircraft or a suitable hose-placement system.
- **Docks:** [DJI Dock 3 support documentation](https://www.dji.com/support/product/dock-3)
  documents automated charging for the Matrice 4D series. That establishes a
  charging capability; it does not establish water loading, AGRAS compatibility
  or cocoon servicing. No combined compatible water-and-power dock was verified
  in this limited check; that is a research gap, not a market-wide absence claim.

### Downloadable documents offered for addition

These links are external source candidates, **not newly added library holdings**.
The existing local irrigation reports and companions are already in the repository.
Acquire and catalogue any chosen original edition under
[the library workflow](../doc_library/CATALOG.md) before registered use.

| ID | Document and download | Verification and limits |
| --- | --- | --- |
| D1 | [Datasheet biodegradable organic Growboxx plant cocoon — Groasis B.V.; publication date not established — direct manufacturer PDF](https://www.groasis.com/images/downloads/Datasheets/en/4%20Datasheet%20Groasis%20Growboxx%20plant%20cocoon%20-%20English.pdf) | Opened 4 November 2026; five-page PDF. Refill/material passages inspected. Historical product claims require current confirmation; do not adopt marketing survival, water savings or lifetime as site predictions. |
| D2 | [Data Sheet of Groasis' reusable Waterboxx plant cocoon — Groasis B.V.; version 2, stated validity through 31 December 2023 — direct manufacturer PDF](https://www.groasis.com/images/downloads/Datasheets/en/3_Datasheet_Reusable_Groasis_Waterboxx_plant_cocoon_-_English.pdf) | Opened 4 November 2026; three-page PDF. Material/refill passages inspected. The validity date is not a verified publication date. |
| D3 | [LIFE NIEBLAS Technical Manual — LIFE NIEBLAS project; 2025-labelled edition — publisher-hosted PDF candidate](https://lifenieblas.com/sites/default/files/documentacion/2025/LIFE%20NIEBLAS-Technical%20Manual_2025_w.pdf) | Search-indexed Cocoon installation passages found 4 November 2026; full browser retrieval failed its size limit (about 29.5 MB). This edition was not reviewed in full and is not a confirmed successful download in this task. The existing irrigation source register references a different 2024-path edition; preserve their distinction. |

## 8. Research completion and knowledge-adoption gate

Before simulator coding begins, produce:

1. An R1–R11 findings report and parameter sheet, including the cost shortlist,
   selected scenario horizon and definitions of “small drone” and adequate service.
2. At least one internally compatible reservoir, plant cluster, drone and base
   configuration. Where evidence cannot establish a capability, explicitly select
   an idealized assumption with a range and limitation; do not label it commercial
   readiness. Unknown required numerical inputs need explicit author/user
   assumptions or must keep the scenario blocked.
3. A reviewed per-species suitability/water-data candidate and central cluster-rule
   changes. Do not claim complete catalogue coverage if only a subset is reviewed.
4. A documented water/energy/time model, mass budget, refill interface and base
   turnaround sequence; list which physical measurements remain development work.
5. A first field-validation plan: bench-test retained volume, repeated fills,
   release/leakage and inlet flow; test approach/insertion, spill and handling
   time; then measure full sortie/base cycles and plant water status under the
   intended conditions. Physical deployment requires those results; an idealized
   simulator can precede the hardware trial when its assumptions are explicit.

For registered knowledge, complete the
[intake worksheet](../restoration_simulator/knowledge/INTAKE_TEMPLATE.md), check
existing identities/duplicates, inspect exact original passages, retain checksums
and actual review dates, and prepare an isolated candidate batch and manifest.
From `restoration_simulator/` in the existing Conda environment, run:

```powershell
python -m backend.knowledge_intake --check BATCH_DIR
python -m backend.knowledge_intake --review BATCH_DIR
```

Review the report, fingerprints and source displays as required by the workflow.
Before publication, stop the simulator, recheck the reviewed candidate, apply
matching registry changes together, validate compatibility, restart and archive
the accepted manifest/report/review notes. Current intake supports `explorer_only`;
feature evidence membership and operational rule adoption need a separate reviewed
change. Follow central rule-library validation, changelog and test requirements.

All generated species, quantities, spacing, dimensions and layout assumptions must
be declared or registered in `restoration_simulator/design_rules/`. New editing
policy belongs in designer-v3; preserve frozen designer-v1/v2 replay semantics.
React must not introduce ecological heuristics or substitute dimensions. Scenario
configuration owns operational/form assumptions; current plant purchase-price
defaults remain in `scenarios/plant-prices.json`, distinct from reservoir prices.

## 9. Implementation acceptance criteria after research

- The module creates reproducible 1–10 ha layouts and explains invalid geometry,
  unsupported plants, missing inputs and impossible placements.
- The app shows suitability, water-rate provenance, reservoir lifetime, assumed
  reliable insertion and manual/automated base status before a run.
- Depletion/deadline calculations and event-driven refills agree with simple
  analytical cases. Water and energy ledgers balance within declared tolerances.
- Tank, fitted-payload mass, battery return reserve, inlet flow, handling time,
  base water and charging constraints affect results. Include cases where one
  reservoir needs multiple water loads and where a return flight is infeasible.
- Degradation beyond the supported horizon, excessive fill, zero-flow equipment,
  missing rates, non-finite values and incompatible component profiles produce
  actionable validation errors. Legitimate zero demand has explicit semantics.
- Missed deadlines and empty reservoirs are visible outcomes, distinct from
  configuration or I/O failure. No failed calculation looks like a successful run.
- Route comparisons preserve the same layout, demand, initial inventory, horizon
  and completion targets. Results show recurring plant capacity, elapsed service
  time and cocoon cost separately, with sensitivity to uncertain inputs.
- Runs save/export stable plant/cluster IDs, coordinates and seed, configuration,
  user overrides, evidence/rule snapshots, model version, policies and event log.
  Adoption of updated rules requires review; it never rewrites old run assumptions.
- Failures preserve the last confirmed save and current draft. Saves use explicit
  versioned contracts and migrations; unsupported or malformed data are rejected
  without silently replacing values, dropping actions or overwriting a good save.

The next deliverable is the research package above. This brief intentionally
leaves product selection, numerical ecological presets and hardware integration
unresolved until that work is complete.
