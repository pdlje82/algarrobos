# Atmospheric water harvesting for semi-arid Almería

Research, engineering concepts and carob restoration sizing — 16 November 2026

**Document status:** research synthesis and calculation audit; preliminary engineering, not a validated site design. **Library identity:** LEARN-018. **Location:** the local `pdlje82/algarrobos` repository, `doc_library/`. Calculations use litres of collected liquid water unless explicitly labelled otherwise.

## 1. Provenance, completeness and reading rules

This document continues the German conversation [*Literaturrecherche Wassergewinnung*](chatgpt-conversation://6af9b0d7-00c4-83ed-a2ea-d5a79f6e44d2), conversation ID `6af9b0d7-00c4-83ed-a2ea-d5a79f6e44d2`. It combines the recoverable discussion, the subjects explicitly requested in the continuation, independently checked primary sources and new, labelled engineering calculations.

**A transcript gap remains.** The chat reader returned five recent question/answer pairs, with `hasMore: false` and no older-page cursor. These cover inexpensive dehumidifiers, early carob watering, the 100-tree compressor/PV calculation, restoration irrigation and the proposed reduction to 25%. Earlier exchanges were not returned. The supplied EPUB recovers substantial earlier material, incorporated below in English. The exact original concentric geometry and morphological matrix are absent from both accessible sources; their treatment is a **labelled engineering reconstruction**, not a claim to reproduce missing wording, dimensions or citations.

**The German EPUB was subsequently supplied and inspected in full.** The initial `/mnt/data/...` reference was unavailable, but the user placed a copy at `C:\Users\JanEngelke\git_private\algarroba_db\ebooks\Wasser_aus_der_Luft_Almeria-1.epub`. All 12 chapters, the title/navigation documents, package metadata, four explanatory diagrams and cover were inspected. The English content below incorporates its substantive findings, calculations, proposals and all five literature links. An unchanged [local archival copy](atmospheric-water-harvesting/Wasser_aus_der_Luft_Almeria-1.epub) and [chapter text/link extraction](atmospheric-water-harvesting/epub-text-and-links.txt) accompany the report. These originals remain German; this research document is English.

EPUB metadata: title *Wasser aus der Luft*; creator `ChatGPT`; language `de`; identifier `urn:uuid:09f3dc50-d600-4755-909f-9dcfd2507e87`; package modified timestamp `2026-11-15T13:00:00Z` (metadata, not independent publication authentication). File size **420,770 bytes**; SHA-256 **`1ad6a8be42c6ada9cc6fea23918a0c12fa2d1b8c65ed268a404869bbd37717f9`**. ZIP integrity and navigation/spine entries were checked. The EPUB is an AI-authored research synthesis, not an independent scientific experiment. Its diagrams explicitly describe themselves as simplified original illustrations.

The five recovered exchanges are retained in the companion [source excerpt](atmospheric-water-harvesting/source-chat-excerpt.json). Appendix A inventories their claims and Appendix B preserves their unresolved citation identifiers. Internal citation identifiers alone do not identify retrievable publications. Newly found publications are linked separately; a recovered identifier is not silently reassigned to a new URL.

Evidence labels used throughout:

| Label | Meaning |
| --- | --- |
| **M** | Physical measurements reported in a primary study; only for its apparatus, site, period and conditions. |
| **P** | Simulation, fitted potential, extrapolation or projection in a source. |
| **V** | Manufacturer or retailer specification/claim; independent field verification is absent. |
| **G** | Published technical guidance or an organisation's practice report; not a local controlled experiment. |
| **A** | Explicit planning assumption selected for a calculation. |
| **C** | Arithmetic or engineering inference from stated inputs; not a measured site result. |
| **H/U** | Historical chat claim / source or applicability unresolved. |

There are **no measured Alhama prototype yields in the recovered material**. A laboratory result, coastal climate normal, fog collector, sorbent uptake test and household-appliance rating are different evidence types. All website checks in this synthesis were made on 16 November 2026; source publication dates are stated separately when established.

## 2. Findings that change the design decision

1. Establishment water, planting method and survival target must be decided before sizing water production. The discussed **60 L/tree/first summer** is a trial budget, not a proven minimum for newly planted carob on this parcel.
2. The change from **240 to 60 L/tree/summer** reduces the assumed seasonal water requirement by exactly 75%. Compressor count and energy scale approximately with it only if performance and operating policy remain unchanged. Integer equipment sizes, weather risk, storage and reserve do not scale perfectly.
3. Earth cooling only condenses water when a heat-transfer surface is colder than the incoming air's dew point. Concentric counterflow geometry can recover sensible cooling; it does not provide a new cold source or eliminate latent heat rejection.
4. Passive dew and fog are distinct resources. Relevant southeast-Spain experiments show strong seasonal and site dependence. Annual averages or mountain fog results cannot guarantee summer supply at an inland Alhama parcel.
5. A cheap compressor dehumidifier is a useful experimental benchmark. Its nameplate litres/day and another brand's performance table do not establish local litres/kWh.
6. Sorption can concentrate vapour from low-RH air, but useful water requires capture, regeneration, condensation and drainage. Sorbent mass gain is not delivered water. Thermal and electrical energy must be reported separately.
7. Water storage can shift production in time and reduce battery needs. It cannot make an annual resource coincide with summer demand without sufficient seasonal storage.
8. Compare atmospheric harvesting against collecting winter rain, storing purchased/delivered water and reducing establishment losses. The recovered conversation already identified this comparison as central to the 100-tree case.

## 3. Site resource: coastal Almería is not the Alhama parcel

**G — background climate, not a production forecast.** AEMET's Almería Airport station is at 21 m elevation. Its 1981–2010 normals give annual precipitation **200 mm** and annual mean temperature **19.1°C**. June/July/August relative-humidity means are **61/60/63%**; corresponding mean temperatures are **23.5/26.1/26.7°C**, with precipitation **5/1/1 mm**. These historical coastal averages are not hourly air states at an elevated inland planting site. [AEMET climate normals][S01]

Never combine a monthly maximum temperature with monthly mean RH and call the result a measured simultaneous air state. Average RH also cannot be fed into a nonlinear appliance performance curve to obtain a reliable average yield.

The minimum useful site record includes simultaneous shaded air temperature and RH, rainfall, wind, equipment inlet conditions, cold-surface and buried-soil temperatures, water mass and power. Measure soil temperature at the actual candidate depths rather than assuming that the annual coastal air mean is the condenser temperature. Dry soil, rock, poor contact, burial depth, seasonal warming and sustained heat injection all change ground-exchanger behaviour.

For an autonomous design, the important resource is the joint hourly distribution of **vapour content, temperature, usable solar energy and heat-sink temperature**, including dry/hot spells. Nighttime high RH can result from cooling without a large increase in absolute moisture. Daylight often supplies electricity when condensation conditions differ from those at night.

## 4. Governing calculations and unit discipline

### 4.1 Dew point and available water

The following are standard moist-air engineering relations; a production design should use a validated implementation with local pressure. The open [PsychroLib implementation of ASHRAE relations][S02] provides a traceable reference. For the illustrative table here, saturation pressure uses the explicitly approximate Magnus fit shown below.

```text
T in °C; p and e in kPa; RH as a fraction, not percent
e_sat(T) ≈ 0.61094 × exp[17.625 T / (T + 243.04)]
e_in = RH × e_sat(T_in)
w_in = 0.62198 e_in / (p − e_in)          kg water / kg dry air
w_out,ideal = min[w_in, w_sat(T_out)]
m_water = m_dry_air × (w_in − w_out)
h(T,w) ≈ 1.006 T + w(2501 + 1.86 T)     kJ / kg dry air
Q_removed ≈ m_dry_air × (h_in − h_out)
```

**A/C — idealised calculations, not local measurements.** Pressure 101.325 kPa; all air reaches the stated outlet temperature and saturation when condensation occurs; no bypass, finite contact resistance, fan heat, leakage or drainage loss. Liquid density approximated as 1 kg/L. A real coil surface normally must be colder than the outlet air.

| Incoming air | Dew point | Ideal outlet | Collected water per 100 m³ incoming air | Cooling at 100 m³/h |
| --- | ---: | ---: | ---: | ---: |
| 30°C, 30% RH | 10.5°C | 20°C | 0 L | 0.326 kW thermal |
| 30°C, 40% RH | 14.9°C | 20°C | 0 L | 0.326 kW thermal |
| 30°C, 60% RH | 21.4°C | 20°C | 0.153 L | 0.434 kW thermal |
| 35°C, 40% RH | 19.4°C | 20°C | 0 L | 0.482 kW thermal |
| 35°C, 60% RH | 26.1°C | 20°C | 0.746 L | 1.009 kW thermal |
| 25°C, 60% RH | 16.7°C | 15°C | 0.144 L | 0.433 kW thermal |
| 30°C, 60% RH | 21.4°C | 15°C | 0.611 L | 0.919 kW thermal |

At constant 30°C/60% RH, 100 m³/h and a perfect 20°C outlet, the calculated 24-hour yield is only **3.66 L**. Delivering 54 L/day under those same ideal states would need about **1,475 m³/h** and **6.4 kW of continuous cooling** before recovery. This is a sensitivity example, not a prediction or an earth-loop sizing rule. At 30°C/40% RH, that 20°C exchanger produces zero condensate regardless of how much additional air passes through it.

### 4.2 Latent heat is a heat load, not an electrical minimum

Condensing one litre near ambient conditions releases roughly **0.67–0.68 kWh of latent heat**. Cooling the carrier air adds a sensible load. A heat pump can move more heat than its electrical input; therefore 0.67 kWh thermal/L is **not** a universal minimum electricity consumption. Conversely, a sorbent's regeneration requirement includes sorption and sensible heating and cannot be equated automatically with free-water evaporation alone.

Report these quantities separately:

| Metric | Definition and denominator |
| --- | --- |
| Specific electricity | kWh electrical / L drained to the collection tank, including fans, pumps, heaters, controls and condenser equipment within the declared boundary. |
| Specific thermal input | kWh thermal / L collected; distinguish incident sunlight, useful collector heat and external supplied heat. |
| Sorbent productivity | L / kg **dry sorbent or dry composite** / complete day; identify which mass is in the denominator. |
| Cyclic working capacity | kg water released between the actual adsorption/desorption endpoints / kg dry material / cycle. |
| Areal productivity | L / m² / day, stating solar aperture, condenser area, sorbent area, fog projected area or total land footprint. |
| Water-service efficiency | Litres reaching the root zone, survival and growth, including storage and delivery losses. |

Do not divide daily nameplate water output by instantaneous peak PV power. Do not compare a one-cycle laboratory result against a complete outdoor day without specifying cycle count, day/night duration and condenser energy.

## 5. Earth-cooled concentric exchanger and counterflow recovery

**A/C — reconstructed concept.** The requested concept can be made physically explicit as two separate functions: a concentric air-to-air recuperator and an earth-coupled cold section. Their geometry may share a housing, but their heat flows must remain distinguishable.

```text
Fresh moist air → filter → outer recuperator passage → earth-cooled section
                                                        ↓ liquid drain
Exhaust outdoors ← inner return passage ← cold, drier air ←┘
                      sensible heat exchange
Earth cold section → rejects net heat into soil or a separate ground-water loop
```

Incoming air is precooled by cold outgoing air; outgoing air warms before discharge. The final cold section must still reject residual sensible heat and the heat released by condensation. Counterflow can improve sensible recovery compared with an unrecovered single pass, at the cost of additional pressure drop and construction complexity.

### 5.1 What the geometry can and cannot accomplish

- A thin conductive dividing wall transfers heat between streams. Separate sealed passages prevent moist inlet air mixing with the dry outlet.
- A small approach temperature requires adequate heat-transfer area, contact time and suitable flow. Very narrow annuli increase friction and can clog or flood.
- Sensible effectiveness can be defined as `ε = (T_hot,in − T_hot,out)/(T_hot,in − T_cold,in)` for the appropriate equal-capacity idealisation. Do not treat a selected 80–90% value as a measurement or apply that simple expression unchanged through a wet, condensing section.
- A vapour-permeable membrane could transfer moisture back into the inlet or between streams. For water recovery this is not automatically useful. Choose and analyse the moisture-transfer behaviour explicitly.
- Recuperation may move the location where condensate forms; all cold passages need drainage accounting. It cannot justify multiplying gross water by an additional arbitrary recovery gain.
- The ground warms under sustained heat rejection. A bucket of initially cool water or a short buried pipe is a transient heat store, not an unlimited cold sink.

The diagram is a functional reconstruction of the **concentric** concept requested in this continuation. The supplied EPUB instead illustrates a single buried U-shaped air duct, and does not specify concentric counterflow passages or pipe diameters/lengths. Its original ground-duct model and experiment are preserved separately below. These geometries must not be presented as the same recovered drawing.

### 5.2 Preferred prototype decisions

An accessible, above-ground condensing air section coupled to a **closed buried liquid loop** may be easier to inspect and clean than sending ambient air through long wet buried ducts. That is an engineering option, not a proven efficiency improvement. Compare its pump energy, extra thermal resistance and cost against a direct buried air path.

For either version, provide continuous fall to a visible collection point, cleanouts, insect screens, a condensate trap appropriate to pressure, insulation where needed, corrosion-compatible wet surfaces and no pockets that hold stagnant water. Record duct/loop pressure drop, fan/pump electricity and ground temperatures during extended operation. Do not infer potable water quality from condensation.

**Go/no-go evidence:** sufficient hours with surface temperature below dew point; measured sustainable heat rejection; measured recovered litres after drainage; measured parasitic energy. A daytime dry-air case with dew point below the ground temperature fails the condensation requirement before detailed exchanger optimisation is useful.

## 6. Passive dew and fog

### 6.1 Radiative dew

Dew forms when an exposed collector radiates to the sky and becomes colder than the dew point. Useful design variables include sky view, long-wave emissivity, solar reflectance, underside insulation, wind exposure, surface wetting, slope and drainage. A roof, tree canopy or PV panel above the radiative face reduces its view of the sky. A solar-absorbing surface and a night-cooling surface therefore have competing requirements unless the architecture switches functions.

**M — nearby climate analogue, not the project site.** Maestre-Valero et al. tested two 1 m² collectors inclined 30° in Cartagena from May 2009 to May 2010. Reported annual collection was **20.76 L/m²** for black foil and **17.36 L/m²** for white foil; dew occurred on 163 and 175 nights respectively. Collection was rare below 75% RH or above 1.5 m/s wind. Dividing by 365 gives **0.057 and 0.048 L/m²/day**. Supplying 54 L/day at those annual means would require approximately **950–1,135 m²**, before additional losses; this does not size summer production. [Maestre-Valero et al., 2011][S03]

Do not adopt 0.3–0.6 L/m² **every day** merely because a favourable dewy night achieved a large yield. An area estimate must include all zero-yield nights and seasonal mismatches.

**M/P — local ecosystem wetness is not tank output.** A Balsa Blanca coastal-steppe conference study reported wetness detection and **modelled potential dew**, including a 0.21 ± 0.14 mm/night value for its study period. Earlier and later reports use different periods and give different annual totals. Neither is a demonstration of equivalent litres drained from an engineered condenser. Their printed rain/dew percentage arithmetic is also inconsistent enough that it should not become a sizing input. [Uclés et al., 2010 abstract][S04], [earlier Balsa Blanca paper][S05]

### 6.2 Fog collection

Fog collectors intercept existing airborne liquid droplets. They are not devices that condense dry vapour at ambient temperature. Production depends on fog liquid-water content, wind, droplet size, exposure, mesh aerodynamics and drainage.

**M/P — relevant Almería field evidence.** Corell et al. report cylindrical-collector data from January 2010 to April 2011. Cabo de Gata and Alhamilla mean annual values are **1.9 and 3.1 L/m²/day**, but summer values fall to **0.2 and 0.1**. The same work gives **modelled flat-screen annual potentials** of 585 and 822 L/m²/year. These latter numbers are not measured production from full flat-screen installations. Cabrera's larger annual figure has missing summer data and is not a summer guarantee. Area definitions and rain interference must be retained when comparing collectors. [Corell et al., 2014, tables 1–2][S06]

**C — deliberately simple sensitivity:** 54 L/day divided by the two summer rates gives **270 or 540 m² of corresponding collector area**, before efficiency, storage and transfer corrections. This is not a recommendation for Alhama; local fog occurrence and collector scaling remain unmeasured.

The library already holds the **LIFE NIEBLAS technical manual** and its reforestation-monitoring report. They are useful for collector/reservoir/restoration architecture, but success at fog-rich project locations does not establish an inland Almería resource. See [IRR-003, technical manual](IRR-003%20-%20LIFE%20NIEBLAS%20-%20Technical%20Manual%20-%202025.pdf) and [IRR-008, monitoring report](IRR-008%20-%20LIFE%20NIEBLAS%20-%20D3%20Reforestation%20Execution%20and%20Results%20Monitoring%20-%202025-03.pdf).

## 7. Compressor condensation and photovoltaic supply

### 7.1 The inexpensive appliance benchmark

The recovered chat compared Obramat 10/12/16/20 L units and a Brico Depôt Bora 12 L device. Its first engineering argument remains sound: a household compressor unit contains a complete refrigeration circuit, evaporator, condenser, fan and controls, providing a low-complexity reference against a custom-built sorption device.

**V — verified Haier specification.** The Haier-branded sheet includes model **AG20BB1TAA**, **20 L/24 h**, **290 W**, high/low airflow **373/288 m³/h**, a 3 L tank, continuous drain with 1.80 m hose, automatic restart/defrost and R290 refrigerant, 83 g. The accessible sheet does not state the temperature/RH for its 20 L rating. Its filename refers to another size, so use the model table inside the PDF, not the filename, to identify the product. [Haier/Obramat technical sheet][S07]

The [Obramat 20 L product page][S08] requires warehouse selection for current price/availability. The chat's EUR 129 and broader EUR 80–130 prices are **historical quoted prices**, not verified current offers. No purchase was made.

**V/C — same-model performance versus climate.** A Meaco 20 L Low Energy manufacturer's table provides the following separate reference. Derived energy values assume its listed power continuously for 24 h. [Meaco manufacturer performance table][S09]

| Air conditions | Listed production | Listed power | Calculated kWh/L |
| --- | ---: | ---: | ---: |
| 10°C, 60% RH | 2.52 L/day | 163 W | 1.55 |
| 20°C, 60% RH | 8.48 L/day | 219 W | 0.62 |
| 30°C, 60% RH | 13.27 L/day | 262 W | 0.47 |
| 20°C, 80% RH | 13.74 L/day | 228 W | 0.40 |

These are manufacturer values for **Meaco**, not measured Haier yields. The recovered assumption **10 L/day at 290 W** implies **0.696 kWh/L**, not 0.35. At a nominal 20 L/day the same power would imply 0.348 kWh/L, but it is inconsistent to combine the nameplate efficiency with the derated 10 L/day design unless power is also changed and justified.

### 7.2 Deployment and operating policy

Maintain a supply of fresh ambient air. A closed room dries out; a short circuit between hot dry exhaust and inlet reduces output. Keep household units within their stated operating envelope, sheltered from weather and dust, with accessible filters, reliable continuous drainage and verified restart behaviour. A shade structure must not trap heat. Additional fans, screens and ducts affect airflow and must be included in energy measurements.

**Do not modify a sealed refrigerant circuit for this baseline experiment.** Any later custom refrigeration development needs appropriate engineering practice and manufacturer compatibility. Irrigation condensate still requires a water-quality check appropriate to the crop, wet materials and storage; ordinary dehumidifier collection does not certify drinking water.

Possible control policies are continuous operation, PV-only daytime operation, humidity/dew-point-gated operation or operation when measured litres/kWh are favourable. A controller should use a tested performance map rather than RH alone. Avoid rapid compressor cycling; account for startup delays and any defrost intervals.

At unchanged hourly yield, running **8 rather than 24 h/day** requires roughly three times as many units for the same daily water. Daytime conditions can change both yield and power, so this factor is only a bookkeeping starting point. A large water tank shifts delivery timing; it does not preserve nighttime production after the battery is removed.

## 8. Solarthermal sorption and condensation

### 8.1 Complete cycle and practical architectures

1. Expose a cooled sorbent bed to ambient air; water adsorbs/absorbs. Adsorption heat must leave the bed.
2. Isolate it from the ambient flow. Heat the bed using a solar absorber or heated fluid/air circuit.
3. Direct released vapour to a cooler condenser in a sufficiently sealed path. An open hot box can lose the recovered moisture back to the atmosphere.
4. Reject condenser heat, collect liquid separately from the sorbent and then cool/reset the bed before the next adsorption period.

**A/C — DIY options:** one night-adsorbing/day-regenerating bed is the simplest cycle to observe; two switched beds can alternate functions; more frequent active cycling needs valves, fans and reliable controls. Multi-stage heat reuse can improve a specifically engineered system, but a single sun-heated box does not automatically achieve it.

An effective architecture separates a **hot insulated sorbent zone** from a **shaded heat-rejecting condenser**. Heating both with the same enclosed glazing can prevent condensation. The desorbed vapour's dew point, leakage and condenser approach temperature determine whether ambient cooling is enough; the condenser does not necessarily need to be below the original ambient-air dew point because sorption has concentrated the vapour.

### 8.2 Primary studies: what was actually demonstrated

| Source | Evidence status and result | Design meaning |
| --- | --- | --- |
| Kim et al., *Science*, 2017, MOF-801 | **M:** about 0.24 L/kg/cycle in a gram-scale lab test. **P:** the widely repeated 2.8 L/kg/day derives from modelled continuous 24 h cycling of an optimised thin layer, not a measured passive desert day. | Keep the laboratory cycle, model and rooftop visualisation separate. [Paper PDF][S10] |
| Song et al., *Nature Water*, 2023, MOF-303 | **M:** passive outdoor Death Valley production 0.114–0.210 L/kg/day; up to 0.285 in Berkeley. Death Valley field air ranged 21.9–60.7°C and 9.4–36% RH. | A measured low-RH outdoor benchmark; not an Almería yield or a commodity-material cost estimate. [Paper PDF][S11] |
| Gentile et al., *Energy*, 2022, silica gel | **M:** 1.5–3.3 L/day per m² solar field; regeneration ≤57°C; ambient 20–35°C, dew point 2–8°C; 1–3 kWh thermal/L. | Useful system-level thermal comparison; retain solar-field area and thermal boundary. [Author-hosted paper PDF][S12] |
| LaPotin et al., *Joule*, 2021, AQSOA-Z01 | **M:** about 0.77 L/m²/day outside under natural sunlight. **P:** roughly doubling a single-stage system was a modelled comparison. | First-stage condensation heat can drive a second stage in an engineered device. [Publisher abstract][S13] |
| Li et al., *ES&T*, 2018, PAM–CNT–CaCl₂ | **M:** 35 g dry composite absorbed 37 g vapour overnight at 60–70% RH; about 20 g liquid collected during 2.5 h sunlight. | This event gives ~0.57 L/kg dry composite collected; uptake, collection and daily productivity differ. [Primary publication][S14] |
| Hoogendoorn et al., *AFM*, 2024, CaCl₂–PAM | **M:** uptake 0.92 g/g at 30% RH and 2.38 g/g at 70%; tested cycling also showed leakage. | A material uptake result is not a clean-liquid production rate or proof of long service life. [Institutional paper PDF][S15] |
| Almassad et al., *Nature Communications*, 2022, MOF-801 | **M, primary indexed passages:** active adaptive system about 3.5 L/kg/day and 1.67–5.25 kWh/L under changing dry conditions; full-page access was blocked during this review. | High material-normalised productivity can entail high electricity consumption. [Publisher page][S16] |

**C — scale illustrations only:** delivering 54 L/day at 0.114–0.210 L/kg/day would correspond to about **257–474 kg dry MOF** before additional losses, if the Death Valley rate transferred unchanged. At 1.5–3.3 L/m²/day it corresponds to **16–36 m² solar field**, if the silica-gel apparatus and its conditions transferred unchanged. Neither extrapolation is an Alhama design. They illustrate why mass-based and area-based headline values cannot be compared without architecture and conditions.

## 9. Sorbent selection

**Engineering screening, not a ranking established for the parcel.** Select a material by cyclic working capacity at the actual night/day states, heat and mass transfer, cost of the finished bed, containment and ageing. Maximum equilibrium uptake at high RH is insufficient.

| Material family | Reason to investigate | Main limitations and measurements needed |
| --- | --- | --- |
| Silica gel | Accessible baseline; specific low-temperature solarthermal experiments exist. | Actual low-RH uptake and usable swing; bed heating/cooling time; binder/inert mass; dust; regeneration/condensation efficiency. |
| Zeolites / molecular sieves | Strong adsorption; specific AQSOA-Z01 multi-stage demonstration. | Regeneration behaviour differs strongly by type. Do not assign a universal temperature or transfer AQSOA performance to generic sieve beads. |
| CaCl₂ or salt composites | Hygroscopic, potentially inexpensive salt; supported hydrogel experiments. | Deliquescence, brine containment, leakage/carryover, corrosion, swelling, drying kinetics and water salinity. Pure salt behaviour differs from a composite. |
| LiCl composites | Candidate for lower-RH capture in an appropriate support. | Material price, containment, contamination and compatibility; no current universal cost multiplier or parcel performance established here. |
| MOF-801 / MOF-303 | Demonstrated low-RH capture and outdoor apparatus. | Finished sorbent availability/cost, shaping, binder, cyclic stability, contact resistance and condenser performance. Do not treat research powder as a purchasable complete system. |
| Hydrogels | Hold hygroscopic salts and permit tailored surfaces/porosity. | Usually a support-plus-salt system; swollen mass is not dry mass. Require dry-composite denominator, collected-liquid balance and leaching/ageing tests. |
| Activated carbon / improvised desiccants | Potential low-cost experimental comparison. | No validated low-RH working capacity or full-cycle yield for the proposed architecture; do not substitute without measurements. |

Initial screening should use supplier composition and a repeatable gravimetric adsorption/desorption test, followed by a separately weighed condenser yield. Used desiccants of unknown composition are not a reliable material specification. Regeneration temperature is determined by the whole cycle and desired release fraction, not just a marketing label.

## 10. Efficiency chain and fair comparison

### 10.1 Compressor/PV chain

```text
Sunlight → PV DC → controller/inverter [→ battery if used] → compressor + auxiliaries
Ambient vapour → cooled air → droplets → drain → tank → distribution → root zone
```

**A/C — example per 1 m² PV:** incident solar energy 6 kWh/m²/day × PV efficiency 22% × downstream performance factor 0.80 = **1.056 kWh/day** at the declared usable-electricity boundary. At 0.696 kWh/L this gives **1.52 L/day**; at 0.47 it gives **2.25 L/day**. These are calculations using selected inputs, not a forecast. Real module area, temperature, shade and operating policy must replace them. A 560 W module is a power rating; its physical area is needed for an area comparison.

Use measured system `kWh/L` after all included auxiliaries; do not multiply it again by invented component efficiencies. If battery/inverter losses are already included in the electricity measurement boundary, do not deduct them twice.

### 10.2 Solarthermal sorption chain

```text
Sunlight → useful collector heat → heated sorbent → released vapour
Ambient air → captured water ↗                          ↓
                                         condenser → drain → tank → roots
```

Two independent constraints apply:

```text
Material-limited water = dry mass × working capacity × completed cycles/day
                        × distinct release/condensation/collection fractions
Heat-limited water = useful collector heat / measured thermal input per collected litre
```

Do not use a working capacity already defined as **released** water and multiply by the released fraction again. For a full apparatus, measured collected litres/day is preferable to a chain of guessed efficiencies. The smaller of the material and heat estimates is only a bound; kinetics and heat rejection can reduce output further.

**A/C — illustration:** 6 kWh/m²/day sunlight × 50% useful collector efficiency = 3 kWh thermal/m²/day. With 1–3 kWh thermal/L this allows **1–3 L/m²/day** thermally, before any additional constraints omitted from that boundary. It does not prove that a selected bed captures enough vapour or that the condenser works.

### 10.3 Compare delivered service, not isolated components

Use the same climate record and report total collector/PV area, complete equipment cost, all supplied energy, produced water, delivered water, downtime, maintenance and water quality. For restoration, add **litres and euros per tree successfully established after two summers**, with the definition of establishment stated. A very efficient device that produces water outside the season of need may require a large tank.

## 11. Morphological design matrix

**A/C — new design-space synthesis.** These are options to combine into testable concepts, not validated compatible combinations or recovered original matrix entries.

| Function | Option A | Option B | Option C | Selection question |
| --- | --- | --- | --- | --- |
| Atmospheric resource | Fog droplets | Night dew | Vapour capture/condensation | Does the parcel have the resource when water is needed? |
| Moisture separation | Radiative surface/mesh | Refrigeration coil | Sorbent bed | What produces collected litres under the local state? |
| Energy source | Wind/sky radiation | PV electricity | Solarthermal heat | Which hourly inputs are available? |
| Cold sink | Night sky/ambient air | Buried ground loop | Active chiller | Can it reject heat continuously at the required temperature? |
| Heat recovery | None/reference | Concentric sensible recuperator | Multi-stage latent-heat reuse | Is the net gain greater than pressure drop and complexity? |
| Sorbent | Silica/zeolite | Salt composite/hydrogel | MOF | What is the actual cyclic working capacity and finished-bed price? |
| Air transport | Natural wind/convection | Low-pressure fan | Switched closed regeneration loop | Are flow, leakage and parasitic power acceptable? |
| Bed operation | One diurnal bed | Two alternating beds | Active multi-cycle apparatus | Can heating and cooling finish within the cycle? |
| Condenser layout | Shaded air-cooled | Ground-liquid-coupled | Refrigeration-assisted | Is vapour dew point sufficiently high? |
| Housing | Fixed separate hot/cold zones | Switchable cover/insulation | Modular replaceable cartridges | Can heat leaks, rain and maintenance be managed? |
| Controls | Observation/manual prototype | Timed states + interlocks | Measured performance/forecast control | Are faults explicit and fail states safe? |
| Storage | Local small reservoir | Central tank/sector delivery | Seasonal tank + backup refill | How long must water and energy be buffered? |
| Distribution | Gravity basin/deep dose | Drip/sector valves | Local subsurface reservoir | What reaches the root zone without excessive loss? |
| Service model | One unit per plant | Central production hub | Transported water + passive treatments | What minimises cost and failure burden per established tree? |

Candidate bundles:

- **Reference R1:** unmodified compressor dehumidifier + energy/water logging + fresh air + tank. Establish actual litres/kWh before buying a fleet.
- **Ground concept R2:** above-ground serviceable condenser + closed earth liquid loop + optional concentric recuperator; evaluate sustainable cooling and net parasitic power.
- **Thermal concept R3:** single silica-gel bed + solar hot zone + separate shaded condenser + manual/controlled isolation. Close the mass and heat balances before adding cycles or exotic sorbents.
- **Passive concept R4:** small fog screen and radiative dew panel, separately metered with rain discrimination, operating alongside R1 rather than claiming an unmeasured replacement supply.

## 12. DIY architecture and build sequence

### 12.1 Functional modules

| Module | Practical prototype requirement | What to record |
| --- | --- | --- |
| Air inlet | Replaceable filter, shade, no exhaust recirculation | Inlet temperature/RH, flow, filter condition |
| Capture/cooling section | Removable sorbent trays or intact refrigeration coil; accessible ground-condenser surface | Bed/coil temperatures, material mass and state |
| Thermal system | Clearly separate hot absorber and cold condenser; insulation and isolation | Heat-input boundary, solar aperture, hot/cold temperatures |
| Flow switching | Sealed dampers/valves suitable for temperature and moisture | Position, leakage, transition times |
| Condensate path | Continuous fall, visible drain, no re-evaporation pool, salt separation | Gross condensate versus actually collected mass |
| Storage | Opaque covered tank, vent/insect control, level/overflow indication | Start/end inventory, leakage, withdrawals |
| Electrical system | Appropriate protected power equipment; measured AC/DC boundaries | Whole-system kWh, startup and standby |
| Controller | State logging, minimum cycle times and explicit faults | Sensor failures, stalled flow, tank-full condition |
| Maintenance access | Filter/tray/coil cleaning without excavation | Labour, consumables, corrosion and biofilm |

These are functional requirements, not a procurement list with quoted prices. No repository simulator rule or application default is created by this report.

### 12.2 Proposed progression

1. Log ambient and candidate soil temperatures first; calculate dew point and identify plausible ground-condensation windows.
2. Run one low-cost compressor device with weighed water and an energy meter. Separate morning, midday, evening and night performance.
3. Test a small passive panel/screen and a small sorbent cartridge under the same weather. Measure **zero-yield** periods as well as successful runs.
4. Add one engineering feature at a time: recuperation, a ground loop, different sorbent, automatic switching or a second stage. Compare net litres per full-system energy/area/cost.
5. Size a service system only after extended summer measurements and a defined irrigation protocol. A favourable week is a useful screening result, not a seasonal reliability demonstration.

## 13. Additional EPUB findings, translated and audited

### 13.1 Air-state examples and seasonal interpretation

EPUB chapter 2 and its air-state figure compare **30°C/30% RH: ~9 g/m³, dew point ~11°C**; **30°C/60%: ~18 g/m³, ~21°C**; and **10°C/80%: ~7.5 g/m³, ~7°C**. These rounded illustrative values explain why warm moderately humid air can hold more vapour than cold high-RH air. At a 19°C cold surface, only the second example condenses. The chapter 4 winter example assumes **15°C soil**: 10°C/80% air would be warmed rather than condensed. None of those soil temperatures is a local measurement.

Chapter 7 correctly distinguishes marine humid summer air from dry-flow periods, and declining winter PV/vapour availability. It proposes operating each technology according to its actual resource: fog during fog, dew on favourable nights, adsorption often at night and regeneration in sunshine, ground cooling when dew point exceeds the wall temperature, and compressors at favourable measured litres/Wh. No universally best hour or season is established.

### 13.2 The reported soil-cold-source experiment

**M — Yao et al. (2021), EPUB chapter 4, verified in primary table 5/§§4–5:** air **30–45°C/20–50% RH**; initial soil **19°C**; flow **54 ± 3.5 m³/h**; area **2.3738 m²**; **2.2 kg weighed over 20 h**, versus 2.7 kg calculated. Soil warmed **2.4°C**, recovering approximately **24 h after shutdown**. Published exchanger: 0.68 m diameter, 0.98 m high, bottom 2 m underground; distinct from the user's concept. Fan-electricity balance remains incomplete. [Primary paper][S29]

**C:** mean output is 0.11 L/h; extrapolating to 2.64 L/day ignores recovery/weather. Listed pressures 1.2/0.1 kPa would imply 16.5 W air power at 54 m³/h if their difference represents system loss; they cannot establish a 15 W electrical fan.

### 13.3 The EPUB's two small autonomous models

| Model / EPUB locator | Original inputs and output, translated | Audit |
| --- | --- | --- |
| Ground duct, chapter 8 | 100 m³/h; 30°C/60% RH cooled to 19°C; ~0.25 L/h, ~1.5 L over 6 h. Selected fan 15 W, therefore 90 Wh. | **A/C.** About **0.06 kWh electrical/L** is implied, but only if heat transfer, ground temperature, airflow and fan operating point all hold. It is not a measured system efficiency. |
| Compressor + small PV, chapter 8 | 300 Wp module; indicative annual-average ~1.4 kWh/day before further battery/electronics losses. At 1 kWh/L, order of 1 L/day; at 3 kWh/L, well below 0.5 L/day. | **A/C.** No retained site-specific PVGIS output establishes 1.4 kWh/day. Seasonal and storage losses matter. Do not compare annual PV averages against summer-only demand without a time model. |

The ground model is consistent with section 4: at a 19°C ideal outlet, approximately **0.255 L per 100 m³** is available from that inlet state, requiring about **0.533 kW** cooling at 100 m³/h, or **3.20 kWh thermal over six hours**. Its low fan-only specific electricity must not be compared directly with complete compressor electricity without disclosing the ground sink and capital works. The selected model output differs from Yao's experiment because flow, weather and apparatus differ; neither validates the other.

### 13.4 Peltier cooling and broad compressor estimates

EPUB chapter 5 gives **0.5–2 kWh electrical/L** as an illustrative range for suitable warm/humid compressor operation, mentions individual examples around **0.8–1**, and allows substantially higher use in dry/cold conditions. These are broad synthesis ranges, not a quoted performance map of a named device. The verified Meaco table can fall below 0.5 kWh/L, so the EPUB range is not a physical lower bound.

The same chapter treats Peltier modules as convenient DC demonstration components. Their hot side must reject both extracted heat and electrical input; efficiency worsens with temperature lift. It mentions some small prototypes at **~20 kWh/L or more**, while explicitly rejecting this as universal. The EPUB gives no precise source-to-number mapping for that claim, so it remains **H/U**, not a validated selection rule. At 1 available kWh/day, a 20 kWh/L device would yield only 0.05 L/day by arithmetic.

### 13.5 Passive lithium-chloride capillary system

**M, with access qualification.** Yang et al. (2024), one of the EPUB's five references, describe a LiCl/capillary solar device. Primary indexed text gives **65–96 mL/day from a 13.5 × 24 cm module**, corresponding to **2–3 L/m²/day** in its summer field test, and around **480 mL/day** for six modules. A reported day distinguished 95 mL generated from 85 mL drained, with 10 mL retained. Automatic continuous behaviour was tested at **60–90% RH**; operation at **40% RH required manual chamber opening**, a material limit when discussing dry-site autonomy. Direct full-page retrieval was blocked during this check. [Yang et al., publisher article][S30]

The EPUB preserves the 2–3 L/m²/day result and small absolute module yields but omits that operating-mode qualification. Its headline must not be promoted to automatic 40%-RH performance. The 2025 correction linked by the source concerns an author's name; no performance revision was identified.

### 13.6 Development proposals and figures

Chapters 9–10 propose **5–10 minute logging**, soil probes at about **1 and 2 m**, a dew collector of a few square metres, and an accessible ground prototype at **50–150 m³/h**. These are proposed experiment dimensions, not measured optimum values. The sorption prototype uses modular silica-gel cartridges, thin conductive sheets/fins, insulation, seals, separate liquid paths and a microcontroller monitoring temperature/RH, ground/exchanger temperatures, solar input and battery state. A metal fabricator could help make housings, fins and removable beds. Measure inlet/outlet conditions, water, fan electricity and ground warming.

The EPUB's four figures communicate: (1) the three air states above; (2) fog-droplet interception versus vapour condensing on a sky-cooled plate; (3) a buried U-duct with drainage; and (4) night adsorption/day thermal regeneration. They are conceptual, unscaled drawings. No hidden numerical engineering dimensions or experimental images were found. Their original German files are retained inside the archived EPUB; the English tables and flow diagrams here carry their substantive content.

The EPUB favours a ground duct as a mechanically simple experiment, sorption as a low-RH research direction, compressors when controlled cold is valuable, Peltier mainly for teaching, and a hybrid sorption/ground device as an **unproved future option**. Its concluding priority is measuring the parcel before optimising or building a full plant.

## 14. Commercial devices: compare complete systems

**V unless stated otherwise.** These are current primary manufacturer statements with access limitations recorded, not independently demonstrated performance at Alhama. Named commercial systems were not present in the supplied EPUB; this section extends the requested scope with fresh checks.

| System | Manufacturer claim / source | Interpretation and limitations |
| --- | --- | --- |
| Haier AG20BB1TAA / Obramat | 20 L/day, 290 W; section 7. [Technical PDF][S07] | Indoor appliance benchmark; rating conditions absent from reviewed sheet; 10 L/day is a selected planning assumption. |
| HJM DHM12L | Manual: 12 L/day at 30°C/80% RH; 6 L/day at 27°C/60%; 210 W; 5–32°C range; 2.2 L tank. [Official manual][S17] | `0.210 × 24 / 6 = 0.84 kWh/L` assumes nominal power continuously. The Brico DHM12 listing has inconsistent 20 L/200 W table entries; verify exact DHM12/DHM12L identity before purchase. |
| MeacoDry Arete One 10 L | At 10/20/30°C and 60% RH: 1.41/4.34/6.88 L/day and 129/151/185 W. [Official table][S18] | Derived 2.20/0.84/0.65 kWh/L. Supports the chat's rounded 1.4/4.3/6.9 values, not a Haier transfer. |
| SOURCE Hydropanel | Official indexed page: ~2.5 L/day in arid conditions, >3.5 in humid conditions. [Manufacturer page][S19] | Full page returned an access/payment error. Indexed manufacturer claim only; request site-month water forecast, installed footprint and maintenance details. |
| Kumulus Amphore/Boks | FAQ: 20–30 L/day, 0.4–0.8 kWh/L depending on climate; up to 45 L/day optimally; recommends warm air and RH >30%. [Official FAQ][S20] | Operating recommendation is not guaranteed water at the threshold. Include all electricity, water treatment and consumables. |
| Watergen GEN-M PRO | Up to 900 L/day in ideal conditions, 350 Wh/L; starts at 15°C/20% RH. [Official page][S21] | Max yield and operating threshold are not simultaneous guarantees. Page also pairs 900 L with 211 US gal (~799 L) and labels power “5.6KW/H”; those conversion/unit issues require clarification. Linked PDF downloads returned 403. |

For any quotation, request a temperature/RH performance map, measured daily input/output under stated test conditions, supplied versus auxiliary energy, product-water specification, consumables, service interval, restart behaviour, dust/heat limits, installed cost and warranty. Large commercial nominal capacities are not evidence that a small DIY device reaches the same specific consumption.

## 15. Carob irrigation: plantation and restoration are different objectives

### 15.1 What the recovered chat originally assumed

The first answer proposed **10–20 L/tree/week for the first and second summers** and **5–15 L/week for the third**, over an illustrative 16-week summer. That yields **160–320 L/tree/summer**, **160–320**, and **80–240**, respectively. It described these as supportive establishment planning ranges and said later watering would depend on drought. Those quantities are **H/A**, not carob-specific survival minima or an adopted local schedule.

At 15 L/week, one device producing 1 L/day supports `7/15 = 0.47` tree; 3 L/day supports `21/15 = 1.4` trees. The earlier suggested device target **2–3 L/tree/day** therefore matched that intensive weekly support scenario. It is not consistent with calling **60 L/tree over 112 days** the same demand: that later restoration scenario averages only **0.536 L/tree/day**. The change is a change in irrigation policy and risk, not a demonstrated improvement in water-generator efficiency.

### 15.2 Primary guidance, field practice and species-specific research

| Source and evidence type | What it supports | What it does not establish |
| --- | --- | --- |
| **G:** MITECO *Ceratonia siliqua* species chapter | 1–2 establishment waterings, at planting and within the next two weeks; repeating support in the second year can be useful. Better-watered, deeper-soil microsites are emphasised. [Official species PDF][S22] | No litres; no proof that two waterings cover every first Almería summer. |
| **G:** Junta de Andalucía dehesa/agroforestry annex | 10–20 L/application every 2–3 weeks in dry months for young stock of 1–2 growing seasons. [Official PDF][S23] | A maintenance/costing context drawing on LIFE Biodehesa, not a controlled carob-Alhama trial or a universal forestry prescription. |
| **G:** SERBAL, 8 August 2025 | Operational report of 12–16 L/young plant in Sierra de los Filabres. Narrative describes July work; caption says before summer. [Local organisation report][S24] | Not a carob dose-response study; illustrated species include oak, rowan, cistus and strawberry tree. |
| **G/C:** MAPA–CSIC, October 2023 revision, §7.1.4, printed pp. 62–63 | Small forest-tray stock in 30–40 cm holes: 15 L/application twice monthly June–September in years 1–2, hence 120 L/tree/summer. Large stock has a separate 50 L example. [Official PDF][S25] | General conservation-planting guidance, explicitly adaptable/nonmandatory; not an experimentally proven carob minimum. |
| **M:** Sánchez Sánchez et al., 2004, Almería microrriego | 1.5–3 L/application at ~25 cm depth; trial species Aleppo pine and wild olive. MITECO's 2008 account reports 3–6 L total and cautions about follow-up/weather. [Original paper page][S26], [MITECO technical PDF][S27] | These very small doses cannot be transferred as a proven carob schedule. Application dose and total trial water must not be confused. |
| **M:** Ezzine et al., 2023, Morocco | Three-year-old carob compared under 8 L/week subsurface drip, ~30 L/month tank irrigation and no irrigation. [Primary article and PDF][S28] | Physiology and treatment comparison do not determine a newly planted Almería seedling's survival minimum. |
| **G:** Correia et al., CNCFS, May 2017, table 5, printed p. 26 | Indicative young orchard allocation April–September: 40/60/70/80/60/50 L, total **360 L/tree**. Reduce for small stock and adapt to observed trees. [Publisher PDF][S31] | Agricultural growth/production guidance; not a restoration minimum or evidence that all trees need the allocation. |
| **M, limited accessible extract:** Padilla et al., 2011 | Two degraded Almería sites, eight Mediterranean woody species including carob, unusually dry early season; overall survival **0–24%**. [Publisher][S32], [first-page/abstract extract][S33] | The overall range is not a carob-specific percentage, and the accessible extract is not the complete paper. Adult drought tolerance does not establish seedling survival. |

The recovered chat also referred to a 2024 *Journal of Ecology* carob review and a Portuguese young-orchard study. The historical IDs alone were insufficient to verify the exact cited editions. The verified 2017 orchard table above supports the 60–80 L/month high-summer order of magnitude; it does not validate the earlier blanket year-by-year prescription.

### 15.3 A defensible trial question

The later chat proposed **4 × 15 L/tree = 60 L/tree in the first summer**, with reserve capacity up to **120 L/tree**, conditional on soil moisture, stock, planting success and weather. This remains a **proposed experiment**, not an agronomic guarantee. The 120 L scenario also corresponds arithmetically to the general MAPA–CSIC schedule, but that does not make the 60 L scenario a demonstrated safe half-dose.

Plant in an appropriate wet-season window; assess soil depth, restrictions, planting-stock roots and provenance; select suitable microsites; evaluate runoff basins, mulch and browsing protection. Dose frequency and infiltration must suit the root zone and soil. Large infrequent doses can reduce surface losses in some settings, but preferential bypass, runoff and waterlogging are possible; delivery method needs measurement.

A proposed comparison can include unwatered, very-low-dose subsurface and demand-triggered support groups, with predeclared emergency intervention rules and an appropriate local field protocol. Randomise/block by microsite, use comparable stock and report all emergency/rescue water. Do not confound a new dose with a different shelter, mulch and planting hole and then attribute the outcome to irrigation alone. Observe at least the first two summers, roots/condition where feasible, survival and growth. Reduction in year 2 or rare intervention in year 3 is a hypothesis to review, not a calendar guarantee of independence.

## 16. Recalculated 100-tree water, PV and battery sizing

### 16.1 Water budgets

**A:** 100 trees, 16 weeks = **112 days**. This normalises the comparisons; literal June–September spans 122 calendar days. No planting water outside the stated schedule, distribution losses, storage losses or emergency reserve is included in these net budgets.

| Scenario | L/tree/summer | Total L/summer | Mean L/day | Minimum units at assumed 10 L/day |
| --- | ---: | ---: | ---: | ---: |
| 4 × 10 L | 40 | 4,000 | 35.71 | 4 |
| 4 × 15 L | 60 | 6,000 | 53.57 | 6 |
| 8 × 15 L | 120 | 12,000 | 107.14 | 11 |
| 15 L/week × 16 | 240 | 24,000 | 214.29 | 22 |

The **25% ratio is exact for these assumed water schedules**: `6,000 / 24,000 = 0.25`. It does not certify equivalent survival. If only 90% of produced water reaches the planned application point, the 6,000 L net budget needs **6,667 L gross**, or 59.52 L/day; the nominal six-unit supply then has almost no additional production margin. The selected 90% is a sensitivity assumption, not measured efficiency.

### 16.2 Reproduce the original electrical assumptions transparently

**A:** each installed unit runs continuously at **0.290 kW**, produces **10 L/day**, each 560 W module supplies **3 kWh/day** at a defined useful-electricity boundary, and PV gets a 25% planning margin. Battery bridges **12 h**, with 80% usable depth of discharge and 92% discharge/inverter delivery efficiency.

```text
units = ceiling(mean water requirement / measured-or-assumed L per unit per day)
daily electricity = units × 0.290 × 24                         kWh/day
PV modules = ceiling(daily electricity × 1.25 / 3)
PV nameplate = modules × 0.560                                kWp
battery nominal = units × 0.290 × 12 / (0.80 × 0.92)           kWh
```

The module assumption is equivalent to **5.36 kWh/kWp/day**, not a freshly computed parcel yield. The following reproduces the chat's simplified calculation; extra battery charging losses and auxiliaries are not yet included.

| Installed units | Assumed L/day | Continuous kW | kWh/day | 560 W modules | PV kWp | Nominal battery kWh |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 6 | 60 | 1.74 | 41.76 | 18 | 10.08 | 28.37 |
| 7 | 70 | 2.03 | 48.72 | 21 | 11.76 | 33.10 |
| 22 | 220 | 6.38 | 153.12 | 64 | 35.84 | 104.02 |
| 25 | 250 | 7.25 | 174.00 | 73 | 40.88 | 118.21 |

Thus the earlier **25 units, 70–80 modules, ~120 kWh** is a coherent rounded scenario under those assumptions, with more units than the arithmetic minimum. Its 70–80 modules correspond to **39.2–44.8 kWp**. The later **6–7 units, 18–20 modules, ~30 kWh** mixes rounding: six units fit 18 modules/~28.4 kWh; seven need ~21 modules/~33.1 kWh with the same assumptions. A 30 kWh battery delivers **22.08 kWh**, whereas seven units need **24.36 kWh AC for 12 h**.

The original 10 L/day yield sensitivity, recalculated for 214.29 L/day demand:

| Assumed unit yield L/day | Minimum units | Modules with same assumptions | Nominal battery kWh |
| --- | ---: | ---: | ---: |
| 13 | 17 | 50 | 80.38 |
| 10 | 22 | 64 | 104.02 |
| 8 | 27 | 79 | 127.66 |
| 6 | 36 | 105 | 170.22 |

The chat's rounded **50/65/80/105 modules** and **80/105/130/170 kWh** reasonably approximate that simplified sensitivity. They are not probabilities for Alhama weather.

### 16.3 Correct the battery/PV energy boundary before design

If 3 kWh/module/day is net AC energy before storage, and half the 25-unit daily load is supplied directly while half passes through a battery at a **selected 90% round-trip efficiency**, required bus energy is `87 + 87/0.90 = 183.7 kWh/day`. Adding the same 25% margin gives **77 modules**, rather than 73. For six units the corresponding arithmetic gives **19 modules**, and for seven **22**. Do not add losses already included in a quoted system yield a second time.

These remain daily-average estimates. Use the parcel coordinates, orientation, horizon, module choice and actual hourly load in an off-grid simulation; report unmet load, curtailed production and battery-empty events over multiple weather years. [JRC PVGIS manual][S34] No new site-specific PVGIS production run was performed for this report. A 12-hour bridge is not multi-day weather autonomy. The chat's proposed **10–15 kW inverter** for the 25-unit case is a preliminary allowance; actual startup, power factor, simultaneous loads and inverter overload capability need checking, with staggered starts if appropriate.

### 16.4 Storage and watering events

Four support events of 15 L for 100 trees each require **1,500 L/event**. Storage and delivery must handle the event even if mean production is only 54 L/day. Staggering sectors can reduce peak storage/delivery requirements if the field protocol permits it.

The chat's **2,000–3,000 L** tank for the intensive weekly scenario is an event/day buffer. Its later **6,000–10,000 L** tank proposal for the restoration scenario could hold roughly an entire nominal summer budget plus some reserve; it is a design proposal, not a necessary fixed tank size. Size from initial inventory, production timing, delivery schedule, dead volume, losses, outage reserve and backup refill. Water stored through winter for summer is a different design from a small continuously replenished buffer.

## 17. Economics and the rainwater comparator

**A/C — preserve the EPUB chapter 10 example:** 200 mm/year × 10 m² = **2,000 L/year gross rainfall on the collection surface**. A selected runoff/collection factor of 0.80 would give **1,600 L/year**, before any losses excluded by that factor. The 200 mm is a coastal historical climate normal, not this parcel's guaranteed annual rain.

At those illustrative inputs, gross areas to obtain 6,000 / 12,000 / 24,000 L are **30 / 60 / 120 m²**; at 80% collection efficiency, **37.5 / 75 / 150 m²**. Storage, roof suitability, irregular rainfall, first-flush diversion and drought-year reliability remain decisive. A planting basin collects runon into soil rather than producing interchangeable tank water; do not count the same rain twice in both supplies.

At the assumed 0.696 kWh/L, delivering 6 m³ requires **4,176 kWh** of generation-side useful electricity if device energy scales directly with litres; 24 m³ requires **16,704 kWh**. Selected electricity prices of EUR 0.10–0.30/kWh imply **EUR 0.070–0.209/L for electricity alone**, excluding PV, battery, treatment, labour and replacements. These are sensitivity prices, not a tariff quotation. Fixed continuous operation may expend more than this demand-proportional calculation if surplus water is not used.

A complete comparison should annualise the device, PV, inverter, battery, tank, buried works, installation and replacements, and add labour/consumables. Compare the same **reliably delivered seasonal volume** against harvested rain, delivered refill water and available lawful supplies. There is no verified complete installed-system quotation in the chat or EPUB, so no defensible payback or cheapest-option claim follows from the appliance price alone.

## 18. Measurement and validation plan

**A — proposed work, not completed tests.** Start with the EPUB's 5–10 minute logging interval and the recovered chat's one-device summer-week screening, then extend through the critical summer and contrasting weather.

1. Calibrate/check temperature/RH sensors and scale; record location, shade, height, soil depth and instrument uncertainty. Keep timestamps consistent across weather, power and water.
2. Measure true whole-system kWh, runtime/standby, weighed liquid, drainage retention, start/end tank inventory and any applied water. Record zero output explicitly; a full tank or blocked hose is not a zero-moisture climate event.
3. For ground systems, record inlet/outlet air and wall/soil temperatures, flow, pressure drop, fan/pump input, warming during a run and recovery after shutdown. Exclude soil/groundwater ingress from atmospheric yield.
4. For sorption, record dry material/composite mass, uptake mass, released vapour or residual loading, drained water, cycle times, heat-input definition and condenser temperatures. Test leaks/carryover, ageing and fouling over repeated cycles.
5. For dew/fog, separate rain, fog and dew as far as practicable; state collector area and zero-yield exposure. Avoid extrapolating a fog-rich annual mean into the dry season.
6. Build a measured performance map versus simultaneous inlet temperature/RH and operational state. Use weather sequences and storage balance to evaluate reliability, then calculate component sizes.
7. Link delivered water to a defined restoration experiment: comparable stock, site blocks, water delivered per plant/event, soil moisture where useful, emergency intervention, survival and growth through two summers.

Success criteria should be set before a fleet purchase: required delivered volume during the irrigation window, maximum acceptable unmet demand, net litres/kWh, maintainability, water suitability and total cost per established tree. Numerical acceptance thresholds have not yet been supplied by the project and are not invented here.

## 19. Inconsistency and uncertainty register

| Issue | Resolution / status |
| --- | --- |
| 25% system size | Exactly true of the selected 6,000/24,000 L seasonal budgets; equipment and ecological outcomes remain conditional. |
| 25 devices versus 22 | 22 is arithmetic minimum at 10 L/day for 214.29 L/day; 25 includes an implicit production margin. Neither yield is measured locally. |
| 6–7 devices, 18–20 panels, 30 kWh | Six is consistent with ~18/~28.4 in the original simplified model. Seven needs ~21/~33.1; charging losses can raise PV count further. |
| Nameplate 20 L/day versus assumed 10 | With 290 W continuously, specific electricity changes from 0.348 to 0.696 kWh/L. Do not mix the two denominators. |
| Ground model's ~0.06 kWh/L | Fan-only conditional calculation, not experimental proof or a complete cooling-energy comparison. Ground heat rejection is essential. |
| EPUB Yao result | Primary text confirms the reported test and post-shutdown recovery. A measured whole-system kWh/L remains unavailable; the test does not prove continuous seasonal output. |
| Dew deposition versus water harvested | Ecological potential/wetness and engineered drained litres are different; neither 30.5 mm/year nor a favourable dewy-night rate directly sizes summer supply. |
| Balsa Blanca reporting | Different periods/methods give different totals; printed rain/dew percentage arithmetic does not consistently reproduce stated ratios. |
| Fog annual versus summer | Local field data show large seasonal differences; modelled flat screens and measured cylindrical collectors must remain separate. |
| MOF 2.8 L/kg/day headline | Kim 2017 value is a modelled 24 h cycling potential, not measured passive desert production. |
| Yang 2–3 L/m²/day | Small-module field result; continuous automatic high-RH mode differs from manual operation at 40% RH. Generated and drained volumes can differ. |
| Sorbent capacity versus yield | g/g uptake, working swing, cycles/day and collected L/day require separate measurement and denominators. |
| Initial 2–3 L/tree/day target versus restoration | Different irrigation policies; not a measured reduction in biological water need or an efficiency gain. |
| Tiny microrriego doses | Aleppo pine/wild olive trial; cannot be labelled demonstrated carob requirements. |
| 0–24% survival | Overall multi-species/site range; not a carob-only treatment result. |
| SERBAL “before summer” | Caption/narrative timing differs; July visit described in an August report. No carob-specific trial established. |
| Brico DHM12/DHM12L and 20 L/200 W table | Retailer/manual identity and numbers conflict; verify nameplate before selecting a device. |
| Watergen page numbers | L/US-gallon conversion and kW/h notation are internally inconsistent; request a controlled datasheet. |
| Historical prices | Preserve as historical claims; current local stock/prices not confirmed. |
| Missing older chat turns | EPUB recovers a substantial earlier synthesis, but it is not a verbatim complete transcript. Exact earlier concentric dimensions/matrix and any omitted citations remain unavailable. |

## 20. Source register and downloadable documents

The links below distinguish accessible primary evidence, source-reported content and unresolved access. **External linked papers/manuals have not been imported as additional standalone library holdings.** The supplied EPUB and recovered chat excerpt are stored in the companion folder. Existing IRR/FOREST holdings remain at their established paths.

| ID | Source, date and access | Role / limitation |
| --- | --- | --- |
| S01 | [AEMET, Almería Aeropuerto, 1981–2010 climate normals][S01] | Official historical coastal normals; HTML inspected. |
| S02 | [PsychroLib, ASHRAE-based psychrometric implementation][S02] | Open engineering equation reference; not local measurements. |
| S03 | [Maestre-Valero et al., 2011, *Comparative analysis of two polyethylene foil materials for dew harvesting in a semi-arid climate*][S03] | Primary publisher abstract/results inspected. [University manuscript target](https://repositorio.upct.es/server/api/core/bitstreams/b0d05d04-4ac1-49b7-883b-36ee2dc89b8c/content) returned 403; download access unconfirmed. |
| S04 | [Uclés et al., 2010, Balsa Blanca dew conference abstract — direct PDF][S04] | Verified downloadable abstract; wetness/modelled deposition, not tank yield. |
| S05 | [Moro et al., *Dew contribution to the water balance in a semiarid coastal steppe* — institutional PDF][S05] | Verified direct PDF; different period from S04; publication date not independently established. |
| S06 | [Corell et al., 2014, *Captación de agua de niebla en determinados enclaves del sudeste de la Península Ibérica* — direct PDF][S06] | Verified primary conference PDF, especially printed pp. 176 and 180, tables 1–2. |
| S07 | [Haier/Obramat, dehumidifier technical sheet — direct PDF, undated][S07] | Verified one-page manufacturer sheet includes AG20BB1TAA. |
| S08 | [Obramat, 20 L dehumidifier product page][S08] | Retailer page; local current price/stock not established. |
| S09 | [Meaco, 20 L Low Energy manufacturer performance table][S09] | Manufacturer measurements/specifications. [September 2022 official manual PDF](https://cdn.shopify.com/s/files/1/0371/8378/3043/files/English_-_Meaco_12L_Low_Energy_and_20L_Low_Energy_Dehumidifier_September_2022.pdf?v=1663852755) also verified; not Haier performance. |
| S10 | [Kim et al., 2017, *Water harvesting from air with metal-organic frameworks powered by natural sunlight* — Berkeley PDF][S10] | Verified primary paper; experiment versus model separated. |
| S11 | [Song et al., 2023, *MOF water harvester produces water from Death Valley desert air in ambient sunlight* — author-hosted PDF][S11] | Verified primary field-study PDF. [Publisher version](https://www.nature.com/articles/s44221-023-00103-7). |
| S12 | [Gentile et al., 2022, *Liter-scale atmospheric water harvesting for dry climates driven by low temperature solar heat* — author-hosted PDF][S12] | Verified primary PDF; *Energy* 254, 124295. [Original EPUB publisher link](https://www.sciencedirect.com/science/article/pii/S0360544222011987). |
| S13 | [LaPotin et al., 2021, *Dual-Stage Atmospheric Water Harvesting Device for Scalable Solar-Driven Water Production*][S13] | Primary abstract inspected; publisher full text blocked. No verified direct PDF found. |
| S14 | [Li et al., 2018, PAM–CNT–CaCl₂ hydrogel, *Environmental Science & Technology* 52, 11367–11377][S14] | Primary publication / institutional record. [KAUST manuscript target](https://repository.kaust.edu.sa/bitstreams/a74da751-58b5-4159-a213-ab47446cae32/download) returned 403; not a verified download. |
| S15 | [Hoogendoorn et al., 2024, CaCl₂–PAM, *Advanced Functional Materials* 34, 2314680 — institutional PDF][S15] | Verified primary PDF. [Publisher DOI](https://doi.org/10.1002/adfm.202314680). |
| S16 | [Almassad et al., 2022, adaptive MOF harvesting, *Nature Communications* 13, 4873][S16] | Primary indexed passages; full retrieval blocked. Values carry that qualification. [PMC record](https://pmc.ncbi.nlm.nih.gov/articles/PMC9391386/). |
| S17 | [HJM, DHM12L official manual — direct PDF, undated][S17] | Verified 37-page manual, printed p. 2. |
| S18 | [MeacoDry Arete One 10 L, official performance table][S18] | Manufacturer data, not independent field test. |
| S19 | [SOURCE, *What is a Hydropanel?*][S19] | Official indexed claim only; full retrieval returned 402. |
| S20 | [Kumulus, official FAQ][S20] | Opened manufacturer claims; not local measurement. |
| S21 | [Watergen, GEN-M PRO official page][S21] | Opened manufacturer claims with unit/conversion issues. [Linked brochure](https://www.watergen.com/wp-content/uploads/2021/11/GEN-M-Pro-Brochure.pdf) and [technical sheet](https://www.watergen.com/wp-content/uploads/2023/10/Watergen-GEN-M-Pro-Spec.pdf) returned 403; download access unconfirmed. |
| S22 | [MITECO, *Ceratonia siliqua* species chapter in C–E species fiches — direct PDF][S22] | Verified guidance; chapter date not independently established here. |
| S23 | [Junta de Andalucía, chapter 8.2 / Measure 8 annex — direct PDF][S23] | Verified dehesa/agroforestry maintenance/cost context, not a carob trial; edition date not independently established. |
| S24 | [SERBAL, support watering and maintenance, summer 2025; 8 August 2025][S24] | Primary local practice report; timing/species limitations retained. |
| S25 | [MAPA–CSIC, sustainable-irrigation conservation guidelines, October 2023 revision — direct PDF][S25] | Verified §7.1.4, printed pp. 62–63; adaptable general planting guidance. |
| S26 | [Sánchez Sánchez et al., 2004, Almería microrriego, *Cuadernos de la SECF* 17, 109–112][S26] | Original publisher page; trial species are pine/wild olive. |
| S27 | [MITECO, microrriego account, December 2008 — direct PDF][S27] | Verified primary-author/official technical account, pp. 1–2; dose and trial-total context retained. |
| S28 | [Ezzine et al., 20 March 2023, carob irrigation, *Scientific Reports* 13, 4536][S28] | Primary article; [verified direct publisher PDF](https://www.nature.com/articles/s41598-023-31664-y.pdf). Three-year-old Moroccan trees. |
| S29 | [Yao et al., 28 November 2021, *Experimental Investigation of a Novel Extracting Water System from Air by Soil Cold Source*][S29] | Primary text checked. [PDF target](https://onlinelibrary.wiley.com/doi/pdf/10.1155/2021/2740081) retrieval failed; download unconfirmed. |
| S30 | [Yang et al., 2024, *A solar-driven atmospheric water extractor for off-grid freshwater generation and irrigation*][S30] | Primary indexed text/figure details; full-page retrieval blocked. [Exact EPUB PMC link](https://pmc.ncbi.nlm.nih.gov/articles/PMC11269568/); [2025 author-name correction](https://doi.org/10.1038/s41467-025-58181-y). |
| S31 | [Correia et al., CNCFS, May 2017, *Alfarrobeira: Estado da Produção* — direct PDF][S31] | Verified table 5, printed p. 26; orchard allocation, not restoration minimum. |
| S32–33 | [Padilla et al., 2011, *Does shelter enhance early seedling survival in dry environments?*][S32]; [downloadable first-page/abstract extract][S33] | Publisher full text blocked; extract is explicitly incomplete. |
| S34 | [European Commission JRC, PVGIS 5 user manual][S34] | Official hourly/off-grid methodology; no parcel simulation performed here. |
| S35 | [Rao et al., 2022, *Thermodynamic limits of atmospheric water harvesting* — Purdue author record][S35] | Preserves the EPUB reference; theoretical least-work comparison, not device production. [Original DOI](https://doi.org/10.1039/D2EE01071B). Author manuscript download returned 403. |
| S36 | [*Atmospheric water harvesting: A comprehensive review of techniques, innovations, systems, and future prospects*, *Next Energy* 12, July 2026, 100731][S36] | Exact EPUB secondary-review reference preserved. Publisher search-index text confirms identity; no quantitative design assumption here relies on this review. |

The original EPUB bibliography's five URLs are therefore preserved exactly: `https://doi.org/10.1155/2021/2740081`, `https://doi.org/10.1039/D2EE01071B`, `https://www.sciencedirect.com/science/article/pii/S0360544222011987`, `https://pmc.ncbi.nlm.nih.gov/articles/PMC11269568/`, and `https://doi.org/10.1016/j.nxener.2026.100731`.

Rao's theoretical comparison reinforces a boundary used in this report: the least work of extracting water depends on the atmospheric state, recovery and process assumptions. It is a different quantity from condensation latent heat or a complete appliance's kWh/L. Its regional technology niches are modelling results, not parcel-specific field validation.

## Appendix A. Remaining historical chat details and offers

This ledger preserves practical details that should not disappear when the discussion is converted into an engineering report. **H/U:** prices were presented in the chat as online offers dated 15 November 2026; no current local stock or price is certified here.

| Historical offer | Quoted price / rating | Original direct link |
| --- | --- | --- |
| Obramat 10 L | EUR 79; 10 L/day | [Original retailer link](https://www.obramat.es/productos/deshumidificador-10l-para-estancias-hasta-18m2-25030025.html) |
| Obramat 12 L | EUR 99; 12 L/day | [Original retailer link](https://www.obramat.es/productos/deshumificador-12l-para-estancias-hasta-20m2-25066088.html) |
| Obramat Haier 16 L | EUR 100; 16 L/day | [Original retailer link](https://www.obramat.es/productos/deshumidificador-16l-para-estancias-hasta-25m2-25072097.html) |
| Obramat Haier 20 L | EUR 129; 20 L/day | [Original retailer link][S08] |
| Brico Depôt Bora 12 L | EUR 110.16; 12 L/day; quoted 240 W | [Original retailer link](https://www.bricodepot.es/f-acula-deshumidificador-bora-12l-modo-inteligente-temporizador-1-24h-8436536350692) |
| Brico Depôt HJM DHM12 | Quoted 210 W and 6 L/day at 27°C/60% | [Original retailer link](https://www.bricodepot.es/deshumidificador-dhm12-12-l-d-ia-2-2-l-dep-osito-210w-hjm-5adf9e15); manual/listing caveats in section 14. |

The initial recommendation favoured the 16 L Haier because its quoted price was EUR 21 above the 10 L unit; it explicitly warned that larger nominal capacity does not prove better litres/kWh. Required purchase checks were continuous drain, sustained operation, automatic restart and acceptable summer temperature range. These remain reasonable comparison criteria, while the price recommendation is historical.

Other recovered estimates, retained as **A/H** rather than measurements:

- For a cheap 10–12 L unit at constant 24-hour conditions: **5–8 L/day at 30°C/60% RH**, **3–5 L/day at 20°C/60%**, and much lower/possibly uneconomic output at **30°C/30–40%**. They were extrapolated from another manufacturer's table, not measured Obramat data.
- Estimated water per 1 kWh: **1.5–2 L warm/very humid**, **0.8–1.5 L warm/moderately humid**, **0–0.7 L hot/relatively dry**. These broad illustrative bands are not mutually complete climate definitions or validated performance curves.
- HJM six-hour illustration: `210 W × 6 h = 1.26 kWh`; proportionally **1.5 L** from the quoted 6 L/day state; same-state/constant-power assumptions apply.
- One square metre of PV was earlier assumed to supply approximately **1 useful kWh/summer day**; the resulting **~1–2 L/day** comparison against a DIY sorber is conditional, not a demonstrated areal productivity.
- The original intensive 100-tree case used **1,500 L/week** and proposed a tank of at least **2,000–3,000 L**. A later **6,000–10,000 L** tank served the revised seasonal strategy. Both storage suggestions require a time-resolved water balance.
- The original proposal to run one appliance for a summer week with an energy meter, temperature/RH logger and scale is a screening experiment. The report extends it to seasonal reliability and field-establishment outcomes.
- The EPUB's Morocco fog figure **1.5–6 L/m²/day** lacks a source-to-number mapping in its five-item bibliography. It remains an attributed historical range for fog-rich settings, not verified Alhama evidence. Its favourable dew-night “several tenths L/m²” likewise is not an all-day/year average.

## Appendix B. Preserved historical citation identifiers

These are the exact identifiers visible in the recovered chat. They are retained for provenance only; they cannot be resolved as ordinary publication URLs. Fresh verifications in section 20 do not prove a one-to-one mapping to these original results. Original raw messages and widget/citation markup are in the companion JSON, preserving details that were not rendered as ordinary text.

| Original assistant message / subject | Citation identifiers, in original appearance order |
| --- | --- |
| `dbf4b2f4-08d4-416e-a0f4-b5248c497b94` — inexpensive dehumidifiers | `turn683713view0`, `turn436062view1`, `turn436062view2`, `turn683713view2`, `turn101535search0`, `turn159753search39`, `turn873050search1` |
| `ecda7613-1be5-47fc-9104-a1f6a5c39c4a` — early carob irrigation | `turn459134view0`, `turn385481search9`, `turn459134search21`, `turn459134view2` |
| `69e7251c-7cd2-4a1e-98c1-d18da7dfc5f2` — 100-tree PV/battery sizing | `turn992399view0`, `turn678436search2`, `turn992399search0`, `turn678436search7`, `turn678436search5` |
| `b190afe9-c324-45c4-bc11-5e1728625097` — restoration versus orchard | `turn779388search9`, `turn779388search8`, `turn779388search3`, `turn779388search0`, `turn779388search5`, `turn640020search52`, `turn779388search1`, `turn779388search2`, `turn855717view0`, `turn779388search7` |
| `95aa2ebd-3d35-4373-b2ea-9ffec5620b58` — 25% resizing | No new source citation identifiers appeared. |

Image-query/source markers and interactive widget markup are retained in the raw excerpt but are not scientific evidence. Some old sliders did not retain visible current values; no missing slider setting has been invented.

## Appendix C. EPUB chapter coverage and English glossary

| EPUB chapter | English subject | Incorporated here |
| --- | --- | --- |
| 1 | Why atmospheric water; four process groups | Sections 2, 5–9 |
| 2 | Dew point and three air-state examples | Sections 4 and 13.1 |
| 3 | Fog nets, dew plates and local deposition | Sections 6 and Appendix A |
| 4 | Underground channel, soil experiment and limits | Sections 5 and 13.2 |
| 5 | Compressor/Peltier cooling and electricity | Sections 7 and 13.4 |
| 6 | Silica gel, salts, MOFs and solar sorption | Sections 8–10 and 13.5 |
| 7 | Seasonality and operating hour | Sections 3 and 13.1 |
| 8 | Small ground and 300 Wp PV models | Section 13.3 |
| 9 | Logging, prototypes, fabrication and quality | Sections 12, 13.6 and 18 |
| 10 | Recommendations, rainwater and hybrid idea | Sections 13.6 and 17 |
| 11 | Five original literature links | Section 20, preserved exactly |
| 12 | Glossary | English definitions below |

| Term | Meaning |
| --- | --- |
| Absolute humidity | Water-vapour mass per air volume, usually g/m³. |
| Humidity ratio | Water-vapour mass per dry-air mass, kg/kg; distinct from g/m³. |
| Relative humidity | Vapour pressure divided by saturation vapour pressure at the same temperature. |
| Dew point | Temperature at which the current vapour pressure is saturated. |
| Condensation | Vapour becoming liquid and releasing heat. |
| Sorption | Uptake at a surface or within a material, encompassing adsorption/absorption. |
| Regeneration | Releasing captured water from a loaded sorbent, commonly using heat. |
| Working capacity | Useful cyclic water-loading difference at the actual operating endpoints. |
| Specific energy | Energy per collected litre, explicitly electrical or thermal. |
| Heat sink | A system or environment accepting rejected heat. |
| kWp | PV rated peak power under standard test conditions; not daily energy. |
| Establishment water | Supplementary water for the defined early planting period; not mature-tree crop demand. |

## Appendix D. Delivery and verification record

This report was written directly into the accessible `algarrobos/doc_library/` folder in English. The original German EPUB was copied without modification and hash-matched. Its text, all chapters, navigation, four diagrams and cover were inspected. The five exposed chat exchanges are archived with their original citation markup. Calculations were independently recomputed; local links, reference definitions, table structure, original-EPUB link preservation and companion integrity were checked. No prototype, irrigation trial, water-quality analysis or parcel-specific PVGIS run was performed. This document has not been adopted into simulator rules or registered ecological evidence.

Remaining completeness limit: the older conversation transcript itself was not exposed, so exact content absent from both the recovered exchanges and supplied EPUB cannot be certified as reproduced. In particular, original concentric-device dimensions and the earlier morphological matrix, if any, are not available; the reconstructed engineering treatment is identified as such.

[S01]: https://www.aemet.es/es/serviciosclimaticos/datosclimatologicos/valoresclimatologicos?k=val&l=6325O
[S02]: https://psychrometrics.github.io/psychrolib/_modules/psychrolib.html
[S03]: https://www.sciencedirect.com/science/article/pii/S0022169411006470
[S04]: https://meetingorganizer.copernicus.org/FOGDEW2010/FOGDEW2010-85.pdf
[S05]: https://digitum.um.es/digitum/bitstream/10201/97801/1/Dew%20contribution%20to%20the%20water%20balance%20in%20a%20semiarid%20coastal%20steppe%20....pdf
[S06]: https://aeclim.org/wp-content/uploads/2016/02/0017_PU-SA-IX-2014-D_CORELL.pdf
[S07]: https://www.obramat.es/pub/media/catalog/product/a/3/f/a/deshumidificador_l_para_estancias_hasta_m_25072097_techsheetsup.pdf
[S08]: https://www.obramat.es/productos/deshumificador-20l-para-estancias-hasta-30m2-25072098.html
[S09]: https://www.meaco.com/products/meaco-20l-low-energy-dehumidifier-and-air-purifier?country=GB
[S10]: https://globalscience.berkeley.edu/sites/default/files/waterharvesting.pdf
[S11]: https://yaghi.berkeley.edu/pdfPublications/23MOFwaterdevice.pdf
[S12]: https://bpb-us-e1.wpmucdn.com/websites.uta.edu/dist/8/4951/files/2022/06/2022-Bozlar-Energy.pdf
[S13]: https://www.sciencedirect.com/science/article/pii/S254243512030444X
[S14]: https://pubs.acs.org/doi/10.1021/acs.est.8b02852
[S15]: https://edoc.hu-berlin.de/server/api/core/bitstreams/c50b6bcd-f75c-403c-b040-8ced8b2b110e/content
[S16]: https://www.nature.com/articles/s41467-022-32642-0
[S17]: https://hjm.es/wp-content/uploads/Manual-Deshumidificador-DHM-12L.pdf
[S18]: https://www.meaco.com/products/meacodryarete1-10l
[S19]: https://source.co/pages/what-is-a-hydropanel-1
[S20]: https://www.kumuluswater.com/fr/faq
[S21]: https://www.watergen.com/commercial/gen-m/
[S22]: https://www.miteco.gob.es/content/dam/miteco/es/parques-nacionales-oapn/publicaciones/Semillas%20-%20Fichas%20de%20especies%20C-E_tcm30-100337.pdf
[S23]: https://juntadeandalucia.es/export/drupaljda/Anexo%20Capitulo%208.2%20Medida%208_NUEVO.pdf
[S24]: https://serbal-almeria.org/noticias/446-riegos-de-apoyo-y-labores-de-mantenimiento-claves-para-el-exito-de-las-repoblaciones-forestales-verano-2025
[S25]: https://preservicio.mapama.gob.es/es/desarrollo-rural/temas/gestion-sostenible-regadios/directrices3y4_actualizada_oct23_tcm30-673192.pdf
[S26]: https://secforestales.org/publicaciones/index.php/cuadernos_secf/article/view/9407
[S27]: https://www.miteco.gob.es/content/dam/miteco/es/biodiversidad/temas/desertificacion-restauracion/0904712280144daf_tcm30-152695.pdf
[S28]: https://www.nature.com/articles/s41598-023-31664-y
[S29]: https://onlinelibrary.wiley.com/doi/10.1155/2021/2740081
[S30]: https://www.nature.com/articles/s41467-024-50715-0
[S31]: https://cncfs.pt/sites/default/files/documentos/2024-04/alfarrobeiraproducao.pdf
[S32]: https://onlinelibrary.wiley.com/doi/10.1111/j.1654-109X.2010.01094.x
[S33]: https://rngr.net/publications/fnn/2011-summer/new-nursery-literature/does-shelter-enhance-early-seedling-survival-in/at_download/file
[S34]: https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/pvgis-5-user-manual_en
[S35]: https://docs.lib.purdue.edu/mepubs/65/
[S36]: https://doi.org/10.1016/j.nxener.2026.100731


