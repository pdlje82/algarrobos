import configuration from "./designer-interactions.json" with { type: "json" };
import { required } from "./contracts.js";

export function validateInteractions(value) {
  required(typeof value === "object" && value !== null && value.version === 1, "Unsupported designer interaction configuration.");
  for (const key of ["keyboard_step_m", "keyboard_large_step_m"])
    required(Number.isFinite(value[key]) && value[key] > 0, `Invalid designer interaction setting: ${key}.`);
  required(value.keyboard_large_step_m >= value.keyboard_step_m, "Large keyboard movement must be at least the normal step.");
  return value;
}

export const designerInteractions = validateInteractions(configuration);
export const movementKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

// Temporary gesture feedback only. Python validates the completed position command.
export function keyboardPosition(position, key, large, width, height) {
  required(movementKeys.has(key), "Unsupported plant movement key.");
  const step = large ? designerInteractions.keyboard_large_step_m : designerInteractions.keyboard_step_m;
  const dx = key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0;
  const dy = key === "ArrowUp" ? -step : key === "ArrowDown" ? step : 0;
  return { x: Math.max(0, Math.min(width, position.x + dx)), y: Math.max(0, Math.min(height, position.y + dy)) };
}

export function locatedPlantCounts(evaluation, id) {
  const placed = evaluation.instances.filter(p => p.species === id).length;
  const row = evaluation.draft.selection.entries.find(p => p.id === id);
  const total = row === undefined ? 0 : row.quantity; // An unchecked species has no purchasing entry.
  required(total >= placed, `Plotted count exceeds purchasing quantity for ${id}.`);
  return { placed, unplaced: total - placed };
}
