import scheme from "./designer-symbols.json" with { type: "json" };
import { properties, required } from "./contracts.js";

export function validateSymbolScheme(data) {
  properties(data, ["version", "groups", "species", "custom"], "designer symbol scheme");
  required(data.version === 1, "Unsupported designer symbol scheme.");
  properties(data.groups, ["tree", "shrub", "grass"], "symbol growth-form groups");
  required(Object.keys(data.groups).sort().join(",") === "grass,shrub,tree", "Symbol scheme requires tree, shrub and grass groups.");
  const shapes = {tree:"triangle", shrub:"circle", grass:"tuft"};
  for (const [id, group] of Object.entries(data.groups)) {
    properties(group, ["label", "family", "shape", "key_colour", "colours"], "symbol group");
    required(group.shape === shapes[id] && typeof group.label === "string" && group.label.length > 0 && typeof group.family === "string", "Invalid symbol group identity.");
    required(Array.isArray(group.colours) && group.colours.length > 0 && Number.isInteger(group.key_colour) && group.key_colour >= 0 && group.key_colour < group.colours.length, "Missing symbol group palette.");
    for (const pair of group.colours) {
      properties(pair, ["light", "dark"], "symbol colour pair");
      required([pair.light, pair.dark].every(c => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)), "Invalid theme colour in designer-symbols.json.");
    }
  }
  required(data.species !== null && typeof data.species === "object" && !Array.isArray(data.species), "Missing symbol species assignments.");
  for (const row of Object.values(data.species)) {
    properties(row, ["group", "colour"], "species symbol");
    required(Object.hasOwn(data.groups, row.group) && Number.isInteger(row.colour) && row.colour >= 0 && row.colour < data.groups[row.group].colours.length, "Invalid species colour assignment.");
  }
  properties(data.custom, ["assignment", "seed"], "custom symbol assignment");
  required(data.custom.assignment === "stable_id_hash" && Number.isInteger(data.custom.seed) && data.custom.seed >= 0 && data.custom.seed <= 0xffffffff, "Unsupported custom symbol assignment.");
  return data;
}

export const symbolScheme = validateSymbolScheme(scheme);

function appearance(group, colour) {
  const definition = symbolScheme.groups[group];
  required(definition !== undefined, `Unsupported plant symbol growth form: ${group}.`);
  const pair = definition.colours[colour];
  required(pair !== undefined, "Missing configured plant symbol colour.");
  return {group, shape:definition.shape, light:pair.light, dark:pair.dark,
    style:{"--plant-symbol-light":pair.light, "--plant-symbol-dark":pair.dark}};
}

export function symbolForPlant(plant) {
  properties(plant, ["id", "group"], "plant symbol identity");
  required(typeof plant.id === "string" && Object.hasOwn(symbolScheme.groups, plant.group), "Missing plant symbol identity or growth form.");
  if (plant.id.startsWith("custom-")) {
    let hash = symbolScheme.custom.seed;
    for (const letter of plant.id) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619) >>> 0;
    return appearance(plant.group, hash % symbolScheme.groups[plant.group].colours.length);
  }
  const row = symbolScheme.species[plant.id];
  required(row !== undefined, `Add a symbol colour for ${plant.id} to designer-symbols.json; no substitute was used.`);
  required(row.group === plant.group, `Symbol growth form disagrees with the catalogue for ${plant.id}.`);
  return appearance(row.group, row.colour);
}

export function symbolForGroup(group) {
  required(Object.hasOwn(symbolScheme.groups, group), "Unknown symbol legend group.");
  return appearance(group, symbolScheme.groups[group].key_colour);
}

export function symbolPath(shape, x, y) {
  required(Number.isFinite(x) && Number.isFinite(y), "Invalid plant symbol coordinates.");
  if (shape === "triangle") return `M${x} ${y-.25}l.23 .4h-.46ZM${x} ${y+.15}v.13`;
  if (shape === "circle") return `M${x-.21} ${y}a.21 .21 0 1 0 .42 0a.21 .21 0 1 0 -.42 0`;
  if (shape === "tuft") return `M${x} ${y+.24}Q${x-.25} ${y+.04} ${x-.24} ${y-.15}Q${x-.08} ${y-.06} ${x} ${y+.24}Q${x-.12} ${y-.07} ${x} ${y-.28}Q${x+.12} ${y-.07} ${x} ${y+.24}Q${x+.08} ${y-.06} ${x+.24} ${y-.15}Q${x+.25} ${y+.04} ${x} ${y+.24}Z`;
  throw new Error(`Unsupported plant symbol shape: ${shape}.`);
}

