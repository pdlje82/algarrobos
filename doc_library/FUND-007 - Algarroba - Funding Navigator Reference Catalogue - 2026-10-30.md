# ALGARROBA — Funding Navigator Reference Catalogue

**Reference date:** 30 October 2026  
**Purpose:** Subject-matter reference for Codex when implementing the Funding Navigator in the existing restoration_simulator application.  
**Geographic centre:** Alhama de Almería, Sierra de Gádor, the Andarax catchment, wider Almería and Andalucía; national, European and voluntary/private instruments are included where relevant.  
**Language:** English, with original Spanish programme names, legal terms, and source-document titles preserved.  
**Document type:** Research-backed reference catalogue, **not** an application, legal opinion, funding award, implementation specification for the entire app, or eligibility determination.

> **Explicit scope restriction:** Do **not** turn this document into chronological “pathways”, “stages”, a default grant ladder, or a prescribed organizational transition. Present funding mechanisms as independent, searchable opportunities. Explain their applicability, limitations, evidence, applicant profiles, economics and relationships to project designs. Users should be free to select any instrument and explore compatible project types in any order. The site planner, demonstrator designer and land-use tools already exist; the navigator should explain funding fit and exchange relevant facts with those tools, not duplicate their workflows.

> **Link restriction:** No Markdown hyperlinks to uploaded project documents are included. Their **original filenames** and, when known, **titles printed inside the PDFs** appear in the source inventory. Codex should identify the corresponding renamed files in its local document library by title, filename fragments, textual fingerprints and subject, then associate each catalogue entry with the correct local record. Never fabricate a library URL or assume a renamed file retains its original filename.

---

## 1. How to interpret funding information

### 1.1 Distinguish the financial mechanisms

| Mechanism | What it means | What the applicant normally has to prove | How funds arrive |
|---|---|---|---|
| **Public subsidy / grant** | Competitive or noncompetitive public assistance for eligible activities | Appropriate applicant, location, approved activities, cost documentation, outputs, compliance | Advance, milestone, reimbursement or lump sum as specified |
| **Grant programme / enabling regulation** | Legal framework authorizing possible calls | Nothing is actually available until a relevant published call exists | No direct payment from framework alone |
| **Open call** | Currently accepts applications subject to budget, deadline and rules | Call-specific eligibility and documents | According to award/contract terms |
| **Historical award / precedent** | Proof that an approach has previously been funded | No automatic entitlement | No new money necessarily available |
| **Public procurement contract** | Buyer pays a supplier for specified works, supplies or services | Tender eligibility, capacity, price/quality, procurement terms | Contract payment on certified delivery, often with guarantees |
| **Donation / membership / sponsorship** | Voluntary private contributions | Credibility, contractual promises, transparency and possibly donation-tax eligibility | On donation/pledge schedule |
| **Service or product revenue** | Earned income from genuine customers | Customer demand and service/product delivery | Invoice or sales revenue |
| **Outcome-based payment / ecosystem-service contract** | Payment conditional on verified performance | Baseline, additionality where required, agreed metric and buyer | After measurement or contracted milestones |
| **Environmental credit** | A separately defined, quantified and verified environmental unit potentially sold or retired | Valid standard, title to claims, MRV, registry if required, buyer and integrity safeguards | Only on contracted sale; certification alone is not a sale |
| **Debt / investment** | Repayable capital or return-seeking financing | Creditworthiness, reliable cash flow, collateral or financial return | Capital now, repayment/return later |
| **In-kind support / land-use rights** | Labour, plants, equipment, advice or conservation use of land | Valid agreements and any restrictions on donated assets | Noncash benefit |
| **Tax incentive** | Legal reduction or deferral of tax | Taxpayer, eligible expenditure/donation and applicable law | Tax treatment, not a grant payment |
| **Risk transfer / guarantee** | Insurance or guarantee that protects finances | Insurable exposure or lender requirements | Covers loss or reduces financing risk, not unconditional restoration income |

### 1.2 Evidence and availability taxonomy

Use these independent status fields; do not collapse them into a single “available” badge:

- `source_strength`: `PRIMARY_LAW`, `PRIMARY_OPEN_CALL`, `OFFICIAL_GUIDANCE`, `PROJECT_LIBRARY`, `SECONDARY_RESEARCH`, `DESIGN_INFERENCE`.
- `instrument_maturity`: `OPERATING`, `EMERGING`, `CONCEPTUAL`, `HISTORICAL`, `STRUCTURAL_FRAMEWORK`.
- `call_status`: `OPEN_CONFIRMED`, `FORTHCOMING_CONFIRMED`, `CLOSED_CONFIRMED`, `NOT_A_CALL`, `UNKNOWN_REVERIFY`.
- `applicant_fit`: `POSSIBLE`, `POSSIBLE_WITH_CONDITIONS`, `NOT_ELIGIBLE_ON_KNOWN_FACTS`, `INSUFFICIENT_INFORMATION`, `NOT_APPLICABLE`.
- `benefit_kind`: `GRANT`, `LUMP_SUM`, `PROCUREMENT`, `DONATION`, `REVENUE`, `OUTCOME_PAYMENT`, `CREDIT_SALE`, `DEBT`, `EQUITY`, `TAX`, `GUARANTEE`, `IN_KIND`.
- `financial_basis`: `FIXED_LUMP_SUM`, `PERCENT_OF_ELIGIBLE_COSTS`, `PER_HECTARE`, `PER_YEAR`, `PER_VERIFIED_UNIT`, `NEGOTIATED`, `UNKNOWN`.
- `amount_is`: `LEGAL_CAP`, `CALL_CAP`, `BUDGET_ENVELOPE`, `HISTORICAL_AWARD`, `ILLUSTRATIVE_NOT_OFFER`.

**Mandatory behavior:** A programme being legally established does not prove that an application can be filed today. A 100% grant rate does not prove that the applicant needs no cash. An area budget is not an individual grant. A private-sector outcome unit is not an EU-guaranteed source of revenue. Show missing evidence rather than silently filling it.

### 1.3 What the navigator should take from existing app features

The project/site and land-use planners may already know parcel area, municipality, land classification, owners, permissions, land-tenure duration, selected plants, irrigation, treatment costs, target habitat, site constraints, and proposed monitoring. Funding matching may consume these **existing** facts and request only missing ones. A plant list is not sufficient proof of restoration, carbon sequestration, additionality, forest eligibility, habitat conservation or revenue.

Useful independent questions: legal applicant; tax and nonprofit status; business activity/CNAE; unemployment/start-of-activity status if considering LEADER 2.7; municipal LEADER territory; actual parcel area; classified agricultural/forest/urban/natural land; site conservation status; tenure and remaining term; private benefit; project output; research novelty; investment budget and accessible cash; maintenance obligations; whether works started; open/closed call; existing public grants; willingness to publish findings or provide controlled public visits; availability of scientific and technical partners; and existence of a paying buyer.

---

## 2. Legal, ecological and financial constraints that affect nearly every route

**Geography is not a province-wide entitlement.** The selected AL20 measures apply only to the AL20 Zona Rural Leader (ZRL), which includes Alhama de Almería. Other municipalities (e.g. Níjar) may belong to a different GDR with different selected typologies and budgets. Verify municipality, the exact parcel position and official ZRL membership; do not use a single generic “Almería LEADER” flag.

**Land access is distinct from fundability.** A landowner, tenant, beneficiary of a usufruct, holder of a concession or nonprofit with a custodia del territorio agreement may have different standing under different calls. Prove the right to implement, maintain, monitor and, when necessary, permit controlled public access. Verify remaining tenure against the legally required retention period. Check whether the agreement survives sale and who owns improvements, plantings, data and credits.

**Nonprofit vs commercial purpose.** Nonproductive conservation support must generate genuine public-interest ecological or social value, not primarily private land appreciation or commercial forestry profit. A nonprofit can employ people and buy legitimate services, but cannot distribute its surplus as dividends. A founder's personally owned pilot plot improved with nonprofit/public money creates a conflict-of-interest and potential private-benefit issue requiring careful legal arrangements, fair approval and clear public benefit.

**Do not double finance.** Track each expense by invoice/activity/parcel/time period and by environmental outcome or unit sold. Different grants may coexist when their own cumulative-aid rules allow them, often only if costs are separate; selling a carbon or nature claim while a grant has financed the same outcome requires explicit methodological and contractual treatment. LEADER typology 2.7 lump-sum support is specifically incompatible with another grant for the same operation. Verify no double compensation or unsupported offset claims.

**Timing and expenditure commitments.** Many investment subsidies require applying before irrevocable commitments, beginning operations or starting a qualifying new business. Some permit preparatory studies with limitations; others have specific `acta de no inicio` procedures for land/real-property works. Do not mark a started project eligible without examining the relevant rule.

**Cash-flow realism.** Distinguish total project cost, eligible cost, noneligible cost, VAT treatment, own contribution, bridge financing, guarantee requirements, grant payment dates, running expenses, maintenance and final-retention liabilities. Under the 2026 Andalusian LEADER framework, advance payments of up to 50% may be possible under specified conditions, but normally require a guarantee equal to 100% of the advance: not “free upfront money”.

**LEADER cross-cutting constraints.** The April 2026 call is published for applications from 23 April 2026 through **31 December 2028**, potentially interrupted by ZRL-specific strategy modification; budget exhaustion and later amendments must be checked. A project must ordinarily score **at least 60 out of 100** under the published evaluation criteria. Beneficiaries are generally limited to **two LEADER grants in the same ZRL during the programming period**, with an exception for 2.7. “Noncompetitive” application processing does not mean automatic acceptance. Certain integral multi-typology operations may be possible, but cannot mix productive and nonproductive character and have their own rules. The published general ceiling for an integral operation may differ from a standard single-typology operation; verify the operative rule.

**Protected environments and hydro-legal rules.** Natura 2000, protected areas, forest-management prescriptions, heritage, watercourses, ramblas and public hydraulic domain may impose permissions or restrictions. In the Andarax demarcation the principal basin authority is the **Junta de Andalucía**. Rainwater-retention/erosion works are not exempt from checking flood and hydraulic-domain law merely because they are called “nature-based solutions”. Avoid false claims that a site can be irrigated, a channel altered or groundwater artificially recharged without authorization.

**Ecological validity precedes planting.** In semi-arid Almería a successful native habitat may consist of shrubs, perennial grass, biological soil crust, sparse trees and natural regeneration. “More trees” is not a universal objective. Assess reference habitat, soil conditions, precipitation, natural vegetation, grazing/erosion and species provenance. Restoration scores should reflect ecological function and long-term persistence, not just saplings planted.

**Measurement and additionality.** For outcome finance/credits, distinguish: baseline → counterfactual (“without project”) → interventions → quantified result → verification → claim ownership → permanence/leakage/reversal risks → buyer/retirement. Benefits such as reduced erosion, increased soil cover, infiltration and biodiversity cannot be assumed numerically from an unvalidated plant list.

**State aid and procurement.** Some commercial LEADER operations use EU `de minimis` state-aid rules; the general Regulation (EU) 2023/2831 ceiling is €300,000 per single undertaking over a rolling three-year period, with sector-specific exceptions and cumulation rules. Contract work is not the same as a subsidy. A nonprofit procuring services from a founder's business needs real work, fair pricing, conflict management and compliance with grant procurement rules. Tax treatment is fact-specific.

---

## 3. AL20 LEADER (Andalucía): exact selected typologies

### 3.0 Programme identity and local documents

- **Programme:** Plan Estratégico de la Política Agrícola Común 2023–2027 (PEPAC), Intervención **7119.2 LEADER**, `Grupo de Desarrollo Rural de la Alpujarra-Sierra Nevada Almeriense (AL20)`.
- **Regulation:** *Orden de 3 de febrero de 2026, por la que se aprueban las bases reguladoras ... Estrategias de Desarrollo Local LEADER ... Intervención 7119.2* (BOJA no. 29, 12 February 2026).
- **Call:** *Resolución de 13 de abril de 2026 ... ayudas para solicitantes que no son Grupos de Desarrollo Rural* (BOJA no. 76, 22 April 2026); general application period as noted above.
- **Original library source 1:** `Tipologías e importes AL20.pdf`; internal one-page signed sheet headed **“LÍNEAS DE AYUDAS Y TIPOLOGÍAS DE OPERACIONES SUBVENCIONABLES”**. This is AL20's actual **selection**, not every typology appearing in the general order.
- **Original library source 2:** `Listado criterios AL20.pdf`; signed list of **criterios/subcriterios de selección**. Review alongside the current official *Guía de instrucciones específicas de verificabilidad y controlabilidad ... (v2-4, 25-09-2026)* and actual call, because criteria are amended/clarified.
- **Supporting local research:** `Restoration with very little founder capital_ the best organizational and financing model for Almerí.pdf` (internal title **“Restoration with very little founder capital: the best organizational and financing model for Almería”**).

**Exactly selected in AL20:** `1.7`, `1.8`, `1.9`, `1.10`, `1.11`, `2.6`, `2.7`, `3.1`, `3.3`, `3.4`, `3.5`, `3.6`.

**Not selected for this AL20 sheet:** `3.2`, `1.1`–`1.6`, `2.1`–`2.5`. These may appear in the *general* Andalusian LEADER legal framework or another GDR, but must not be displayed as currently selected AL20 options. AL20's three **programme envelopes** are about **€330,052.59 (line 1)**, **€989,725.78 (line 2)** and **€710,649.89 (line 3)**, total approximately **€2,030,428.26**. These are not amounts reserved for a user or an individual project. Selected types do not each receive their own guaranteed budget.

### 3.1 Catalogue at a glance

| Stable ID | Exact selected AL20 type | Main applicant profile | Typical aid | Main funding logic |
|---|---|---|---|---|
| `LEADER-AL20-1.7` | Modernisation / startup of agricultural holdings | Eligible farm operators/undertakings | Normally 65%, max €200,000 | Productive agricultural investment |
| `LEADER-AL20-1.8` | Startup/modernisation of forestry holdings | Eligible forestry undertaking/holder | Normally 65%, max €200,000 | Productive forestry investment |
| `LEADER-AL20-1.9` | Processing/marketing agricultural products | Eligible agri-food SME | Normally 65%, max €200,000 | Commercial agricultural value chain |
| `LEADER-AL20-1.10` | Processing/marketing forest products | Eligible forest-product SME | Normally 65%, max €200,000 | Commercial forest value chain |
| `LEADER-AL20-1.11` | Agricultural/forestry support-service businesses | Eligible SME / new business | Normally 65%, max €200,000 | Commercial provision of agrarian/forestry services |
| `LEADER-AL20-2.6` | Startup/modernisation of general rural enterprises | Eligible SME / new business | Normally 65%, max €200,000 | Productive non-agricultural enterprise |
| `LEADER-AL20-2.7` | New economic activity with business plan | Eligible **individual** becoming autónomo | **€37,000 lump sum + up to €13,000** | Conditional business-creation milestones |
| `LEADER-AL20-3.1` | Studies/plans linked to rural conservation and sustainability | Eligible public/nonprofit | Up to 100%, max €28,000 | Public-interest nonproductive study |
| `LEADER-AL20-3.3` | Promotion/information/awareness | Eligible public/nonprofit | Up to 100%, max €28,000 | Public-interest awareness and outreach |
| `LEADER-AL20-3.4` | Demonstration related to rural conservation/social sustainability | Eligible public/nonprofit | Up to 100%, max €28,000 | Nonproductive novel, transferable demonstration |
| `LEADER-AL20-3.5` | Conservation/protection/rehabilitation/recovery of rural heritage, incl. environmental | Eligible public/nonprofit | Up to 100%, max €200,000 | Nonproductive physical heritage/nature conservation |
| `LEADER-AL20-3.6` | Sustainable rural public-benefit infrastructure, tools and services | Eligible public/nonprofit | Up to 100%, max €200,000 | Nonproductive public/community infrastructure |

**Important qualification:** These are legal maxima/general characteristic rates; precise eligible applicants, thresholds and costs must be rechecked under the applicable legal typology and AL20-specific call. They are not twelve open cash offers independent of budget and scoring.

### `LEADER-AL20-3.1` — Environmental studies, plans and programmes

- **Concept:** Commission or produce a public-interest study, plan or programme on conservation of rural heritage, quality of life and social/sustainable development. The study must be a genuine usable product with outcomes accessible for the intended public or territory; do not confuse it with ordinary grant application writing or a purely private consultant's design assignment.
- **Algarroba-fit examples (interpretations, not automatic eligibility):** A publicly useful local inventory of degraded dryland habitats; an evidence-based municipal ecological-connectivity and native-species recovery plan; an erosion/degradation diagnosis and local restoration manual; a community stewardship feasibility assessment tied to rural conservation.
- **Indicative maximum:** €28,000 and up to 100% eligible expenditure; reimbursement logic; eligible public/nonprofit-type bodies and any additional requirements in the full typology.
- **Evidence:** Defined study boundary, competent provider/team, methodology, beneficiaries, intended use, outputs, dissemination plan and proof it is not merely a standalone technical design for a separately funded construction job.
- **Exclusion/uncertainty:** Avoid representing routine private due diligence, investor analysis or an architecture/engineering design commissioned solely for a private property as an eligible public-interest 3.1 project.
- **Sources:** original `Tipologías e importes AL20.pdf`; `Listado criterios AL20.pdf`; official **Orden de 3 de febrero de 2026**, annex 3.1.

### `LEADER-AL20-3.3` — Promotion, information and awareness

- **Concept:** Noncommercial public-interest information, outreach and participation related to environmental heritage and rural sustainability.
- **Algarroba-fit examples:** Practical events on protecting native dryland habitats; schools and landowners learning about soil erosion and natural regeneration; publication of a free local ecological-restoration guide; participatory nature monitoring with public-facing materials.
- **Indicative maximum:** €28,000, up to 100% for the nonproductive version; verify applicant and permitted item types. Personnel, logistics, media, materials and venue costs may qualify where explicitly supported.
- **Exclusions:** No disguised brand advertising, recurring events without additionality under the specified rules, general commercial marketing, permanent capital works masquerading as awareness.
- **Evidence:** Audience, programme, learning outcomes, outreach deliverables, attendance, accessibility and dissemination metrics.
- **Sources:** original AL20 selection/criteria; official 2026 order annex 3.3.

### `LEADER-AL20-3.4` — Nonproductive novel demonstration

- **Concept:** **Experiment, test and evaluate** a technology, process, method or approach that is **new or not known in the relevant Zona Rural Leader** and capable of replication under similar circumstances. Organizing the experiment and disseminating its results are central.
- **Algarroba-fit examples:** A controlled comparison of passive regeneration, selective management of existing Salsola-dominated biomass, mulching without inappropriate soil disturbance, water-harvesting microfeatures where permitted, and native shrub establishment. Test scientific hypotheses rather than presupposing every cleared square metre must receive trees.
- **Indicative maximum:** **€28,000; 100% eligible nonproductive costs**; reimbursement.
- **Likely applicant:** Eligible public legal entities/nonprofits, public-law bodies and qualifying publicly participated companies as defined; **not an ordinary private individual wanting free improvements to personal property**.
- **Central tests:** Novelty to the ZRL, demonstration protocol, genuine evaluation, counterfactual or comparison, transferability, public dissemination. Keep publicly available information on methodology, execution and results for the required period (the rules refer to at least three years after final payment).
- **Cost restrictions:** Strict rules on permanent improvements, immovable assets and investments used for the demonstrator; do not assume a permanently planted private orchard is covered. Check equipment rental vs ownership, legal use of the site, public-interest rationale and all article-11 exclusions.
- **Not this type:** Improving commercial competitiveness of a forestry/agricultural business; merely executing a standard restoration without a test/evaluation; a marketing showcase for a private commercial product; recurring identical events with no value added.
- **Required design evidence:** Objective and research question, reference habitat, baseline, replicates/control areas where feasible, treatment protocol, scientific/technical support, schedule, monitoring variables, pre-specified success criteria, transferability rationale, open results, cash-flow and land/ownership agreement.
- **Sources:** original AL20 selection/criteria; official **Orden 3 febrero 2026**, annex 3.4.

### `LEADER-AL20-3.5` — Conservation, protection, rehabilitation and recovery of rural heritage including the environment

- **Concept:** Substantive **nonproductive** physical conservation/restoration of qualifying rural heritage or natural heritage; ecological public benefit rather than forestry production.
- **Algarroba-fit examples:** Restoration of degraded native shrublands, habitat connectivity, erosion-stabilisation measures compatible with environmental rules, recovery of noncommercial natural vegetation, protection of a natural-heritage site and ecological access/interpretation facilities where genuinely connected to conservation.
- **Indicative maximum:** **€200,000, up to 100% of eligible costs**; reimbursement.
- **Applicant:** Eligible public bodies, public/nonprofit legal persons and qualifying publicly participated companies — **not an ordinary private individual** under this typology.
- **Key legal condition:** The operation must include **diffusion and/or public use** of the heritage asset. Where a site is fenced or otherwise enclosed, a plan explaining actual days and hours of opening or other suitable ways for the public to engage must be part of the project. Do not infer unrestricted physical access is required for sensitive habitats; justify conservation-compatible access/interpretation.
- **Further constraints:** If a forest management plan or equivalent is legally required, the operation must conform to one **valid at application**. Funding is not intended for improving the economic value/productivity of forests or production/marketing of agricultural and forest products. **Acquisition of the heritage asset itself is excluded**; distinguish implementation from buying the plot.
- **Evidence:** Ecological baseline, legal land rights, resource conservation value, pressure analysis, restoration method, maps and bill of quantities, public-benefit/public-use plan, permissions, maintenance, monitoring and appropriate environmental safeguards.
- **Sources:** original AL20 selection/criteria; official **Orden 3 febrero 2026**, annex 3.5.

### `LEADER-AL20-3.6` — Sustainable rural infrastructure, equipment, tools and services

- **Concept:** Creation/improvement of facilities or services primarily benefiting community life, public sustainability, local associations and sustainable rural development rather than production or the conservation works themselves.
- **Algarroba-fit examples:** A genuinely public-use community nature-learning space, accessible shared biodiversity monitoring resource, nonprofit collaboration tools or community participation facilities. A proprietary commercial software platform or private equipment fleet is a doubtful fit.
- **Indicative maximum:** €200,000, up to 100% nonproductive eligible costs.
- **Exclusion:** 3.6 **expressly separates** restoration of rural/environmental heritage (3.5), one-off studies (3.1), promotional events (3.3), demonstrations (3.4) and productive commercial investments. Do not classify all “green infrastructure” automatically under 3.6.
- **Evidence:** Public service demand, who can access, operating body, public/noncommercial character, ongoing maintenance and environmental/social benefit.
- **Sources:** original AL20 selection/criteria; official **Orden 3 febrero 2026**, annex 3.6.

### `LEADER-AL20-2.7` — Startup of a new individual self-employed activity

- **Concept:** An **individual natural person** beginning a genuinely new full-time self-employed business, implementing a qualifying approved economic plan. It is **not** a biodiversity-grant scheme and **not** a grant to create a nonprofit or improve privately owned land without a business.
- **Financial structure:** **€37,000 base lump sum** (€18,500 first payment + €18,500 final payment) with **up to €13,000 additional** at final payment, absolute maximum **€50,000**. It is awarded against plan achievement, not by reimbursing an arbitrary invoice list.
- **Bonus criteria (subject to overall €13k cap):** €6,000 if registered business location satisfies a qualifying disadvantaged/constraints territory criterion; €5,000 applicant younger than 35; €5,000 female applicant; €5,000 qualifying additional full-time job sustained at least 12 months; €3,000 qualifying climate-mitigation/adaptation scoring. These are conditional, **not additive beyond €13k** and not all assumed from the municipality name.
- **Timing:** Must be unemployed at application and have accumulated unemployment during at least 50% of the previous three months; must not have been registered in RETA in the same CNAE group activity in the previous three years; establish activity through the required RETA and tax registrations after applying and within the stipulated period around award notification; municipality registration in the ZRL by commencement; dedicate oneself exclusively to the activity.
- **Business milestones:** Implement approved plan within **24 months** from commencement; first year intermediate net return at least half the relevant annual SMI benchmark; second year/final net return at least applicable annual SMI; full-time self-employment maintained until **three years after final payment**. Precise account definitions and enforcement belong to the original order.
- **Exclusion of particular interest:** Agricultural/forestry production, processing and **services supporting the agricultural/forestry sector when classified under 1.11** are excluded from 2.7. Do not describe any “forestry consultant” as automatically eligible for 2.7. Mixed-sector activity classification must be resolved by GDR in writing based on actual service customers and operations.
- **Possible genuinely independent business concepts:** Paid GIS mapping, monitoring technology or environmental data services if AL20 classifies them under 2.7 rather than 1.11; environmental education/services to non-forest markets, subject to the real CNAE and business plan. Merely calling a forestry service “technology” does not overcome the explicit exclusion.
- **Evidence:** Unemployment history, prior RETA/CNAE, resident municipality, planned full-time self-employment, commercial market, detailed forecast with SMI milestones, tax/registration timing, continuity capacity, grant history and written activity classification from AL20.
- **Major warning:** No “€50,000 to invest in a foundation” promise; no routing the award to a related association as subsidy capital; no double aid for same operation; source regulation governs compatible employment.
- **Sources:** original AL20 selection/criteria; official **Orden 3 febrero 2026**, annex 2.7; original `Restoration with very little founder capital_ the best organizational and financing model for Almerí.pdf`.

### `LEADER-AL20-1.11` — Agricultural/forestry service businesses

- **Concept:** Genuine SME that supplies services **to agricultural and/or forestry operators**. The same forestry-service activity excluded from 2.7 may be a better thematic fit here, but usually involves capital investment rather than a lump-sum creation payment.
- **Indicative support:** **65% of eligible productive investment, maximum €200,000 per operation**, subject to de minimis where applicable. Need a real private contribution (nominally at least 35% of eligible expenditure), plus any ineligible costs and bridge cash.
- **Algarroba-fit examples:** Paid forestry planting/maintenance, native revegetation contracting, forest inventory, drone/GIS monitoring for forest operators, specialist native-plant or forest-management services where the main customer market is agriculture/forestry. Exact activity depends on legal wording and GDR classification.
- **Evidence:** SME status, actual customer segment, price list/contracts, equipment/qualified labour, cash-flow, traceable procurement, business feasibility, eligible investment costs and continuity.
- **Warnings:** Does not finance donation-funded ecosystem conservation merely because a contractor performs the labour. Do not double finance machinery also charged to other grants; no automatic entitlement for a founder's private noncommercial demo.
- **Sources:** original AL20 documents; official **Orden 3 febrero 2026**, annex 1.11; original low-capital financing study.

### `LEADER-AL20-2.6` — Startup/modernisation of general rural enterprises

- **Concept:** Productive rural SMEs outside the more specific agriculture/forestry support categories (where classified accordingly), with real business investment.
- **Indicative support:** **65% of eligible investment, max €200,000**, subject to state-aid rules.
- **Possible examples:** A commercial environmental information/GIS firm, specialist visitor/environmental education service, software or environmental consultancy serving broader industries; only if the real activity and EDL criteria fit 2.6.
- **Key classification rule:** If services primarily serve agricultural/forestry sector they may belong to 1.11. If activities overlap, the general legal rule looks at predominant characteristics and AL20 may determine the line when there is no predominant sector.
- **Evidence:** Eligible SME, viable customer demand, assets/invoices, budget/finance, site and any operating permits.
- **Sources:** original AL20 documents; official order annex 2.6.

### `LEADER-AL20-1.7` — Agricultural holdings

- **Concept:** Startup, modernisation and competitiveness of **genuine farm holdings**; environmental improvements can be part of an eligible productive agricultural operation.
- **Indicative support:** generally 65% eligible investment, max €200,000 under the selected standard measure.
- **Possible examples:** A legitimate rain-fed farm with productivity and environmental improvements; equipment or modernization helping reduce agricultural impact while maintaining agricultural character. An entirely nonproductive native shrubland reserve is **not** a farm merely because carob or almond trees are in the planting plan.
- **Key caution:** Explicitly excluded types of new/modernized irrigation infrastructure under this typology unless the rule states a particular exception; water law, access, SIGPAC/registration and farm legitimacy matter.
- **Sources:** original AL20 documents; official order annex 1.7.

### `LEADER-AL20-1.8` — Productive forestry holdings

- **Concept:** Startup, modernization or competitiveness of an economically genuine forestry holding, with documented title/usage rights and forest-management character.
- **Indicative support:** generally 65% eligible investments, max €200,000.
- **Possible examples:** Productive forestry enterprise improvements with environmental standards, rather than a noncommercial nature reserve. Land classification, viable forestry use and management plans are major filters.
- **Caution:** Productive forest investment is distinct from ecological conservation under 3.5 and from public PEPAC nonproductive forestry measures. Check restrictions and state-aid basis.
- **Sources:** original AL20 documents; official order annex 1.8.

### `LEADER-AL20-1.9` — Processing/marketing agricultural products

- **Concept:** Investment in agricultural-product transformation, processing and commercialization by eligible businesses.
- **Indicative support:** generally 65% eligible costs, max €200,000; legal state-aid treatment varies with agricultural Annex I product/output classification.
- **Possible examples:** Actual value-added food/crop chain from eligible cultivation; a hypothetical carob-processing venture **only** if business, product scope and investment meet the typology.
- **Not:** Native-tree planting for ecological reasons, a seedling giveaway, or general conservation without a market product.
- **Sources:** original AL20 documents; official order annex 1.9.

### `LEADER-AL20-1.10` — Processing/marketing forest products

- **Concept:** Investment in a genuine forest-product processing and marketing enterprise (e.g. qualifying forest biomass/wood/nonwood products) under actual programme rules.
- **Indicative support:** generally 65% eligible investment, max €200,000; check de minimis.
- **Possible examples:** Verified sustainable forest-products value chains, not unqualified removal of ecologically useful scrub as an imaginary commercial forestry feedstock.
- **Evidence:** Forestry-product eligibility, source legality, plant/equipment, sales, environmental permits and supply sustainability.
- **Sources:** original AL20 documents; official order annex 1.10.

### AL20 design caveats

- `3.1`, `3.3`, `3.4`, `3.5`, `3.6` are **separate eligible purposes**. A study, event, demonstration, conservation work and public infrastructure are not interchangeable.
- All AL20 selected operation types inherit **the actual scoring criteria**, geography, budget, declaration, verification and financial requirements. Do not infer awards solely from thematic match.
- Pre-existing eligible activities under other GDRs cannot be imported automatically into AL20; verify local selection first.
- The coexistence of grant types in the catalogue is **not** permission to apply repeatedly for the same invoice, same activity or same environmental outcome.
- 2.7 business plan payments must never be represented as reimbursement percentages; 1.11 / 2.6 productive investment must never be represented as unrestricted lump sums.

---
## 4. Other Andalusian, Spanish and sectoral public funding

> Entries in this section are separate **programme families or precedents** unless an actual identified open call is stated. A law, funding authority or previous successful project does not constitute a continuously available grant. Status is **UNKNOWN_REVERIFY** by default.

### `ES-AND-PEPAC-FOREST-PREVENTION` — Forest damage prevention, intervention 6881.2

- **Official family:** PEPAC 2023–2027 intervention **6881.2**, Andalusian measures for prevention of forest damage, especially wildfire prevention; check the Andalusian regulatory order, including the order of **5 December 2025** and subsequent amendments/calls.
- **What it can support:** Qualifying forest-risk reduction, fire prevention or related preventive management on eligible forest land under the actual call. This is more specific than a general reforestation subsidy.
- **Applicants:** Eligible forest owners/managers or other entities as defined in each call; may require management plan, area, qualifying forest cover/ownership and forest-risk prioritisation.
- **Algarroba application:** If an actual forest parcel needs ecologically compatible prevention work or habitat-resilient management, screen this family. Not obviously suited to planting a small orchard or testing Salsola biomass on non-forest agricultural land.
- **Finance:** Call-defined eligible investment/co-financing; no unverified rate or ceiling asserted here.
- **Status:** Enabling framework / call-specific; confirm whether an application period and eligible actions exist on the query date.
- **Sources:** official Andalusian order and relevant call (not uploaded as a named standalone PDF in this project inventory); `DOC20251216140451PROYECTO SELVICOLA.pdf` as a separate forestry-work precedent.

### `ES-AND-PEPAC-FOREST-ENVIRONMENT` — Nonproductive environmental forestry, intervention 6881.4

- **Official family:** PEPAC **6881.4** for nonproductive forestry investment, environmental silviculture and/or forest ecological condition under its operative calls.
- **Possible fit:** Native habitat improvement, stand/forest resilience, biodiversity-friendly woodland management and targeted interventions on legally eligible forest land.
- **Evidence:** Forest status, title/manager, compatible management instrument, ecological objective, eligible prescriptions, permissions, biodiversity safeguards, tendered work plans.
- **Caution:** The phrase “nonproductive forestry” does not automatically include every nonproductive parcel or every planting technique. Geographic and area thresholds must be obtained from the individual convocatoria.
- **Status:** Specific call to verify; do not mark `OPEN_CONFIRMED` solely because general bases exist.

### `ES-CAP-DIRECT-ECO` — CAP area payments and eco-schemes

- **Nature:** Agricultural income support / area-based practices, not a restoration project grant.
- **Possible recipients:** Eligible `agricultor activo` with qualifying SIGPAC agricultural hectares, claims and practices.
- **Potential relevant practices:** Depending on the programme and year, agroecological or soil-protective farming, permanent vegetation cover, biodiversity-related practices, organic agriculture or extensive grazing. Exact lists and payment levels are campaign-specific.
- **Algarroba application:** Useful only if a parcel is a genuine eligible farm and the selected practice satisfies the agricultural conditions. No payments for a private natural shrubland merely because it is biodiverse.
- **Risks:** Conversion of habitat to agriculture to access subsidies may be ecologically damaging or legally restricted; maintain eligibility without degrading protected vegetation.
- **Status/amount:** Annual claim and current regional/national rules; no fixed euro-per-hectare promise here.

### `ES-CAP-AGROENVIRONMENT-ORGANIC` — Agroenvironment-climate and organic management

- **Nature:** Regional PEPAC commitments, sometimes over multiple years, compensating incremental cost/income foregone for specified agricultural practices.
- **Fit:** Practicing eligible farmers using soil, vegetation, grazing, landscape-feature or input-management measures that meet the actual commitment.
- **Evidence:** Farmer and parcel registration, baseline and additional practices, management logs, inspections, area, multi-year commitment.
- **Risks:** Do not combine payments for an already-required practice without additionality/compatibility assessment; an ordinary restoration NGO is not a farmer merely by leasing land.

### `ES-CAP-EIP-AGRI-7161` — EIP-AGRI innovation Operational Groups

- **Nature:** Cooperative innovation programme connecting agricultural/forest practitioners, researchers, technologists, associations and advisers, known as **Grupos Operativos** under the EIP-AGRI approach.
- **Proposed fit:** Testing low-water rehabilitation methods with working farmers, sustainable biomass/soil treatments, sensor-backed natural regeneration, land management and climate resilience with demonstrable sector uptake.
- **What differs from 3.4:** A multi-actor applied-innovation project with an agricultural/forestry sector need, joint work programme and partnership governance, rather than just a small public-interest local demonstration.
- **Evidence:** Operational group agreements, sector innovation problem, replication and adoption potential, experimental work packages, user role, budgets, dissemination and the actual call.
- **Status:** The identified Andalusian round ran **7 October 2025 to 6 February 2026** and is closed as of this document date; later calls **UNKNOWN_REVERIFY**.
- **Sources:** official Andalusian EIP-AGRI / PEPAC 7161 call; no exact original project-library PDF for the official call.

### `ES-FB-RENATURALISATION-BASES` — Fundación Biodiversidad, agrarian/forest renaturalisation legal basis

- **Original project PDF:** **`BASES-REGULADORAS.pdf`**. **Important:** This PDF is **NOT** the Andalusian LEADER basis. Its printed title is **“Orden TED/870/2025, de 5 de agosto, por la que se aprueban las bases reguladoras para la concesión de subvenciones de la Fundación Biodiversidad, F.S.P., en régimen de concurrencia competitiva, para fomentar actuaciones dirigidas a la renaturalización y restauración ecológica en el ámbito agrario y forestal”** (BOE-A-2025-16485).
- **Nature:** National enabling regulation for competitive **Fundación Biodiversidad** calls to convert or manage eligible agrarian/forestry land toward ecological restoration and sustainable territorial objectives. **Not itself an Almería-wide open grant.**
- **Potential beneficiaries under enabling bases:** Qualifying **natural persons who have real rights allowing works**, private legal entities with suitable land rights, environmental NGOs, qualifying public bodies, research/academic institutions, and defined groupings. The ultimate call can add further location and eligibility filters.
- **Support types:** Establishment/afforestation and natural-area creation, eligible investments, and where called for, **periodic annual per-hectare premiums** for maintenance and income foregone. Payments and duration depend on the individual call; enabling bases discuss periodic support up to **12 years** for applicable commitments.
- **Regulatory boundaries:** The enabling order allows up to **100% of eligible costs** and specifies aggregate per-beneficiary aid per hectare in the range of **€500 to €200,000 per hectare** as subsequently determined by call. **This is a per-hectare legal regulatory boundary, not an offer of €200,000 for every hectare**, and it must not be confused with the €200,000 LEADER per-operation ceiling.
- **Good design:** Genuine renaturalisation with scientific ecological baseline, legal title, previous land use, hydrological pressure reduction where applicable, additional habitat function, realistic planting/natural regeneration, maintenance, monitoring, eligible area boundaries and legal guarantees.
- **Bad assumptions:** Calling the enabling basis an open national payment; claiming that any Almería landowner automatically qualifies; assuming per-ha ceiling equals payout; assuming tree-planting monoculture is required.
- **Status:** `NOT_A_CALL`; match only when a compatible specific convocatoria is present and independently verified.
- **Related historical programme:** `ES-FB-DONANA-2025` below.

### `ES-FB-DONANA-2025` — Doñana renaturalisation call (geographically excluded for Almería)

- **Exact call title:** **“Convocatoria de ayudas para la renaturalización y restauración ecológica en el ámbito agrario y forestal en el área de influencia de Doñana”** (2025), Fundación Biodiversidad / Orden TED/870/2025.
- **Location:** Delimited **Doñana influence area**, not Almería, Sierra de Gádor, or the Andarax.
- **Availability:** Opened **27 October 2025**, closed **15 January 2026**. **CLOSED_CONFIRMED** at reference date. Do not put it into “open funds for Alhama”.
- **Budget and payment example:** Approximately **€28.5 million** programme budget, call information describing aid of **up to €7,000 per hectare and year over ten years**, subject to specific conditions; not a generic Spanish rate. Provisional resolution published **October 2026** preselected **66 applications, ~407 hectares**, not final entitlement for other projects.
- **Why it matters:** Demonstrates that policy can pay landholders over years to renaturalise agrarian/forestry land and restore habitats/water function. Useful as a **design and precedent document**; not as an available local grant.
- **Original project PDFs:** `BASES-REGULADORAS.pdf`; `report_Propuesta-Resolucion-Provisional_Donana_renat_CON-TABLAS.pdf`, printed **“Propuesta de resolución provisional de la convocatoria de ayudas ... Doñana”** with project tables.
- **Evidence needed to learn from it:** Eligible land use, prior irrigation/production status, hectares, baseline water use, qualified land rights, maintenance years, technical guide and payment modules. Never transpose scoring or amounts automatically to other calls.

### `ES-FB-BIODIVERSITY-FORESTS` — Other Fundación Biodiversidad biodiversity, forest and bioeconomy grants

- **Family:** Other competitively awarded national projects for forest bioeconomy, biodiversity restoration, sustainable nature-based enterprises, green employment or ecosystem improvement. Programme boundaries change frequently with European funds/PRTR and calls.
- **Possible fit:** Forest bioeconomy with measurable ecological outcomes, nonprofit-led landscape conservation, science-backed vegetation/habitat recovery, social innovation and skill-building, or community governance **if named in the specific call**.
- **Who:** May target nonprofits, research/education organisations, public bodies, companies, groupings or landholders; depends entirely on the published notice.
- **Warning:** Doñana, Mar Menor, coastal areas, urban renaturalisation, DANA recovery and other place-specific calls are not interchangeable. An eligible organization in Spain is not enough if the plot lies outside the area or type.
- **Status:** `UNKNOWN_REVERIFY`; programme-family watchlist, not open-call assertion.
- **Source:** original `BASES-REGULADORAS.pdf` pertains only to the renaturalisation regulation, not all Fundación Biodiversidad schemes.

### `ES-FB-EMPLEAVERDE` — Empleaverde+ and green-economy skills/employment

- **Nature:** Fundación Biodiversidad employment/training initiatives, often supported by European Social Fund Plus (ESF+), targeting eligible employment outcomes, entrepreneurship and workforce skills.
- **Possible fit:** Training local workers in ecological monitoring, native plant establishment, habitat rehabilitation, GIS data skills and green employment; particularly where programme inclusion/target-population requirements are met.
- **Different purpose:** Does **not** generally pay for arbitrary trees or land purchase. Must measure training, employability, qualification and participant eligibility.
- **Who:** Actual call defines employers, nonprofits, training providers, partnerships and target participants.
- **Evidence:** Curriculum, trainers, placements or documented employment outcomes, eligible target groups, costs, data protection and safeguards.
- **Status:** Verify open call and ESF+ implementation rules.

### `ES-MITECO-PRTR-RESTORATION` — NextGenerationEU / PRTR project funding

- **Nature:** Time-bounded Spanish recovery and resilience investments, public grants and procurements for forest, river, watershed, biodiversity, coastal and climate-adaptation projects; **not** one generic open pot.
- **Algarroba fit:** Most plausibly as a subcontractor, local technical participant, land partner, or bidder in an actual tender rather than expecting unrestricted direct funding for a private parcel.
- **Original local precedents:** `NJyGw38d59Ey04J43U5QT4SaaiG3G6.pdf` (Andarax restoration investment justification); `26_ Resolución_6_2022_ES.Enc(F).pdf`; `10_ Resolución.Encargo(F).pdf`; `DOC20251216140451PROYECTO SELVICOLA.pdf` (national park buffer / PRTR funding in its own specific context).
- **Status:** Historical/project-specific until a current call or contract is identified. Separate grant awards from public administrative `encargos` to Tragsa/Tragsatec.

### `ES-JA-FOREST-REHABILITATION-OTHER` — Regional forest restoration and habitat investments

- **Family:** Other Junta de Andalucía measures for forests, risk prevention, biodiversity and restoration, including protected-area, environment and rural programmes beyond the selected local LEADER measures.
- **Potential:** Eligible landowner/manager, municipal project or conservation organisation, depending on call; restrictions often concern forest status, management instruments, safety and public benefit.
- **Evidence:** Specific order and convocatoria, intervention number, beneficiary profile, eligible cost list, hectares, forest-plan conformity and open date.
- **Important:** Do not merge these with LEADER 3.5 solely because both mention ecological recovery.

### `ES-FEDER-REGIONAL` — FEDER regional green infrastructure / resilience programmes

- **Nature:** European Regional Development Fund investments administered through Spanish/Andalusian operational programmes and selected public/private calls.
- **Possible uses:** Municipal ecological connectivity, green-blue infrastructure, sustainable drainage, watershed resilience, environmental digital infrastructure, nature-based services and sector development where an actual action allows it.
- **Typical applicant:** Often public bodies or supported consortia, but rules differ by managing authority and call.
- **Algarroba fit:** Municipal partner, paid contractor or nonprofit implementing public-benefit components; not a presumption of direct financing for an individual owner's parcel.
- **Evidence:** Programme priority, managing authority, eligible geography, measurable output indicators, public procurement and state-aid controls.

### `ES-LOCAL-MUNICIPAL` — Local environmental, social and participatory budgets

- **Family:** Ayuntamiento, Diputación Provincial de Almería, municipal participatory budgets, provincial development programmes, public-education/community grants or local land stewardship agreements.
- **Fit:** Small public-space restoration, environmental awareness, school/community stewardship, educational planting if ecologically appropriate, local monitoring, community facilities.
- **Important:** Each municipality and fiscal year is a separate opportunity. A municipality may support in kind (land, equipment, maintenance) rather than award a cash subsidy.
- **Evidence:** Official municipal budget line or call, council resolution, agreement, land ownership, benefit to residents, safe public access, maintenance role.
- **Status:** `UNKNOWN_REVERIFY`; **never invent an existing municipal grant**.

### `ES-PARK-NATURA2000-RURAL` — Protected-area and park socioeconomic-impact aid

- **Family:** Grants or budget lines for socio-economic influence areas of national parks, protected areas or Natura 2000-linked investments, subject to site-specific restrictions and funding windows.
- **Real local precedent:** `DOC20251216140451PROYECTO SELVICOLA.pdf` — printed title **“Tratamientos selvícolas para mejorar hábitats de especies amenazadas en el Monte del Pueblo de Ferreira (Ferreira)”**; technical forest works linked to a grant for areas of socio-economic influence of National Parks, **2023 call**, supported by PRTR.
- **Applicability:** A demonstration outside a park influence area or protected designation does not inherit this project's funding. Check official boundary, applicant and current call.
- **Project concept:** Habitat improvement and compatible management in a legally eligible public/protected forest; may involve public tenders and technical plans.

### `ES-WATER-CATCHMENT` — Water and river-restoration authority budgets and contracts

- **Nature:** Works, plans and commissions financed under water administration, flood-risk, hydro-forest restoration, public river management or climate adaptation; sometimes financed by PRTR/FEDER.
- **Fit:** Legal riverbed/ramblas management, erosion reduction, sediment management, native riparian rehabilitation, runoff infiltration where legally and scientifically appropriate, monitoring.
- **Applicants/contracting:** Water administration, municipalities, engineering consultants, contractors or delegated public entities depending on call/contract.
- **Not:** Private intervention in `dominio público hidráulico` without authorization; no claim of groundwater recharge outcome without measurements.
- **Original precedents:** `DOC2026081811211505__PPTP__ Redac__ Proyecto Rambla Aljibe.pdf` (technical specifications for drafting Rambla del Aljibe hydrological-forest restoration project, Vícar); `NJyGw38d59Ey04J43U5QT4SaaiG3G6.pdf` (Andarax investment justification); `26_ Resolución_6_2022_ES.Enc(F).pdf`; `10_ Resolución.Encargo(F).pdf`.

### `ES-CARBON-REGISTRY` — MITECO voluntary carbon absorption project registry

- **Distinct from:** Grant funding; **voluntary Spanish registration and compensation marketplace** for eligible carbon removals. Registering does not mean MITECO buys the carbon.
- **Official source title:** MITECO **“Inscripción de proyectos de absorción de dióxido de carbono”** and **“Preguntas y respuestas ... Registro de huella de carbono, compensación y proyectos de absorción”**.
- **The key verifiable eligibility conditions:** (a) Qualifying afforestation where land was not forest since **31 December 1989** or qualifying burned-forest recovery; (b) **minimum one hectare** unit; (c) at least **20% tree canopy at maturity** and potential forest-tree height at least **3 m**; (d) **at least 30 years** permanence; (e) management plan, approved calculation method and monitoring reports **every five years**; other provenance/timing conditions apply.
- **Algarroba fit:** A ecologically sensible, legally qualifying **larger forest restoration** project may be registered and contract carbon compensation with willing organizations. A **0.45 ha** single parcel is below the published 1 ha threshold. A sparse native dryland-shrub restoration with no intention/ability to reach defined forest cover may be ecologically valuable but ineligible for this specific registry.
- **Carbon revenue:** Model certified quantity and actually **sold** volume separately; seller must secure rights to claim, avoid duplicate sale, monitor reversal risks, and negotiate a price with buyer. Do not assume a tonne price or automatic sales.
- **Other cautions:** Registry credits/absorption units are **not** EU Emissions Trading System compliance allowances and do not necessarily meet rules of independent international standards.
- **Status:** Registry framework operates; actual projects subject to acceptance; market sales speculative.

---

## 5. European, international and innovation-finance programmes

### `EU-LIFE-NATURE` — LIFE Nature and Biodiversity (Standard Action Projects)

- **Purpose:** Demonstration and implementation of nature and biodiversity conservation, ecological connectivity, habitat/species recovery, EU nature-policy deployment, replication and evidence-based impact.
- **Suitable projects:** Multi-site restoration that protects genuinely important habitats, addresses threats, builds stakeholder governance, has strong post-project management and replicable results. Nature-based dryland restoration can be thematically relevant but will not qualify merely because it plants trees.
- **Applicants:** Public bodies, nonprofits, companies and consortia according to the call; eligible land rights, capacity and co-financing matter. A first-time small local entity may be a viable field/monitoring partner rather than coordinator.
- **Costs:** Typically partial co-financing; exact LIFE subprogramme funding rates, consortium requirements and eligible costs must be taken from that year's call, not inferred from LEADER 100% rates.
- **Status:** LIFE **2026 Standard Action Project application deadline 22 September 2026 has passed**. Future calls need verification.
- **Evidence:** Clear EU added value, ecological baseline, conservation-target indicators, formal partner work packages, stakeholder/landowner commitment, implementation risks, budget, permits and post-grant continuity.
- **Sources:** official **“LIFE Calls for proposals 2026”** and CINEA; no separate full LIFE call PDF in current local library. The local LIFE CUSTODIA research document is a **financing research product**, not a grant application under LIFE Nature.

### `EU-LIFE-CLIMATE` — LIFE Climate Change Adaptation

- **Purpose:** Real-world climate-risk adaptation, resilience and practical demonstration of effective responses.
- **Potential fit:** Landscape drought resilience, erosion/runoff management, climate-adaptive native vegetation, river catchment measures, heat and habitat functions, credible monitoring and policy integration.
- **Critical design distinction:** Measure climate **risk reduction** (e.g. soil loss risk, water retention or ecosystem resilience) with a valid method; do not simply relabel ordinary tree planting “adaptation”.
- **Who and finance:** Eligible organisations/partnerships and call-defined co-funding. Avoid implying this is an open call in late October 2026.

### `EU-LIFE-GOVERNANCE` — LIFE environmental governance, information and participation

- **Potential fit:** Shared land stewardship and conservation governance, landowner engagement, knowledge transfer, regulatory delivery, citizen participation, capacity building and monitoring standards.
- **What it is not:** A catch-all route for paid installation of shrubs on privately owned land with no governance/intervention transfer outcomes.
- **Local implementation precedent:** **LIFE CUSTODIA (LIFE23-GIE-ES-LIFE Stewardship)** underpins `Instrumentos_financiacion_naturaleza.pdf` and shows a governance-oriented nature finance project exists; it does not award the startup restoration simulator a grant.

### `EU-LIFE-STRATEGIC` — LIFE Strategic Nature Projects and related integrated projects

- **Purpose:** Large, multi-actor delivery of national/regional nature and environmental strategies with coordinated funding sources.
- **Likely promoters:** Public regional/national authorities or large coordinating bodies with substantial institutional and financial capacity.
- **Possible role:** Local restoration demonstration, monitoring, stewardship or subcontracted work in a wider integrated public project.
- **Caution:** Far more complex and institutionally anchored than an individual landowner's site; topic and application format differ from Standard Action Projects.

### `EU-HORIZON-NATURE-LIVINGLAB-2027` — Horizon Nature restoration living labs

- **Verified open topic (30 October 2026):** **HORIZON-NATURE-2027-02-02**, *“Living labs co-creating solutions for the restoration of ecosystems addressing implementation bottlenecks and improving resilience to risks”*.
- **Opening:** **13 October 2026**; **deadline 14 January 2027, 17:00 Brussels time**; **HORIZON-RIA Research and Innovation Action**, lump-sum grant methodology per official topic.
- **Research fit:** Comparative dryland restoration protocols, evidence from different climates, trade-offs between planting and assisted natural regeneration, land access/finance bottlenecks, governance adoption and validation at multiple living-lab sites.
- **Project requirement:** Research excellence, a genuine co-creation network, more than one context/site as required, defined research questions, authorities/practitioners, open research outputs and scientific impact; **a single private plot is not itself an eligible full research consortium**.
- **Who:** Consortium/other eligibility rules from topic and Horizon general annexes. Not all Horizon actions have identical rates or minimum consortium rules; verify precise call.
- **Local reference note:** `wp-14-horizontal-activities_horizon-2026-2027_en.pdf` is **“Horizon Europe Work Programme 2026–2027 — 14. Horizontal Activities”**; it is NOT the primary topic text for HORIZON-NATURE-2027-02-02. Codex should not misattribute the topic description to that uploaded file.

### `EU-HORIZON-NATURE-NETWORK-2027` — Horizon living lab network / support action

- **Verified topic:** **HORIZON-NATURE-2027-02-03**, *“Networking to scale up living labs for nature restoration solutions and to address bottlenecks to implementation”*; open **13 October 2026**, deadline **14 January 2027**.
- **Concept:** Connecting existing living labs and users, harmonizing methods, spreading evidence and addressing institutional obstacles; coordination/support emphasis.
- **Relevance:** A geographically dispersed restoration-monitoring network or an evidence-sharing platform with proper institutions may contribute. Not a subsidy for merely buying a small plot.

### `EU-HORIZON-NATURE-MONITORING-2027` — Cost-effective biodiversity monitoring

- **Verified topic:** **HORIZON-NATURE-2027-02-05**, *“Cost-effective biodiversity monitoring for EU policies”*; open **13 October 2026**, deadline **14 January 2027**.
- **Possible fit:** Repeatable low-cost monitoring, vegetation/soil condition data, remotely sensed changes, biodiversity indicators, digital protocols, field-to-satellite validation and interoperable public records.
- **Caution:** Requires explicit research quality and consortium fit. A web app or drone by itself is not a deliverable sufficient for this programme.

### `EU-HORIZON-CL6-BIODIV` — Horizon Europe Cluster 6 biodiversity/soil/food/water calls

- **Nature:** Many distinct topics under Cluster 6 and linked cross-cutting work programmes: biodiversity and ecosystem services, sustainable agriculture, soil, bioeconomy, circular production and governance.
- **Time-specific caution:** Do **not** conflate the open **HORIZON-NATURE-2027-02** topics above with the separate **HORIZON-CL6-2027-01-BIODIV** call: official Research Executive Agency information lists the latter opening **20 April 2027** with deadline **22 September 2027**. Topic/call IDs control status.
- **Potential ideas:** Restoration technologies, robust habitat monitoring, practical agronomic climate adaptation, low-input agroforestry, soil and watershed experiments; each requires topic-specific results and partners.
- **Source:** official **“Horizon Europe Cluster 6 Work Programme 2026–2027”** and EU Funding & Tenders topic text; local horizontal-activities PDF alone does not establish call fit.

### `EU-MISSION-SOIL` — EU Mission “A Soil Deal for Europe”

- **Nature:** Horizon-funded soil living labs, lighthouse farms, soil monitoring, citizen/land-manager cooperation and viable soil-management innovations.
- **Possible fit:** Dryland soil health, biological crusts, erosion and organic matter, grazing/vegetation management and monitoring protocols in real-world field sites.
- **Evidence:** Site soil baseline, demonstrable soil-management experiment, replicable method, academic/practitioner involvement, appropriate living-lab network and actual topic eligibility.
- **Caution:** Soil Mission membership is not a standing grant; different calls have different applicants and deadlines.

### `EU-MISSION-ADAPT` — EU Mission on Adaptation to Climate Change

- **Nature:** Innovation and demonstration funding with regional/local adaptation plans, monitoring and deployable tools.
- **Possible fit:** Working with a municipality or regional stakeholder to evaluate climate-risk reduction by natural infrastructure and native vegetation.
- **Conditions:** Real climate-risk objectives, vulnerable sector/region, institutional adopter, topic-specific calls. General mission documents do not confer direct individual eligibility.

### `EU-INTERREG-EUROMED` — Interreg Euro-MED

- **Verified current call:** **Call 8 — Thematic projects**, written application period **1 October–13 November 2026, 13:00 Brussels time**, with mandatory annexes due **27 November 2026** under the published schedule, subject to updates. Thematic elements include ecosystem restoration/biodiversity resilience; detailed intervention priorities and partner geography must be confirmed from terms of reference.
- **Design:** Cross-border Mediterranean organisations and multiple pilot sites producing transferable governance and practical solutions. A local parcel can be a demonstration site, but cannot independently qualify without the required partnership/territorial scope.
- **Proven project:** `DOC20251211113154PPT_COASTRUST.pdf` supports a **specific actual Interreg Euro-MED COASTRUST** stewardship contract in Níjar. The document states **80% FEDER and 20% resources from FAMP** for that project; **that 80/20 split must not be copied as an automatic rate for every Interreg operation**.
- **Related original:** `Estrategia-Coastrust-Nijar_DEF.pdf`, printed **“Estrategia para la gestión costera sostenible en clave de custodia territorial — Proyecto COASTRUST, Municipio de Níjar, 2025”**.
- **Evidence:** Transnational partner structure, country eligibility, cross-border added value, transferable methods, pilots, beneficiary/partner agreements, finance and administration.

### `EU-INTERREG-SUDOE` — Interreg SUDOE

- **Concept:** Southwestern European transnational cooperation, potentially around rural resilience, biodiversity, water management, forest risk and climate adaptation.
- **Algarroba fit:** A geographically transferable solution with organisations from eligible territories of Spain, Portugal and France, subject to programme/call maps.
- **Status:** `UNKNOWN_REVERIFY`; no presumption an ecosystem restoration application is open on 30 October 2026.
- **Risk:** Project themes, budgets and required composition differ from Euro-MED.

### `EU-INTERREG-EUROPE` — Interreg Europe

- **Concept:** Interregional cooperation to improve public policies, governance and policy instruments rather than direct parcel-scale planting.
- **Possible fit:** Comparative rural restoration financing policies, land-stewardship instruments, regional monitoring/strategy adoption with public authorities from partner regions.
- **Requirement:** Policy instrument/learning and local stakeholder groups, not only ecological engineering.
- **Status:** Call-specific unknown.

### `EU-INTERREG-NEXT-MED` — NEXT MED and relevant Mediterranean cooperation

- **Concept:** Wider trans-Mediterranean cooperation; includes eligible non-EU Mediterranean partner participation under particular calls.
- **Possible fit:** Drylands, water stress, coastal habitat stewardship and nature-based resilience with qualifying international partners.
- **Requirement:** Country eligibility, programme objectives, detailed applicant rules and geopolitics; no assumption that any Almería project can apply directly.
- **Status:** Call-specific unknown.

### `EU-BIODIVERSA` — Biodiversa+ joint transnational research calls

- **Nature:** Biodiversity research partnership using transnational **national/regional funding-agency** commitments; each call has its own participating agencies, partner-country requirements, eligible research organisations and budget.
- **Possible fit:** Scientific comparison of restoration outcomes, biodiversity monitoring, climate–biodiversity relationships and conservation governance; usually an academic-led research project.
- **Eligibility caveat:** A partner being in Spain does not automatically guarantee funding by a participating Spanish agency. Check the national annex and funder allocation.
- **Status:** `UNKNOWN_REVERIFY` for the precise relevant call. Do not claim a tentative future call is confirmed open without official call evidence.

### `EU-PRIMA` — Partnership for Research and Innovation in the Mediterranean Area

- **Nature:** Mediterranean research and innovation in water management, farming systems and agri-food value chains.
- **Possible fit:** Evidence-based semi-arid water-efficient land management, dryland agriculture, soil–water conservation and climate-resilient agricultural systems.
- **Limitation:** A nature reserve with no research hypothesis, relevant agricultural/water context or international research consortium may not qualify.
- **Status:** Calls and partner-country/cost rules must be checked individually.

### `EU-ERASMUS-EDUCATION` — Erasmus+ education and vocational cooperation

- **Nature:** Educational/training exchanges and cooperative projects, rather than a physical biodiversity-restoration grant.
- **Possible fit:** Training materials, transnational restoration-skills curricula, community education and structured vocational partnerships.
- **Evidence:** Eligible education providers/NGOs, learner groups, partnership requirements, measurable learning outputs, actual call priorities.
- **Caution:** Cannot use as a disguised tree-buying fund; verify specific Erasmus+ Key Action.

### `EU-CERV-SOLIDARITY` — CERV / European Solidarity Corps / social participation

- **Nature:** Separate EU programmes that may support civic participation, volunteering, inclusivity and community service when their specific priorities are satisfied.
- **Possible fit:** Verified eligible community environmental volunteering or democratic/community participation initiatives, especially with a genuine education/social dimension.
- **Risk:** These are not general forestry-work grants; safeguarding, volunteer rules and target objectives are essential. Different programmes are not interchangeable.
- **Status:** Topic/call-specific unknown.

### `EU-INNOVATION-SME` — EIC, EIT Climate-KIC, EIT Food and other innovation support

- **Nature:** Competitive venture/technology innovation, accelerators, advisory services, equity or grants depending on the programme.
- **Potential fit:** A **real scalable environmental-tech product**: demonstrably innovative remote sensing, ecological monitoring software, restoration planning decision-support or validated nature-credit MRV infrastructure serving paying markets.
- **Not a fit:** Simple local tree planting as a noncommercial objective; a general website with no novel technology/market validation does not satisfy deep-tech criteria.
- **Evidence:** Innovation novelty and intellectual property, product maturity, market traction, founding team, business case, scale and environmental impact.
- **Caution:** Many schemes provide mentorship not capital; verify legal form, accelerator terms, current call and instrument (grant, services or investment).

### `ES-CDTI-ENISA-TECH` — Spanish innovation finance, CDTI and ENISA

- **Nature:** National research/innovation grants and business financing / participative loans with their own company, technology, profitability, solvency and ownership requirements.
- **Potential:** Applied remote-sensing and ecological-monitoring technology, marketable restoration software, accredited R&D projects.
- **Not:** Philanthropic nature reserve, unpaid volunteer work, automatic subsidies for buying conservation land.
- **Finance:** May be repayable and require own equity/funding; never label an ENISA loan a grant. Confirm current product, company eligibility and application status.

### `EU-GREEN-ASSIST-ADVISORY` — Green Assist / water resilience advisory initiatives

- **Nature:** Technical/investment-readiness assistance to develop financially sound nature/water projects in selected competitions; **not direct planting cash**.
- **Possible use:** Advisory support for scalable natural water retention, water resilience or investment model if the project meets that particular initiative's scope.
- **Status:** The EU announced a **Water Resilience Investment Accelerator** in October 2026; intake details, exclusions and dates must be checked before presenting it as a live opportunity.

---
## 6. Nature finance — complete set of 25 instruments in the local LIFE CUSTODIA study

**Canonical source:** original uploaded **`Instrumentos_financiacion_naturaleza.pdf`**, printed title **“Instrumentos de financiación para la naturaleza: Aplicación en procesos de custodia del territorio”**, LIFE CUSTODIA / LIFE23-GIE-ES-LIFE Stewardship, document D2.1, 2025. The study assesses **25 instruments**, classifies **15 as highly suitable** for land stewardship under its own qualitative method, and discusses **three structural approaches**. Its assessment of “alta idoneidad” is **not** a statement that a Spanish marketplace already exists, that a specific farm can be certified, or that buyers have committed funds.

All 25 instrument names below deliberately preserve the **Spanish names from that PDF** so Codex can search the renamed project copy. English explanations and the Algarroba examples are a combination of that source's analysis and explicitly labelled implementation interpretation. IDs are stable references **within this document**, not legal codes or external programme IDs.

### Group I — Innovative consolidated instruments assessed as highly suitable

#### `NATURE-01` — Pagos por servicios ecosistémicos (PES)

- **How it works:** A known beneficiary of an ecosystem service pays the land manager/owner/steward for agreed management that supplies or safeguards the service; contracts may be direct and local, without a tradable certificate. Possible buyers: water users, utilities, downstream land beneficiaries, companies exposed to flood/erosion or supply-chain risks, municipalities.
- **Algarroba example:** A consortium of downstream stakeholders contracts for independently documented catchment vegetation/erosion management, subject to legal authority and scientifically reasonable service expectations.
- **Minimum contract:** Define actual buyer, service, boundaries, counterfactual, tenure, actions, measured indicators, payment events, inspection and dispute resolution, risks and exclusivity. For water benefits in the Andarax, demonstrate local relevance; do not assume that a project increases downstream groundwater just because surface infiltration rises.
- **Economics:** Negotiated/possibly periodic revenue **only if a buyer signs**. No state subsidy, standard hectare fee or guarantee of market demand. Ecosystem service payment **is not automatically a tradable carbon/water/nature credit**.

#### `NATURE-02` — Pagos por resultados de restauración

- **Mechanism:** Payer reimburses/rewards **verified ecological outcomes**, not only activities; payments may follow ecological milestones or indicators.
- **Possible outcomes:** Reduced bare-ground exposure and erosion, improved native-species cover, habitat structural recovery, established plants after drought seasons, verified soil function. Define a suitable reference and monitoring approach; effects of rainfall/weather need consideration.
- **Algarroba use:** A public programme, philanthropic foundation or corporate buyer contracts to pay for restoration verified by third-party field monitoring over a defined plot network.
- **Risks:** Ecological outcomes may take years; monitoring cost, climatic variability, guarantee requirements and baseline quality can outweigh payments on tiny parcels. No generic available payer.

#### `NATURE-03` — Programas de membresía digitalizados y vinculados a resultados

- **Mechanism:** Supporters pay recurring membership contributions linked to **transparent project reporting** rather than to statutory conservation credits.
- **Algarroba use:** A digital membership giving subscribers maps, ecological monitoring and honest updates on managed parcels. Member benefits must not promise ownership, financial returns or offsets unless those are legally created and documented.
- **Evidence:** Governance, data protection, accounting, donor recognition/receipt policies, payment terms, public-facing monitoring, measurable outputs and truthful attribution.
- **Finance:** Recurring voluntary revenue; customer/member retention and payment-provider fees matter. Ordinary association membership does not automatically create the favourable Spanish donation deduction.

#### `NATURE-04` — Compensaciones ambientales

- **Mechanism:** Financing to compensate environmental impacts through legally required mitigation/compensation, voluntary measures or contractual offset schemes as allowed by the applicable system.
- **Algarroba use:** A developer or public body is legally required to provide equivalent ecological measures; a sufficiently qualified land steward may contract to deliver/maintain them **if law, permit and competent authority permit that arrangement**.
- **Critical distinction:** Mandatory **environmental-impact compensation** is not identical to freely issued voluntary biodiversity credits; requirements such as ecological equivalence, mitigation hierarchy, additionality, durability, physical proximity, approval and long-term enforcement may be strict.
- **Risks:** Some impacts cannot legitimately be offset. Compensatory action cannot be sold again as the same claimed benefit without explicit separate accounting and methodological approval. Work may constitute a procurement contract or an agreement, not a grant.

#### `NATURE-05` — Procesos de aseguramiento ambiental

- **Mechanism:** Insurance, environmental liability cover or other risk-transfer products which protect conservation/revegetation operations against specified liabilities or losses.
- **Algarroba use:** Protect managed parcels, field volunteers, contractors, environmental liabilities, events or restoration investments where relevant products exist.
- **Benefit:** Reduces risk and may help grantors, lenders and partners accept a project; **does not normally generate restoration revenue**.
- **Limits:** Premiums and exclusions, weather/establishment-risk exclusions, claims limits, claims documentation, insurable interest; generic insurance is not equivalent to certifying ecological results.

### Group II — Emerging instruments judged high-potential

#### `NATURE-06` — Créditos de biodiversidad (nature/biodiversity credits)

- **Mechanism:** Define a nature-positive **unit** under a specific method, establish a scientific baseline, prove additional measurable improvement or stewardship conditions, verify independently, register/track the unit where needed, contract with buyer and retire/transfer the claim.
- **Possible outcomes:** Native habitat condition, species abundance, ecological connectivity, durable recovery of degraded shrubland, improved soil/vegetation biodiversity. **The unit, metric and transferability differ between standards.** A hectare is not automatically one credit.
- **Algarroba fit:** Strong potential *conceptually* for independent, well-documented native dryland habitat improvement at sites with secure long-term rights and measurable recovery. Existing scrub may itself be valuable; a poorly conceived planting plan may reduce biodiversity and generate no positive credit.
- **EU status as of Oct 2026:** European Commission issued its **“Roadmap towards Nature Credits”** in July 2025 and formed an expert group; EU-wide mechanisms/methods are developing. **There is no automatic EU-wide compulsory price, universal approved unit, or buyer for restoration credits.** The source study's high-suitability rating is forward-looking.
- **Contract/integrity checks:** Rights to biodiversity claim, additionality, conservative baseline, independent verification, leakage/reversal, permanence and legal tenure, indigenous/local rights where relevant, registry/serial number, double issue/sale and compliance with mitigation hierarchy. Separate **contribution claims** from **offset/compensation claims**; offset language must be particularly scrutinized.
- **Business model:** Only count signed offtake or actual sales as revenue; show illustrative cost and uncertainty of verification/aggregation on small plots.
- **Primary external documentary title:** European Commission **“Roadmap towards Nature Credits”**, COM(2025) 374 final, and Commission **“Nature credits”** expert group information.

#### `NATURE-07` — Créditos de mercado de carbono (voluntary carbon market credits)

- **Mechanism:** Quantify additional net greenhouse-gas removal or avoidance according to a recognized method, independently validate/verify, issue registered serialised units and sell/retire them according to the standard and buyer contract.
- **Potential project forms:** Ecologically defensible afforestation, agroforestry, soil-carbon projects, biochar or improved land/forest management **only where a recognized methodology truly applies**. Existing natural shrublands may be inappropriate to convert to forest, regardless of carbon price.
- **Registries are distinct:** (1) Spain's **MITECO Registro de huella de carbono ... proyectos de absorción**, with its **one-hectare minimum, forest definitions and 30-year commitment**; (2) independent voluntary standards such as Verra/VCS, Gold Standard or Plan Vivo, each with method- and jurisdiction-specific rules; (3) future/evolving EU CRCF certification, which is **not the same as an automatic buyer or EU ETS allowance**.
- **Carbon accounting questions:** Eligible prior land use, additionality, baseline carbon, soil and biomass carbon, uncertainty, species, leakage, non-permanence/buffer, fire/drought mortality, verification cost, future project management, co-benefits and grant interactions.
- **Reality check:** No assumed €/tonne, no automatic credits for merely planting, no extrapolation from a short field trial, no qualifying carbon claim for a single 0.45 ha parcel under the MITECO registry's 1 ha threshold.

#### `NATURE-08` — Créditos de agua positiva (water-positive / water-benefit credits)

- **Mechanism:** Proposed or specialized market units for **measured and verified** water-volume, quality, replenishment or watershed benefits; often a bespoke buyer programme rather than a standard national market.
- **Potential Almería use:** Catchment erosion/infiltration management, legally permitted rewetting or runoff attenuation, water-saving agricultural conversions, restored hydrological function, groundwater/stream monitoring.
- **Key scientific requirements:** Define whether claim concerns water savings, effective recharge, reduced demand, water quality, flood mitigation or retention. These are **not interchangeable**; direct infiltration does not necessarily equal additional aquifer recharge, and conservation action can shift evapotranspiration.
- **Needed:** Catchment-scale water balance, hydrologically credible baseline/counterfactual, legal water rights, buyer whose withdrawals or footprint correspond to that basin, temporal matching, verification and third-party audit.
- **Market status:** **EMERGING**, limited standardization; never show a guaranteed Spanish “water credits rate” or automatic certificate. Distinguish from a direct negotiated PES water agreement.

#### `NATURE-09` — Fondos de inversión ambiental

- **Mechanism:** Specialized funds invest in environmental assets or enterprises with expected financial return alongside environmental constraints.
- **Algarroba fit:** Larger portfolios of land management or commercial nature services with predictable revenues, e.g. qualifying PES contracts, regenerative production, hospitality or monitoring service income; pure preservation with no cash flow may need philanthropy instead.
- **Terms:** Ticket sizes, return expectations, land/legal structure, asset ownership, exit, security, metrics and governance. **Not a donation/grant.**
- **Warning:** Investor ownership or exit incentives can clash with permanent nonprofit land stewardship; contractual conservation protections must be explicit.

#### `NATURE-10` — Fondos de impacto

- **Mechanism:** Return-seeking investment funds that also demand credible, quantified environmental/social impact, often under impact-investment frameworks.
- **Algarroba fit:** A commercial ecological-monitoring service, restoration contractor or multi-property regenerative business with attributable financial returns and monitored outcomes.
- **Requirements:** Bankable business, track record, legal vehicle, financial forecasts, independent impact metrics and investor reporting.
- **Caution:** Impact capital is not money automatically distributed for improving habitat; land improvement alone often fails the financial-return test.

### Group III — Adapted traditional instruments judged highly suitable

#### `NATURE-11` — Venta de productos certificados vinculados a procesos de custodia

- **Mechanism:** Selling real forest/agricultural/other products whose provenance and management satisfy an applicable certification/assurance standard; premiums are negotiated in a real market.
- **Possible use:** Sustainably produced native-plant nursery stock, eligible tree/forest products, farm goods from legitimately managed productive sites, branded local products with documented ecological stewardship.
- **Restrictions:** Biological/ecological suitability, certification fees, marketing, actual yield, lawful extraction, phytosanitary/provenance rules, tax and production status. Do not harvest protected native scrub to invent a value chain.
- **Nature claim:** A product certified for one feature does not imply biodiversity credits or independently verified ecosystem gain.

#### `NATURE-12` — Contribuciones voluntarias de beneficiarios

- **Mechanism:** Businesses, communities or users benefiting from nature contribute money voluntarily without buying a standardized environmental unit.
- **Algarroba use:** Adjacent landowners, local enterprises, downstream beneficiaries or tourism operators co-finance erosion control, vegetation/landscape recovery or community conservation.
- **Value:** A flexible negotiated contribution can be simpler than a certified credit if there is a credible beneficiary and governance agreement.
- **Caution:** Define whether it is a donation, contract, sponsorship or cost-sharing arrangement and what environmental claims, if any, funders may make.

#### `NATURE-13` — Transferencia de activos comunitarios con valor financiero

- **Mechanism:** Transfer or contribution of a legally usable **asset** (land rights, property, buildings, equipment, rights or income-producing facilities) that can strengthen a community conservation initiative.
- **Algarroba use:** Donated conservation parcel, public-law compliant municipal building/land use, donated irrigation-free restoration equipment, long-term no-cost property use, landowner-given easement-like legal rights where recognized.
- **Critical checks:** Asset title, taxes, liability, encumbrances, transferability, duration, conditional use, legal restrictions on public-property disposal and long-term maintenance. “Community asset” is not automatically transferable from public ownership.
- **Accounting:** In-kind or capital contribution, not necessarily liquid cash. Do not equate donated land valuation with unrestricted spendable funds.

#### `NATURE-14` — Pagos por servicios recreativos, culturales y de salud

- **Mechanism:** Genuine revenue from nature-related access, interpretation, guided activities, educational courses or cultural/health-oriented experiences where legal, ethical and environmentally compatible.
- **Algarroba use:** Nature walks, scientific workshops, monitoring field days and educational visits led by qualified personnel; non-invasive activities with controlled visitor loads.
- **Requirements:** Appropriate land access, permits, insurance, customer demand, accessibility and visitor management; commercial activities may conflict with a grant's nonproductive character or access conditions.
- **Caution:** Do not claim medical outcomes without evidence or required qualifications; keep habitat conservation primary on sensitive plots.

#### `NATURE-15` — Filantropía y financiación colectiva ambiental

- **Mechanism:** Donations, grants from foundations, major gifts, planned gifts/bequests, matched giving and donation crowdfunding for a clearly defined conservation purpose.
- **Algarroba use:** Fund field observation, native plant materials, fencing where justified, biodiversity measurements, stewardship agreements and conservation land acquisition when donor terms allow.
- **Key distinction:** Ordinary association can receive donations, but donors do not automatically get Spanish Law 49/2002 deductions. Qualifying foundations and associations declared `de utilidad pública` that comply with that legal regime can provide the statutory favourable treatment; a newer association does not inherit that status merely by registering.
- **Structure:** An established nonprofit can host an initiative by agreement; Spanish law does not have a universally automatic US-style fiscal-sponsor form. The host legally owns received donations/assets, so terms must define finance, brand, monitoring, data, responsibilities and exit.
- **Costs/risks:** Trust, fundraising costs, transparency, donor restrictions, donor independence, founder-conflict management and ability to maintain promised ecological outcomes.
- **No invented guarantee:** A crowdfunding target is an **ask**, not secured income.

### Group IV — Conditional instruments

#### `NATURE-16` — Eco-recargos voluntarios en sectores económicos

- **Mechanism:** Opt-in environmental surcharge included in customer transactions with transparent use of proceeds, e.g. hospitality booking, local product purchase, visitor/activity ticket.
- **Possible use:** Local tourism/retail partner offers customers a clearly voluntary add-on for biodiversity stewardship with audited reporting.
- **Need:** Real business partners, customer consent, VAT/tax treatment, refund rules, admin costs and no unsupported claims that each euro “offsets” a quantified damage.
- **Caution:** Not a public tax or conservation credit; collection is contract/commercial-transaction based.

#### `NATURE-17` — Créditos de resiliencia climática

- **Mechanism:** Emerging outcome-based units or contracts for quantified risk reduction/resilience, e.g. avoided flood/erosion loss or demonstrable ecosystem robustness.
- **Potential use:** Nature-based erosion/runoff measures with a genuine beneficiary exposed to risk and rigorous modelling/monitoring.
- **Market limitation:** Highly method-dependent, few uniform tradable instruments. The risk counterfactual and who benefits from avoided losses are difficult to attribute.
- **Caution:** Do not turn a scenario-modelled percent reduction into a sellable market credit without a method, verifier and buyer.

#### `NATURE-18` — Mecanismos de garantía ecológica

- **Mechanism:** Financial guarantee, reserve or security arrangement tied to restoration performance or ecological durability.
- **Use:** Offers assurance to lenders, donors or contractual counterparties that required interventions or remediation can occur if specified obligations fail.
- **Requirements:** Legal guarantee wording, trigger, accountable party, collateral, environmental performance definition and independent verification.
- **Important:** A guarantee **reduces risk**; it is not a net new grant. It may lock cash or require a fee.

#### `NATURE-19` — Préstamos verdes

- **Mechanism:** Repayable loans with funds earmarked for eligible environmental investments, sometimes with reporting/green criteria or concessional elements.
- **Possible use:** Equipment and staff expansion for a paid restoration contractor, eligible productive agroforestry or digital monitoring venture with credible cash flows.
- **Conditions:** Interest, security, repayment schedule, debt service, sometimes own funds and green-use audit; nature credit estimates alone are unreliable collateral without contracts.
- **Caution:** Debt for non-revenue land restoration can be financially dangerous. “Green” changes the use-of-proceeds criteria, not the repayment obligation.

#### `NATURE-20` — Participación en propiedad (equity conservacionista)

- **Mechanism:** External investor acquires an ownership interest in a company or asset structure that includes conservation commitments.
- **Possible use:** A viable business combining conservation management with paid services or productive assets; potentially community ownership arrangements with suitable legal terms.
- **Requirements:** Legal ownership model, valuations, investor voting/exit rights, ecological safeguards, governance, return and conflict restrictions.
- **Caution:** **Nonprofit association members do not own dividend-bearing equity** in the association; do not translate equity financing into donation-funded charitable ownership. Investor return and conservation permanence may conflict.

#### `NATURE-21` — Procesos fiscales innovadores con retorno directo a conservación

- **Mechanism:** Dedicated tax or fiscal-incentive designs that direct resources to conservation, requiring law or public-authority action.
- **Potential use:** Policy advocacy with municipal/regional authority for conservation-linked incentives or locally dedicated revenues where legally permitted.
- **Not:** A currently accessible tax deduction invented by app; do not assume a municipality can create arbitrary tax privileges.
- **Requirements:** Legal basis, responsible tax authority, eligibility, public-administration approval and accounting.

### Group V — Instruments with significant limitations for small land-stewardship operations

#### `NATURE-22` — Bonos verdes, sociales y sostenibles

- **Mechanism:** Issuing debt securities earmarking proceeds for a defined environmental/social project portfolio, with financial reporting and investors.
- **Potential fit:** Large institutional or municipal portfolios with adequate credit standing, reliable repayment and formal disclosure, not a tiny plot or informal NGO.
- **Major limitation:** Securities issuance and disclosure cost, complexity, debt obligation, project pipeline; “green bond” is not a grant.

#### `NATURE-23` — Tasas por uso

- **Mechanism:** Legally imposed user fees by appropriate public authority or authorized operator.
- **Potential fit:** Carefully regulated access/service charges that can finance conservation, depending on who may legally levy them and for what service.
- **Major limitation:** An NGO cannot simply levy a municipal tax or mandatory public-use fee on its own authority; nature protection/public access conflicts may arise.

#### `NATURE-24` — Contribuciones por valorización urbanística

- **Mechanism:** Capture of a share of property-value uplift resulting from public planning or environmental improvements under applicable legal arrangements.
- **Possible fit:** Public urban/territorial green-infrastructure policy where statutory valuation and collection authority exists.
- **Major limitation:** Rarely suitable as direct funding for a rural nonprofit restoration plot; needs lawful urbanistic/fiscal procedures and enforceable benefit allocation.

#### `NATURE-25` — Distritos de mejora empresarial

- **Mechanism:** A defined local business district pools financial contributions for mutually beneficial shared improvements, sometimes including green infrastructure.
- **Potential fit:** Commercial street/visitor area financing local green/public-realm amenities under an actual governance scheme.
- **Major limitation:** Requires cohesive businesses, authorized district structure, and meaningful joint economic interests; not a generic route to private rural habitat restoration.

### Three *frameworks*, not additional funding sources

The LIFE CUSTODIA study separately identifies:

1. **Landscape finance:** Coordinate grants, private payments, landowners, social capital and conservation targets at the scale of one territory. There is no fund simply named “landscape finance” that sends money to each mapped plot.
2. **Blended finance:** Combine finance with different risk and return profiles (e.g. philanthropic first-loss support, grants, loans, impact investors, buyer contracts) in a lawful structure. It is not permission to finance the same invoice or sell the same outcome twice.
3. **Responsabilidad Social Corporativa orientada a conservación:** Organize corporate nature contributions around measurable, transparently reported conservation rather than one-off greenwashing sponsorship. A corporate CSR strategy is a **means of engaging buyers/donors**, not a guaranteed independent funding programme.

**Source:** original `Instrumentos_financiacion_naturaleza.pdf`, chapter **“Enfoques estructurales de articulación financiera”**. Preserve the document's separation of 25 **instruments** and 3 **structural approaches** in navigation and filters.

---

## 7. Carbon, nature, water and other ecosystem claims — technical and legal comparison

### 7.1 A claim must be defined before discussing monetary value

- **Carbon removal:** Tonnes of CO₂-equivalent measured/estimated with accepted accounting and permanence; not the same as a raw count of trees or forecast canopy area.
- **Avoided emissions:** Counterfactual emission reduction; methodology and claims are different from removal, often ineligible under a removal-only programme.
- **Habitat condition / biodiversity:** Must specify ecological metric/unit, baseline and nature-positive gain; no default EUR/hectare conversion.
- **Water quantity:** Water **saved**, infiltration, recharge, retention, environmental flows and avoided extraction are different metrics with different hydrological boundaries.
- **Water quality:** Load/concentration of nutrients/sediment/other contaminants, sampling and hydrological context, not automatically “litres of water generated”.
- **Erosion and soil health:** Site- and catchment-specific erosion/process measures; avoided erosion can matter ecologically even where no credit registry exists.
- **Climate resilience:** Defined exposure/vulnerability/risk effect, not merely “planting climate-resilient species”.

### 7.2 EU Carbon Removals and Carbon Farming Certification Framework (CRCF)

- **Regulatory identity:** **Regulation (EU) 2024/3012** creating a voluntary EU certification framework for permanent carbon removals, carbon farming and carbon storage in products, with implementing/delegated methodology work.
- **Current methodological development:** European Commission announced in **July 2026** methodologies for **three carbon farming activities**: **agriculture and agroforestry on mineral soils**, **rewetting/restoration of peatlands and other organic soils**, and **afforestation**. The exact technical act, verification schemes, implementation dates, limits and accepted projects require checking on the application date.
- **Eligibility:** Ecological safeguards, quantification, monitoring, third-party verification and the relevant certification scheme; field plots alone do not create certified units and the Regulation does **not** compel a buyer to purchase them.
- **Algarroba fit:** Potentially agroforestry on suitable actual agricultural land, or qualifying ecologically sound afforestation. No inference that a natural semi-arid shrub mosaic meets an afforestation methodology.
- **Distinct:** EU CRCF certificates, Spanish MITECO registry units, voluntary international credits, emissions-trading allowances, and corporate reports have **different legal and marketing properties**. No automatic conversion.
- **Official titles:** European Commission **“Certification methodologies — Carbon Removals and Carbon Farming”**; **“Commission adopts certification methodologies for carbon farming under the CRCF Regulation”** (10 July 2026).

### 7.3 EU nature credits: avoid claiming a mature uniform market

- **Official state:** European Commission **“Roadmap towards Nature Credits”** published July 2025, expert group activity underway in 2026. Nature-positive performance units and voluntary purchase programmes are being developed, but a single compulsory, EU-wide biodiversity credit market and price do not exist merely because the Roadmap exists.
- **What the navigator can say:** "Potentially relevant emerging private financing mechanism; depends on methodology, verification, durable land rights and a buyer." It cannot say "eligible for €X in EU biodiversity credits" without an actual signed scheme and payment data.
- **Claim types:** Funding a positive contribution is distinct from purchasing equivalence for a specific habitat destruction. Strong anti-greenwashing rules and ecological integrity apply.
- **Critical economics:** Baseline inventories, third-party audits, minimum site/portfolio scale, permanent management, long-term measurement and buyer demand can dominate a micro-plot's potential income.

### 7.4 Spanish regulatory and voluntary compensation

- **Regulated impact compensation:** May be required under project-specific environmental permits and Spanish/EU environmental law, subject to strict conditions; not every NGO can self-issue an offset.
- **Voluntary PES / buyer contracts:** More flexible but still require believable promised benefits and enforceable contracts.
- **Credits:** Only method-specific issuance/sale creates marketable units. A report showing biodiversity improved is not automatically a credit.
- **No double counting of nature:** Where public funding has already paid to deliver a legal obligation, determine whether any further sold environmental claims remain legitimate under the grant, standard and buyer agreement.

### 7.5 What cannot be inferred from the site's plant-list feature

The app can support plant species, quantities and ecological suitability, but **must not** infer final forest definition, net sequestration, native habitat improvement, nutrient removal, groundwater recharge, carbon/nature/water credits, number of marketable units, market price, validated permanence or offset authorization solely from these fields. These require methods, source data, rights, verification and, for revenue, an actual buyer.

---
## 8. Additional private, municipal, public-contract and asset financing

These mechanisms partly overlap LIFE CUSTODIA's 25 items but are useful **separate navigator records** because they have distinct counterparties, constraints and practical application forms. Avoid presenting them as 25 additional statutory Spanish grants.

### `FIN-DONATIONS-INDIVIDUAL` — One-off public donations

- **Payer:** Individual donors voluntarily contributing to a qualifying association/foundation or other legally able organiser.
- **Design:** A clear, traceable site or outcome budget; regular progress evidence; treatment of unrestricted vs earmarked gifts; privacy and receipts.
- **Best fit:** Restoration fieldwork, monitoring, land-use agreement administration, public education and noneligible co-funding where grant terms permit.
- **Legal issues:** Nonprofit status, gifts to a natural person vs nonprofit, restricted-fund accounting, fundraising law and donation tax status. Do not describe donations to any startup association as automatically deductible under Law 49/2002.

### `FIN-CROWDFUND-DONATION` — Donation-based crowdfunding

- **Payer:** Many supporters; often a fixed-purpose campaign.
- **Design:** Public baseline, high-confidence works budget, independent milestones, failure/refund policy, aftercare, transparent land rights and ownership of improvements.
- **Risk:** Campaign success and donor payments uncertain; crowdfunding platform may charge fees; donor expectations can exceed ecological reality. Campaigns may need donor-facing explanations that not every planted shrub survives.

### `FIN-CROWDFUND-REWARD` — Reward-based crowdfunding and pre-sales

- **Payer:** Purchasers expecting a permitted good, experience or benefit rather than a charitable tax receipt.
- **Design:** Genuine merchandise, workshops, guided visits, educational publication, monitoring subscription or other lawful deliverable.
- **Risk:** Consumer law, VAT/tax, delivery and refund obligations; cannot sell a regulated ecological credit without proper issuance.

### `FIN-MEMBERSHIP` — Nonprofit memberships and recurring supporter plans

- **Payer:** Members supporting governance or a subscribed mission.
- **Design:** Clear rights, costs, financial reports and authentic site indicators; optionally a public web dashboard showing interventions and uncertainties.
- **Risk:** Membership dues are distinct from donations and paid digital subscriptions, including for taxation and donor receipts.

### `FIN-FOUNDATION-GRANTS-PRIVATE` — Private foundation philanthropy

- **Payer:** Foundations financing conservation, water, biodiversity, science, environmental justice or community projects.
- **Design:** Narrowly aligned public benefit, credible organisation/host, legal land rights, monitoring and manageable reporting; each foundation has its own geography and policies.
- **Risk:** Do not invent an open call for any foundation based on its mission. A direct concept-note invitation, public competition and donor-advised gift are different application mechanisms.
- **Possible partner leads, not committed funders:** Established conservation nonprofits such as Fundación Global Nature, Fundación Internacional para la Restauración de Ecosistemas, AlVelAl and SEO/BirdLife could be assessed for partnerships; **no agreement to host or fund Algarroba is established here**.

### `FIN-CORPORATE-GIFT` — Corporate charitable contributions

- **Payer:** Companies donating to an environmental entity with no equivalent commercial service provided.
- **Design:** Independent biodiversity claims, geographic relevance, honest reporting and donor tax treatment where appropriate.
- **Risk:** Contract may actually be sponsorship/marketing or service procurement, changing tax, procurement and accounting. Do not promise “carbon neutral” to donors without verified authorized offsets.

### `FIN-SPONSORSHIP` — Corporate sponsorship and brand partnerships

- **Payer:** Companies paying for permitted promotion, events, reporting or association of brand with conservation.
- **Design:** Sponsor deliverables, proof of public benefit, truthful nature-positive messaging, editorial independence and non-exclusive conservation claims.
- **Risks:** Potential conflict with LEADER 3.x nonproductive purpose, advertising/VAT obligations, conflicts in independent ecological reporting, harmful greenwashing.

### `FIN-CSR-SUPPLYCHAIN` — Supply-chain biodiversity/water stewardship arrangements

- **Buyer:** Businesses with material nature/water exposure, possibly food, beverage, agriculture, hospitality or infrastructure firms.
- **Design:** Restore ecological function relevant to the company's actual footprint/supply chain, under a credible monitoring and contract framework.
- **Risk:** Corporate ESG or sustainability disclosure obligations **do not mandate buying Algarroba credits**. A nature-positive “contribution” is not automatically an impact offset.

### `FIN-LAND-DONATION` — Donated land, bequests and conservation gifts

- **Instrument:** Property or rights transferred outright or subject to legally valid conservation conditions.
- **Goal:** Long-term conservation control; potential build-up of a durable protected asset portfolio, subject to organisational capacity.
- **Required due diligence:** Registered owner, title/encumbrances, unpaid taxes, parcel geometry, access, easements, environmental liabilities, costs of notary/registration, site maintenance, conservation purpose and any transfer restrictions.
- **Risk:** Accepting land can create ongoing expenses; an association is not magically exempt from property taxes, transaction costs or obligations. A gift's value is not available cash.

### `FIN-CUSTODY-NOCASH` — Custodia del territorio and rights donated for conservation

- **Instrument:** Contract by which owner retains title while a qualified steward receives agreed rights and obligations to manage/conserve land. May include land-management covenants, monitoring and public-interest obligations.
- **Value:** Reduces capital needed for land purchase and may establish legal standing for a third-party grant or PES contract if that grant accepts the particular rights.
- **Evidence:** Duration, parties, parcel coordinates, permitted interventions, rights to monitor/access, sale/reversion, liability, who owns improvements, termination, nature-credit rights and assignment of responsibilities.
- **Caution:** `Custodia` is a land-governance instrument, **not** a funding programme, and by itself does not grant the custodian ownership or any official credits.

### `FIN-LEASE-USUFRUCT` — Long-term leases, usufruct and other land-use entitlements

- **Instrument:** Paid or donated legally enforceable land rights without purchasing title.
- **Importance:** Establishes who can act on land and for how long, may permit a grant that requires management rights. Durations and forms differ; a ten-year lease is not automatically compatible with a thirty-year permanence requirement.
- **Risks:** Rent cash flow, right to transfer improvements/claims, inheritance or sale, agricultural vs forest lease law, registry needs, community/public-law restrictions.

### `FIN-PUBLIC-LAND-USE` — Municipal or other public-land agreements

- **Instrument:** License, concession, assignment or cooperation agreement providing a lawful use of public land under competent authority.
- **Use:** Conservation demonstration or public-benefit restoration on a municipally controlled site.
- **Evidence:** Public law procedure, duration, authorizing resolution, purpose and public access, procurement/property restrictions and monitoring/maintenance responsibilities.
- **Risk:** A verbal municipal “yes” does not substitute for a legally effective right to implement a grant-financed project.

### `FIN-PROCUREMENT-WORKS` — Public environmental works tenders

- **Financial mechanism:** Public administration or authorised contractor pays under a competitively procured works contract, **not a grant**.
- **Typical services:** Revegetation, erosion control, riparian works, environmental restoration, fencing where needed, land rehabilitation, maintenance and monitoring.
- **Requirements:** Bid eligibility, technical capacity, resources, subcontracting, performance guarantees, health and safety, tender submission, documentation and environmental compliance.
- **Relevant original examples:** `Informe Técnico sobre criterios juicio de valor.PDF` for Andarax tender evaluation; `26_ Resolución_6_2022_ES.Enc(F).pdf` for a public `encargo` to Tragsa; `NJyGw38d59Ey04J43U5QT4SaaiG3G6.pdf` project justification.
- **Special warning:** A **medio propio encargo** to Tragsa/Tragsatec is a specific public administrative form, **not necessarily an open tender available to any company**. Do not suggest a user can simply apply for it as a subsidy.

### `FIN-PROCUREMENT-ENGINEERING` — Paid planning, environmental assessment and GIS/engineering services

- **Mechanism:** A municipality or public authority contracts for studies, field surveys, environmental documentation, hydrology, forest design, monitoring, maps, databases and project writing.
- **Potential Algarroba fit:** A technically capable commercial entity may bid or subcontract for project design, geospatial mapping, drone surveys, field measurement, monitoring or restoration cost estimation.
- **Examples:** `DOC2026081811211505__PPTP__ Redac__ Proyecto Rambla Aljibe.pdf` — *“Pliego de prescripciones técnicas particulares ... contrato de asistencia técnica para la redacción del proyecto de restauración hidrológico-forestal de la Rambla del Aljibe ... Puebla de Vícar”* (2026); `10_ Resolución.Encargo(F).pdf` — environmental surveillance and safety management for river works.
- **Risk:** Licensed design/engineering responsibilities may require technical signatories and professional insurance; not every GIS subcontract is equivalent to statutory engineering certification.

### `FIN-PROCUREMENT-PLANTS` — Native plant and forest reproductive material supply contracts

- **Mechanism:** Revenue for supplying native plants or seeds under public procurement or private restoration contracts.
- **Real source:** `DOC20240813101251TSA0078436 PPT PLANTA NIJAR.pdf`, internal title **“Pliego de prescripciones técnicas particulares ... Suministro de planta autóctona para ejecución de obra ecosistemas fluviales en el T.M. de Níjar ... financiado por la Unión Europea–NextGenerationEU”** (TSA0078436).
- **Applicant:** Qualified nursery or supplier; contractual compliance with plant species, container size, provenance, phytosanitary and delivery standards.
- **Risk:** A plant-species list is a procurement specification; it is not itself a subsidy for landowners who want those species.

### `FIN-PROCUREMENT-STEWARDSHIP` — Stewardship activity service contracts

- **Mechanism:** Public or institutional buyers engage implementers for stewardship activities, participation, land management or habitat support under a contracted programme.
- **Real example:** `DOC20251211113154PPT_COASTRUST.pdf`, a procurement for activities under a custodia agreement for Parque Gunter Kunkel (Níjar), Interreg Euro-MED COASTRUST; complementary strategy `Estrategia-Coastrust-Nijar_DEF.pdf`.
- **Possible paid roles:** Public engagement, agreement management, biological follow-up, practical site maintenance, reports, outreach.
- **Risk:** Only when a live contract/tender exists and an eligible applicant can bid; COASTRUST itself is not an open perpetual opportunity for Alhama landowners.

### `FIN-COMMERCIAL-RESTORATION` — Private restoration services and maintenance contracts

- **Buyer:** Private landowners, developers, farms, conservation nonprofits, industrial sites or businesses required to rehabilitate land.
- **Revenue:** Actual contract price for design, earthworks, native planting, natural-regeneration management, erosion controls, monitoring or post-planting maintenance.
- **Evidence:** Licenses, service qualifications, labor/equipment rates, safety, ecological competence, procurement terms and financial discipline.
- **Caution:** Work paid by an NGO grant can be legitimate outsourced service, but scrutinize related-party conflicts and no double invoicing.

### `FIN-COMMERCIAL-DATA` — Monitoring, GIS, remote sensing and data platforms

- **Buyer:** Conservation groups, municipalities, farms, forestry contractors, research projects, environmental consultants.
- **Deliverables:** Mapped parcels, field data, vegetation change detection, drought/erosion monitoring, MRV data systems, reports and integration with funding reporting.
- **Revenue:** Subscription, licensed product or professional service contract where client value is proven; unlike a subsidy, success depends on paying demand.
- **Risks:** Data rights, drone permits, scientific validation, privacy/location access, claims accuracy and support costs. A funding navigator can explain market relevance without implying the app itself wins innovation grants.

### `FIN-REGENERATIVE-PRODUCTION` — Real agricultural, agroforestry and forest-product income

- **Buyer:** Agricultural/forest product customers, where production/harvest is lawful and economically viable.
- **Revenue:** Harvest sales or ecosystem-compatible productive services, potentially certified premiums; connect to LEADER 1.7–1.10 or CAP when legally eligible.
- **Risk:** Drought, maturity/yield delays, uncertain crop economics, soil and conservation constraints, land-use changes and the fact that a mature carob tree is not automatically marketable fruit income during a young site's initial years.

### `FIN-DEBT-LOAN` — Loans, revolving funds and bridge finance

- **Instrument:** Bank, ethical lender or cooperative credit; potentially tied to a confirmed grant, a contract receivable, operating enterprise or secured asset.
- **Use:** Cover temporary reimbursement lag or real equipment purchase **when realistic repayment exists**.
- **Risks:** Interest, fees, collateral, grant clawback, bank guarantee, mismatched debt tenor and unpredictable conservation revenues; a promise of future nature credits is not secure collateral.

### `FIN-IMPACT-EQUITY` — Equity / return-seeking investment in a legitimate business

- **Finance:** Capital for a company with a financial return; ownership/voting rights and exit.
- **Possible fit:** Technical restoration services, scalable monitoring technology, a productive agroforestry venture with protection of ecologically valuable zones.
- **Not:** Equity shares in an ordinary nonprofit association, or automatic purchase of a philanthropic land bank.
- **Safeguards:** Conservation covenants, accounting, return obligations, data IP, governance conflicts and exit restrictions.

### `FIN-LOCAL-HUMAN-CAPITAL` — Training, volunteer and in-kind contributions

- **Nature:** Volunteer labour (only where safe/lawful), training placements, donated tools, university fieldwork, municipal staff time, seed/plant donations, educational partners.
- **Design:** Competent supervision, safety, consent, insurance, legitimate work vs employment distinction, data quality, provenance of plants, and value of supplied in-kind resources.
- **Key constraint:** Free volunteer time may not count as eligible matching expenditure in a given subsidy; check eligibility instead of assigning an invented hourly valuation.

### `FIN-TAX-INCENTIVES` — Tax-favoured charitable giving and other lawful fiscal measures

- **Mechanism:** Tax incentives encourage donors or reduce a qualifying entity's net cost. **Not** an independent cash grant to the conservation site.
- **Spanish nonprofit anchor:** **Ley 49/2002**, conditional application to qualifying nonprofits (not all associations). Under the referenced current Spanish regime, qualifying individual-donor deductions are **80% of the first €250** and generally **40% beyond**, possibly **45%** under statutory repeat-giving rules. Exact year, donor situation and entity qualification must be reverified before the UI calculates deductions.
- **Applicant flags:** Ordinary new association vs `de utilidad pública`/qualified foundation, status of the host, corporate donors, foreign donors, tax residence and receipt requirements.
- **Risk:** Public-utility declaration normally requires qualifying ongoing activity (often at least two years); foundation form has governance/endowment costs. Association or foundation creation itself is not a funding programme.
- **Other taxes:** Property/transfer/VAT treatment, environmental or farm incentives and grants have separate rules; no blanket exemption for conservation land.

---

## 9. Project designs as independent funding-match tags (no chronological dependencies)

The user can select any design type, regardless of other project features. A design is a **problem/intervention/output definition**. It is **not** a grant, it does not guarantee eligibility, and it should not force a legal form until a candidate funding rule actually requires one.

| Design ID | Central purpose | Example outputs and measurements | Potential funding connections (screen, do not promise) |
|---|---|---|---|
| `DESIGN-EXPERIMENT` | Demonstrate a locally new, transferable restoration method | Treatment/control map, soil/vegetation baseline, repeated monitoring, public technical report | LEADER 3.4; university partnership; EIP-AGRI if agriculture/forestry multi-actor case; Horizon topic |
| `DESIGN-HABITAT-RESTORE` | Recover native habitats and ecological functionality | Protected/recovered habitat, native species composition, stability, maintenance, public interest | LEADER 3.5; suitable forestry/FB call; LIFE; philanthropy |
| `DESIGN-EROSION` | Reduce soil loss and runoff risk | Erosion indicators, sediment and vegetation/soil-cover outcomes, permitted works | LEADER 3.5 in qualifying context; public engineering contracts; climate/watershed calls; PES where buyer |
| `DESIGN-RIPARIAN` | Restore watercourse/ramblas function | Riparian habitat, channel geomorphology where lawful, hydraulic safety, native plant establishment | Public water authority contracts, LIFE, Interreg, public-sector FEDER |
| `DESIGN-WATER` | Improve a specifically measurable water outcome | Verified water savings, hydrological restoration or quality/load outcomes | Water PES / beneficiary contract; relevant research/public measures; emerging water-positive mechanism |
| `DESIGN-AGROFORESTRY` | Combine genuine production with ecological practices | Farm/forest products, soil cover, economic and biodiversity metrics | CAP; LEADER 1.7/1.8; agricultural research; CRCF methods where eligible |
| `DESIGN-NATIVE-NURSERY` | Produce legal native material for paid restoration | Provenance, plant health, real deliveries, customers | LEADER 1.11 or other specific productive type; nursery and procurement contracts |
| `DESIGN-ENV-SERVICES` | Sell professional restoration and monitoring services | Contracts, equipment, invoices, qualified staff, customer outcomes | LEADER 1.11 or 2.6 by proper classification; paid tenders; customer revenue |
| `DESIGN-DIGITAL-MRV` | Monitor ecological performance and report evidence | Field/GIS data, validated sensors/models, interoperable monitoring protocols | Horizon monitoring, CDTI/innovation programmes, service contracts, R&D consortia |
| `DESIGN-PUBLIC-STUDY` | Produce an open rural environmental study/plan | Report, maps, methodology, public-use plan outputs | LEADER 3.1; research/public planning commission |
| `DESIGN-AWARENESS` | Educate and involve citizens | Workshops, material, training and audience evidence | LEADER 3.3; suitable social/education programmes; sponsorship |
| `DESIGN-PUBLIC-FACILITY` | Supply genuinely shared public-benefit sustainability facility | Accessible equipment/resource, user base, operating governance | LEADER 3.6; municipal/FEDER public measures |
| `DESIGN-LAND-STEWARDSHIP` | Permanently or durably govern land for conservation | Written custodia/leases, biodiversity outcomes, maintenance, transparency | Philanthropy, stewardship contracts, grants depending on applicant, corporate conservation |
| `DESIGN-LAND-PURCHASE` | Acquire land or assets for long-term conservation | Title, environmental covenants, liabilities, funded aftercare | Dedicated donations, bequests, impact capital only where financially legitimate; generally **not** LEADER 3.5 asset acquisition |
| `DESIGN-CARBON` | Deliver verified eligible removal | Approved project method, tonnes verified, monitoring and buyer | MITECO registry where site qualifies; voluntary markets; EU CRCF where eligible |
| `DESIGN-NATURE-CREDITS` | Measure and sell defined biodiversity improvement units | Baseline, accepted unit method, third-party verification, registry, buyer | Emerging voluntary nature-credit schemes, bespoke buyer contracts |
| `DESIGN-COMMUNITY` | Socially inclusive community conservation | Genuine participation, employment/skills and ecological outcomes | LEADER 3.3/3.6 when eligible, ESF+/Empleaverde, community philanthropy |
| `DESIGN-LIVING-LAB` | Co-create/test scientific solutions with partners | Multi-site protocol, research work packages, open data, replication | Horizon Europe, Biodiversa+, PRIMA, EIP-AGRI and research-related LIFE/Interreg |
| `DESIGN-CLIMATE` | Lower a defined exposure or vulnerability | Quantified climate-risk and ecological impact | LIFE Adaptation, Mission Adaptation, suitable regional measures, resilience PES/contracts |
| `DESIGN-PUBLIC-TENDER` | Deliver an existing procurement contract | Priced bill, staffing, supply/works, deliverables, insurance, tender bid | Paid municipal/Junta/Tragsa/consultancy procurement; **not** a grant application |

### More detailed matching notes for semi-arid Almería

**Experimental vegetation management / Salsola-rich sites:** A real comparator is needed. The starting vegetation may contain native or ecologically useful cover. Species identification, habitat classification, biomass properties, soil salinity and seasonal moisture constraints must be known before grading clearing/mulching as positive. A funding match can emphasize methodology/monitoring under 3.4, physical environmental recovery under 3.5, or applied research under EIP-AGRI/Horizon — **but not simultaneously presume all three pay for the same plot treatment**.

**Assisted natural regeneration:** May be cheaper and ecologically superior to planting under water stress; grant writers must define protection, selective pressure management, monitoring and ecological result. Some funding categories finance activities, not only physical tree count. Verify evidence/eligible cost wording.

**Native shrub and sparse-tree mosaics:** Ecological restoration can be valid without reaching the forest cover required by a carbon registry. Never downgrade a grant fit for biodiversity simply because carbon credits are unavailable. Conversely, carbon eligibility must never override habitat-conservation law or target ecology.

**Ramblas and hydrological interventions:** The planner may propose runoff-slowing or soil-retention features; before presenting them as fundable, check domain status, flood safety, downstream effects and permits. Small local actions must not be falsely described as proven aquifer recharge or groundwater increase.

**Agroforestry vs conservation:** Commercial revenue, CAP and productive LEADER types require a real farming/forestry business. Nonproductive 3.x funding requires a genuine public-benefit purpose. A physical mosaic of shrubs/trees could serve either or both across distinct, documented activities, but bookkeeping, land use, legal eligibility and public/nonprivate benefit control the classification.

**Digital monitoring and research:** Remote sensing and a web app can improve funding evidence, but grant eligibility depends on who is paid for what — a researcher developing a new method, a contractor delivering a monitoring service, or an NGO using available software to produce the promised ecological reports. These are different funding mechanisms.

---

## 10. Independent example eligibility checks for the navigator

These are **alternative fact patterns, not steps or recommended sequences**. Their purpose is to test whether the implementation handles exclusions, uncertainty, distinct applicant identities, and emerging credits correctly.

**Scenario A — Private owner of 4,500 m² (0.45 ha) near Alhama de Almería, not farming, wants native ecological restoration.**

- `LEADER-AL20-3.4`/`3.5`: **not directly eligible as an ordinary individual applicant** under their specified public/nonprofit beneficiary provisions. The existence of a local nonprofit partner would change the *applicant facts*, not automatically cure private-benefit, tenure, public-access or demonstration tests.
- `LEADER-AL20-2.7`: no eligibility on these facts; an intended restoration plot is not itself a new qualified individual full-time commercial business. Require unemployment/new-business and sector questions if user actually considers 2.7.
- `ES-FB-DONANA-2025`: **not eligible (geographic and closed)**.
- `ES-CARBON-REGISTRY`: **fails published 1 ha minimum** for a single 0.45 ha project; also must check other forest conditions, regardless of planting list. Don't assume aggregation is permitted.
- Nature/water credits: **possible to investigate conceptually, not confirmed payment or credit eligibility**; economics likely difficult at micro scale without aggregation, site-specific method and buyer.
- Donations/land stewardship/private conservation contributions: **potential**, depending on organizer, agreement and public-benefit governance; no grant guarantee.

**Scenario B — Established nonprofit with long-term rights over several degraded parcels in AL20 and public-access/diffusion plan.**

- `LEADER-AL20-3.5`: **potential** subject to heritage value, nonproductive purpose, rights, public access, scoring, eligible works, cash flow and budget.
- `3.4`: **potential** for a separately defined new transferable demonstrator, not just because it undertakes restoration.
- LIFE/FB/Interreg: **thematic possibilities**, but require a compatible actual call and capacity/partners.
- Credits: remain **method/buyer dependent**; nonprofit status alone does not produce certification or revenue.

**Scenario C — Forestry-service sole trader proposing ecological field work for forest landowners.**

- `LEADER-AL20-1.11`: **potential productive SME investment**.
- `LEADER-AL20-2.7`: **explicit exclusion** when the real activity is forestry/agricultural support-service 1.11, regardless of a preferred tax category.
- Public contracts: possible subject to qualifications, tender terms and business status.
- LEADER 3.5: not a commercial subsidy to the trader; an eligible nonprofit/public beneficiary might separately procure qualifying services under grant rules.

**Scenario D — Individual genuinely planning a new non-forestry environmental monitoring business, resident in AL20.**

- `LEADER-AL20-2.7`: **insufficient information** without unemployment in previous three months, previous RETA/CNAE status, sector classification, full-time exclusive activity, projected net SMI and timing of registration.
- `LEADER-AL20-2.6`: possible productive investment if that is the correct classification and finance exists.
- R&D/innovation loans/grants: only if actual technology/business innovation meets the specific programme.

**Scenario E — Registered productive farm with eligible agricultural land and a native agroforestry design.**

- CAP direct/eco/agroenvironmental interventions: **possible** if SIGPAC, agricultural activity and specific annual practices qualify.
- LEADER 1.7: possible relevant productive investment; verify restrictions, especially irrigation-related expenses.
- FB Doñana: only if the farm is **inside** its defined Doñana geography and the closed historical call conditions apply; an Almería farm is outside it.
- CRCF: potentially under a compatible certified agroforestry/soil-carbon methodology, **not guaranteed financial income**.

**Scenario F — Municipality owns degraded river-adjacent land and seeks habitat restoration.**

- Potential 3.5 where AL20 location, heritage, public benefit, nonproductive purpose and legal rights fit; alternatively territorial/public water, FEDER and actual procurement programmes.
- Need check public hydraulic domain, water/flood permits, public procurement and protected habitats.
- Private owner donation assumptions do not apply; municipality may itself become grantee or buyer.

**Scenario G — University and landowners designing a multi-site comparative restoration study.**

- Horizon Nature living-lab topics and EIP-AGRI may be relevant with required international/multi-actor groups and exact published call terms.
- 3.4 can fund a distinct local demonstrator with eligible local applicant; does not waive research-call consortium requirements.
- Field-data collection, university role, scientific hypotheses and open results need to be genuine.

**Scenario H — Company wants to buy “100 water credits” from a restored 0.45 ha plot.**

- **Do not quote a price or number of credits.** Demand agreed unit definition and accepted standard/independent verifier; estimate legal rights, hydrological baseline and buyer commitment; compare PES contract vs credit scheme.
- Distinguish company sponsorship/donation from verified water benefit offset. No amount or unit is implied by planted species or plot area alone.

**Scenario I — Nonprofit owns a tract and wants to buy an adjoining parcel with LEADER 3.5.**

- LEADER 3.5 expressly excludes acquiring rural-heritage assets. Distinguish **buying** land from **restoring** eligible managed land; land donation/major philanthropy or other specially permitted funds may be relevant.
- Do not transfer ownership of land purchased by a host NGO to a later separate entity without addressing title, charitable restrictions and costs.

---
## 11. Document-library source crosswalk — **original filenames and printed titles**

**Use this inventory for Codex document resolution.** The files in the GitHub application's library were reportedly **renamed**. Do not assume that a filename below exists there as-is. Match by the **printed title, agency, project title, case number, year and unique wording**; after a confident match, store the app's existing document identifier/reference, not a hard-coded path or fake URL. The library document's actual indexed text and PDFs remain the authority for detailed figures and scope.

### 11.1 Direct financing, regulation, criteria and grant research

| Library source key | **Original name of project file** | Internal/printed document title or strongest search fingerprint | What it substantiates; what it does **not** substantiate |
|---|---|---|---|
| `SRC-AL20-SELECTED` | **`Tipologías e importes AL20.pdf`** | Signed **“LÍNEAS DE AYUDAS Y TIPOLOGÍAS DE OPERACIONES SUBVENCIONABLES”**, `GRUPO DE DESARROLLO RURAL`, AL20; signed 16/02/2026 | **Primary local selection** of exactly 12 AL20 types, three budget envelopes. Does not itself contain the full legal applicant/expense rules. |
| `SRC-AL20-CRITERIA` | **`Listado criterios AL20.pdf`** | Signed `criterios de selección`/`subcriterios`, GDR AL20, annex selection criteria for LEADER 7119.2 | AL20 selection criteria/scoring; compare with later official 25/09/2026 verification guide, and never invent score. |
| `SRC-FB-RENAT-BASES` | **`BASES-REGULADORAS.pdf`** | **“Orden TED/870/2025, de 5 de agosto ... Fundación Biodiversidad ... renaturalización y restauración ecológica en el ámbito agrario y forestal”**, **BOE-A-2025-16485** | Legal enabling bases for FB agrarian/forest renaturalisation; explicitly **not** the 2026 Andalusian LEADER order; not alone an Almería-open call. |
| `SRC-FB-DONANA-PROVISIONAL` | **`report_Propuesta-Resolucion-Provisional_Donana_renat_CON-TABLAS.pdf`** | **“PROPUESTA DE RESOLUCIÓN PROVISIONAL”**, Fundación Biodiversidad renaturalización Doñana; October 2026, includes individual application tables | Outcome/status/precedent for **Doñana only**; proposed awards are **not final** and not generic grants for Almería. |
| `SRC-FGN-NATURE-FINANCE` | **`Instrumentos_financiacion_naturaleza.pdf`** | **“Instrumentos de financiación para la naturaleza: Aplicación en procesos de custodia del territorio”**; LIFE CUSTODIA, **D2.1 Financing Instruments for Nature**, 2025 | **Canonical 25 instruments + 3 frameworks**; conceptual applicability and caveats. Does not prove markets/buyers are operational in Almería. |
| `SRC-LOW-CAPITAL-MODEL` | **`Restoration with very little founder capital_ the best organizational and financing model for Almerí.pdf`** | **“Restoration with very little founder capital: the best organizational and financing model for Almería”** | Explanations of nonprofit/commercial/land functions, LEADER 2.7 and 1.11, land stewardship and donor-tax issues; **secondary research**; recheck the actual law. Ignore its suggested chronological organizational sequence for this navigator. |
| `SRC-ILLUSTRATED-PRIMER` | **`Almeria_Restoration_Illustrated_Primer-1.pdf`** | **“From one dryland parcel to a restoration organization”**, *Illustrated Strategic Primer*, revised 18 October 2026 | Ecological and organizational context, site baseline and habitat mosaics. Not a live grant instrument and **do not** import its staged strategy. |
| `SRC-RESTORATION-LIBRARY-INDEX` | **`Restoration_Projects_Overview_UPDATED(1).md`** | **“Restoration Engineering & Environmental Project Library — Master Catalog”**, last updated 9 October 2026 | Index of local engineering and administrative project documents; helpful to resolve renamed files by technical area and programme precedent. |
| `SRC-HORIZON-14` | **`wp-14-horizontal-activities_horizon-2026-2027_en.pdf`** | **“Horizon Europe Work Programme 2026–2027 — 14. Horizontal Activities”**, Annex XIV | Evidence for listed **horizontal activities**, **not** the full Cluster 6 or open HORIZON-NATURE topic texts. Do not derive all Horizon funding rules from it. |

### 11.2 Public projects, real contracts and restoration-investment precedents

| Library source key | **Original file** | Internal/printed title / distinctive identifier | Appropriate use in the navigator |
|---|---|---|---|
| `SRC-ANDARAX-JUSTIFICATION` | **`NJyGw38d59Ey04J43U5QT4SaaiG3G6.pdf`** | **“MEMORIA JUSTIFICATIVA SOBRE LA NECESIDAD DE LA INVERSIÓN”**; **“RESTAURACIÓN DEL RÍO ANDARAX PARA GARANTIZAR SU ADAPTACIÓN E INCREMENTAR SU RESILIENCIA FRENTE A LOS EFECTOS DEL CAMBIO CLIMÁTICO”**; `CONTR 2023 152183` | Project scope, budget/need justification and public investment precedent; **not an open grant to a private landowner**. |
| `SRC-ANDARAX-TENDER-EVAL` | **`Informe Técnico sobre criterios juicio de valor.PDF`** | **“Informe de la Comisión Técnica para la valoración de los criterios de adjudicación cuya ponderación depende de un juicio de valor”**, Andarax river-restoration contract `CONTR 2023 0000152183` | Procurement qualification/evaluation and real commercial opportunities. Not a grant. |
| `SRC-ANDARAX-ESTIMATE` | **`ENLACE CONSIGNA BC3-CAPAS.PDF`** | **“RESTAURACIÓN DEL RÍO ANDARAX PARA GARANTIZAR SU ADAPTACIÓN E INCREMENTAR SU RESILIENCIA...”**; `CONTR/2023 152183`; reference to BC3 and layers | Pointer to engineering cost files/layers, **not** an actual funding call or necessarily the full bill of quantities in the one-page PDF. |
| `SRC-NIJAR-TRAGSA-ENCARGO` | **`26_ Resolución_6_2022_ES.Enc(F).pdf`** | **“Resolución ... se formaliza ... TRAGSA ... encargo ... Proyecto de restauración de ecosistemas fluviales semiáridos de Almería y Campo de Níjar ... infraestructuras verdes”**; `6/2022/ES` | Actual public administrative work assignment; distinguish `encargo a medio propio` from competitive procurement/grant. |
| `SRC-NIJAR-TRAGSATEC-ENCARGO` | **`10_ Resolución.Encargo(F).pdf`** | **“Resolución ... TRAGSATEC ... Apoyo a la dirección de obra, coordinación de seguridad y salud y vigilancia ambiental ... ecosistemas fluviales semiáridos”**; `1/2023/ES` | Professional services/funded public-project architecture; not an individually available startup subsidy. |
| `SRC-NIJAR-PLANT-SUPPLY` | **`DOC20240813101251TSA0078436 PPT PLANTA NIJAR.pdf`** | **“Pliego de prescripciones técnicas particulares ... Suministro de planta autóctona ... ecosistemas fluviales ... Níjar ... Plan de Recuperación, Transformación y Resiliencia”**, `TSA0078436` | Native plant supply tender, real planting specifications and price/quantity context; **not a tree grant**. |
| `SRC-RAMBLA-ALJIBE-PPT` | **`DOC2026081811211505__PPTP__ Redac__ Proyecto Rambla Aljibe.pdf`** | **“Pliego de prescripciones técnicas particulares ... contrato de asistencia técnica para la redacción del proyecto de restauración hidrológico-forestal de la Rambla del Aljibe ... Puebla de Vícar”**, `8572/2026` | Actual public **paid engineering service** scope, roles and deliverables. Not a grant. |
| `SRC-COASTRUST-PPT` | **`DOC20251211113154PPT_COASTRUST.pdf`** | **“Pliego ... contratación del desarrollo de actividades en el Parque Gunter Kunkel de Níjar a través de un acuerdo de custodia ... Interreg Euro-MED COASTRUST”**, `AC_COASTRUST_2025` | Real Interreg-funded stewardship procurement; states 80% FEDER/20% FAMP **for that project**, not universal Interreg aid rate. |
| `SRC-COASTRUST-STRATEGY` | **`Estrategia-Coastrust-Nijar_DEF.pdf`** | **“Estrategia para la gestión costera sostenible en clave de custodia territorial — Proyecto COASTRUST, Municipio de Níjar, 2025”** | Example conservation/stewardship partnership and governance; coastal place-specific, not automatically open to inland Alhama. |
| `SRC-FERREIRA-SILVICULTURE` | **`DOC20251216140451PROYECTO SELVICOLA.pdf`** | **“Tratamientos selvícolas para mejorar hábitats de especies amenazadas en el Monte del Pueblo de Ferreira (Ferreira)”** | 2023 national-park influence-area aid / PRTR-related funded forestry project precedent; not a general open programme for all Almería. |
| `SRC-LAUJAR-MINE-RESTORATION` | **`2025-03-18-40710-Reserva de Laujar-Plan de restauración(1).pdf`** | **“Adaptación a la AAU/AL/0015/21 del Plan de Restauración de las Labores Afectas al Permiso de Investigación ‘Reserva de Láujar’ (Nº40.710)”** | **Legally required mine-related restoration and financial liability** example; distinguish compliance obligations from voluntary conservation grants. |

### 11.3 Territorial, hydrological, environmental and technical context documents

| Library source key | **Original file** | Printed title / search fingerprint | Proper role |
|---|---|---|---|
| `SRC-ANDARAX-PLAN-MEMORIA` | **`01_MEMORIA_INFORMACION_sellado(F).pdf`** | **“Plan Especial de la Vega del Río Andarax en la Aglomeración Urbana de Almería — Memoria de Información y Diagnóstico”** (2024) | Territorial conditions and constraints; **not** a grant call. |
| `SRC-ANDARAX-PLAN-ECON` | **`06_ESTUDIO_ECONOMICO_FINANCIERO_sellado(F).pdf`** | **“Plan Especial de la Vega del Río Andarax ... Estudio Económico-Financiero”** | Public-plan financial feasibility and cost/financing context; not direct private subsidy. |
| `SRC-ANDARAX-PLAN-ACTIONS` | **`07_PROGRAMA_ACTUACIONES_sellado(F).pdf`** | **“Plan Especial de la Vega del Río Andarax ... Programa de Actuaciones”** | Territorial project/programme descriptions and public governance; not a currently selectable grant. |
| `SRC-ANDARAX-PLAN-SEA` | **`08_ESTUDIO_AMBIENTAL_ESTRATEGICO_sellado(F).pdf`** | **“Plan Especial de la Vega del Río Andarax ... Estudio Ambiental Estratégico”** | Environmental constraints, assessment and planning compatibility, not cash. |
| `SRC-ALMERIA-REMOTE-SENSING-PHD` | **`01. Tesis.pdf`** | **“Mapeado de invernaderos de plástico mediante análisis de imagen basada en objetos y series temporales de imágenes de satélite”**, Rafael Jiménez Lao, Universidad de Almería, 2022 | Technical background on remote sensing/mapping; not proof of available grant. |
| `SRC-GROUNDWATER-GUIDE` | **`Groundwater Primer Prompt.txt`** | Contains explanatory guide titled **“Guía introductoria a la hidrogeología y al seguimiento de las aguas subterráneas en el valle del Andarax”** | Hydrogeological concepts, agencies, measurement limitations. Not a payment method; particularly useful to prevent unsupported groundwater-recharge claims. |

### 11.4 Library matching procedure for Codex

1. Index title and textual metadata for every document in the application's own library. Retain the library's original stable `document_id` and available view/download URL internally.
2. For the inventory above, match original filename where still present; otherwise match the **printed title** and exact distinctive phrase, public contracting file number, authority and year. A scanned first page may need a manual source alias but should not be “matched” by filename length or random suffix.
3. Permit many funding entries to cite the same document but ensure the **document supports the specific statement**. A tender for native plant supply is a procurement precedent, not proof of LEADER eligibility.
4. For each funding rule store `supporting_documents` and `source_type`, distinguishing **legal authoritative**, **local selected list**, **research synthesis**, **historical contract**, **environmental technical context** and **implementation inference**.
5. Where authoritative call text is **not** in the local library (e.g. BOJA LEADER 2026 order; a specific Horizon Nature topic), store its official title, authority, date, document number and a `source_missing_locally` flag. **Never attach an unrelated uploaded PDF as a substitute.**
6. If a source match is uncertain, display **“Source file not resolved”** rather than a guessed local link. Allow a maintainer to approve or correct the match.
7. Avoid placing manually guessed full Windows paths or web URLs in this Markdown; Codex can implement local linking using its actual repository's document abstraction.

---

## 12. Other authoritative **source titles** to look up when maintaining the catalogue

These are **official source names and identifiers, not claims that the corresponding files are already included in the project library**. No URLs are supplied. They should be used to verify current details and optionally added to the app's source library.

| Topic | Exact official title / identifier / responsible authority | Why needed |
|---|---|---|
| Andalusian LEADER law | **Orden de 3 de febrero de 2026, por la que se aprueban las bases reguladoras ... Estrategias de Desarrollo Local LEADER ... Intervención 7119.2**; BOJA **29/2026**, Junta de Andalucía | Applicant types, expense exclusions, percentages, thresholds, cross-grant rules, 2.7 payments and maintenance |
| Andalusian LEADER call | **Resolución de 13 de abril de 2026 ... ayudas para solicitantes que no son Grupos de Desarrollo Rural**; BOJA **76/2026** | Current general application window, financing, procedures and conditions |
| AL20 regional scope | **Ayudas previstas en las Estrategias de Desarrollo Local LEADER ... GDR DE LA ALPUJARRA-SIERRA NEVADA ALMERIENSE (AL20)**, Junta de Andalucía | Geography, current selected operation sheet, strategy, funding availability and criteria |
| Selection verification | **Guía de instrucciones específicas de verificabilidad y controlabilidad sobre los criterios de valoración ... Intervención 7119.2 (v2-4, 25-09-2026)** | Verify documentation for scoring instead of guessing 60 points |
| Fundación Biodiversidad enabling rules | **Orden TED/870/2025**, BOE-A-2025-16485 | Correct title of uploaded `BASES-REGULADORAS.pdf`; legal basis, not location-specific open call |
| Doñana call | **Convocatoria de ayudas para la renaturalización y restauración ecológica ... en el área de influencia de Doñana 2025**, Fundación Biodiversidad | Geographic exclusion, actual amounts and historical status |
| LIFE | **LIFE Calls for proposals 2026**, CINEA | Distinguish calls, closed deadlines, eligible project types and rates |
| Horizon restoration | **HORIZON-NATURE-2027-02-02 — Living labs co-creating solutions for the restoration of ecosystems addressing implementation bottlenecks and improving resilience to risks**, EU Funding & Tenders | Confirm open status, deadline, consortium, work packages and lump-sum rules |
| Horizon coordination | **HORIZON-NATURE-2027-02-03 — Networking to scale up living labs for nature restoration solutions and to address bottlenecks to implementation** | Separate coordination/support from research work |
| Horizon monitoring | **HORIZON-NATURE-2027-02-05 — Cost-effective biodiversity monitoring for EU policies** | Research-funded validated monitoring, not general app building |
| Cluster 6 call cycle | **Biodiversity and ecosystem services — Horizon Europe Cluster 6**, European Research Executive Agency | Distinguish 2027 CL6 call dates from HORIZON-NATURE 2027 |
| Interreg | **Call 8 — Thematic projects**, Interreg Euro-MED | Closing date, partner rules, priorities and annex submission |
| MITECO carbon | **Inscripción de proyectos de absorción de dióxido de carbono**, MITECO | 1 ha, forest canopy/height, 30 years, 5-year monitoring |
| MITECO registry FAQ | **Preguntas y respuestas — Registro de huella de carbono, compensación y proyectos de absorción**, MITECO | Common registry eligibility clarifications, including aggregation questions |
| EU carbon farming | **Regulation (EU) 2024/3012 — Union certification framework for permanent carbon removals, carbon farming and carbon storage in products**; Commission methodology documents | Distinguish certification from a market sale, check EU CRCF methodology |
| EU nature credits | **Roadmap towards Nature Credits**, European Commission **COM(2025) 374 final**, July 2025 | Emerging status; no guaranteed pan-EU market/buyer |
| Spanish nonprofit framework | **Ley Orgánica 1/2002 reguladora del Derecho de Asociación**; **Ley 49/2002 de régimen fiscal de las entidades sin fines lucrativos y de los incentivos fiscales al mecenazgo**; **Ley 50/2002 de Fundaciones** | Legal forms, donor-tax qualifications, nonprofit duties and assets |
| De minimis | **Commission Regulation (EU) 2023/2831 on the application of Articles 107 and 108 TFEU to de minimis aid** | Single-undertaking and cumulation restrictions |
| Forestry PEPAC | Andalusian PEPAC interventions **6881.2 and 6881.4**, including **Orden de 5 de diciembre de 2025** and current calls | Forest-specific investments and applicant rules |
| EIP-AGRI | Andalusian PEPAC **Intervención 7161** Operational Groups call and governing rules | Agricultural/forestry multi-actor innovation eligibility |
| Water law | **Plan Hidrológico de las Cuencas Mediterráneas Andaluzas 2022–2027**, Junta de Andalucía | Hydrological authority, conservation constraints and compatibility |

---
## 13. Canonical data fields for implementation — reference, not an app redesign

The navigator should maintain **source-backed separate records** for programme families, open calls, legal provisions, private mechanisms and historical examples. These are the recommended information fields, not a demand to replace the app's existing state, React components or Python simulation engine.

### 13.1 Funding/instrument record

```yaml
funding_id: "LEADER-AL20-3.4"          # Stable ID in this reference
canonical_name: "LEADER 3.4 — Demonstration..."
original_name: "Operaciones destinadas al desarrollo de actividades de demostración..."
mechanism: "GRANT"                  # See §1 taxonomy
programme_family: "LEADER PEPAC 7119.2"
authority: "Junta de Andalucía / AL20 GDR"
region_scope: "AL20 ZRL"            # A municipality lookup is necessary
geography_must_be_verified: true
selected_in_local_strategy: true
source_strength: "PRIMARY_LAW"
call_status: "OPEN_CONFIRMED"        # Snapshot date, NOT evergreen
call_status_checked_on: "2026-10-30"
open_from: "2026-04-23"
open_until: "2028-12-31"
call_caveats: "Possible ZRL interruptions and budget availability"
beneficiary_profiles:
  - "eligible_public_legal_entity"
  - "eligible_nonprofit_legal_entity"
  - "qualifying_public_participation_enterprise"
excluded_beneficiary_examples:
  - "ordinary_private_person_improving_own_property"
project_design_tags:
  - "DESIGN-EXPERIMENT"
required_outputs:
  - "novel_method_or_approach_in_local_ZRL"
  - "actual_test_and_evaluation"
  - "transferability"
  - "public_dissemination"
nonproductive_required: true
financial_basis: "PERCENT_OF_ELIGIBLE_COSTS"
funding_rate_max: 1.0
funding_cap_eur: 28000
amount_is: "LEGAL_CAP"
payment_form: "REIMBURSEMENT"
advance_payment: "conditional; verify guarantee and grant rule"
key_exclusions:
  - "commercial_competitiveness_improvement"
  - "permanent_private_site_improvement_without_eligible_demonstration_basis"
  - "general_excluded_costs"
application_scoring: "minimum 60 points per current general LEADER call"
known_compatibility_risks:
  - "same_cost_double_funding"
  - "founder_land_private_benefit"
  - "nonproductive_vs_productive_misclassification"
source_document_keys:
  - "SRC-AL20-SELECTED"
  - "SRC-AL20-CRITERIA"
external_primary_source_titles:
  - "Orden de 3 de febrero de 2026 ... Intervención 7119.2"
  - "Resolución de 13 de abril de 2026 ... solicitantes que no son GDR"
source_missing_locally: true        # True only if the two official documents aren't in library
confidence_notes: "Eligibility is conditional; AL20 approval required"
```

**This illustration is not an assertion that all content above is automatically derived from a parsed source.** `source_missing_locally` must reflect the **actual** repository state, not default `true` in production. The financing, activity scope and dates should be stored as structured, versioned legal facts, not guessed from a natural-language summary.

### 13.2 Application/eligibility evidence fields

| Field family | Specific variables needed | Do not infer from |
|---|---|---|
| Applicant | Natural person/nonprofit/registered charity/public body/company/university; legal residency; tax/RETA status; SME size; financial capacity | Merely selecting a “conservation” project |
| Geography | Municipality, official GDR polygon, protected-area/park boundaries, catchment, regional grant boundary | Province or postcode alone |
| Land | Parcel area, cadastral references, registry title/lease/custody/concession, remaining years, right to plant/monitor/public access | Plant list or informal owner permission |
| Land type | Registered agricultural/forest/natural/urban class, actual cover, prior use, protected habitat | Visual image classification alone |
| Activity | Nonproductive/public benefit vs genuine enterprise; new method vs standard works; study vs promotion vs demonstration vs physical restoration | User description “green project” |
| Budget | Total cost, eligible cost, VAT treatment, annual cash flow, own funds, advances, guarantee, cap, cofinancing | Published maximum grant amount |
| Applicant timing | Grant submission, first binding contract/work, RETA/tax registration, unemployment in required period | Date user created a project in the app |
| Scoring | Program-specific selection points and documentary evidence, pass/fail constraints | Generic ecological impact score |
| Permissions | Watercourse/river, forest, ecological assessment, planning, Natura 2000, protected species, agriculture | Assuming “nature restoration” exempts works |
| Monitoring | Baseline, reference habitat, indicators, actual observations, methodological confidence, third-party verification | Predicted success from a species mix |
| Credits | Method/version, issue scale, eligible land use, additionality, permanence, claim rights, verification, registry, buyer/offtake | Hectares planted or carbon taken from an ad hoc formula |
| Disclosure | Public reporting, visitor days/alternative public use, research outputs and data policy | Existence of a website alone |
| Compatibilities | Other grants same operation/cost; existing ecological obligations; credit issuance and buyer claims; `de minimis` history | Applicant not having mentioned other funding |

### 13.3 Eligibility output logic

For each opportunity, separate:

- `hard_ineligible_reason`: Known published exclusion, e.g. outside Doñana, not AL20 geography, wrong applicant legal form, Carbon Registry area below 1 hectare, LEADER 2.7 already begun new activity before application where prohibited, closed call.
- `conditional_requirement`: Plausible match but needs documentary confirmation (valid land rights, forest plan, public access, classification under 1.11 or 2.6, actual operating activity, verified proposed outputs).
- `unknown_due_to_missing_data`: Missing parcel area, applicant status, exact local GDR, finance or call document.
- `not_finance_source`: A law, plan, climate/nature-credit roadmap, research source, certification pathway, land agreement, tax treatment or previous contract that does not independently provide funds.
- `funding_cost_mechanism`: Calculate only where rate and **eligible costs** are available. Otherwise return “amount cannot be estimated from available facts”.
- `available_cash`: Separate from nominal granted assistance; never calculate cash as `grant rate * total site-planner cost` without filtering eligible expenses, rate, financial instruments and payment dates.
- `credit_income`: Zero **confirmed** unless actual buyer/offtake contract and method-approved units support a forecast; exploratory scenarios should be explicitly speculative and assumptions visible.

**Example response to a plot failing a known test:** “For the Spanish MITECO forest carbon absorption registry, this individual 0.45 ha site is below the published 1 ha minimum. The ecological restoration project may still be valid and may qualify under other instruments, but this registry route cannot currently be treated as eligible on those facts.”

**Example response to an ambiguous business classification:** “A paid vegetation-monitoring service could be considered under LEADER 1.11 or 2.6 depending on its real forestry/agricultural customer base. 2.7 specifically excludes services falling under 1.11. Obtain written GDR classification before making a business-registration or spending decision.”

**Example response to an emerging credit:** “Potential voluntary biodiversity-payment mechanism. No verified certificate, unit amount, standard acceptance, buyer or price is identified. Treat expected revenue as unconfirmed.”

### 13.4 Funding categories for navigation (not a life-cycle or timeline)

Use independent searchable facets, not an ordered project journey:

- **Funding payer:** EU / Spain / Andalucía / local government / nonprofit foundation / corporate / household / customers / investors.
- **Financial mechanism:** grant, lump sum, reimbursed cost, procurement, donation, service revenue, PES, credit sale, loan, equity, tax, guarantee, noncash support.
- **Applicant:** individual / farmer / forestry undertaking / autónomo / SME / association / qualified charitable entity / foundation / university / municipality / public authority / consortium.
- **Project objective:** ecological conservation / novel demonstration / awareness / public study / farm productivity / forest production / restoration services / digital MRV / water / soils / biodiversity / climate / social outcomes / land acquisition.
- **Location:** current municipality and official funding region, eligibility boundary rather than informal proximity.
- **Money nature:** statutory maximum, actual call cap, allocated envelope, historical amount, user-estimated budget, real contract revenue, hypothetical price.
- **Availability:** actual open call verified on date, closed example, regulatory framework, emerging market, private negotiation or concept.
- **Constraints:** cofinance, cash advance or bank guarantee, legal rights, output monitoring, minimum area, mandatory public use, long-term maintenance, research partners, land classification, buyer verification.
- **Supporting source:** matched repository document, official legal source name, date and status; source confidence and missing documents visible.

All filters should be usable independently; an association applicant can explore commercial contracts, a farmer can explore philanthropic stewardship, and a research consortium can explore public tenders **without the navigator declaring one universal route optimal**. Compatibility and legal separation still apply.

### 13.5 Updates and provenance

- The **snapshot date** is October 30, 2026. Legal and call status must have an independent `last_checked` date.
- Use the official published call as primary authority, then regulations, then local selected operation sheets, then official implementation guides, then uploaded research. Local PDFs may accurately describe **historical** situations without representing live eligibility.
- Maintain title and exact version/issuer. A source document and a funding record should have a many-to-many relationship with **supporting claim type** (legal condition / actual selection / precedent / interpretation).
- If a future call replaces a previous one, preserve the old reference for history but change its availability; do not silently re-label the old grant as newly open.
- Preserve conflicting or uncertain requirements as a review queue rather than choosing the more favourable number. Examples: legal percentage ceiling vs actual call percentage; research call topic vs general Horizon annex; property owner vs formal legal right holder.
- Never construct a local library document link from an original filename. Use the real document ID found in the app's repository.

---

## 14. Common false statements to prevent

| Do **not** say | Say instead |
|---|---|
| “LEADER AL20 finances any ecological planting by any Almería resident.” | “Only selected AL20 typologies apply inside their defined ZRL and each has applicant, scoring, objective and cost conditions.” |
| “There is a €50,000 subsidy to become autónomo and build a conservation foundation.” | “LEADER 2.7 is a restricted individual-business lump sum conditional on unemployment, a new qualifying activity and business milestones; forestry services may instead fall under 1.11.” |
| “LEADER 3.4 and 3.5 are the same planting grant, but 3.5 is larger.” | “3.4 tests and disseminates a locally new transferable demonstration; 3.5 funds qualifying nonproductive conservation/restoration and includes public-benefit access/diffusion duties.” |
| “The Fundación Biodiversidad renaturalisation rules offer up to €200,000 for every hectare in Almería.” | “The 2025 order is enabling law with per-hectare legal limits; actual locations, rates, amounts and windows require specific published calls.” |
| “Doñana's ten-year per-hectare payments are available to Alhama.” | “That named call was Doñana-specific and closed in January 2026; use it as a policy/design precedent.” |
| “A 0.45 hectare native-tree project can sell Spanish forest carbon credits.” | “The identified MITECO registry has a 1 ha minimum plus forest cover, permanence, baseline and other conditions; no buyer is automatic.” |
| “Nature credits are guaranteed because the European Commission launched them.” | “The EU launched a roadmap, expert work and pilots; recognized methods, issuable units, verified results and willing buyers are scheme-specific and developing.” |
| “Water retained in a rain garden automatically equals new aquifer recharge.” | “Infiltration, water retention, soil moisture and aquifer recharge are distinct, requiring local hydrological analysis and evidence.” |
| “A €200,000 100% grant requires no own money.” | “Up to 100% of *eligible cost* may be paid, often in reimbursement after spending; advances may require financial guarantees.” |
| “Project A had an 80% Interreg rate, therefore Interreg always pays 80%.” | “The COASTRUST document demonstrates that specific programme's/project's 80% FEDER/20% FAMP financing, not universal eligibility for all Interreg calls.” |
| “The municipality will fund a public reserve because a technical plan describes it.” | “A planning document/technical precedent signals a potential public policy interest, not an awarded grant or live contract.” |
| “All documents in the project library are grants.” | “Uploaded sources include legal bases, local selected aid categories, research, contract tenders, actual administrative assignments, planning studies and ecological technical documents.” |
| “A donated plot makes an organization financially solvent.” | “Land is a conservation asset that often brings maintenance, tax, liability and liquidity costs.” |
| “An NGO can issue an offset because it planted native species.” | “The right to claim an offset/credit is standard-, law-, contract- and verification-specific. Funding ecological work and certifying a tradable outcome are separate.” |
| “A forest company and a nonprofit can both bill the same planting as independent grant expenditures.” | “Each invoice, funded activity, public award and environmental claim must be documented and checked for overlapping-finance and related-party restrictions.” |

---

## 15. Interpretation and source hierarchy — final implementation notes

This is an **exhaustive working taxonomy of the mechanisms identified or materially relevant to the project**, not an assertion that every programme has an open 2026 call or that every instrument can generate income on a small dryland parcel. It combines three types of material:

**A. Statements directly supported by original project-library documents.** In particular, the AL20 signed selected-typology sheet and criteria; the full Spanish Fundación Biodiversidad renaturalisation enabling order; the Doñana provisional results; the LIFE CUSTODIA 25-instrument study; and public restoration/engineering/stewardship contracts. Their exact filenames and printed titles are recorded in §11. Some of these documents describe **closed or geographically restricted** schemes.

**B. Independently checked official programme information as at 30 October 2026.** The Andalusian LEADER 2026 legal order and April 2026 call; CINEA LIFE 2026 call schedule; Horizon Nature topic IDs and October 2026 opening dates; Interreg Euro-MED Call 8 dates; MITECO carbon project registration requirements; European Commission CRCF and nature-credit roadmap statements; the specific Doñana published call and provisional results. Official document **titles**, rather than unverified repository file links, are provided in §12. Codex or a maintainer must resolve and recheck their current versions.

**C. Expert interpretation for the Algarroba application.** Example project designs, likely fit, fundability cautions, possible buyers, evidence fields, and developer-friendly category IDs. These are **proposals** and not a substitute for a written answer from AL20, the grant authority, competent professional, registry or buyer. They should be labelled as “possible match” or “requires verification”, never as an automatically approved project.

The Funding Navigator's fundamental purpose is to help users understand **what financial instrument exists, whom it can serve, what actual project it would fund, how the money is disbursed, why a project might be rejected, what evidence is missing, and which source supports the statement**. It should not imply that a complete funding history, organisation, or ecological design is forced by the choice of a grant.

**End of reference — 30 October 2026.**
