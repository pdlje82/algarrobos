import { required } from "./contracts.js";
import { plantPresentation } from "./plantNames.js";
import { evidenceLabels, validateHandbookPages, validatePhotograph, validatePlantingGuide } from "./plantingGuide.js";

const modelIds = ["mr1", "mr2", "mr3"];
const topicIds = ["purpose", "land", "arrangement", "climate", "preparation", "water", "maintenance", "density"];

function object(value, context) {
  required(value !== null && typeof value === "object" && !Array.isArray(value), `Invalid ${context}.`);
}
function fields(value, keys, context) {
  object(value, context);
  for (const key of keys) required(Object.hasOwn(value, key), `Missing ${context}.${key}.`);
  for (const key of Object.keys(value)) required(keys.includes(key), `Unsupported field ${context}.${key}.`);
}
function text(value, context) {
  required(typeof value === "string" && value.trim().length > 0, `Missing ${context}.`);
}
function list(value, context) {
  required(Array.isArray(value) && value.length > 0, `Missing ${context}.`);
}
function strings(values, context) {
  list(values, context); for (const value of values) text(value, context);
}
function exactIds(values, ids, context) {
  list(values, context);
  for (const value of values) object(value, context);
  required(JSON.stringify(values.map(value => value.id)) === JSON.stringify(ids), `Invalid ${context} order or IDs.`);
}
function evidence(card, context, keys) {
  fields(card, keys, context); text(card.text, context);
  required(Object.hasOwn(evidenceLabels, card.kind), `Unknown evidence category in ${context}.`);
  validateHandbookPages(card.pages);
}

export function validateRestorationModels(data, plantingGuide) {
  validatePlantingGuide(plantingGuide);
  fields(data, ["version", "reviewed", "presentation", "views", "combination", "models", "comparison", "relationships", "related", "production_context", "examples", "limitations"], "restoration model reference");
  required(data.version === 1, "Unsupported restoration model reference version.");
  text(data.reviewed, "restoration model review date");
  fields(data.presentation, ["initial_model", "initial_view"], "model presentation");
  exactIds(data.views, ["models", "compare"], "restoration views");
  for (const view of data.views) { fields(view, ["id", "label"], "restoration view"); text(view.label, "restoration view label"); }
  exactIds(data.models, modelIds, "restoration models");
  required(modelIds.includes(data.presentation.initial_model), "Unknown initial restoration model.");
  required(data.views.some(view => view.id === data.presentation.initial_view), "Unknown initial restoration view.");
  evidence(data.combination, "combined approach", ["kind", "text", "pages"]);
  list(data.examples, "additional restoration examples");
  for (const example of data.examples) {
    fields(example, ["id", "title", "rainfall", "vegetation", "water", "management", "lesson", "pages", "photo_page", "photo"], "restoration example");
    for (const key of ["id", "title", "rainfall", "vegetation", "water", "management", "lesson"]) text(example[key], `restoration example.${key}`);
    validateHandbookPages(example.pages); validateHandbookPages([example.photo_page]); validatePhotograph(example.photo);
  }
  const examples = [...plantingGuide.examples, ...data.examples];
  const exampleIds = examples.map(example => example.id);
  required(new Set(exampleIds).size === exampleIds.length, "Duplicate restoration example IDs.");
  for (const model of data.models) {
    fields(model, ["id", "code", "title", "summary", "diagram_description", "diagram_note", "topics", "example_ids", "questions", "pages"], "restoration model");
    for (const key of ["code", "title", "summary", "diagram_description", "diagram_note"]) text(model[key], `${model.id}.${key}`);
    required(model.code === model.id.toUpperCase(), `Invalid model code for ${model.id}.`);
    exactIds(model.topics, topicIds, `${model.id} topics`);
    for (const topic of model.topics) { text(topic.title, "model topic title"); evidence(topic, `${model.id}.${topic.id}`, ["id", "title", "kind", "text", "pages"]); }
    strings(model.example_ids, "model example references");
    required(new Set(model.example_ids).size === model.example_ids.length && model.example_ids.every(id => exampleIds.includes(id)), `Unknown or duplicate finca reference in ${model.id}.`);
    strings(model.questions, "site questions"); validateHandbookPages(model.pages);
  }
  exactIds(data.comparison, ["purpose", "land", "arrangement", "water", "maintenance"], "comparison topics");
  for (const row of data.comparison) { fields(row, ["id", "label"], "comparison row"); text(row.label, "comparison label"); }
  list(data.relationships, "planning relationships");
  for (const item of data.relationships) { fields(item, ["title", "text"], "planning relationship"); text(item.title, "relationship title"); text(item.text, "relationship text"); }
  evidence(data.related, "related dehesa model", ["title", "kind", "text", "pages"]); text(data.related.title, "related model title");
  list(data.production_context, "production model context");
  required(JSON.stringify(data.production_context.map(item => item.code)) === JSON.stringify(["MP2", "MP3", "MP4"]), "Invalid production model context.");
  for (const item of data.production_context) {
    fields(item, ["code", "title", "text", "pages"], "production model");
    text(item.title, "production model title"); text(item.text, "production model explanation"); validateHandbookPages(item.pages);
  }
  strings(data.limitations, "restoration evidence limitations");
  return plantPresentation({ ...data, source: plantingGuide.source, examples, oak: plantingGuide.oak });
}
