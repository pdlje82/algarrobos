import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import models from "../src/restoration-models.json" with { type: "json" };
import planting from "../src/carob-planting-guide.json" with { type: "json" };
import { validateRestorationModels } from "../src/restorationModels.js";

test("models resolve their real finca references without modifying either reference source", () => {
  const before = structuredClone(models), plantsBefore = structuredClone(planting);
  const guide = validateRestorationModels(models, planting);
  assert.deepEqual(guide.models.map(model => model.code), ["MR1", "MR2", "MR3"]);
  assert.equal(guide.presentation.initial_model, "mr1");
  assert.equal(guide.presentation.initial_view, "models");
  assert.equal(guide.examples.find(example => example.id === "rozas_altas").rainfall, "800–1,200 mm/year");
  assert.equal(guide.source, planting.source);
  for (const model of guide.models) for (const id of model.example_ids) assert.ok(guide.examples.some(example => example.id === id));
  assert.deepEqual(models, before); assert.deepEqual(planting, plantsBefore);
});

test("incompatible models, broken references and missing evidence fail explicitly", () => {
  const cases = [
    [data => { data.version = 2; }, /Unsupported restoration/],
    [data => { data.apply_automatically = true; }, /Unsupported field/],
    [data => { data.models[0].suitability_score = 100; }, /Unsupported field/],
    [data => { data.presentation.initial_model = "best-fit"; }, /Unknown initial/],
    [data => { data.presentation.initial_view = "forecast"; }, /Unknown initial/],
    [data => { data.models[0].topics.splice(5, 1); }, /topics order or IDs/],
    [data => { data.models[0].example_ids = ["invented-finca"]; }, /Unknown or duplicate finca/],
    [data => { data.models[0].example_ids = ["albox", "albox"]; }, /Unknown or duplicate finca/],
    [data => { data.models[1].topics[0].kind = "guaranteed"; }, /Unknown evidence/],
    [data => { data.models[2].questions = []; }, /site questions/],
    [data => { data.examples[0].photo.src = "https://example.org/placeholder.png"; }, /local example photograph/],
    [data => { data.examples[0].photo_page = 0; }, /page reference/],
    [data => { data.comparison[0].id = "suitability_score"; }, /comparison topics/],
    [data => { data.related = null; }, /related dehesa/],
  ];
  for (const [change, message] of cases) {
    const broken = structuredClone(models); change(broken);
    assert.throws(() => validateRestorationModels(broken, planting), message);
  }
  const badPlanting = structuredClone(planting); badPlanting.source.url = "javascript:alert(1)";
  assert.throws(() => validateRestorationModels(models, badPlanting), /HTTPS/);
});

test("the Rozas Altas photograph matches its documented source and original dimensions", async () => {
  const origin = new URL("../public/restoration-models/", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("manifest.json", origin), "utf8"));
  const example = models.examples.find(example => example.id === "rozas_altas");
  assert.equal(manifest.page, example.photo_page);
  assert.equal(manifest.figure, "5.56");
  assert.equal(manifest.license, example.photo.license);
  assert.equal(manifest.credit, example.photo.credit);
  const png = await readFile(new URL(manifest.asset, origin));
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png.readUInt32BE(16), example.photo.width);
  assert.equal(png.readUInt32BE(20), example.photo.height);
  assert.equal(createHash("sha256").update(png).digest("hex"), manifest.sha256);
});
