import { required } from "./contracts.js";

export const evidenceLabels = Object.freeze({
  guidance: "Book guidance",
  observation: "Finca observation",
  suggestion: "Project suggestion",
  unresolved: "Unresolved",
});

const featureIds = ["collar", "ball", "surface", "support", "preparation", "dimensions"];
const viewIds = ["planting", "buying", "care", "evidence"];

function properties(value, keys, context) {
  required(value !== null && typeof value === "object" && !Array.isArray(value), `Invalid ${context}.`);
  for (const key of keys) required(Object.hasOwn(value, key), `Missing ${context}.${key}.`);
}

function nonempty(value, context) {
  required(typeof value === "string" && value.trim().length > 0, `Missing ${context}.`);
}

function list(value, context) {
  required(Array.isArray(value) && value.length > 0, `Missing ${context}.`);
}

export function validateHandbookPages(value) {
  list(value, "handbook page references");
  required(value.every(page => Number.isInteger(page) && page >= 1 && page <= 168), "Invalid handbook page reference.");
}

function secureUrl(value) {
  nonempty(value, "planting guide source URL");
  required(new URL(value).protocol === "https:", "Planting guide sources must use HTTPS.");
}

function cards(value, context, fields, evidence) {
  list(value, context);
  for (const card of value) {
    for (const key of fields) nonempty(card[key], `${context}.${key}`);
    validateHandbookPages(card.pages);
    if (evidence) required(Object.hasOwn(evidenceLabels, card.kind), `Unknown evidence category in ${context}.`);
  }
}

export function validatePlantingGuide(guide) {
  properties(guide, ["version", "plant_id", "reviewed", "presentation", "source", "views", "features", "preparations", "buying_checks", "containers", "substrate", "care", "treatments", "examples", "oak", "limitations"], "planting guide");
  required(guide.version === 1 && guide.plant_id === "carob", "Unsupported planting guide version or species.");
  nonempty(guide.reviewed, "planting guide review date");
  properties(guide.presentation, ["initial_view", "initial_feature"], "planting guide presentation");
  properties(guide.source, ["title", "authors", "url", "publication_url", "research"], "planting guide source");
  for (const key of ["title", "authors", "research"]) nonempty(guide.source[key], `source.${key}`);
  secureUrl(guide.source.url);
  secureUrl(guide.source.publication_url);
  list(guide.views, "planting guide views");
  for (const view of guide.views) {
    nonempty(view.id, "view ID");
    nonempty(view.label, "view label");
  }
  return validateGuideContents(guide);
}

function validateGuideContents(guide) {
  required(JSON.stringify(guide.views.map(view => view.id)) === JSON.stringify(viewIds), "Planting guide requires its four ordered views.");
  cards(guide.features, "diagram features", ["id", "label", "text", "basis"], true);
  required(JSON.stringify(guide.features.map(feature => feature.id)) === JSON.stringify(featureIds), "Planting diagram features do not match the guide.");
  required(guide.features.every((feature, index) => feature.number === index + 1), "Invalid planting diagram feature numbers.");
  required(viewIds.includes(guide.presentation.initial_view), "Unknown initial planting guide view.");
  required(featureIds.includes(guide.presentation.initial_feature), "Unknown initial planting diagram feature.");
  cards(guide.preparations, "preparation examples", ["title", "text"], true);
  cards(guide.buying_checks, "buying checks", ["title", "text"], false);
  cards(guide.containers, "container comparisons", ["size", "label", "text"], true);
  cards([guide.substrate], "substrate", ["title", "text"], true);
  cards(guide.care, "establishment care", ["title", "text"], true);
  cards(guide.treatments, "optional treatments", ["title", "text"], true);
  cards(guide.examples, "finca examples", ["id", "title", "rainfall", "vegetation", "water", "management", "lesson"], false);
  required(new Set(guide.examples.map(example => example.id)).size === guide.examples.length, "Duplicate finca example IDs.");
  for (const example of [...guide.examples, guide.oak]) {
    validateHandbookPages([example.photo_page]);
    validatePhotograph(example.photo);
  }
  cards([guide.oak], "oak comparison", ["title", "text"], true);
  list(guide.limitations, "evidence limitations");
  for (const limitation of guide.limitations) nonempty(limitation, "evidence limitation");
  return guide;
}

export function handbookPageUrl(source, page) {
  secureUrl(source.url);
  validateHandbookPages([page]);
  const url = new URL(source.url);
  url.hash = `page=${page}`;
  return url.href;
}

export function validatePhotograph(photo) {
  properties(photo, ["src", "alt", "width", "height", "credit", "figure", "license", "license_url"], "example photograph");
  for (const key of ["src", "alt", "credit", "figure", "license"]) nonempty(photo[key], `example photograph.${key}`);
  required(/^\/(?:planting-explorer\/carob|restoration-models)\/[a-z-]+\.png$/.test(photo.src), "Invalid local example photograph path.");
  required([photo.width, photo.height].every(value => Number.isInteger(value) && value > 0), "Invalid example photograph dimensions.");
  secureUrl(photo.license_url);
}
