import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import guide from "../src/carob-planting-guide.json" with { type: "json" };
import { handbookPageUrl, validatePlantingGuide } from "../src/plantingGuide.js";

test("the carob reference guide has valid sources and deliberate initial navigation", () => {
  assert.equal(validatePlantingGuide(guide), guide);
  assert.equal(guide.presentation.initial_view, "planting");
  assert.equal(guide.presentation.initial_feature, "collar");
  assert.equal(guide.plant_id, "carob");
  const link = new URL(handbookPageUrl(guide.source, 127));
  assert.equal(link.protocol, "https:");
  assert.equal(link.searchParams.get("inline"), "1");
  assert.equal(link.hash, "#page=127");
});

test("missing guidance, unknown evidence and incompatible data are rejected explicitly", () => {
  const cases = [
    [data => { delete data.care; }, /care/],
    [data => { data.version = 99; }, /Unsupported/],
    [data => { data.features[0].kind = "proven"; }, /Unknown evidence category/],
    [data => { data.presentation.initial_view = "forecast"; }, /Unknown initial/],
    [data => { data.presentation.initial_feature = "taproot-depth"; }, /Unknown initial/],
    [data => { data.features.pop(); }, /features do not match/],
    [data => { data.containers = []; }, /container comparisons/],
    [data => { data.care[0].pages = [0]; }, /page reference/],
    [data => { data.examples[0].photo_page = 169; }, /page reference/],
    [data => { delete data.examples[0].photo; }, /example photograph/],
    [data => { data.examples[0].photo.height = 0; }, /photograph dimensions/],
    [data => { data.examples[0].photo.alt = ""; }, /photograph.alt/],
    [data => { data.examples[0].photo.src = "https://example.org/substitute.png"; }, /local example photograph/],
    [data => { data.examples[1].id = data.examples[0].id; }, /Duplicate finca/],
    [data => { data.source.url = "javascript:alert(1)"; }, /HTTPS/],
  ];
  for (const [change, message] of cases) {
    const broken = structuredClone(guide);
    change(broken);
    assert.throws(() => validatePlantingGuide(broken), message);
  }
  assert.throws(() => handbookPageUrl(guide.source, undefined), /page reference/);
  assert.throws(() => handbookPageUrl(guide.source, 169), /page reference/);
});

test("example photographs retain the source extracts, dimensions and attribution", async () => {
  const manifest = JSON.parse(await readFile(new URL("../public/planting-explorer/carob/manifest.json", import.meta.url), "utf8"));
  for (const example of [...guide.examples, guide.oak]) {
    const photo = example.photo;
    const filename = photo.src.split("/").at(-1);
    const source = manifest.photographs.find(record => record.file === filename);
    assert.ok(source, `Missing provenance for ${filename}`);
    assert.equal(source.page, example.photo_page);
    assert.equal(photo.license, "CC BY-NC-SA 4.0");
    assert.ok(photo.credit.includes("QUERAT"));
    const png = await readFile(new URL(`../public${photo.src}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), photo.width);
    assert.equal(png.readUInt32BE(20), photo.height);
    assert.equal(createHash("sha256").update(png).digest("hex"), source.sha256);
    const libraryImage = await readFile(new URL(`../../../${source.library_asset}`, import.meta.url));
    assert.deepEqual(png, libraryImage, "Public image must preserve the original extracted bytes");
  }
});
