# Dryland ecological recovery prediction

## Scientific basis, Almería application and an engineering implementation roadmap

**Prepared:** 3 November 2026  
**Scope:** Ecological, natural-regeneration and forest-recovery prediction in drylands, with particular attention to semi-arid southeastern Spain.  
**Evidence boundary:** Synthesis of the referenced ChatGPT conversation and recoverable earlier project discussions and project-authored notes. No new web research, paper retrieval or environmental-data download was undertaken.

## Reading this document

The central task is to predict **which ecological functions and communities can recover, where, over what period, under which management and water constraints, and with what uncertainty**. Predicting tree cover alone answers only a narrow part of that question.

This document uses four evidence labels:

| Label | Meaning |
|---|---|
| **Earlier reported finding** | A result described in an earlier conversation or project synthesis. The original study was not independently checked for this document. |
| **Ecological interpretation** | A conceptual explanation connecting the recovered material. It is not a newly verified study result or a calibrated site prediction. |
| **Proposed method** | A modeling, monitoring, experimental or software design recommendation developed from those concepts. |
| **Unresolved** | A question for which the recovered material does not justify an answer, threshold or numerical parameter. |

**All modeling equations, system designs, monitoring schedules and roadmap stages below are proposed methods unless explicitly identified otherwise.** All application-specific ecological conclusions are interpretations or hypotheses unless tied to a reported finding. This distinction is especially important for water memory, long-term forecasts and intervention effects.

The source ledger in [Section 20](#20-source-ledger-and-retrieval-limits) distinguishes recoverable links from incomplete references. External links are copied from earlier material, with tracking parameters removed where unnecessary. They were not opened or verified for this task. A working-looking DOI or URL does not independently authenticate the earlier assistant's description.

## Contents

1. [What recovery prediction means](#1-what-recovery-prediction-means)
2. [Prediction targets and decision contracts](#2-prediction-targets-and-decision-contracts)
3. [Ecological mechanisms and limits](#3-ecological-mechanisms-and-limits)
4. [Water memory and hydrological state](#4-water-memory-and-hydrological-state)
5. [Almería and semi-arid Spanish application](#5-almería-and-semi-arid-spanish-application)
6. [Natural regeneration, assistance and planting](#6-natural-regeneration-assistance-and-planting)
7. [Species, provenance, stock and survival](#7-species-provenance-stock-and-survival)
8. [Temporal and spatial scales](#8-temporal-and-spatial-scales)
9. [Field, sensor, GIS and remote-sensing inputs](#9-field-sensor-gis-and-remote-sensing-inputs)
10. [Modeling strategies](#10-modeling-strategies)
11. [Uncertainty and limits of inference](#11-uncertainty-and-limits-of-inference)
12. [Causal evaluation of interventions](#12-causal-evaluation-of-interventions)
13. [Validation and forecast evaluation](#13-validation-and-forecast-evaluation)
14. [Monitoring and adaptive management](#14-monitoring-and-adaptive-management)
15. [Practical system architecture](#15-practical-system-architecture)
16. [Phased implementation roadmap](#16-phased-implementation-roadmap)
17. [Portfolio and career development](#17-portfolio-and-career-development)
18. [Future scientific and technology directions](#18-future-scientific-and-technology-directions)
19. [Immediate decisions and unresolved questions](#19-immediate-decisions-and-unresolved-questions)
20. [Source ledger and retrieval limits](#20-source-ledger-and-retrieval-limits)

## 1. What recovery prediction means

Recovery prediction estimates a future ecological state or trajectory conditional on an initial state, environmental history, future forcing and management. A useful conceptual formulation is:

~~~text
Future ecosystem state
    depends on present state and ecological legacies,
    incoming weather and disturbance,
    management and resource inputs,
    ecological processes,
    and chance.

Observations are incomplete measurements of that state.
~~~

“Dryland restoration,” “natural recovery” and “forest recovery” overlap, but they imply different scopes:

- **Dryland ecological recovery** concerns water-limited systems and can include soils, shrublands, grasslands, open woodland and ecological processes.
- **Natural recovery** concerns changes generated through surviving organisms, resprouting, seed banks, dispersal and establishment, potentially after disturbance is reduced.
- **Forest recovery** concerns a forest or woodland reference and associated structure, composition and processes. The objective must first be justified for the site.
- **Restoration outcome prediction** asks what is likely after a specified intervention.
- **Restoration impact estimation** asks how outcomes differ because of that intervention relative to a counterfactual.

A green satellite pixel, a living planted tree and a self-replacing ecological community are different outcomes. A system can improve in one respect while declining in another. More woody cover might conflict with a locally appropriate open-habitat objective; better seedling survival may depend on continuing external irrigation.

### 1.1 Recovery needs an explicit reference

Recovery is always relative to something: a pre-disturbance condition, a nearby ecological reference, a desired functional state or a negotiated management objective. The reference should specify composition, structure, function and acceptable human use.

For the project discussed here, an appropriate starting question is:

> Can this parcel develop a more persistent and ecologically appropriate vegetation–soil mosaic, with natural recruitment and acceptable erosion, under a bounded external-water and maintenance budget?

That is more informative than asking how many trees will be present in 30 years. The reference may include existing native scrub and open ground. Historical vegetation and vegetation-series maps can inform it, but neither establishes an inevitable future endpoint under changed climate and land use.

### 1.2 Forecasts, scenarios and suitability maps

| Product | Question answered | Critical limitation |
|---|---|---|
| State estimate | What condition is the site in now? | Depends on observation error and coverage. |
| Suitability map | Where do conditions resemble those associated with a species or process? | Does not directly predict establishment or recovery time. |
| Conditional forecast | What will happen over a defined horizon under specified assumptions? | Requires evaluation against subsequent observations. |
| Scenario | What could happen if a climate, management or process assumption holds? | A plausible trajectory is not a validated forecast. |
| Intervention-effect estimate | How would the outcome differ between defined management alternatives? | Requires causal identification assumptions or experimental evidence. |
| Decision recommendation | Which action best meets stated objectives and constraints? | Depends on values, costs, evidence and risk tolerance as well as prediction. |

The existing restoration simulator brief explicitly describes a placeholder planning experience, rather than validated ecology [P4]. Its timelines and configured outcomes must not become training labels or evidence that recovery follows that schedule.

## 2. Prediction targets and decision contracts

Before selecting a model, define the response variable, unit, horizon, management regime, observation protocol and intended decision.

### 2.1 A multi-dimensional target set

| Dimension | Possible target | What it does not establish |
|---|---|---|
| Planted survival | Probability an original plant remains alive to a specified dry season or date | Reproduction, healthy growth or independence from irrigation |
| Natural recruitment | New naturally established individuals per surveyed area and interval, followed by cohort persistence | Germination alone is not successful recruitment into an enduring population |
| Growth and structure | Collar diameter, canopy dimensions, cover or structural distribution | Biomass or carbon without an appropriate measurement model |
| Composition | Native functional groups, species presence, dominance and turnover | Richness alone is not habitat quality |
| Soil stability | Bare-ground connectivity, erosion observations and sediment export at a defined scale | A vegetation index is not measured soil retention |
| Water performance | External water used, root-zone moisture, stress and survival under a stated policy | Captured runoff is not additional catchment water |
| Resistance | Magnitude of ecological change during drought, browsing or fire | A single post-event observation does not describe recovery |
| Recovery after disturbance | Time or trajectory toward a declared functional or structural reference | Returning canopy volume need not restore composition or function |
| Persistence and resilience | Probability of retaining or regaining an acceptable state under repeated disturbance | Permanent stability or immunity to future climate |
| Self-replacement | Survival, reproduction and persistence of subsequent natural cohorts | Surviving planted adults alone |

Avoid collapsing these into an unexplained “restoration success score.” If a combined decision score is useful, retain the component outcomes, weight choices and tradeoffs.

### 2.2 Example forecast contract

**Illustrative contract, not a claim about an existing dataset:**

- **Unit:** an individually identified planted seedling within a surveyed microsite and treatment block.
- **Prediction time:** immediately after installation, using only information available then.
- **Target:** probability of being alive after the second dry season under a defined establishment and rescue-water policy.
- **Inputs:** species, stock batch and provenance, initial dimensions, root condition, measured soil profile, exposure, existing cover, protection, treatment and climate scenario.
- **Output:** calibrated probability or probability range, uncertainty, data-quality flags and applicability warning.
- **Decision:** compare planting stations or select a small trial; do not use an unvalidated probability to justify parcel-wide planting.

A separate forecast made after the first summer can use first-summer observations. Mixing those observations into an installation-time model would leak future information.

### 2.3 Recruitment needs a sequence of targets

Natural regeneration can fail at several transitions:

~~~text
Propagule source → arrival → germination or resprouting
    → survival through stress → persistent juvenile
    → reproductive adult → further recruitment
~~~

Map and measure the transition relevant to the decision. Nearby woodland may improve propagule availability, but distance alone does not measure viable seed arrival. A seedling flush after rainfall can disappear before the next survey. Resprouts should be distinguished from newly germinated individuals and counted consistently.

## 3. Ecological mechanisms and limits

### 3.1 Environmental filtering and ecological legacies

**Ecological interpretation.** Recovery depends on which organisms and processes remain possible after filtering by moisture, temperature, substrate, rooting space, disturbance and species availability. Land-use history affects soil structure, seed banks, nutrient patterns and connectivity.

Two abandoned parcels with similar present cover may therefore have different trajectories. One may contain viable root systems and nearby seed sources; another may have compacted subsoil, active erosion and little propagule input. “Abandoned land” is a land-use description, not a diagnosis of ecological potential.

An earlier Portuguese study summary associated faster woodland recovery with moister sites, north-facing slopes and proximity to surviving woodland [E1]. These associations motivate local hypotheses. They do not establish causal effect sizes or a universal recovery clock for Almería.

### 3.2 Water limitation is a chain of constraints

Rain must reach the parcel, infiltrate or arrive as runon, enter accessible soil, remain available through dry periods and be reached by functioning roots. Atmospheric demand and plant traits affect how quickly that supply becomes limiting.

Annual rainfall alone misses timing, intensity, dry-spell duration and carryover. A sequence of small events may wet only the surface; an intense event may export sediment and water. The consequences depend on soil and terrain.

Young nursery plants initially occupy a small rooting volume. Established shrubs on the same hillside do not demonstrate that newly installed trees can access the same water. Existing drought-adapted biomass is useful evidence of persistence under current conditions, not proof of unoccupied water available for additional trees.

### 3.3 Soil erosion and feedbacks

**Ecological interpretation.** Loss of fine soil can reduce infiltration, rooting volume and establishment opportunity. Connected bare patches can route water and sediment away from vegetation. Existing cover, stones and surface structure can influence those pathways.

Possible feedback:

~~~text
Cover loss → altered runoff and soil loss → poorer establishment
    → continued low cover
~~~

This is a mechanism to investigate, not proof of a threshold or an irreversible alternative state on the project parcel. Demonstrating thresholds, hysteresis or state change requires suitable observations or experiments; a smooth vegetation-index trend cannot establish them.

The earlier Spanish post-fire summary reported no statistically significant treatment differences in the main measured soil properties after five years, in a small experiment [E6]. That does not show that treatments never reduced early erosion. The measured endpoint, timing and precision must match the question.

For implementation, distinguish susceptibility maps, measured erosion and predicted treatment effects. A RUSLE-style screening layer can organize questions about hillslope sheet/rill erosion; it should not be presented as a complete model of gullies, sediment delivery, deposition or event-scale rambla behavior.

### 3.4 Grazing and browsing

Grazing is not a single yes/no exposure. Relevant variables include animal type, density, residence time, season, access routes, palatability, trampling and browsing height. Wildlife and livestock may create different pressures.

The earlier southeastern Spanish mountain-grassland summary described relationships between grazing intensity, greening and climate sensitivity, without significant browning in its study area [E3]. This is evidence against automatically equating all grazing with progressive degradation. It is not a controlled estimate that exclusion will increase tree recruitment on this parcel.

**Proposed method:** record actual damage and access, and compare justified protection or grazing-management alternatives. Where fencing is assigned to whole patches, those patches are the experimental units; many plants inside one enclosure do not provide many independent fencing replicates.

Exclusion can change competition and habitat structure as well as browsing. Evaluate the reference ecosystem and multiple outcomes before calling a treatment beneficial.

### 3.5 Facilitation and competition

Existing shrubs can alter radiation, temperature, wind, browsing exposure, litter and soil conditions. They can also compete for water and nutrients. These mechanisms can operate together.

Earlier discussions reported context-dependent nurse-shrub effects under drought and grazing, and differences between soil beneath Salsola and nearby gaps [E7, P1]. Neither statement proves that planting under every shrub improves survival.

**Proposed method:** distinguish beneath-canopy, canopy-edge and open microsites; record nurse identity and size, receiving plant identity, soil and browsing. Compare treatments within suitable blocks. An under-shrub versus open comparison without randomization or careful matching can confound facilitation with pre-existing soil differences.

### 3.6 Disturbance, resistance and recovery

The earlier southeastern Spanish fire study summary described species-specific recovery over roughly a decade, including resprouting and recovery beyond estimated pre-fire biovolume in some species [E5]. This concerns the studied species and disturbance histories.

Resprouting adults and planted seedlings have different capacities. Recovery after one fire does not establish resilience to repeated fire, drought and browsing. Estimated pre-fire size adds reconstruction uncertainty, and biovolume is a structural proxy rather than a complete measure of ecosystem function.

## 4. Water memory and hydrological state

### 4.1 A precise working definition

**Ecological interpretation; no dedicated water-memory study was recovered.** Water memory means that current plant condition or ecosystem response depends on antecedent moisture and related ecological states, not only today's rainfall.

Distinguish:

1. **Physical storage:** water retained in soil layers or weathered/fractured material, where accessible.
2. **Root-zone development:** past moisture influences root growth and which storage can subsequently be used.
3. **Biological legacy:** earlier drought or growth can alter leaf area, reserves, damage and future response.
4. **Community legacy:** past wet periods can establish cohorts whose effects persist into later dry years.
5. **Catchment and groundwater carryover:** slower storage and recharge may matter in connected settings, but access by a particular plant must be demonstrated.

These are distinct mechanisms, not interchangeable names for a lagged rainfall variable. Different mechanisms can produce similar delayed greenness.

### 4.2 A minimal water balance

For a consistently defined root-zone control volume:

~~~text
Storage_next =
    Storage_now
    + infiltrated rainfall
    + infiltrated runon and irrigation
    + upward or lateral subsurface input
    - evaporation
    - transpiration
    - drainage and lateral loss.
~~~

Use one unit system, such as water-depth equivalent over a stated area. If starting from gross rainfall or gross runon, represent interception, bypass and surface export explicitly; do not subtract them again from inputs already defined as infiltrated.

A single bucket is a screening abstraction. Layered soil, preferential flow, bedrock fractures, changing rooting depth and salinity can require a different representation. Soil moisture percentage is not automatically plant-available water: sensor calibration, texture and water potential matter.

An excavation's soil volume is not its water-storage capacity. Earlier project notes explicitly distinguished preparation depth, planting depth and connected rooting volume [P3]. Enlarging a hole helps only if usable, hydraulically connected soil and root access result.

### 4.3 Modeling memory without inventing it

Candidate predictors include:

- antecedent rainfall and climatic water-balance summaries over biologically plausible windows;
- time since effective wetting, consecutive dry days and event intensity where measured;
- observed soil moisture by relevant layer;
- antecedent plant condition, prior drought exposure and cumulative irrigation;
- seasonality, soil profile and rooting-stage interactions.

Short, medium and longer windows can be explored, but no universal “memory duration” was established in the recovered discussion. Select windows within training folds, evaluate collinearity and compare with a simple seasonal baseline.

**Testable hypothesis:** measured antecedent root-zone state improves out-of-time forecasts beyond current weather and season alone. Success requires better held-out predictions, not merely a statistically significant lag coefficient.

State-space models offer a more explicit separation:

~~~text
Ecological state_next = process(state_now, weather, treatment) + process error
Observed measurement = observation_model(state) + measurement error
~~~

Such models can combine latent storage, plant condition and imperfect observations. Their parameters may be weakly identifiable; extra complexity should follow data that can constrain it.

### 4.4 Local water distinctions from earlier discussion

The Alhama climate discussion repeatedly separated local rainfall, mountain rainfall, streamflow, reservoir storage and groundwater observations [P2]. It also identified stale measurements and missing matched rainfall/ET data.

The transferable lesson is methodological: a regional reservoir percentage does not measure a seedling's root-zone water, and mountain rainfall does not establish recharge beneath a parcel. This document does not update or repeat those historical readings as current conditions.

## 5. Almería and semi-arid Spanish application

### 5.1 Diagnose the actual site

The earlier project discussions concern Alhama/Andarax and a neighboring Salsola-dominated parcel. The earlier Salsola conversation described abundant vegetation growing without irrigation and a desire to explore renaturalization [P1]. These are user-reported observations. They are not a botanical survey, a quantified biomass-production record or a water balance.

An Almería application must separate lowland and mountain conditions, exposed slopes and sheltered pockets, different substrates, watercourses and uplands, and disturbed agricultural ground from existing habitat. Regional labels alone cannot resolve those differences.

**Proposed baseline questions:**

1. Which existing vegetation is native, persistent, recruiting or ecologically valuable?
2. What is the effective rooting depth, lateral rooting opportunity and substrate?
3. Where does water originate, infiltrate, concentrate and leave during actual events?
4. Is salinity a measured limitation, rather than inferred from a plant name?
5. What is the browsing/trampling regime?
6. Which nearby communities are credible references under comparable terrain and water conditions?
7. What maintenance and external-water commitment is feasible?

No annual rainfall cutoff, tree density, irrigation dose or expected survival percentage for this parcel is justified by the recovered evidence.

### 5.2 Salsola as a concrete decision case

The earlier photo-based identification leaned toward **Salsola oppositifolia**, with alternatives remaining. The application catalogue and planting review also contain **Salsola webbii** [P1, P5]. These records are not equivalent identifications.

Preserve the distinction between:

- the actual plant on the neighboring parcel;
- a named catalogue species;
- species used in an external experiment;
- a vernacular name used in conversation.

The earlier Salsola summary reported Almería work supporting investigation of existing shrubs and their microsites, but its underlying paper links and figure data were not exposed in the retrieved text [P1]. Do not reconstruct effect sizes or bibliographic details from that summary.

**Proposed sequence:** verify identity and habitat → map retained vegetation and soil/runoff patterns → observe natural recruitment → select one interpretable comparison → monitor through dry seasons.

Selective surface mulching, under-edge planting or limited runoff capture are hypotheses to compare where appropriate. Wholesale shredding and burial of Salsola was not established as a validated restoration treatment. Retaining existing cover should be a genuine comparator, with outcomes measured on the same basis as planted areas.

### 5.3 An appropriate vegetation mosaic

Earlier project notes distinguish carob and native shrub mosaics, very arid scrub, seasonal-watercourse vegetation and conditional oak components [P5, P6]. They also caution that vegetation series are contextual ecological frameworks, not fixed planting recipes.

Examples discussed include carob, wild olive, lentisk, retama, esparto, Ziziphus and dryland oaks. This is a candidate vocabulary, not a parcel recommendation. Watercourse species should not be assigned to dry uplands solely because they occur in an Almería catalogue.

Species occurrence under low rainfall does not demonstrate establishment of purchased stock without support water. Regional ecological presence, procurement availability, habitat suitability and experimentally demonstrated treatment response are separate evidence classes.

## 6. Natural regeneration, assistance and planting

### 6.1 A continuum of interventions

| Strategy | Principal mechanism | Conditions to investigate | Main evidence risk |
|---|---|---|---|
| Passive recovery | Existing processes continue after disturbance reduction or cessation | Propagules, resprouts, substrate and tolerable disturbance | Calling lack of intervention a guaranteed recovery pathway |
| Assisted natural regeneration (ANR) | Remove a diagnosed barrier to existing or incoming regeneration | Browse damage, disturbance, local competition or erosion bottleneck | Applying assistance where that barrier is absent |
| Enrichment or nucleation planting | Add missing species or establish limited patches | Missing propagules, suitable microsites and a justified community objective | Measuring installed plants while ignoring retained vegetation |
| More extensive planting | Install a larger vegetation component | Strong establishment basis, resources and ecological justification | High costs, persistent water dependency and damage to existing cover |
| Physical stabilization first | Address active substrate loss or unstable ground | Ongoing erosion or landform constraints | Assuming engineering completion proves ecological recovery |

ANR is not simply “do nothing,” and planting is not the only active restoration option. Protection of naturally recruiting individuals may be ANR; installing new individuals is planting, even when arranged within existing scrub.

### 6.2 Ask which bottleneck is limiting

If seedlings appear and are repeatedly browsed, protection may be relevant. If seeds do not arrive, fencing alone may achieve little. If all seedlings die despite arrival and protection, rooting conditions and water stress may be more limiting. If an open scrub reference is already functioning, increasing tree density may not address a restoration deficit.

These are diagnostic hypotheses. They require observation rather than automatic decision rules based on cover or proximity alone.

### 6.3 Compare strategies on compatible units

A planted cohort and an unplanted control cannot be compared solely by “percentage of planted trees surviving,” because the control contains no planted cohort. Use plot-level outcomes across strategies:

- retained native cover and composition;
- persistent recruits, separated by natural versus planted origin;
- soil stability and connected bare ground;
- external water, labor and cost per managed area;
- progress toward the declared reference;
- reproduction and subsequent recruitment when observable.

Individual survival remains essential within the planting arm. Report it alongside whole-plot outcomes.

## 7. Species, provenance, stock and survival

### 7.1 Separate four selection problems

1. **Species/community fit:** Is the organism appropriate to the ecological objective and site?
2. **Provenance fit:** Which population or source material is appropriate, considering present and plausible future conditions?
3. **Stock quality:** Are roots, health, container history and plant condition suitable for installation?
4. **Microsite and establishment fit:** Can the actual plant establish under the defined treatment and water policy?

Earlier Iberian modeling combined climate suitability and genetic groups [E2]. Genetic structure is not itself proof of adaptive advantage. Occurrence suitability also cannot resolve nursery damage, soil depth or the best planting position.

Treat future-climate provenance choices as a risk-managed experimental question, not an assurance that material from a warmer place will outperform local material. The recovered discussion does not establish an optimal seed-transfer strategy.

### 7.2 Model survival as an event process

Earlier reporting of a long Mediterranean-climate restoration experiment emphasized substantial mortality and species differences over 12 years [E4]. Its mortality fraction is not an Almería prior to copy directly.

Useful analysis distinguishes:

- mortality time or the interval in which death occurred;
- right-censoring when a living individual reaches the end of observation;
- missed visits or lost individuals, which are not automatically deaths;
- uncertain dormancy/dieback versus confirmed mortality;
- replacement plants, which start new records.

A discrete-time hazard model may fit seasonal censuses well:

~~~text
h(i,t) = P(death in interval t | alive at start of interval t, recorded history)
S(i,T) = product over intervals t≤T of [1 - h(i,t)]
~~~

These conditional hazards must refer to a coherent trajectory and policy. Multiplying unrelated cross-sectional probabilities is not survival analysis.

Start with survival curves and a small, interpretable model. Check proportional-hazards assumptions if using Cox regression; consider interval-censored or discrete-time approaches when exact event dates are unavailable. Include site or block structure where supported.

### 7.3 Water policy is part of the treatment

“No routine irrigation, with specified rescue watering” differs from “zero external water.” Record every application and its trigger.

Under an equal-water comparison, treatments receive the same external allocation. Under an equal-rescue-rule comparison, treatments may use different amounts. Both can be useful, but they estimate different outcomes [P3, P6].

Growth only among survivors can also mislead. A treatment that kills vulnerable plants may leave a fast-growing survivor subset. Report survival and growth jointly, retain the original cohort denominator and examine selective loss before declaring a treatment superior.

## 8. Temporal and spatial scales

### 8.1 Time is part of the ecological question

| Horizon | Suitable questions | Main limitation |
|---|---|---|
| Event to weeks | Wetting, runoff, erosion, heat stress and sensor response | Sparse event observations can miss critical processes |
| Seasons to early years | Establishment, mortality, browsing, recruitment pulses | Strong sensitivity to particular weather sequences |
| Multiple years | Cohort persistence, canopy development, maintenance dependence | Short records may exclude severe stress years |
| Decades | Community change, reproduction, woodland structure and repeated disturbance | Increasing climate, management and process uncertainty |

These are operational categories, not fixed biological deadlines. The earlier Portuguese woodland time estimate came from a wetter setting and should not be transferred to Almería [E1]. Slow woody development is not automatically failure if the appropriate reference is a persistent shrub–grass mosaic.

Near-term forecasts can be tested relatively soon. Multi-decade outputs should usually be conditional scenarios until supported by suitably long and transferable evidence.

### 8.2 Spatial support matters

A sensor samples a small soil volume; a seedling occupies a microsite; a plot contains multiple plants; a satellite pixel mixes surfaces; a catchment redistributes water and sediment.

Do not treat resampled data as new information. A coarse soil prediction interpolated to small pixels remains a coarse prediction. A fine terrain model may describe microtopography while climate forcing remains spatially uncertain.

**Proposed hierarchy:** landscape screening → parcel diagnosis → microsite trial → monitored plant/plot forecasts → cautious aggregation. Aggregation should carry uncertainty and account for spatial dependence rather than multiplying a parcel average across a region.

## 9. Field, sensor, GIS and remote-sensing inputs

### 9.1 Minimum field schema

| Record | Essential contents |
|---|---|
| Parcel and reference | Stable ID, boundary, habitat objective, land-use history, survey date and observer |
| Plot/block | Geometry, sampling design, slope/exposure, retained cover, disturbance and treatment assignment |
| Soil profile | Depths, texture, coarse fragments, restriction, salinity method, infiltration observations and uncertainty |
| Plant/cohort | ID, species identification confidence, natural/planted/resprout origin, source/provenance, stock batch and installation date |
| Plant observation | Date, alive/dead/uncertain/not seen, dimensions, condition, browsing, reproduction and observer |
| Intervention | Actual operation, footprint, material, dates, water, maintenance, labor and deviations |
| Environmental observation | Rainfall, soil-moisture layer, temperature or other variable, units, device, calibration and quality flag |
| Disturbance/event | Drought episode definition, storm, erosion evidence, grazing access, fire or accidental damage |

Track coordinate accuracy and relocation confidence. A location adequate for a parcel map may be insufficient to identify a small plant in aerial imagery. Preserve raw observations; corrections should be traceable.

### 9.2 Sensors and field observations

A modest, well-maintained sensor subset can constrain water-process hypotheses. More sensors do not automatically improve inference if placement is biased or calibration is poor.

Place measurements in relation to actual nursery balls, surrounding soil and relevant horizons. Pair treatment and reference observations where possible. Record installation disturbance, maintenance, missing intervals, clock drift and device changes. A dry or failed sensor is not a zero-water reading.

Use fixed photographs and repeatable measurements to make field labels auditable. Root architecture and cause of death often remain uncertain without destructive or specialist assessment; do not turn a visual symptom into a confirmed mechanism.

### 9.3 GIS and climate layers

The earlier brief identified Sentinel/Copernicus, PNOA, REDIAM, SoilGrids and habitat maps as relevant sources [D1–D5]. Earlier notes also emphasized QGIS, GeoPandas, Rasterio, Xarray and spatial databases. These are candidate resources, not a statement that this project already holds usable layers.

| Input family | Proposed derived information | Critical caution |
|---|---|---|
| Terrain/DEM | Slope, aspect, potential radiation, flow paths and terrain position | Flow algorithms and DEM scale may not represent small terraces or event runoff |
| Aerial/historical imagery | Past land use, retained shrubs, boundaries and structural change | Acquisition date, season and positional consistency |
| Land cover and habitat | Reference context and environmental stratification | Map classes and uncertainty differ from field diagnosis |
| Soil predictions | Regional screening of texture or other properties | Do not substitute for measured rooting depth or salinity |
| Weather observations | Rain timing, dry spells, temperature and atmospheric demand | Gauge representativeness, gaps, units and observation times |
| Climate projections | Conditional future exposure and suitability | Scenario/model/downscaling uncertainty; not a dated weather forecast |
| Connectivity | Distance and landscape relation to possible propagule sources | Source presence does not establish seed delivery |
| Management history | Grazing, irrigation, clearance and planting exposure | Frequently incomplete and spatially imprecise |

Reference evapotranspiration describes standardized atmospheric evaporative demand; it is not measured actual transpiration of this vegetation. Rainfall minus ET₀ can be a climatic indicator, not a complete root-zone balance.

### 9.4 Remote sensing: measurement first

Use repeat imagery to estimate cover, phenology, structural change, bare-ground patterns and disturbance response. Link each remote variable to a field outcome and an observation-error model.

Earlier discussion highlighted weather/season confounding in restoration classification [E8], along with the need to combine long records and detailed monitoring products [E9].

Key limitations:

- Wet-year herbs can dominate a greenness signal without establishing persistent woody recruitment.
- Sparse woody cover may contribute only part of a pixel dominated by soil.
- Similar spectra can represent different species or ecological conditions.
- Shadow, illumination, cloud masking and seasonal timing can create apparent change.
- Small planted seedlings may be below satellite detectability.
- Drone segmentation and photogrammetry require field validation; canopy volume is not automatically biomass.

Do not assume a specific index solves these problems. Start with a physically interpretable observation target and verify it against repeated field samples. A model predicting satellite greenness is a greenness model until its relationship to the ecological outcome is demonstrated.

### 9.5 A defensible processing sequence

~~~text
Immutable raw files and metadata
    → coordinate/time/unit checks
    → imagery quality masks and documented preprocessing
    → terrain, weather and seasonal features
    → alignment to plant/plot/pixel support
    → field-linked labels with observation confidence
    → versioned training and evaluation tables.
~~~

Preserve source resolution, acquisition dates, missingness and treatment dates. Fit preprocessing learned from data within training folds. Never silently replace an unavailable required source with a convenient proxy.

## 10. Modeling strategies

The modeling task is a set of linked problems: observe current state, predict transitions, evaluate interventions and support decisions. One universal model is unlikely to serve all four well.

### 10.1 Start with explicit baselines

Useful comparators include persistence of present state, a seasonal/climate-only model, a site-stratified historical mean where adequate records exist, and a simple treatment-aware statistical model.

Baselines reveal whether complexity adds transferable information. An elaborate image model that mainly identifies wet years has not demonstrated a restoration capability. If observed outcomes are too sparse for a meaningful baseline, the first deliverable should be a monitoring and data-quality system.

### 10.2 Statistical models

| Method | Useful role | Main caution |
|---|---|---|
| Logistic/generalized linear model | Binary establishment or survival at a fixed horizon | Censoring and incomplete follow-up must be handled appropriately |
| Generalized additive model | Smooth nonlinear responses to moisture, exposure or time | Extrapolation and unjustified flexibility |
| Hierarchical model | Partial pooling across plots, sites, species or cohorts | Group effects can be weakly estimated with few independent groups |
| Survival/hazard model | Time-dependent mortality with incomplete follow-up | Event timing, policy and censoring assumptions |
| Count/hurdle model | Recruitment occurrence and abundance | Separate true absence from missed detection and unsuitable sampling |
| State-space model | Latent ecological state with noisy repeated observations | Identifiability and assumptions about process/measurement error |
| Occupancy/detection model | Species presence under imperfect detection | Requires repeat sampling and defensible detection assumptions |

For natural recruitment, distinguish propagule arrival from establishment if data allow. A hurdle model can separate “any recruits observed” from counts conditional on occurrence, but the two components are statistical descriptions unless tied to measurements of the actual mechanisms.

Use a small number of ecologically justified interactions, such as species × moisture, protection × browsing, or nurse microsite × drought. A small pilot cannot support every interaction across many treatments and species.

### 10.3 Mechanistic models

Mechanistic components represent processes such as:

- infiltration, storage, evapotranspiration and root-accessible water;
- establishment or mortality response to water stress;
- growth constrained by water, rooting volume and traits;
- recruitment/dispersal transitions;
- event runoff and erosion, where the data and decision justify them.

Their strength is explicit reasoning about changed conditions and conservation constraints. Their weakness is uncertain parameters and imperfect process structure. A model described as mechanistic can still be wrong or unconstrained.

**Proposed starting point:** a parsimonious water-balance model connected to a plant/cohort transition model. Check units, plausible bounds and response to limiting cases before fitting. Compare with a simpler empirical forecast. Do not start with a high-detail ecosystem model whose additional parameters cannot be measured or identified.

### 10.4 Machine learning

Tree-based models can test nonlinear relationships in structured field/environmental data. Image segmentation can support canopy/cover measurement. Time-series models may represent phenology and disturbance histories.

Deep learning becomes defensible when independent labeled sites, observation diversity and the measurement target justify it. Many pixels from one parcel do not substitute for many independent ecological examples. Transfer learning may help image measurement, but it does not establish ecological or causal transfer.

Feature importance, attention maps and SHAP-style explanations describe model behavior. They do not prove that a management action changes the outcome. A predictive relationship between irrigation and mortality can even reverse the apparent biological story if stressed plants preferentially receive rescue water.

### 10.5 Hybrid models

A practical hybrid can use:

1. field and remote sensing to estimate current vegetation state;
2. a water-balance component for antecedent root-zone conditions;
3. a hierarchical hazard/recruitment model for biological transitions;
4. a constrained residual model only if it improves held-out forecasts;
5. a separate causal evaluation for management recommendations.

Hybridization should have a clear purpose: constrain units, represent memory, use complementary observations or improve transfer. It should not be a way to add every available method.

Avoid double counting. If antecedent rainfall is used both to estimate storage and as a correlated downstream predictor, inspect whether parameters remain interpretable and whether the joint model improves evaluation.

### 10.6 Species distribution models

The earlier Iberian framework motivates landscape-level screening under present and future climates [E2]. For the project:

~~~text
Climate/landscape suitability
    → local substrate and habitat screening
    → stock and provenance assessment
    → microsite establishment trial
    → monitored demographic outcomes.
~~~

An occurrence model may reflect dispersal history, sampling bias and land use as well as physiological conditions. It is not a seedling-survival model. Future suitability should retain the climate-model/scenario ensemble and identify environmental novelty.

### 10.7 Decision support

Compare actions using predicted distributions of relevant outcomes, actual resource costs and constraints. Preserve a “monitor before deciding” option.

Possible decision criteria include expected persistent native recruitment, avoided soil loss where measurable, external-water use, labor, cost and habitat compatibility. Do not equate low predicted planting survival with a need for more intensive planting; it may support a different reference or management strategy.

When uncertainty dominates the action ranking, a targeted experiment can be more useful than a more detailed map. Value-of-information reasoning asks which additional observation could change the decision enough to justify its cost.

## 11. Uncertainty and limits of inference

### 11.1 An uncertainty register

| Source | Example | Proposed treatment |
|---|---|---|
| Observation | Species uncertainty, missed seedlings, sensor drift | Identification confidence, repeated visits, calibration and error models |
| Sampling | Few plots or unrepresentative microsites | Design-based summaries, transparent sampling frame and appropriate resampling |
| Parameter | Weakly estimated species or treatment response | Intervals/posterior distributions and sensitivity checks |
| Process variability | Different outcomes under similar measured conditions | Predictive distributions, not only fitted means |
| Model structure | Different plausible water or mortality mechanisms | Compare defensible alternatives; document assumptions |
| Future forcing | Weather sequences and climate scenarios | Conditional scenario ensembles with provenance |
| Management | Unknown future grazing, rescue water or maintenance | Explicit policies and alternative scenarios |
| Transfer | New geology, habitat, species or region | Applicability checks and external validation |
| Evidence provenance | Incomplete or unverified earlier citation | Retain the source status; do not convert it into a parameter |

A narrow parameter interval is not automatically a narrow predictive interval. Uncertainty may remain large even with many satellite pixels because the number of independent sites is small.

### 11.2 Report the uncertainty appropriate to the decision

A forecast record should include:

- target and horizon;
- management policy and weather/climate assumptions;
- point estimate only where defensible;
- interval or ensemble distribution and its interpretation;
- observation coverage and quality;
- model/version and evaluation domain;
- novelty or out-of-domain flag;
- main reasons the forecast could fail.

Use justified reporting precision. If local data do not support calibrated probabilities, provide a transparent screening category or scenario range instead. Do not invent percentages to make a dashboard look complete.

### 11.3 Calibration and extrapolation

For a group of adequately evaluated forecasts near a stated probability, observed frequencies should be compatible with that probability, allowing for sampling uncertainty. Calibration should be assessed by site, species, treatment and horizon where sample size permits.

Confidence on familiar sites does not imply reliability on a new substrate or drought regime. A useful system can decline to issue a forecast outside its supported domain and state which observation or validation is needed.

### 11.4 Avoid false certainty from historical analogues

Space-for-time comparisons and chronosequences can extend apparent time coverage. They also assume that differences among sites represent stages of a comparable process. Land-use history, substrate and management can violate that assumption.

Use such evidence to inform hypotheses or conditional scenarios, with independent historical or longitudinal checks. Do not assemble a precise 30-year parcel trajectory from unrelated sites and call it locally validated.

## 12. Causal evaluation of interventions

### 12.1 Prediction is not intervention effect

A treatment can be associated with poor outcomes because it was directed at the hardest sites. Conversely, the best sites may receive the most expensive treatment. Rescue irrigation is often given after stress appears. These assignment processes matter.

For a declared outcome Y and horizon:

~~~text
Average treatment effect = E[Y under treatment A - Y under comparator B]
~~~

Only one potential outcome is observed for each unit. Identification of the unobserved alternative requires a design and assumptions; a predictive model with a treatment input is insufficient by itself.

Define whether the question concerns the effect of assignment to a policy, the actual delivered operation, or a dynamic rescue-water regime. Record deviations rather than quietly redefining the treatment after observing outcomes.

### 12.2 A feasible local experiment

**Proposed design, to be refined after site diagnosis:**

1. Select one primary uncertainty, such as establishment at shrub edges versus suitable open microsites, or a diagnosed preparation treatment.
2. Define the comparator, primary outcome, observation horizon and rescue policy before installation.
3. Establish blocks representing relevant site variation.
4. Randomize within blocks where ecologically and operationally feasible.
5. Preserve unplanted or retained-cover comparisons for plot-level recovery questions.
6. Record installation quality, water, maintenance and treatment departures.
7. Monitor the original cohorts and plot outcomes, including failures.

Do not fully cross species, nurse treatment, mulch, preparation, protection and water in a tiny trial. The earlier Salsola proposal mentioned an 80-plant design; another carob note illustrated a 12-tree comparison [P1, P3]. These were learning proposals, not sample sizes justified by a power analysis.

Choose replication from the decision, expected variability and detectable effect worth acting on. If those quantities are unknown, treat the pilot as a way to estimate feasibility and variance.

### 12.3 Pseudoreplication and interference

The independent treatment unit may be a catchment, enclosure or plot rather than a plant. Shared irrigation, shade, grazing and runoff can couple responses.

Runoff capture especially violates a simple no-interference assumption if it changes water reaching neighboring controls. Map donor and receiving areas, design spacing or cluster assignment accordingly, and state the scale at which effects are interpreted.

### 12.4 Before-after-control-impact and observational designs

Where randomization is unavailable, repeated pre- and post-intervention measurements at treated and comparison sites can support a BACI analysis. Difference-in-differences requires a defensible parallel-trends argument and absence of differential coincident changes; pre-trend inspection is useful but not proof.

Matching, weighting and regression adjustment depend on measured confounders, overlap and an appropriate treatment definition. A small opportunistic dataset cannot establish a causal effect simply by adding more covariates.

Keep baseline and post-treatment variables distinct. If estimating the total effect of a microcatchment, controlling for the moisture increase it causes can remove part of the pathway being studied. Mediation analysis is a separate question with additional assumptions.

### 12.5 Report outcomes and resource tradeoffs

At a common horizon, report survival, persistent recruitment, condition, cover, external water, labor, materials and impacts on retained vegetation. Predeclare how replacements and missing observations are handled.

Water or cost per survivor can become unstable when few plants survive; report raw totals and survival alongside the ratio. A large average benefit may conceal a harmful subgroup, while a nonsignificant estimate may remain compatible with ecologically important effects.

## 13. Validation and forecast evaluation

### 13.1 Match validation to the intended use

| Intended use | Relevant test |
|---|---|
| Forecast the next season on monitored plots | Forward-chaining evaluation with only then-available inputs |
| Predict another parcel in the same landscape | Hold out whole parcels/sites and consider spatial buffering |
| Transfer across habitat/substrate types | Hold out those environmental groups |
| Evaluate species/provenance transfer | Explicitly hold out the intended groups; expect limited support |
| Estimate treatment effects | Design-based or causally justified comparison, not predictive accuracy alone |
| Produce a regional decision map | Independent field validation across the deployment domain |

Random pixel or plant splits can place nearly identical conditions in training and testing. Use the independent ecological unit, not the number of table rows, to define separation.

### 13.2 Prevent leakage

- Keep repeated measurements of a held-out unit together when the question requires a new-unit test.
- Do not use post-treatment cover to predict an installation-time outcome.
- Keep feature selection, imputation, scaling and tuning inside training folds.
- Prevent overlapping imagery windows from leaking outcome-period information.
- Distinguish retrospective mapping with observed weather from forecasts that require weather scenarios.
- Keep a final test set separate from repeated model selection.

The earlier Swedish-pasture preprint summary warned about temporal confounding [E8]. Its reported classification accuracy is not a target accuracy for Almería, and cannot validate a survival or recruitment forecast.

### 13.3 Use metrics matched to outcomes

| Target | Candidate evaluation | Interpretation |
|---|---|---|
| Fixed-horizon survival probability | Brier score, log loss, calibration and discrimination | Accuracy alone can reward predicting the majority class |
| Time to mortality | Censoring-aware time-dependent scores and survival calibration | Ranking alone does not establish useful probabilities |
| Recruitment/counts | Count error, distributional fit and interval coverage | Evaluate excess zeros and area/effort offsets |
| Continuous structure/cover | Bias, absolute error and predictive-interval coverage | Include field measurement uncertainty |
| Spatial classification | Class-specific precision/recall, confusion and area-aware evaluation | Dominant background can inflate overall accuracy |
| Intervention effect | Effect estimate and uncertainty under the design | Predictive test performance does not identify causation |
| Decision policy | Outcome/resource tradeoffs and sensitivity to assumptions | A higher statistical score may not improve decisions |

Resample at the relevant independent level. With only a handful of sites, interval estimates can themselves be unstable; report that limitation rather than producing impressive-looking decimal places.

### 13.4 Operational evaluation

Before routine use, verify:

1. Input completeness, coordinate/time alignment and units.
2. A meaningful improvement over the declared baseline.
3. Calibration and errors in the intended environment.
4. Behavior under missing data, novel conditions and sensor failures.
5. Reproducible reconstruction of a past forecast.
6. A prospectively registered prediction compared with later observations.

If a model fails, retain the failed forecast and explain the failure. Updating the model must not erase the earlier prediction or change its input history.

## 14. Monitoring and adaptive management

### 14.1 Proposed monitoring cadence

This is a starting design, not a universal protocol:

| Stage | Main observations | Purpose |
|---|---|---|
| Before intervention | Vegetation, recruitment, soil, erosion, grazing, reference and historical imagery | Establish starting state and comparators |
| Installation | Stock, location, actual operations, water and initial dimensions | Define the cohort and delivered treatment |
| After meaningful events | Wetting, storm damage, runoff/erosion and exceptional stress | Observe processes missed by calendar visits |
| During early dry seasons | Survival/condition and relevant moisture observations | Identify establishment bottlenecks |
| At consistent seasonal censuses | Growth, recruitment, cover, maintenance and water | Compare like with like across years |
| At longer intervals | Reproduction, cohort persistence, community structure and soil condition | Evaluate ecological persistence |

Choose actual frequency from the process and access constraints. If visits are too far apart to identify when or why mortality occurs, report interval uncertainty. Early intensive monitoring can decline as appropriate, but long-term follow-up remains necessary.

### 14.2 Baseline and comparators are durable infrastructure

Keep permanent plot locations, repeat-photography instructions and original plant IDs. Preserve unplanted areas and management records. Monitor apparent failures as carefully as successful patches.

Weather-adjusted satellite anomalies can help interpret monitoring, but a residual after removing rainfall is not automatically a restoration effect. Model misspecification, unmeasured weather and management changes can remain.

### 14.3 Predeclared response rules

Adaptive management can include rescue watering, protection repair or relocation decisions, but triggers should be documented. Record who acted, when, why and what changed.

If a predeclared rescue rule is part of the treatment, evaluate the policy as implemented. Unrecorded emergency management can make a treatment appear self-sustaining when it depends on substantial labor or water.

Use monitoring to revise decisions, not to force every plot toward the original planting vision. Persistent recruitment under retained scrub may support ANR; repeated failure despite support may justify a different objective or intervention.

## 15. Practical system architecture

### 15.1 Build a traceable evidence-to-decision chain

~~~text
Source register and field protocols
              ↓
Raw field / sensor / imagery / climate records
              ↓
Validation, quality flags and spatial-temporal alignment
              ↓
Observation products and versioned feature tables
              ↓
Baselines → statistical / process / hybrid candidates
              ↓
Spatial and temporal evaluation
              ↓
Versioned forecast with assumptions and applicability
              ↓
Map, comparison report or planning interface
              ↓
New field observations and forecast audit
~~~

Keep observational measurements, ecological assumptions, intervention evidence and scenario placeholders distinguishable throughout.

### 15.2 Minimal viable components

| Component | Practical initial choice | Purpose |
|---|---|---|
| Field collection | Structured offline-capable forms or validated tables | Stable IDs, repeatable measurements and explicit missing states |
| GIS review | QGIS and GeoPackage | Parcel/plot/microsite inspection and map checking |
| Spatial processing | Python with GeoPandas, Shapely and Rasterio | Geometry, joins and reproducible raster sampling |
| Time-series/gridded processing | Pandas/Xarray where appropriate | Weather, sensors and temporal features |
| Tabular/spatial storage | Validated files and a small database only if needed | Traceable relationships and manageable updates |
| Imagery archive | Source metadata, local/cloud references and reproducible recipes | Avoid untraceable manual composites |
| Statistical modeling | Established Python modeling libraries selected for the target | Baselines, survival and uncertainty |
| Experiment tracking | Versioned configuration, code, data manifests and result tables | Reconstruct forecasts and comparisons |
| Delivery | Static report/maps first; API only when needed | Make decisions reviewable before building an application |

This is a proposed stack, not a current compatibility or package-version recommendation. No new software documentation was researched. Pin and test dependencies at implementation time.

Move to a spatial server database, orchestration or cloud processing when actual scale or collaboration requires it. A small pilot does not need a distributed platform to become scientifically useful.

### 15.3 Data contracts and record relationships

Useful linked entities:

~~~text
site → plot/block → microsite → individual/cohort → observations
                     ↘ interventions and resource use

source → dataset snapshot → features → model version → forecast → evaluation
~~~

A forecast should store issue time, last input-observation time, target, horizon, management policy, climate/weather assumptions, model/version, source manifest, uncertainty and domain flags.

Represent missing, unknown, not observed, not applicable and measured zero separately. A failed data fetch must not become “zero rainfall”; an unidentified plant must not silently receive the catalogue's species identity.

### 15.4 Integration with the restoration simulator

The recovered MVP brief assigns authoritative rules/state to Python and a presentation role to React/FastAPI [P4]. The repository instructions also separate traceable ecological evidence from layout assumptions.

**Proposed future integration:**

- Keep illustrative timeline outcomes labeled as scenarios.
- Add an evidence-backed forecast service only after an independently usable model and evaluation exist.
- Pass a saved design snapshot and explicit environmental inputs to that service.
- Return outcomes, ranges, assumptions and applicability; retain the forecast version with the design.
- Keep actual field monitoring records separate from simulated histories.
- Require explicit adoption of changed assumptions rather than silently updating past plans.

This document does not audit the current implementation or claim that a scientific forecast module exists.

### 15.5 Useful acceptance checks

For a future implementation, test meaningful failure modes: incompatible coordinates, mixed units, duplicate IDs, wrong time windows, ambiguous species, missing required layers and out-of-domain conditions.

A water component should respect its accounting boundary and conservation logic. A survival component should preserve the original cohort, censoring and replacement records. Evaluation splits should demonstrably separate the declared ecological units. Saved forecasts should be reproducible from their manifests.

## 16. Phased implementation roadmap

These are capability stages, not promises that ecology can be learned within fixed development deadlines. Software milestones can be reached quickly; field evidence accumulates over seasons and years.

### Phase 0 — Define the decision and audit existing evidence

**Work**

- Choose a parcel and an ecological reference with local ecological input.
- State one first prediction/decision contract.
- Inventory actual field records, images, historical management and source notes.
- Separate measured values, reported findings, guidance, assumptions and unresolved parameters.
- Resolve whether Salsola identity and rooting conditions are adequate for trial design.

**Deliverable:** an evidence register, target specification, data-gap map and field protocol.

**Exit condition:** the team can state what observation would support or contradict the intended recommendation. If no outcome labels exist, proceed to measurement rather than claiming predictive skill.

### Phase 1 — Build a reproducible parcel baseline

**Work**

- Establish stable site/plot IDs and survey representative microsites.
- Prepare terrain, retained-cover and historical-land-use layers from sources already held or later explicitly acquired.
- Create a documented imagery/weather workflow with quality checks.
- Produce maps that separate observations from screening inferences.

**Deliverable:** a GIS project and reproducible Python pipeline, with a baseline report and uncertainty notes.

**Exit condition:** another person can reproduce the map and trace every layer to its date, resolution and source. The parcel map does not pretend to be a microsite survival forecast.

### Phase 2 — Establish a monitored, interpretable pilot

**Work**

- Select one principal ecological uncertainty and a feasible comparator.
- Use blocking/randomization or document an observational alternative.
- Record stock, provenance, actual treatment and the water policy.
- Retain reference plots, original cohort IDs and a schedule for dry-season/event observations.
- Budget for monitoring, replacements recorded as new cohorts, and instrument maintenance.

**Deliverable:** a registered pilot design, baseline dataset and first monitoring report.

**Exit condition:** treatment delivery and missing observations are auditable. The trial's independent replication is understood. Early results remain pilot evidence.

### Phase 3 — Develop the first ecological forecast

**Work**

- Fit simple seasonal/climate and survival/recruitment baselines.
- Add measured soil/microsite and management variables selectively.
- Evaluate temporal and spatial separation to the extent the dataset permits.
- Make a dated prospective forecast for the next observation period.

**Deliverable:** an evaluated forecast notebook or small Python package, model card and explicit applicability statement.

**Exit condition:** either demonstrated added predictive value or a documented finding that the present data cannot support deployment. Both are useful scientific results.

If the only data come from one parcel, restrict claims to that setting; external transfer remains untested.

### Phase 4 — Add process-informed water memory

**Work**

- Fit and check a parsimonious water component using measured profiles and moisture.
- Compare it with simpler antecedent-weather features.
- Link supported state estimates to survival or recruitment transitions.
- Examine parameter sensitivity and identifiability.

**Deliverable:** a water-state/plant-response comparison with mass-balance checks and out-of-time evaluation.

**Exit condition:** the process component improves interpretation or forecast value enough to justify its maintenance. If parameters remain unconstrained, retain the simpler model.

### Phase 5 — Test transfer and intervention value

**Work**

- Add independently monitored parcels or collaborating sites.
- Validate across relevant substrate, exposure and management variation.
- Estimate treatment effects only where the design supports them.
- Compare actions under external-water, habitat and labor constraints.

**Deliverable:** a multi-site evaluation and decision report, including negative transfer results.

**Exit condition:** a stated deployment domain with independent support. Do not extend a single-site planting pilot into a regional restoration prescription.

### Phase 6 — Deliver operational decision support

**Work**

- Package accepted models and evidence as an API/report workflow if users need it.
- Add forecast monitoring, explicit failure states and versioned scenario inputs.
- Integrate with planning tools while preserving the distinction between field evidence and scenarios.
- Establish responsibility for ecological review, data maintenance and forecast retirement.

**Deliverable:** a decision-support product that can show where it has evidence, where uncertainty matters and where further measurement is needed.

**Exit condition:** users can trace a recommendation to observations, assumptions and evaluated performance. A visually convincing map alone does not satisfy this condition.

## 17. Portfolio and career development

The earlier science brief and library overview point to a strong role for engineering in environmental data integration, spatial analysis, monitoring and forecasting [C1, P7]. These are grounded technical directions, not a new labor-market assessment or a guarantee of work.

### 17.1 A sequence of portfolio artifacts

| Artifact | Engineering capability demonstrated | Scientific boundary to show |
|---|---|---|
| Parcel evidence atlas | GIS, source provenance and terrain/image alignment | Screening versus field confirmation |
| Weather-aware vegetation monitor | Remote-sensing time series, quality control and climate integration | Greenness versus ecological recovery |
| Seedling cohort monitor | Data design, survival analysis and resource accounting | Censoring, replacements and selective mortality |
| Recruitment survey module | Sampling design, detection and cohort tracking | Seedling pulses versus persistent regeneration |
| Water-memory comparison | Process modeling, temporal features and calibration | Identifiability and held-out value |
| Intervention evaluation | Experimental/BACI reasoning and uncertainty | Causal assumptions and independent replication |
| Forecast/planning interface | Python service design, model cards and usable explanations | Applicability, uncertainty and scenario labeling |

Each artifact should contain a clear question, data provenance, reproducible method, baseline, evaluation, failure cases and ecological interpretation. Synthetic data can demonstrate software mechanics, but must remain visibly synthetic and cannot establish model skill.

### 17.2 Learning priorities

1. **Ecological foundations:** succession, environmental filtering, dryland water limitation, disturbance, recruitment, facilitation and appropriate references.
2. **Measurement and field partnership:** plant identification, soil/rooting diagnosis, sampling and repeatable observations.
3. **GIS and remote sensing:** coordinate systems, raster/vector support, phenology, change detection and quality control.
4. **Statistical forecasting:** survival, hierarchical models, counts, temporal validation, calibration and uncertainty.
5. **Causal evaluation:** treatment definition, randomization, BACI, interference and dynamic management.
6. **Process modeling and software delivery:** water balance, reproducible pipelines, versioning and understandable decision products.

Learn the ecological concept alongside the code that measures or predicts it. For example, survival analysis becomes more meaningful when the data model correctly represents dormancy, missed observations and rescue watering.

### 17.3 Where collaboration is necessary

A Python/remote-sensing engineer can lead reproducible integration, observation pipelines, evaluation and decision tooling. Local ecological and soil/hydrological expertise is needed to establish habitat objectives, identify species and restrictions, interpret interventions and assess transfer.

The first practical professional asset is a trustworthy measurement and evidence system. Advanced machine learning becomes valuable when the ecological target and data support it.

### 17.4 A manageable first portfolio project

**Suggested project:** “Weather-aware monitoring and establishment prediction for a semi-arid restoration pilot.”

Start with a parcel evidence atlas and field registry. Add an imagery time series with seasonal/weather context, then a cohort survival report when observations exist. Publish a forecast evaluation only after genuine held-out outcomes are available.

This sequence can yield useful engineering work before decades of vegetation development have elapsed. It also avoids claiming long-term recovery prediction from an early planting census.

## 18. Future scientific and technology directions

The following are **reasoned directions**, not results of a new literature review or claims about technology readiness.

### 18.1 From detecting change to forecasting trajectories

The important scientific move is from “vegetation changed” to “this community is likely to retain or regain specified functions under these conditions.” That requires demographic observations, process state and disturbance history in addition to imagery.

Early indicators may become valuable, but they must be tested for their ability to predict later persistence. An early canopy response is not inherently a surrogate for long-term recruitment or resilience.

### 18.2 Better separation of observation and ecology

Multispectral imagery, aerial structure, field surveys and sensors can provide complementary measurements. A strong future system will model what each instrument sees and misses, rather than treating all inputs as interchangeable ecological truth.

Computer vision can reduce the cost of repeated canopy mapping or field-image measurement. Species identification and mortality diagnosis still require validation under local appearance, season and image quality.

### 18.3 Dynamic water and biological memory

Forecasts may improve by representing antecedent soil state, root development, prior drought damage and cohort history. The scientific challenge is to determine which memories are identifiable and decision-relevant.

Combining occasional field measurements with more frequent remote observations through data assimilation is a plausible direction. Assimilation can update state estimates; it does not repair an incorrect process model or create information absent from all observations.

### 18.4 Transfer across sites and future climates

Hierarchical trait-informed models may share information across species and sites while preserving differences. Transfer requires explicit tests across climatic, edaphic and management domains.

Foundation or pretrained Earth-observation models may improve representation and measurement with fewer local labels. They cannot remove the need for local outcome data, calibration or causal design.

### 18.5 Learning which interventions work where

Distributed, consistently monitored trials can support treatment-effect estimates and context dependence better than disconnected demonstrations. Common protocols and transparent negative results matter as much as more sophisticated algorithms.

Adaptive experiments could direct later effort toward unresolved decisions, provided allocation changes are recorded and analyzed correctly. “Active learning” for image labels and experimental allocation for causal learning are different tasks.

### 18.6 Forecasts that improve through public evaluation

Prospective forecast archives, versioned inputs and shared evaluation protocols can expose failures and improve ecological learning. Useful benchmarks should include calibration, transfer and decisions, rather than only pixel classification accuracy.

Long-term monitoring is the scarce foundation: technological sophistication cannot compress a decade of unobserved persistence into a short image sequence.

### 18.7 Decision systems with explicit limits

The most credible future tool may combine reliable present-state measurement, modest near-term forecasting and transparent long-term scenarios. A parcel-scale “digital twin” is only justified if state, processes, updates and forecast performance are demonstrated. The label itself adds no evidence.

The desired outcome is a better decision under uncertainty, including decisions to retain existing vegetation, change the objective or collect more evidence.

## 19. Immediate decisions and unresolved questions

### 19.1 What the recovered discussion supports now

- Make natural regeneration and retained vegetation explicit alternatives to planting.
- Diagnose rooting volume, actual water availability and browsing before prescribing treatment.
- Treat Salsola identity and nurse effects as questions requiring confirmation.
- Measure persistent recruitment and whole-plot outcomes alongside planted survival.
- Separate early establishment, long-term persistence and post-disturbance resilience.
- Combine field and remote measurements with weather and management history.
- Build a traceable monitoring/baseline system before adding complex forecasts.
- Keep simulator placeholders, technical guidance and experimental evidence distinct.

These are synthesis recommendations. They are not quantified treatment effects for the parcel.

### 19.2 Questions that remain open

| Question | Evidence needed |
|---|---|
| What reference is appropriate for this parcel? | Habitat assessment, comparable local vegetation and explicit objectives |
| Which Salsola taxon is present? | Field identification with retained uncertainty until confirmed |
| Is natural recruitment occurring and persisting? | Repeated origin- and species-resolved cohort surveys |
| What limits tree/shrub establishment? | Soil profiles, rooting constraints, moisture, damage and treatment comparisons |
| Does existing scrub facilitate or compete with candidate plants? | Matched or randomized microsite comparison with drought/browsing context |
| Does runoff capture improve outcomes without unacceptable redistribution? | Event observations, donor-area accounting and independent replication |
| Which species/provenance is appropriate? | Site fit, traceable material and relevant comparative evidence |
| How much external water is required? | Explicit policy, measured applications and survival/growth outcomes |
| Do benefits persist after support declines? | Continued cohort and plot monitoring |
| Can predictions transfer outside the pilot? | Independent sites and environmental-domain validation |
| Can long-term recovery be predicted credibly? | Longitudinal evidence, demographic/process constraints and evaluated uncertainty |

Do not fill these gaps with a generic planting recipe or uncalibrated probability map.

## 20. Source ledger and retrieval limits

### 20.1 What was actually recovered

The principal conversation was read through the ChatGPT/Codex chat tool. It contained a substantial science brief headed **20 October 2026**, plus later requests for the Markdown document. Its long text was truncated near the career discussion, and some assistant replies consisted only of content-reference markers. The retrieved page reported no older page for that conversation.

The available recent-chat inventory also identified relevant project discussions. The Salsola and Alhama climate discussions were read; the carob-root discussion exposed only the user's question and an assistant reference marker, so it provides no recoverable substantive answer. Recent simulator discussion and the locally saved MVP brief supplied project context.

Earlier project-authored Markdown notes were read from the existing algarrobos repository. They are recovered research syntheses and planning records, not new literature searches. Their own original-source access limitations remain applicable. No PDF studies were newly opened or independently reassessed for this document.

This is not a complete audit of all historical project chats, uploaded files or literature. Inaccessible figures, library attachments and internal citation markers were not treated as retrieved evidence.

### 20.2 Conversation sources

| ID | Conversation | Material used |
|---|---|---|
| C1 | [Dryland Restoration Science & Career Brief](chatgpt-conversation://6ad7066c-467c-83ed-9113-0fd77542c8f5) | Reported studies, ecological themes, datasets and technical/career directions |
| P1 | [Investigación sobre renaturalización de salsola](chatgpt-conversation://6ae1cc58-ea88-83ed-9b59-a89e9d8840e1) | Tentative Salsola identification, existing-cover reasoning and trial proposal; underlying bibliography/figures not exposed |
| P2 | [Alhama Climate & Water](chatgpt-conversation://6ac1f9c5-9da8-83eb-b0aa-08dd0a94f501) | Spatially uneven rainfall, missing/stale measurements and separation of water compartments |
| P4a | [Implement restoration simulator MVP](chatgpt-conversation://01a179f5-fd50-7fe2-91e6-7f15bb5d2db1) | Recent planning/design context; the saved brief below is the clearer specification of placeholder scope |

Conversation links are provenance references; access depends on the reader's account and application.

### 20.3 Findings reported in the main science conversation

**Status of every row below:** earlier assistant-reported, not independently verified here. Where bibliographic metadata are incomplete, a descriptive label is used rather than an invented article title or author list.

| ID | Earlier reported finding | Preserved source link | Interpretation limit |
|---|---|---|---|
| E1 | Northeastern Portuguese agricultural-abandonment study: 118 plots and historical aerial reconstruction; mature woodland structure described as taking approximately 60–80 years, sometimes longer, with site/connectivity differences. Rainfall context reported as roughly 550–750 mm/year. | [Publisher page, DOI 10.1111/rec.70464](https://onlinelibrary.wiley.com/doi/full/10.1111/rec.70464) | Wetter than many Almería lowlands; no transferable parcel recovery deadline or causal coefficient |
| E2 | Iberian restoration-planning framework reported to combine 44 forest species, genetic groups and ten climate models, at approximately kilometer-scale resolution. | [Frontiers article, DOI 10.3389/ffgc.2026.1735354](https://www.frontiersin.org/journals/forests-and-global-change/articles/10.3389/ffgc.2026.1735354/full) | Suitability is not microsite establishment; genetic structure is not demonstrated adaptation |
| E3 | Southeastern Spanish mountain-grassland analysis reported satellite data for 1985–2024 and locations from 35 herds; widespread greening, slower greening with heavier grazing and different climate sensitivity; no significant browning reported. | [Publisher page, DOI 10.1111/1365-2664.70263](https://besjournals.onlinelibrary.wiley.com/doi/full/10.1111/1365-2664.70263) | Observational relationships in the studied mountain grasslands do not identify local exclusion effects |
| E4 | Mediterranean-climate woodland restoration outside Spain: more than 11,000 planted trees/shrubs monitored over 12 years; around half reported to have died, with species/stock/treatment differences. | No usable article link or complete citation exposed in the recovered text; see [C1](chatgpt-conversation://6ad7066c-467c-83ed-9113-0fd77542c8f5) | Do not assign the reported mortality fraction to Almería or infer a herbicide recommendation |
| E5 | Southeastern Spanish post-fire study: nine woody species, reconstructed pre-fire size and observations 10–12 years after fire; all resprouted, six reportedly exceeded estimated pre-fire biovolume. | [PubMed record 42766728](https://pubmed.ncbi.nlm.nih.gov/42766728/) | Species- and disturbance-specific structural recovery; reconstruction uncertainty and limited functional interpretation |
| E6 | Semiarid Spanish pine-forest post-fire treatments: no significant differences in main measured soil properties after five years, with nine experimental plots reported. | No usable article link or complete citation exposed; see [C1](chatgpt-conversation://6ad7066c-467c-83ed-9113-0fd77542c8f5) | Nonsignificance is not equivalence or proof that early erosion control failed |
| E7 | Southeastern Spanish nurse-shrub experiment described as showing context-dependent effects with grazing and drought. | Original citation not exposed beyond an internal reference marker; see [C1](chatgpt-conversation://6ad7066c-467c-83ed-9113-0fd77542c8f5) | No effect size or universal nurse recommendation can be recovered |
| E8 | Swedish restored-pasture preprint: 1,397 sites and approximately 88% best classification accuracy reported; temporal/weather confounding highlighted. | No usable preprint URL or full citation exposed; see [C1](chatgpt-conversation://6ad7066c-467c-83ed-9113-0fd77542c8f5) | Different ecosystem, preprint status and classification target; not Almería forecast performance |
| E9 | European technical report described as supporting integration of long land-cover records and detailed Copernicus products. | Report title/URL not exposed; see [C1](chatgpt-conversation://6ad7066c-467c-83ed-9113-0fd77542c8f5) | General monitoring direction, not evidence of a particular recovery model |
| E10 | Southern Spanish semi-supervised object-based vegetation classification reported at approximately 82–85% accuracy. | Original citation not exposed; see [C1](chatgpt-conversation://6ad7066c-467c-83ed-9113-0fd77542c8f5) | Classification accuracy cannot be repurposed as ecological-outcome accuracy |

The numbers in this ledger document what the earlier conversation reported. They are not model parameters, targets, validated source extractions or new recommendations. Precise publication dates from that conversation have not been repeated as independently established facts.

### 20.4 Earlier project-authored notes

These local files were available and read. Their dates are the dates stated in the notes, not evidence that every underlying source remains current. Paths identify the provenance collection; no source files were changed.

| ID | Local record | Contribution |
|---|---|---|
| P3 | [LEARN-007 — Carob Establishment: Soil Preparation and Growth with Limited Water](<C:/Users/JanEngelke/git_private/algarrobos/doc_library/LEARN-007 - Carob Establishment - Soil Preparation and Growth with Limited Water.md>), 28 October 2026 | Preparation versus planting depth; connected rooting volume; runoff and water accounting; small-trial limitations; source register |
| P4 | [Restoration Simulator MVP Brief](<C:/Users/JanEngelke/git_private/algarrobos/Restoration_Simulator_MVP_Brief.md>), version 0.4, 26 October 2026 | Explicit placeholder ecology/finance scope and Python/FastAPI/React boundary; not a current implementation audit |
| P5 | [LEARN-005 — Dryland Restoration: Planting Techniques and Checklist Coverage](<C:/Users/JanEngelke/git_private/algarrobos/doc_library/LEARN-005 - Dryland Restoration - Planting Techniques and Checklist Coverage.md>), 28 October 2026 | Procurement versus planting evidence, species identity and missing protocols |
| P6 | [LEARN-008 — Carob Restoration: Nursery Buying Guide and Mixed Planting Models](<C:/Users/JanEngelke/git_private/algarrobos/doc_library/LEARN-008 - Carob Restoration - Nursery Buying Guide and Mixed Planting Models.md>), with 29 October additions | Stock/provenance, water-policy differences, mixed mosaics, oak/vegetation-series qualifications and source discrepancies |
| P7 | [LEARN-002 — Restoration Projects: Career Learning Overview and Research Gaps](<C:/Users/JanEngelke/git_private/algarrobos/doc_library/LEARN-002 - Restoration Projects - Career Learning Overview and Research Gaps.md>) | Existing library's engineering coverage and digital monitoring/data gaps; not a labor-market survey |

These absolute local links work only where that repository exists. The document's scientific discussion remains readable without opening them.

### 20.5 Selected underlying links preserved in the project notes

These links make the earlier evidence easier to inspect later. Their inclusion is not a claim that the primary material was re-read for this document.

| Topic | Source link and recorded identity | Recorded evidence/access limitation |
|---|---|---|
| Carob ecology and rooting | Thomas et al. (2024), [International Biological Flora: Ceratonia siliqua](https://doi.org/10.1111/1365-2745.14325) | P3 identifies a biological synthesis, not a field construction or irrigation prescription |
| Carob planting models | Navarro Cerrillo & Palacios Rodríguez, eds. (2026), [UCOPress publication page](https://www.uco.es/servicios/ucopress/omp/index.php/ucopress/catalog/book/69); [book PDF link](https://www.uco.es/servicios/ucopress/omp/index.php/ucopress/catalog/download/69/83/1938?inline=1) | Earlier notes reviewed guidance and demonstrations, with internal discrepancies retained; no universal optimum |
| Soil preparation in drylands | MITECO (2008), [Técnicas de preparación del suelo para repoblaciones forestales en ambientes áridos y semiáridos, PDF](https://www.miteco.gob.es/content/dam/miteco/es/biodiversidad/temas/desertificacion-restauracion/0904712280144d78_tcm30-152824.pdf) | Historical technical guidance, not proof that all preparation methods suit existing habitat |
| Rocky-substrate water use | [Water use patterns of introduced carob trees on rocky hillslopes in the Negev Desert](https://doi.org/10.1016/S0140-1963(18)31099-1), 1988 | P3 reports partial publisher-indexed access; geology and runoff context limit transfer |
| Multi-species establishment | Metougui, Ilvesniemi & Bekkaoui (2026), [Early establishment and growth of native and exotic trees in semi-arid Morocco](https://doi.org/10.1016/j.foreco.2026.123908) | P3 reports abstract/excerpt access; overall effects not assignable to carob alone |
| Shelters | Padilla et al. (2011), [Does shelter enhance early seedling survival in dry environments?](https://doi.org/10.1111/j.1654-109X.2010.01094.x) | Earlier review used publisher abstract; a tube is not equivalent to every browsing-protection measure |
| Amendments and species differences | Clemente et al. (2004), [Restoration of a Limestone Quarry: Effect of Soil Amendments on the Establishment of Native Mediterranean Sclerophyllous Shrubs](https://doi.org/10.1111/j.1061-2971.2004.00256.x) | P3 identifies a short field experiment with abstract-only access to outcomes; no transferable dose |
| Carob physiology under water deficit | Ezzine et al. (2023), [Scientific Reports full-text page](https://pmc.ncbi.nlm.nih.gov/articles/PMC10027864/) | Earlier review concerns three-year-old field plants and physiological responses, not a first-summer irrigation optimum |
| Nursery inoculation | Jadrane et al. (2021), [Inoculation with selected indigenous mycorrhizal complex improves Ceratonia siliqua's growth and response to drought stress](https://pmc.ncbi.nlm.nih.gov/articles/PMC7783803/) | P6 distinguishes greenhouse evidence from field establishment; no inoculation recommendation adopted here |
| Coscoja context | Junta de Andalucía, [Quercus coccifera factsheet, PDF](https://www.juntadeandalucia.es/medioambiente/BIO/DOC/BIO-DOC-6120-003.pdf) | P6 treats natural occurrence and vegetation context separately from seedling establishment |
| Encina context | Junta de Andalucía, [Quercus rotundifolia botanical factsheet, January 2025, PDF](https://www.juntadeandalucia.es/medioambiente/portal/documents/20151/255221248/UMBRIA-ENE-2025.pdf/638e27d7-29a8-8718-0c4f-9ac034bbb20d?t=1745493497879) | Regional context, not parcel suitability |
| Vegetation-series interpretation | Junta de Andalucía, [management-model excerpt, PDF](https://www.juntadeandalucia.es/medioambiente/consolidado/publicacionesdigitales/40-762_ANEXO_CARTOGRAFICO_Y_SERIES_DE_VEGETACION-MODELOS_DE_RESTAURACION_FORESTAL/40-762/8_MODELOS_DE_GESTION_DE_LA_VEGETACION-03.PDF); [vegetation-series excerpt, PDF](https://www.juntadeandalucia.es/medioambiente/consolidado/publicacionesdigitales/40-762_ANEXO_CARTOGRAFICO_Y_SERIES_DE_VEGETACION-MODELOS_DE_RESTAURACION_FORESTAL/40-762/26_SERIES_DE_VEGETACION_CLIMATOFILAS_Y_EDAFOXEROFILAS-09.PDF) | Earlier notes identify nomenclature/context discrepancies; no series assigned to this parcel |

### 20.6 Data and technical resources already named in the main conversation

These are discovery/resource links, not datasets downloaded or checked for this document.

| ID | Resource | Intended role and limitation |
|---|---|---|
| D1 | [Copernicus Data Space STAC browser](https://browser.stac.dataspace.copernicus.eu/) | Discover Sentinel imagery; verify actual product/resolution/access when implementing |
| D2 | [PNOA — Spain's National Aerial Orthophotography Plan](https://pnoa.ign.es/) | Aerial/historical and related terrain resources; actual coverage/acquisition dates must be checked |
| D3 | [SoilGrids](https://isric.org/explore/soilgrids/) | Regional soil screening; earlier brief reported approximately 250 m products, not microsite truth |
| D4 | [REDIAM — Andalusian Environmental Information Network](https://www.juntadeandalucia.es/medioambiente/portal/acceso-rediam) | Regional environmental layers; inspect metadata and classification |
| D5 | [European habitat-map publication link](https://www.nature.com/articles/s41597-025-06235-7) | Earlier brief described approximately 100 m modeled habitat predictions with uncertainty; not field habitat confirmation |
| D6 | [QGIS documentation](https://docs.qgis.org/) | GIS training and reference |
| D7 | [Google Earth Engine Python/API reference](https://developers.google.com/earth-engine/api_docs) | Candidate processing environment; this document makes no present access or pricing claim |
| D8 | [SAIH Hidrosur rainfall portal](https://www.redhidrosurmedioambiente.es/saih/resumen/precipitacion/comparada) | Named in the earlier Alhama discussion; current measurements were not retrieved |
| D9 | [AEMET Alhama de Almería page](https://www.aemet.es/es/eltiempo/prediccion/municipios/alhama-de-almeria-id04011) | Named local weather resource; a forecast page is not itself a historical observed-weather dataset |

### 20.7 Evidence-use rule for later implementation

Before turning a literature claim into an operational parameter or recommendation, recover the original source and check the species, site, treatment, comparison, outcome, follow-up, uncertainty and access limitations. Where that cannot be done, retain the claim as background context or an explicit hypothesis.

The present document supplies a structured scientific and engineering basis for that work. It does not supply a calibrated recovery model, a parcel-specific planting specification or new evidence that resolves the listed uncertainties.

