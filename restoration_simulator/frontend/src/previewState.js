// Retained results are explicitly previous calculations, never valid for a new draft.
export const initialPreview = {
  context: null,
  key: null,
  status: "idle",
  value: null,
  error: "",
};

export function previewReducer(state, event) {
  if (event.type === "start")
    return {
      context: event.context,
      key: event.key,
      status: "pending",
      value: state.context === event.context ? state.value : null,
      error: "",
    };
  if (!["success", "error"].includes(event.type))
    throw new Error(`Unknown preview event: ${event.type}.`);
  if (state.key !== event.key || state.context !== event.context) return state;
  return event.type === "success"
    ? { ...state, status: "success", value: event.value, error: "" }
    : { ...state, status: "error", error: event.error };
}

export function previewView(state, context, key) {
  const eligible = context !== null;
  const matches = eligible && state.context === context && state.key === key;
  return {
    preview: eligible && state.context === context ? state.value : null,
    previewBusy: eligible && (!matches || state.status === "pending"),
    previewError: matches && state.status === "error" ? state.error : "",
    previewCurrent: matches && state.status === "success",
  };
}
