import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import baseCatalogue from "../../scenarios/planting-catalog-v2.json" with { type: "json" };
import priceDefaults from "../../scenarios/plant-prices.json" with { type: "json" };
import illustrations from "../src/plant-illustrations.json" with { type: "json" };
import { checklistSystems, preselectPlants, changeUnitCost, cataloguePricePatch } from "../src/plantSelection.js";
import { unitCost } from "../src/contracts.js";
import { initialPreview, previewReducer, previewView } from "../src/previewState.js";
const catalogue = { ...baseCatalogue, plants: baseCatalogue.plants.map((plant) => ({ ...plant, default_unit_cost: priceDefaults.unit_costs[plant.id] })) };

test("all catalogue plants have Spanish and Latin names, references, and a shipped transparent illustration", async () => {
  assert.deepEqual(illustrations.plants.map((plant) => plant.id).sort(), catalogue.plants.map((plant) => plant.id).sort());
  for (const plant of illustrations.plants) {
    assert.ok(plant.spanish_name.trim().length > 0);
    assert.ok(plant.scientific_name.trim().length > 0);
    assert.ok(plant.references.length > 0);
    for (const reference of plant.references) assert.equal(new URL(reference.url).protocol, "https:");
    assert.equal(plant.image, `/plants/${plant.id}.png`);
    const png = await readFile(new URL(`../public${plant.image}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), 1254, "every plant ships at the shared original resolution");
    assert.equal(png.readUInt32BE(20), 1254);
    assert.equal(png[25], 6, "RGBA images preserve transparent backgrounds");
  }
});

test("system presets combine individual plants without resetting quantities or custom entries", () => {
  const original = [
    { id: "carob", quantity: 2, unit_cost: 8.35, price_confirmed: true },
    { id: "custom-test", label: "Local plant", group: "shrub", quantity: 7, unit_cost: 1.75, price_confirmed: true },
  ];
  const before = structuredClone(original);
  const woodland = preselectPlants(catalogue, original, "woodland");
  const combined = preselectPlants(catalogue, woodland, "scrub");
  const repeated = preselectPlants(catalogue, combined, "woodland");
  assert.deepEqual(original, before);
  assert.deepEqual(combined, repeated);
  assert.equal(repeated.find((entry) => entry.id === "carob").quantity, 2);
  assert.equal(repeated.find((entry) => entry.id === "carob").unit_cost, 8.35);
  assert.equal(repeated.find((entry) => entry.id === "carob").price_confirmed, true);
  assert.equal(repeated.find((entry) => entry.id === "esparto").price_confirmed, false);
  assert.equal(repeated.find((entry) => entry.id === "custom-test").quantity, 7);
  assert.equal(new Set(repeated.map((entry) => entry.id)).size, repeated.length);
  assert.ok(repeated.some((entry) => entry.id === "esparto"));
  assert.ok(repeated.every((entry) => !Object.hasOwn(entry, "system")));
});

test("the six-plant semi-arid preset selects the missing poster plants with unconfirmed editable prices", () => {
  const original = [{ id: "rosemary", quantity: 3, unit_cost: 4.2, price_confirmed: true }];
  const selected = preselectPlants(catalogue, original, "scrub");
  assert.equal(selected.length, 6);
  assert.deepEqual(selected.find(p => p.id === "rosemary"), original[0]);
  for (const id of ["rhamnus_lycioides", "ephedra_fragilis"]) {
    const plant = selected.find(p => p.id === id);
    assert.equal(plant.unit_cost, priceDefaults.unit_costs[id]);
    assert.equal(plant.price_confirmed, false);
  }
});

test("changing a price clears confirmation, while the same amount and presets preserve it", () => {
  const entries = [{ id: "carob", quantity: 3, unit_cost: 6, price_confirmed: true }];
  assert.equal(changeUnitCost(entries, "carob", 6)[0].price_confirmed, true);
  assert.deepEqual(changeUnitCost(entries, "carob", 0)[0], { id: "carob", quantity: 3, unit_cost: 0, price_confirmed: false });
  assert.equal(changeUnitCost(entries, "carob", null)[0].price_confirmed, false);
  assert.equal(entries[0].price_confirmed, true);
  assert.throws(() => changeUnitCost(entries, "missing", 1), /Unknown selected plant/);
});

test("default-price updates preserve zero and exclude custom plants and quote confirmations", () => {
  assert.deepEqual(cataloguePricePatch(catalogue, [
    { id: "carob", quantity: 4, unit_cost: 0, price_confirmed: true },
    { id: "custom-a", quantity: 1, unit_cost: 999, price_confirmed: true },
  ]), { carob: 0 });
  assert.throws(() => cataloguePricePatch(catalogue, [{ id: "custom-a", unit_cost: 1 }]), /Select at least one catalogue plant/);
  for (const value of [null, undefined, true, -1, NaN, Infinity, 0.001, 1000001]) assert.throws(() => unitCost(value));
  assert.equal(unitCost(6.35), 6.35);
});

test("each catalogue plant appears once in its visual system; broken presets fail explicitly", () => {
  const systems = checklistSystems(catalogue);
  const displayed = systems.flatMap((system) => system.plants.map((p) => p.id));
  assert.equal(displayed.length, catalogue.plants.length);
  assert.equal(new Set(displayed).size, catalogue.plants.length);
  const broken = structuredClone(catalogue);
  broken.mixes[0].plant_ids.push("missing-plant");
  assert.throws(() => checklistSystems(broken), /Unknown plant/);
  assert.throws(() => preselectPlants(catalogue, [], "missing-system"), /Unknown plant preset/);
});

const start = (key, context = "1:demonstrator") => ({ type: "start", key, context });
const finish = (key, value, context = "1:demonstrator") => ({ type: "success", key, context, value });

test("editing retains the visible preview immediately but invalidates commit before effects run", () => {
  const result = { total: 845, trees: 10 };
  let state = previewReducer(initialPreview, start("draft-1"));
  state = previewReducer(state, finish("draft-1", result));
  assert.equal(previewView(state, "1:demonstrator", "draft-1").previewCurrent, true);
  const edited = previewView(state, "1:demonstrator", "draft-2");
  assert.equal(edited.preview, result);
  assert.equal(edited.previewBusy, true);
  assert.equal(edited.previewCurrent, false);
  state = previewReducer(state, start("draft-2"));
  assert.equal(state.value, result);
  state = previewReducer(state, finish("draft-2", { total: 851, trees: 11 }));
  assert.equal(previewView(state, "1:demonstrator", "draft-2").preview.total, 851);
});

test("failed calculations preserve the previous preview with a visible error and commit disabled", () => {
  let state = previewReducer(initialPreview, start("valid"));
  state = previewReducer(state, finish("valid", { total: 845 }));
  state = previewReducer(state, start("cleared-quantity"));
  state = previewReducer(state, {
    type: "error", context: "1:demonstrator", key: "cleared-quantity",
    error: "Each selected plant needs a positive whole-number quantity.",
  });
  const view = previewView(state, "1:demonstrator", "cleared-quantity");
  assert.equal(view.preview.total, 845);
  assert.match(view.previewError, /positive whole-number/);
  assert.equal(view.previewCurrent, false);
  assert.equal(view.previewBusy, false);
});

test("late responses cannot replace newer calculations or leak across decisions/revisions", () => {
  let state = previewReducer(initialPreview, start("draft-1"));
  state = previewReducer(state, start("draft-2"));
  state = previewReducer(state, finish("draft-2", { total: 900 }));
  assert.equal(previewReducer(state, finish("draft-1", { total: 100 })), state);
  assert.equal(previewView(state, "1:land-access", "draft-2").preview, null);
  assert.equal(previewView(state, "2:demonstrator", "draft-2").preview, null);
  assert.equal(previewView(state, null, null).preview, null);
  const changed = previewReducer(state, start("draft-3", "2:demonstrator"));
  assert.equal(changed.value, null);
  assert.equal(previewReducer(changed, finish("draft-2", { total: 1 })), changed);
});
