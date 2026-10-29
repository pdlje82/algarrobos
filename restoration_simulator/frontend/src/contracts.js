import defaults from "../../scenarios/defaults.json" with { type: "json" };

export function required(value, message) {
  if (!value) throw new Error(message);
}

export function object(value, path) {
  required(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${path} must be an object.`,
  );
}

export function properties(value, names, path) {
  object(value, path);
  for (const name of names)
    required(
      Object.hasOwn(value, name),
      `Missing ${path}.${name}. Reload after restarting the Python backend.`,
    );
}

export function clientDefaults() {
  required(defaults.version === 1, "Unsupported defaults.json version.");
  properties(
    defaults.client,
    ["project_name", "theme", "theme_storage_key", "notice_without_project"],
    "defaults.client",
  );
  for (const [name, value] of Object.entries(defaults.client))
    required(
      typeof value === "string" && value.length > 0,
      `Invalid defaults.client.${name}.`,
    );
  required(
    ["system", "light", "dark"].includes(defaults.client.theme),
    "Invalid configured theme.",
  );
  return defaults.client;
}

export function fieldsContract(fields, checkSelection = false) {
  required(Array.isArray(fields), "Form fields are missing or invalid.");
  for (const f of fields) {
    properties(f, ["name", "label", "type", "default"], "field");
    required(
      typeof f.name === "string" && typeof f.label === "string",
      "Invalid form field name or label.",
    );
    required(
      [
        "number",
        "text",
        "textarea",
        "select",
        "category",
        "plant_selection",
      ].includes(f.type),
      `Unsupported field type: ${f.type}.`,
    );
    if (f.type === "number")
      required(
        f.default === null ||
          (typeof f.default === "number" && Number.isFinite(f.default)),
        `Invalid numeric default ${f.name}.`,
      );
    if (["text", "textarea", "select", "category"].includes(f.type))
      required(
        typeof f.default === "string",
        `Invalid text/selection default ${f.name}.`,
      );
    if (["select", "category"].includes(f.type)) {
      required(Array.isArray(f.options), `Missing options for ${f.name}.`);
      for (const option of f.options) {
        properties(option, ["value", "label"], `field.${f.name}.option`);
        required(
          typeof option.value === "string" && typeof option.label === "string",
          `Invalid option for ${f.name}.`,
        );
      }
      if (f.type === "select" && checkSelection)
        required(
          f.options.some((o) => o.value === f.default),
          `Default selection for ${f.name} is unavailable.`,
        );
    }
    if (f.type === "plant_selection") {
      properties(
        f.catalogue,
        ["version", "selection_version", "plants", "groups", "mixes", "custom_defaults", "price_defaults"],
        "plant catalogue",
      );
      properties(
        f.catalogue.custom_defaults,
        ["custom_group", "custom_quantity", "unit_costs"],
        "plant catalogue.custom_defaults",
      );
      required(
        f.catalogue.selection_version === 2,
        "Individual plant pricing requires the current Python backend. Restart it and reload.",
      );
      priceDefaultsContract(f.catalogue.price_defaults);
      for (const plant of f.catalogue.plants) {
        properties(plant, ["id", "default_unit_cost"], "catalogue plant");
        required(Object.hasOwn(f.catalogue.price_defaults.unit_costs, plant.id), `Missing default price for ${plant.id}.`);
        unitCost(plant.default_unit_cost);
      }
      required(
        ["tree", "shrub", "grass"].includes(
          f.catalogue.custom_defaults.custom_group,
        ) &&
          Number.isInteger(f.catalogue.custom_defaults.custom_quantity) &&
          f.catalogue.custom_defaults.custom_quantity > 0,
        "Invalid custom plant defaults.",
      );
    }
  }
}

export function inputValue(inputs, name) {
  required(
    Object.hasOwn(inputs, name) && inputs[name] !== undefined,
    `Missing form input ${name}. Reopen the decision.`,
  );
  return inputs[name] === null ? "" : inputs[name]; // Explicitly unentered/unknown numeric draft.
}

export function validUnitCost(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1000000 && Math.round(value * 100) / 100 === value;
}

export function unitCost(value) {
  required(validUnitCost(value),
    "Enter plant unit prices from €0 to €1,000,000, using whole cents.");
  return value;
}

export function priceDefaultsContract(value) {
  properties(value, ["version", "currency", "revision", "unit_costs", "custom_unit_costs"], "default plant prices");
  required(value.version === 1 && value.currency === "EUR" && typeof value.revision === "string" && /^[a-f0-9]{64}$/.test(value.revision), "Invalid default-price version, currency or revision.");
  object(value.unit_costs, "default unit costs");
  required(Object.keys(value.unit_costs).length > 0, "Missing catalogue default prices.");
  for (const price of Object.values(value.unit_costs)) unitCost(price);
  properties(value.custom_unit_costs, ["tree", "shrub", "grass"], "custom plant unit costs");
  for (const price of Object.values(value.custom_unit_costs)) unitCost(price);
  return value;
}

export function record(rows, id, kind) {
  required(Array.isArray(rows), `Missing ${kind} records.`);
  const value = rows.find((row) => row.id === id);
  required(
    value !== undefined,
    `Unknown ${kind} reference: ${id}. Reload the saved project.`,
  );
  const fields = {
    parcel: "name",
    party: "name",
    plant: "label",
    agreement: "parcel_id",
  };
  required(Object.hasOwn(fields, kind), `Unsupported reference kind: ${kind}.`);
  required(
    typeof value[fields[kind]] === "string" && value[fields[kind]].length > 0,
    `Missing ${kind}.${fields[kind]}.`,
  );
  return value;
}

export function demonstratorContract(value) {
  properties(value, ["status", "sources"], "demonstrator");
  required(Array.isArray(value.sources), "Missing demonstrator sources.");
  if (value.status === "Not planned") return;
  if (value.legacy === true) {
    properties(value, ["explanation"], "legacy demonstrator");
    return;
  }
  required(
    ["planned", "baselined", "installed", "observed", "evaluated"].includes(
      value.status,
    ),
    "Unsupported demonstrator stage.",
  );
  properties(
    value,
    [
      "legacy",
      "plan",
      "budget",
      "fit",
      "details",
      "planting",
      "parcel_name",
      "spent",
      "planned_future_spending",
      "funding_stage",
      "funding_record",
      "baseline",
      "observation",
      "evaluation",
      "installed_year",
      "followup_due",
      "funding_review",
    ],
    "demonstrator",
  );
  properties(
    value.plan,
    [
      "restoration_area",
      "trees",
      "shrubs",
      "notes",
      "funding_route",
      "installation_years",
      "followup_years",
    ],
    "demonstrator.plan",
  );
  properties(
    value.budget,
    ["rows", "installation", "monitoring", "reporting", "total"],
    "demonstrator.budget",
  );
  for (const key of ["installation", "monitoring", "reporting", "total"])
    required(
      typeof value.budget[key] === "number" &&
        Number.isFinite(value.budget[key]),
      `Invalid required budget.${key}.`,
    );
  for (const key of [
    "restoration_area",
    "trees",
    "shrubs",
    "installation_years",
    "followup_years",
  ])
    required(
      typeof value.plan[key] === "number" && Number.isFinite(value.plan[key]),
      `Invalid required plan.${key}.`,
    );
  properties(
    value.fit,
    ["status", "issues", "unknowns", "explanation"],
    "demonstrator.fit",
  );
  required(
    Array.isArray(value.fit.issues) &&
      Array.isArray(value.fit.unknowns) &&
      Array.isArray(value.details) &&
      Array.isArray(value.budget.rows),
    "Invalid demonstrator details or budget rows.",
  );
  for (const row of value.budget.rows) {
    properties(row, ["label", "amount"], "budget row");
    required(
      typeof row.amount === "number" && Number.isFinite(row.amount),
      "Invalid required budget row amount.",
    );
  }
  if (Object.hasOwn(value.plan, "plant_selection")) {
    properties(
      value.planting,
      ["entries", "questions"],
      "demonstrator.planting",
    );
    required(
      Array.isArray(value.planting.entries) &&
        Array.isArray(value.planting.questions),
      "Invalid planting list.",
    );
    for (const plant of value.planting.entries) {
      properties(plant, ["unit_cost", "line_total", "price_confirmed"], "planting budget entry");
      unitCost(plant.unit_cost);
      required(typeof plant.line_total === "number" && Number.isFinite(plant.line_total) && plant.line_total >= 0, "Invalid plant line total.");
      required(plant.price_confirmed === null || typeof plant.price_confirmed === "boolean", "Missing plant price confirmation status.");
    }
  } else {
    required(
      value.planting === null,
      "Aggregate-only plans must explicitly identify their absent species list.",
    );
  }
}

export function validateResponse(path, data) {
  object(data, "API response");
  if (path === "plant-prices") return priceDefaultsContract(data);
  if (path === "designer/apply") return validateResponse("commit", data);
  if (["designer/save","designer/library"].includes(path)) return validateResponse("designer",data);
  if (path === "designer") {
    properties(data,["evaluation","fields","catalogue","design_revision","project_revision","available","reason","saved","can_import","rules_update_available","library","active_design_id","library_defaults","suggested_name"],"designer workspace");
    fieldsContract(data.fields,true);
    validateResponse("designer/preview",data.evaluation);
    required(Number.isInteger(data.design_revision)&&Number.isInteger(data.project_revision),"Invalid designer revision.");
    properties(data.library_defaults,["version","name_limit","migrated_name","name_prefix","unnamed_label","unlinked_label"],"designer library defaults");
    required(data.library_defaults.version===1&&data.library_defaults.name_limit===80&&typeof data.suggested_name==="string","Unsupported library configuration.");
    required(Array.isArray(data.library),"Missing named design library.");
    const ids=new Set(),names=new Set();
    for(const design of data.library){
      properties(design,["id","name","area","plants"],"named design summary");
      required(typeof design.id==="string"&&!ids.has(design.id)&&typeof design.name==="string"&&design.name.trim()===design.name&&design.name.length>0&&design.name.length<=data.library_defaults.name_limit&&!names.has(design.name.toLocaleLowerCase()),"Invalid or repeated design name/ID.");
      required(Number.isFinite(design.area)&&design.area>0&&Number.isInteger(design.plants)&&design.plants>=0,"Invalid named design area/count.");
      ids.add(design.id);names.add(design.name.toLocaleLowerCase());
    }
    required(data.active_design_id===null||ids.has(data.active_design_id),"Active design is absent from the library.");
    required(data.saved===(data.active_design_id!==null),"Named design saved state disagrees with its identity.");
    return data;
  }
  if (["designer/preview","designer/import-plan"].includes(path)) {
    properties(data,["draft","width","height","instances","rules","issues","removed","summary","ruleset_hash","reasons","features"],"designer evaluation");
    properties(data.features,["catchment"],"designer features");
    required([1,2,3].includes(data.draft.version)&&data.draft.bundle.manifest.version===data.draft.version,"Unsupported designer contract.");
    if(data.draft.version>=2){
      properties(data,["species","overlays","density_update","message"],"designer-v2 evaluation");
      properties(data.draft,["preferences","dismissed","legacy_exclusions","dimensions","displaced","area_density_update"],"designer-v2 draft");
      required(Array.isArray(data.species)&&typeof data.message==="string"&&(data.density_update===null||Array.isArray(data.density_update)),"Invalid density evaluation.");
      for(const row of data.species){
        properties(row,["id","requested_density","effective_density","density_step","quantity","entry"],"species density");
        required([row.requested_density,row.effective_density,row.density_step].every(Number.isFinite)&&row.density_step>0&&Number.isInteger(row.quantity)&&row.quantity>=0,"Invalid density/count values.");
        properties(row.entry,["id","quantity","unit_cost","price_confirmed"],"density plant entry");
        required(row.entry.id===row.id&&row.entry.quantity===row.quantity&&typeof row.entry.price_confirmed==="boolean"&&validUnitCost(row.entry.unit_cost),"Invalid density entry identity, price or count.");
        properties(data.overlays[row.id],["root_ball","crown"],"plant overlays");
        for(const feature of ["root_ball","crown"]){const overlay=data.overlays[row.id][feature];if(overlay!==null){properties(overlay,["diameter_m","kind","evidence","source","section","context"],"dimension overlay");required(Array.isArray(overlay.diameter_m)&&overlay.diameter_m.length===2&&overlay.diameter_m.every(v=>Number.isFinite(v)&&v>0),"Invalid overlay diameter.");}}
      }
      for(const key of ["shrub_density","overall_density"])required(Number.isFinite(data.summary[key]),`Invalid designer summary ${key}.`);
    }
    if(data.draft.version===3){
      properties(data.draft,["associations","placement_preferences","placement_seed","placement_seen","placement_notes"],"designer-v3 draft");
      properties(data.placement,["categories","associations","warnings","unplaced","minimum_clearance"],"designer placement");
      required(Number.isInteger(data.draft.placement_seed)&&Array.isArray(data.draft.placement_seen)&&Array.isArray(data.placement.warnings)&&Array.isArray(data.placement.unplaced)&&data.placement.minimum_clearance>0,"Invalid placement state.");
      for(const row of data.species){
        required(["within_crowns","open_ground","independent"].includes(data.placement.categories[row.id]),"Missing placement category.");
        const crown=data.overlays[row.id].crown;
        required(crown!==null&&crown.diameter_m[0]===crown.diameter_m[1],"A representative crown / plant diameter is required.");
      }
      for(const instance of data.instances){
        properties(instance,["parent_id","placement_explanation"],"associated instance");
        required((instance.parent_id===null||typeof instance.parent_id==="string")&&typeof instance.placement_explanation==="string","Invalid association explanation.");
      }
    }
    for(const key of ["instances","rules","issues","removed","reasons"])required(Array.isArray(data[key]),`Missing designer ${key}.`);
    for(const instance of data.instances){
      properties(instance,["id","species","x","y","radius","manual","reasons"],"designer plant instance");
      required([instance.x,instance.y,instance.radius].every(Number.isFinite)&&Array.isArray(instance.reasons),"Invalid designer plant position or provenance.");
      const trace=data.reasons.find(row=>row.species===instance.species);
      required(trace!==undefined&&Array.isArray(trace.rules)&&Array.isArray(trace.reasons),`Missing rule trace for ${instance.species}.`);
    }
    for(const key of ["plants","trees","shrubs","placed","unplaced","tree_density","carob_density","plant_cost"])required(typeof data.summary[key]==="number"&&Number.isFinite(data.summary[key]),`Invalid designer summary ${key}.`);
    required(Number.isFinite(data.width)&&Number.isFinite(data.height)&&data.width>0&&data.height>0,"Invalid designer dimensions.");
    designerDisplayContract(data.display,data);
    return data;
  }
  if(path==="designer/apply-preview"){
    properties(data,["preview","previous","notice"],"designer apply preview");validateResponse("preview",data.preview);return data;
  }
  if (
    [
      "project",
      "project/new",
      "commit",
      "undo",
      "import",
      "parcels/delete",
    ].includes(path)
  ) {
    properties(
      data,
      [
        "client_contract_version",
        "configuration_mode",
        "configuration_notice",
        "project",
        "revision",
        "can_undo",
        "undo_kind",
        "actions",
        "summary",
        "land_access",
        "explanation",
      ],
      "API response",
    );
    required(
      data.client_contract_version === 1,
      "Unsupported API contract. Restart the Python backend and reload.",
    );
    required(
      ["none", "json-snapshot-v2", "legacy-v4-form-adapter"].includes(
        data.configuration_mode,
      ),
      "Unsupported form configuration mode.",
    );
    required(
      data.configuration_notice === null ||
        typeof data.configuration_notice === "string",
      "Invalid configuration notice.",
    );
    required(
      Number.isInteger(data.revision) && typeof data.can_undo === "boolean",
      "Invalid project revision or undo state.",
    );
    required(Array.isArray(data.actions), "Missing action list.");
    for (const action of data.actions) {
      properties(
        action,
        [
          "id",
          "title",
          "kind",
          "cost",
          "duration",
          "available",
          "status",
          "fields",
          "terms_label",
          "optional",
          "repeatable",
          "reason",
        ],
        "action",
      );
      required(
        ["available", "future", "unavailable", "completed"].includes(
          action.status,
        ),
        "Unsupported action status.",
      );
      required(
        action.available === (action.status === "available"),
        "Inconsistent action availability.",
      );
      fieldsContract(action.fields, action.available);
    }
    if (data.project !== null) {
      properties(
        data.project,
        [
          "id",
          "name",
          "schema_version",
          "area_unit",
          "scenario",
          "time",
          "cash",
          "parcels",
          "agreements",
          "parties",
          "activities",
          "payments",
          "obligations",
          "organizations",
          "grant",
          "history",
        ],
        "project",
      );
      for (const key of [
        "parcels",
        "agreements",
        "parties",
        "activities",
        "payments",
        "obligations",
        "organizations",
        "history",
      ])
        required(Array.isArray(data.project[key]), `Invalid project.${key}.`);
      properties(
        data.project.scenario,
        ["horizon", "notice", "outline"],
        "project.scenario",
      );
      required(
        typeof data.project.scenario.notice === "string" &&
          Array.isArray(data.project.scenario.outline),
        "Invalid scenario description or outline.",
      );
      for (const key of ["cash", "time"])
        required(
          typeof data.project[key] === "number" &&
            Number.isFinite(data.project[key]),
          `Invalid project.${key}.`,
        );
      properties(
        data.summary,
        [
          "active_area",
          "owned_area",
          "restored_area",
          "parcel_records",
          "completed_activities",
          "demonstrator",
          "grant_explanation",
          "asset_explanation",
          "pending",
          "future_rent_to_horizon",
          "future_rent_after_horizon",
          "remaining_maintenance_commitment",
          "beyond_horizon",
        ],
        "summary",
      );
      for (const key of [
        "active_area",
        "owned_area",
        "restored_area",
        "parcel_records",
        "completed_activities",
        "future_rent_to_horizon",
        "future_rent_after_horizon",
        "remaining_maintenance_commitment",
      ])
        required(
          typeof data.summary[key] === "number" &&
            Number.isFinite(data.summary[key]),
          `Invalid summary.${key}.`,
        );
      for (const parcel of data.project.parcels)
        properties(
          parcel,
          [
            "id",
            "name",
            "area",
            "owner_id",
            "location",
            "cadastral_reference",
            "current_use",
            "current_cover",
            "physical_access",
            "site_condition",
            "restrictions",
            "acquisition_cost",
          ],
          "parcel",
        );
      for (const payment of data.project.payments)
        properties(
          payment,
          ["id", "year", "kind", "cash_change", "agreement_id"],
          "payment",
        );
      demonstratorContract(data.summary.demonstrator);
      properties(
        data.land_access,
        ["routes", "targets", "notice"],
        "land_access",
      );
    } else {
      required(
        data.summary === null &&
          data.land_access === null &&
          data.actions.length === 0,
        "Unexpected records without a project.",
      );
    }
  } else if (path === "land/form") {
    properties(
      data,
      ["fields", "route_id", "parcel_id", "parcel_area"],
      "land form",
    );
    fieldsContract(data.fields, true);
  } else if (path === "preview") {
    properties(
      data,
      [
        "revision",
        "explanation",
        "cost",
        "cash_after",
        "end_year",
        "summary",
        "timeline_agreements",
        "agreements",
        "obligations",
        "parties",
        "parcels",
        "payments",
        "demonstrator",
      ],
      "preview",
    );
    for (const key of ["cost", "cash_after", "end_year"])
      required(
        typeof data[key] === "number" && Number.isFinite(data[key]),
        `Invalid required preview.${key}.`,
      );
    demonstratorContract(data.demonstrator);
    properties(
      data.summary,
      [
        "future_rent_to_horizon",
        "future_rent_after_horizon",
        "remaining_maintenance_commitment",
        "beyond_horizon",
      ],
      "preview.summary",
    );
  } else if (path === "parcels/removal-preview") {
    properties(
      data,
      [
        "revision",
        "parcel_id",
        "name",
        "area",
        "title",
        "removed_actions",
        "deleted_parcels",
        "remaining_actions",
        "remaining_parcels",
        "cash_after",
        "cash_change",
        "year_before",
        "year_after",
        "explanation",
        "undo_notice",
      ],
      "deletion preview",
    );
    required(
      Array.isArray(data.removed_actions),
      "Invalid deletion dependency list.",
    );
  } else if (path === "export") {
    properties(data, ["format_version", "project", "undo"], "export");
  } else {
    throw new Error(`No client contract registered for API endpoint ${path}.`);
  }
  return data;
}

function designerDisplayContract(value,evaluation) {
  properties(value,["version","density_defaults","crown_editors","plants","unplaced","pocket"],"designer display facts; restart Python and reload");
  required(value.version===1,"Unsupported designer display facts.");
  for(const key of ["crown_editors","plants"])object(value[key],`designer display ${key}`);
  if(value.density_defaults!==null){
    properties(value.density_defaults,["carob","tree","shrub","grass"],"saved density defaults");
    required(Object.values(value.density_defaults).every(n=>Number.isFinite(n)&&n>0),"Invalid saved density defaults.");
  }
  const diameter=v=>v===null||(Number.isFinite(v)&&v>0);
  const range=v=>v===null||(Array.isArray(v)&&v.length===2&&v.every(n=>Number.isFinite(n)&&n>0)&&v[1]>=v[0]);
  for(const facts of Object.values(value.crown_editors)){
    properties(facts,["value","range","default_value","basis","note","has_override","editable"],"crown editor facts");
    required(diameter(facts.value)&&diameter(facts.default_value)&&range(facts.range)&&["measured","assumption"].includes(facts.basis)&&typeof facts.note==="string"&&typeof facts.has_override==="boolean"&&typeof facts.editable==="boolean","Invalid crown editor facts.");
    required(facts.value===(facts.range!==null&&facts.range[0]===facts.range[1]?facts.range[0]:null),"A crown range must not be replaced by an invented diameter.");
  }
  if(evaluation.draft.version>=2)for(const row of evaluation.species){
    required(Object.hasOwn(value.crown_editors,row.id),`Missing crown editor facts for ${row.id}.`);
    const facts=value.crown_editors[row.id],overlay=evaluation.overlays[row.id].crown;
    required(JSON.stringify(facts.range)===JSON.stringify(overlay===null?null:overlay.diameter_m)&&facts.editable===(evaluation.draft.version===3),"Crown editor does not match the saved design.");
  }
  for(const facts of Object.values(value.plants)){
    properties(facts,["mode","parent_id","parent_name","name"],"plant display facts");
    required(["associated","manual","tree","open_ground","independent"].includes(facts.mode)&&typeof facts.name==="string"&&(facts.parent_id===null||typeof facts.parent_id==="string")&&(facts.parent_name===null||typeof facts.parent_name==="string"),"Invalid plant display facts.");
  }
  for(const instance of evaluation.instances)required(Object.hasOwn(value.plants,instance.id),`Missing display facts for ${instance.id}.`);
  required(Array.isArray(value.unplaced),"Missing readable unplaced facts.");
  for(const facts of value.unplaced){properties(facts,["id","name","reason"],"unplaced facts");required(typeof facts.id==="string"&&typeof facts.name==="string"&&["with_tree_outside","outside","not_positioned"].includes(facts.reason),"Invalid unplaced facts.");}
  const pocket=value.pocket;
  properties(pocket,["enabled","supported_count","species","name","example_id","state","plotted","moves_with_pocket","quantity","extra_quantity","radius","crown_diameter","crown_range"],"pocket display facts");
  required([pocket.enabled,pocket.plotted,pocket.moves_with_pocket].every(v=>typeof v==="boolean")&&pocket.supported_count===1&&typeof pocket.species==="string"&&(pocket.name===null||typeof pocket.name==="string")&&(pocket.example_id===null||typeof pocket.example_id==="string")&&["off","linked","independent","unplaced","absent"].includes(pocket.state),"Invalid pocket identity or status.");
  required(Number.isInteger(pocket.quantity)&&pocket.quantity>=0&&Number.isInteger(pocket.extra_quantity)&&pocket.extra_quantity===Math.max(0,pocket.quantity-1)&&Number.isFinite(pocket.radius)&&pocket.radius>0&&diameter(pocket.crown_diameter)&&range(pocket.crown_range),"Invalid pocket quantities or dimensions.");
  required(pocket.example_id===(pocket.quantity>0?`${pocket.species}:0`:null)&&pocket.plotted===evaluation.instances.some(p=>p.id===pocket.example_id),"Pocket example-tree identity does not match the plan.");
}
