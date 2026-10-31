import test from "node:test";
import assert from "node:assert/strict";
import {
  fieldsContract,
  inputValue,
  record,
  validateResponse,
  clientDefaults,
  demonstratorContract,
} from "../src/contracts.js";
import { money, area, year } from "../src/format.js";

test("zero and explicit unknown are preserved; invalid numbers are errors", () => {
  assert.match(money(0), /0\.00/);
  assert.equal(area(0), "0 m²");
  assert.equal(year(0), "0");
  for (const format of [money, area, year]) {
    assert.equal(format(null), "Unknown");
    for (const value of [undefined, NaN, Infinity, false, "0"])
      assert.throws(() => format(value));
  }
});

test("missing inputs are rejected while cleared drafts remain empty", () => {
  assert.equal(inputValue({ value: 0 }, "value"), 0);
  assert.equal(inputValue({ value: null }, "value"), "");
  assert.throws(() => inputValue({}, "value"), /Missing form input/);
});

test("required defaults and option lists cannot silently disappear", () => {
  fieldsContract([
    { name: "price", label: "Price", type: "number", default: 0 },
  ]);
  assert.throws(
    () => fieldsContract([{ name: "price", label: "Price", type: "number" }]),
    /default/,
  );
  assert.throws(
    () =>
      fieldsContract(
        [
          {
            name: "route",
            label: "Route",
            type: "select",
            default: "missing",
            options: [{ value: "existing", label: "Existing" }],
          },
        ],
        true,
      ),
    /unavailable/,
  );
  assert.throws(
    () =>
      fieldsContract([
        { name: "route", label: "Route", type: "select", default: "existing" },
      ]),
    /options/,
  );
  assert.throws(
    () =>
      fieldsContract([
        { name: "price", label: "Price", type: "number", default: "0" },
      ]),
    /numeric/,
  );
});

test("broken references produce errors rather than displaying raw IDs", () => {
  assert.equal(
    record([{ id: "p1", name: "Finca" }], "p1", "parcel").name,
    "Finca",
  );
  assert.throws(() => record([], "p1", "parcel"), /Unknown parcel/);
  assert.throws(
    () => record([{ id: "p1" }], "p1", "parcel"),
    /Missing parcel.name/,
  );
});

test("incomplete API views and previews cannot masquerade as valid data", () => {
  assert.throws(
    () => validateResponse("project", {}),
    /client_contract_version/,
  );
  assert.throws(
    () => validateResponse("preview", { revision: 1, explanation: "ok" }),
    /cost/,
  );
  assert.throws(
    () => validateResponse("unregistered", {}),
    /No client contract/,
  );
});

test("client initial values come from the shared JSON configuration", () => {
  const config = clientDefaults();
  assert.equal(typeof config.project_name, "string");
  assert.ok(["system", "dark", "light"].includes(config.theme));
});

test("missing planting/budget records cannot be hidden as an unplanned pilot", () => {
  demonstratorContract({ status: "Not planned", sources: [] });
  assert.throws(() => demonstratorContract(null), /object/);
  assert.throws(
    () => demonstratorContract({ status: "planned", sources: [] }),
    /legacy/,
  );
  assert.throws(
    () => demonstratorContract({ status: "invented", sources: [] }),
    /stage/,
  );
});

test("missing access area cannot be replaced by another summary field", () => {
  const data = {
    client_contract_version: 1,
    configuration_mode: "json-snapshot-v2",
    configuration_notice: null,
    revision: 1,
    planning:{project_revision:1,planning_revision:0,draft:{version:1,inputs:{},source:null},saved:false,committed:false,planting:null,available:false,reason:"No land",context:{parcel:null,design:null,planning_municipality:"unknown",municipality_conflict:false,notice:"Unverified project record"}},
    can_undo: false,
    undo_kind: "action",
    actions: [],
    explanation: "Ready",
    project: {
      id: "test",
      name: "Finca",
      schema_version: 4,
      area_unit: "m2",
      scenario: { horizon: 30, notice: "Example", outline: [] },
      cash: 0,
      time: 0,
      parcels: [],
      agreements: [],
      parties: [],
      activities: [],
      payments: [],
      obligations: [],
      organizations: [],
      history: [],
      grant: {},
    },
    summary: {
      active_area: 0,
      owned_area: 0,
      restored_area: 0,
      parcel_records: 0,
      completed_activities: 0,
      demonstrator: { status: "Not planned", sources: [] },
      grant_explanation: "None",
      asset_explanation: "None",
      pending: "None",
      future_rent_to_horizon: 0,
      future_rent_after_horizon: 0,
      remaining_maintenance_commitment: 0,
      beyond_horizon: [],
    },
    land_access: { routes: [], targets: [], notice: "Example" },
  };
  assert.equal(validateResponse("project", data), data);
  data.summary.area = 5000;
  delete data.summary.active_area;
  assert.throws(() => validateResponse("project", data), /active_area/);
});
