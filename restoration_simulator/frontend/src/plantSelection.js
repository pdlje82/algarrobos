import { required, record, unitCost } from "./contracts.js";

export function checklistSystems(catalogue) {
  required(Array.isArray(catalogue.mixes), "Missing planting systems.");
  required(Array.isArray(catalogue.plants), "Missing plant catalogue.");
  const ids = new Set(catalogue.mixes.map((system) => system.id));
  required(ids.size === catalogue.mixes.length, "Duplicate planting system.");
  for (const plant of catalogue.plants)
    required(ids.has(plant.system), `Unknown system for ${plant.label}.`);
  return catalogue.mixes.map((system) => {
    const plants = catalogue.plants.filter((plant) => plant.system === system.id);
    required(plants.length > 0, `No checklist plants for ${system.label}.`);
    required(
      Array.isArray(system.plant_ids) &&
        system.plant_ids.length > 0 &&
        new Set(system.plant_ids).size === system.plant_ids.length,
      `Invalid plant preset for ${system.label}.`,
    );
    for (const id of system.plant_ids) record(catalogue.plants, id, "plant");
    return { ...system, plants };
  });
}

// A preset checks individual plants. There is no separate system in the cart.
export function preselectPlants(catalogue, entries, systemId) {
  const system = checklistSystems(catalogue).find((s) => s.id === systemId);
  required(system !== undefined, `Unknown plant preset: ${systemId}.`);
  const selected = new Set(entries.map((entry) => entry.id));
  return [
    ...entries,
    ...system.plant_ids
      .filter((id) => !selected.has(id))
      .map((id) => ({
        id,
        quantity: record(catalogue.plants, id, "plant").suggested_quantity,
        unit_cost: unitCost(record(catalogue.plants, id, "plant").default_unit_cost),
        price_confirmed: false,
      })),
  ];
}

export function changeUnitCost(entries, id, value) {
  required(entries.some((entry) => entry.id === id), `Unknown selected plant: ${id}.`);
  return entries.map((entry) => entry.id === id
    ? { ...entry, unit_cost: value, price_confirmed: entry.unit_cost === value ? entry.price_confirmed : false }
    : entry);
}

export function cataloguePricePatch(catalogue, entries) {
  required(new Set(entries.map((entry) => entry.id)).size === entries.length, "Duplicate plants in price draft. Correct the checklist before saving defaults.");
  const ids = new Set(catalogue.plants.map((plant) => plant.id));
  const prices = Object.fromEntries(entries.filter((entry) => ids.has(entry.id)).map((entry) => [entry.id, unitCost(entry.unit_cost)]));
  required(Object.keys(prices).length > 0, "Select at least one catalogue plant to save default prices. Custom prices stay in this project.");
  return prices;
}
