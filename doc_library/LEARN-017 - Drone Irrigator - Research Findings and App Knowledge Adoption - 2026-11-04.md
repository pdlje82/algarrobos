# Drone Irrigator: research findings and app knowledge adoption

Reviewed 4 November 2026. This is a bounded desk-research and software-integration
study of all eleven packages in the [simulator brief](../drone_irrigator/README.md).
It is not a field trial, an exhaustive review of every plant's literature, a
supplier quotation, or a flight authorisation. The simulator is not implemented.

The promising concept is a passive reservoir at each plant, with intelligence
and water transport concentrated on the drone and its base. The main unresolved
constraints are useful water payload, repeated reservoir service life, hose
capture/transfer time, local water demand, and base turnaround. None of these can
be replaced by advertised spray area per hour or an unloaded flight-time figure.

The app integration separates exact PDF-backed claims, contextual web observations,
explicit unknowns, and prepared author assumptions. Numerical species water rates
remain unknown where the reviewed evidence does not establish a transferable rate.

## R1. Reservoir shortlist

**Growboxx is a relevant biodegradable refill candidate.** Its manufacturer
datasheet describes a refill siphon and soil-dependent delivery through the box
bottom. It does not establish a guaranteed repeated-fill lifetime or autonomous
insertion. Confirm the supplied model, usable volume, inlet opening and wet
strength. [Groasis datasheet, undated, PDF pp. 1 and 5](https://www.groasis.com/images/downloads/Datasheets/en/4%20Datasheet%20Groasis%20Growboxx%20plant%20cocoon%20-%20English.pdf).

**Land Life Cocoon deserves a trial rather than rejection on “single fill” wording.**
MENAQUA's assessment reports summer refilling and suggests a covered access hole.
That supports refill practice, not drone-ready service. Its technical annex and
the NIEBLAS manual describe different fill quantities, approximately 25 L and 20 L;
the actual supplied edition and usable headspace must be resolved. [MENAQUA,
December 2021 assessment, PDF pp. 109–112](https://menaquafoundation.org/wp-content/uploads/2022/03/Final-Report.pdf).

**Waterboxx is a reusable benchmark.** It is polypropylene, with a documented
capped refill port. Its nominal content and wick-release claims belong to the
product; they are not a species irrigation prescription. The inspected v2
datasheet states validity through December 2023. [Groasis Waterboxx datasheet,
PDF pp. 1–3](https://www.groasis.com/images/downloads/Datasheets/en/3_Datasheet_Reusable_Groasis_Waterboxx_plant_cocoon_-_English.pdf).

No candidate is declared drone-compatible. Measure useful retained volume, fill
acceptance, cap access, leakage, repeated wetting, animal interference, soil
loading and degradation. A biodegradable container that can be topped up once is
not automatically a season-long serviceable reservoir.

## R2. Minimize cocoon cost

Use **installed cost per plant over a common establishment period**, alongside
purchase price. Include freight/tax, installation, inlet adaptation, markers,
inspection, failed units, replacement, and disposal or retrieval. For reuse,
include cleaning, transport, storage and realistic cycle counts.

The NIEBLAS manual records a historical Cocoon purchase cost of EUR 7.8 each,
excluding a current delivered quote. On 4 November 2026, the manufacturer's
[Waterboxx 10-pack listing](https://www.waterboxx.com/product/groasis-waterboxx-10-pack/?lang=en)
displayed EUR 301.29: EUR 30.129 per set by division. These are different products
and procurement conditions; they do not prove which is cheaper in an Almeria
project. The [2017 Groasis price-list URL](https://www.groasis.com/images/Distributor_documents/20170701_pricelist/20170701_Groasis_Retail_Pricelist_-_End_user_Quantity_Discount_2017.pdf)
is an indexed historical lead; direct retrieval failed, so its prices are not
adopted. [NIEBLAS manual, PDF p. 93](https://lifenieblas.com/sites/default/files/documentacion/2025/LIFE%20NIEBLAS-Technical%20Manual_2025_w.pdf).

Request delivered, dated quotes at pilot, pallet and hectare-scale quantities for
the exact edition. No supplier was contacted in this task. Quotes, current
Growboxx availability, tooling costs and a local-production bill of materials
remain unresolved. Historic scale-up targets must not become today's defaults.

Low-cost development options include a simpler moulded-fibre reservoir, a locally
made passive fill guide, and a reusable guide retrieved after establishment.
These are engineering proposals, not established product alternatives. Validate
coatings, wet strength, soil compatibility, biodegradation conditions and rights
to manufacture. A recycled drinking bottle or buried clay pot is not automatically
equivalent in root protection, lifetime, refill access or useful water delivery.

Compare alternatives with:

```text
reservoir lifecycle cost = purchase + freight/tax + installation + inlet/marker
                        + inspection + replacements + retrieval/disposal
service cost = water + power + human time + drone/base/battery allocation
```

These are accounting definitions, not implemented calculators. A cheap small
reservoir may cause frequent visits; a larger one may reduce stops but increase
installation cost. A passive inlet that saves alignment time could be more
valuable than reducing the reservoir price alone. Shared cluster reservoirs could
reduce unit counts but change the requested one-reservoir-per-plant scope.

## R3. Plant suitability and stock

All **23 catalogue species** now have structured, reservoir-specific assessment
records. “Not assessed” is distinct from “unsuitable.” No product/species pair is
declared universally supported.

| Catalogue identity | Reviewed finding | App treatment |
| --- | --- | --- |
| `carob` — *Ceratonia siliqua* | Direct Cocoon trial at Maysara had poor results under harsh late-spring/sandy-soil conditions; Waterboxx manufacturer also lists carob. | Conditional candidates, with site/stock/water limitations; no daily rate. |
| `cork_oak` — *Quercus suber* | NIEBLAS reports Cocoon plantings in Portugal; emergency irrigation and shelter conditions matter. | Conditional Cocoon candidate; transfer to Almeria requires review. |
| `wild_olive` — *Olea europaea var. sylvestris* | Cultivated-olive experiments are not automatically evidence for the wild variety. | Preserve taxon distinction and unknown demand. |
| `holm_oak` — *Quercus rotundifolia* | Published Cocoon work discusses *Q. ilex* taxa. Exact correspondence/provenance must be resolved. | No implicit taxonomic substitution. |
| `rosemary` — *Salvia rosmarinus* | Published Cocoon study discusses *Rosmarinus officinalis*; a trial does not supply an optimal local dose. | Contextual web evidence retained; compatibility remains unassessed. |
| `tamarix` — *Tamarix* spp. | Published results for *T. gallica* do not identify the app's genus-level stock. | Actual species required before transfer. |
| `lentisk`, `buckthorn`, `palmetto`, `retama`, `esparto`, `thyme`, `rhamnus_lycioides`, `ephedra_fragilis`, `ziziphus`, `lycium`, `salsola`, `oleander`, `kermes_oak`, both `phillyrea` species, `myrtle`, `terebinth` | The bounded screen did not establish product-, stock-, site- and stage-specific Cocoon suitability or a transferable daily dose. | Explicit unassessed product entries and unknown numeric rates; see individual profiles and search dispositions. |

Carob context is in [MENAQUA PDF pp. 80–81](https://menaquafoundation.org/wp-content/uploads/2022/03/Final-Report.pdf).
Cork oak context is in [NIEBLAS D3, delivered March 2025, PDF pp. 15, 61 and 63](https://lifenieblas.com/sites/default/files/documentacion/2025/Monitoring%2520and%2520evaluation%2520of%2520the%2520reforestation%2520execution%2520and%2520results.pdf).
The latter is a Portugal trial, not an Almeria species recommendation.

The [Carabassa et al. article](https://onlinelibrary.wiley.com/doi/full/10.1002/ldr.4134)
was first published online 24 October 2021 and appears in the 2022 journal issue.
Its [publisher PDF](https://onlinelibrary.wiley.com/doi/pdf/10.1002/ldr.4134) opened
in the research browser; automated download was denied. It remains an offered
addition, with web observations separated from the registered local PDF evidence.

Measure actual nursery stock. The MENAQUA Cocoon guide discusses container fit,
but this is general product guidance, not confirmed fit for every taxon. Its
root-collar wording and NIEBLAS installation wording are retained as a manual
review issue; no new planting-depth rule has been adopted.

## R4. Water demand, release and refill interval

Keep these quantities distinct: applied irrigation, whole-plant transpiration,
supplemental establishment need, reservoir release, evaporation/leakage, and
useful water reaching roots. Manufacturer release ranges cannot fill the app's
species-demand fields.

MENAQUA's carob applied-water table is trial history, not an optimum; its water-loss
annex shows why depletion depends on soil and conditions. NIEBLAS presents
project irrigation choices and totals whose denominators and periods differ.
Neither justifies dividing a total by an arbitrary number of days and calling it
species demand. [MENAQUA PDF pp. 81 and 115–119](https://menaquafoundation.org/wp-content/uploads/2022/03/Final-Report.pdf),
[NIEBLAS PDF pp. 143 and 155](https://lifenieblas.com/sites/default/files/documentacion/2025/LIFE%20NIEBLAS-Technical%20Manual_2025_w.pdf).

Useful contextual studies were found but are not substituted for cocoon
establishment doses:

- [Myrtle irrigation-frequency experiment, Iakovoglou and Kokkinou, 2018](https://ojs.pphouse.org/index.php/IJBSM/article/view/3650): publisher abstract compares frequencies across two months; frequency alone is not a litres/day recommendation.
- [Arid-shrub watering experiment, Padilla et al., 2009](https://www.jstor.org/stable/40305764): greenhouse work includes *Ephedra fragilis*, *Lycium intricatum* and *Retama sphaerocarpa*. Full methods were not retrieved; no dose adopted. *Salsola oppositifolia* is not the catalogue's *S. webbii*.
- [El Chaparrillo public research-centre advice, 29 November 2022](https://chaparrillo.castillalamancha.es/consultas/riego-antes-y-despues-del-injerto): gives first-summer weekly watering for *Pistacia terebinthus* orchard rootstocks. Grafting/production guidance is contextual, not a restoration Cocoon rate.
- Nursery hardening, essential-oil production and potted drought experiments for the remaining shrubs do not establish a transferable minimum field dose. Dispositions are in the source-review ledger.

The stored daily low/central/high fields are therefore `null` with
`not_established`, not zero. Before future simulation, obtain nursery/site advice
or measurements and explicitly choose assumed sensitivity bounds if evidence is
insufficient. No new numerical water-rate rule is activated.

## R5. Clusters, spacing and service access

Three **prepared, unadopted** templates reference the existing central rule
library: carob island from MR2, a coscoja-related cluster, and a single-species
carob control. They identify candidate members, not compulsory counts or a new
spacing optimum. Existing dimension/density/placement owners remain authoritative.

The local [FOREST-002 handbook](FOREST-002%20-%20Andalusia%20-%20Carob%20Cultivation%20and%20Restoration%20Handbook%20-%202026.pdf),
PDF pp. 131–134, supplies the existing island/oasification context. FOREST-003,
PDF p. 3, supplies the separately retained series reference and its existing
naming tension. Neither proves every companion will thrive beneath every tree.

The future layout must add reservoir footprint, unobstructed inlet, canopy growth,
rotor/downwash and hose clearance as separate engineering constraints. Use a
saved placement seed and bounded attempts; report impossible layouts. Geometry
and ecological compatibility must remain in registered Python/central rules,
not React heuristics. No frozen evaluator or saved rules snapshot was changed.

## R6. Drone shortlist and the meaning of small

The prepared study defines “small” as at most 10 kg MTOM **as an author comparison
boundary**, not an externally established class or selected airframe mass.

| Candidate | Useful comparison | Missing integration |
| --- | --- | --- |
| Matrice 350 RTK | Enterprise payload platform; reference fitted mass and maximum mass allow a budget check. | Certified water hardware, mounting, slosh/centre-of-gravity assessment and loaded energy measurements. |
| AGRAS T25 | 20 L commercial spray-tank benchmark, considerably larger than the study class. | Precision hose/inlet conversion; spraying capability does not imply root-reservoir servicing. |
| Matrice 5TD + Dock 4 | Documented dock compatibility and battery service. | Its 450 g added-payload allowance includes all water hardware and water; it is not a multi-litre carrier. |
| Purpose-built small water drone | Can concentrate design around the actual inlet and tank. | Hypothetical; no performance, price or ready kit established. |

[M350 manual v1.2, August 2024, PDF pp. 113–114](https://dl.djicdn.com/downloads/matrice_350_rtk/20250806UM/Matrice_350_RTK_User_Manual_v1.2_en4.pdf),
[T50/T25 manual v1.0, January 2025, PDF pp. 79–80](https://dl.djicdn.com/downloads/t50_t25/20250109/T50_T25_User_Manual_v1.0_EN.pdf),
[Dock 4 manual v1.0, October 2026, PDF p. 87](https://terra-1-g.djicdn.com/6189933d30024fc1b331bffe4fe41837/dock-4/20261014/UM/renew/DJI_DOCK_4_MATRICE_5TD_UM_EN_20261016_final.pdf).

Compare useful water after tank/pump/hose/controller mass, not nominal payload.
Do not treat a single gimbal rating as the total aircraft payload rating. Maximum
unloaded endurance and a loaded hover test have different conditions and exclude
the operational return reserve. Procurement price, current support and regional
approval still need written confirmation.

## R7. Reliable hose placement

No reviewed source demonstrates a commercial drone inserting its hose into these
plant reservoirs. The [Miwa et al. experiment, 21 March 2024](https://medcraveonline.com/IRATJ/IRATJ-10-00280.pdf)
demonstrates a wire-supplied citrus spraying prototype, not root-reservoir docking.
[ArduPilot precision landing](https://docs.ardupilot.org/copter/docs/precision-landing-and-loiter.html)
documents a positioning building block, not liquid-transfer completion.

Proposed development sequence: surveyed plant location for coarse approach;
passive visual marker for local pose; wide, replaceable funnel/guide; compliant
nozzle and bounded insertion; onboard flow/pressure sensing and metered delivery;
explicit stop and disengagement. Plant-side electronics are unnecessary to that
proposal, but cap handling, dirt, algae, insects, root growth, hose swing and
downwash remain design questions. A funnel must not turn into an evaporation or
animal-access opening.

V1 may assume insertion succeeds at reachable plants, as requested. It must still
charge a measured or explicitly assumed nonzero handling time and obey capture,
flow and payload limits. That assumption is an optimistic simulation condition;
physical reliability remains a development/validation topic.

## R8. Docks and water/power service

Dock 4 is documented for Matrice 5TD with automatic battery service and charging.
This does not establish liquid loading or compatibility with M350/AGRAS. A fast
swap also depends on charged-pack availability and sustained charging resources.
[DJI manual, PDF pp. 9 and 69](https://terra-1-g.djicdn.com/6189933d30024fc1b331bffe4fe41837/dock-4/20261014/UM/renew/DJI_DOCK_4_MATRICE_5TD_UM_EN_20261016_final.pdf).

The [J150 refill-station listing](https://shop.agrispraydrones.com/products/j150-drone-dock-material)
documents vendor claims for automatic liquid refill while a person swaps the
battery. This is useful partial automation; it is not evidence of an unattended
small-drone water-and-power solution. EU compatibility and supply were not verified.

Use a manually serviced base as the first physical-prototype comparison, with
water loading, battery handling and human time explicitly costed. An automated
base needs a compatible liquid coupling, level/flow confirmation, water stock,
charging inventory, wet/electrical separation, drainage, filtration, reliable
power/communications and servicing. Parallel charging/loading only saves time
when actual resources permit it. No combined turnkey system is established by
this bounded search; this is not a market-wide nonexistence claim.

## R9. Remote operation and resupply

Remote plants still require water and energy delivered to the base. Survey actual
site slope, landing/base access, distance, elevation, rock/root obstacles,
vegetation growth, dust, heat, wind, shade, communications, positioning quality,
water quality and wildlife/public access. Reservoir fill records can support
estimated levels, but they are not plant-side sensor measurements.

The reviewed field and aircraft sources identify relevant limitations; they do
not provide measured Almeria downtime or a site survey. Keep weather windows,
loaded energy, evaporation/leakage and reserve margins as explicit scenario
inputs. Include several saved layouts and site/demand uncertainty scenarios.

## R10. Permissions and staffing

[EASA FAQ 116450, updated 1 February 2024, direct PDF](https://www.easa.europa.eu/en/print/pdf/node/116450/215572)
includes the open-category no-dropping-material condition. [Current EASA guidance](https://www.easa.europa.eu/en/the-agency/faqs/drones-uas)
also distinguishes automatic routes with pilot intervention from autonomous
operation. Whether the proposed contact/hose transfer is treated in a particular
way requires assessment of the actual concept; it is not decided here.

Use [AESA's specific-category guidance](https://www.seguridadaerea.gob.es/es/ambitos/drones/operaciones-uas-drones/operaciones-con-uas-drones---categoria-especifica)
to establish the applicable authorisation, declaration or operator-certificate
route. Verify fitted aircraft, water release, supervision, VLOS/BVLOS, competence,
insurance, emergency procedures and current [geographical-zone requirements](https://www.seguridadaerea.gob.es/es/ambitos/drones/zonas-geograficas-de-uas).
Check actual coordinates/dates in [ENAIRE Drones](https://drones.enaire.es/), plus
land-manager/environmental/public-access conditions. The research browser could
not inspect the interactive ENAIRE map; no coordinates were assessed.

A remote dock is not permission to operate unattended. Include required pilot
and supervision time in the cost study. No flight permission, site clearance or
supplier operational approval has been obtained.

## R11. Value comparison and validation plan

Measure the same plant service over the same horizon for drone, manual carried
water, practical ground transport and an appropriate tank/pipe option. Separate
initial installation/filling from recurring refills. Report useful litres, water
lost, hours, energy, labour, cost and deadline failures, not just visits.

Predeclare trial criteria with the practitioner before hardware testing:

1. Bench-test each exact reservoir edition and proposed inlet: retained usable
   volume, acceptance flow, leakage, headspace, repeated fills and aged wet strength.
2. Test interface acquisition/capture/disengagement under representative wind,
   lighting, slope, plant shelter and canopy conditions. Log misses, spills,
   recoveries, damage and handling time, including unsuccessful attempts.
3. Measure complete loaded sortie and base cycles, with useful water mass,
   battery/charging inventory, return reserve and human actions accounted for.
4. Run matched planting/soil observations across the relevant establishment
   season. Reservoir level alone cannot establish adequate root-zone water or
   survival benefit. Keep operational throughput separate from biological outcomes.

No pass percentages, fixed nozzle diameter, species reserve threshold or
plants-per-drone capacity has been invented. The economics remains a comparison
framework until measurements/quotes support it. A technical success may still
lose to ground watering on cost or labour.

## App adoption and remaining gates

The shared profile authority is `scenarios/drone-irrigator-research-v1.json`;
prepared cluster references live in `design_rules/drone_irrigator_v1.json`.
Registered adapters expose them in the Knowledge Explorer and link every profile
to its existing species identity. The read-only profile API supplies the same
records for future consumers. The app shows source facts, assumptions, gaps and
supplementary web evidence separately.

Prepared scenario inputs and cluster references are validated but **not adopted**
into Site Designer generation, saved projects or any simulator. Existing funding
and Designer evidence memberships remain unchanged. The accepted Explorer intake,
source checksums, exact passage ledger and compatibility results are archived
under `knowledge/intake/drone-irrigator-v1/`; the source-review and implementation
records explain the manual adoption/development gates still open.

## Original documents and access status

The [source-review ledger](../drone_irrigator/research/SOURCE_REVIEW.md) lists every
new local original, checksum, exact reviewed pages, issuer/date limits, direct
download and failed retrieval. Ten new original PDFs are stored and catalogued
under IRR, DRONE and POLICY IDs. Browser-only references and failed links remain
offered additions/leads; temporary caches do not count as library holdings.
