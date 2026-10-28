import { useEffect, useReducer, useState } from "react";
import { initialPreview, previewReducer, previewView } from "./previewState.js";

export function usePreview(request, context, calculate) {
  const [state, dispatch] = useReducer(previewReducer, initialPreview);
  const [attempt, setAttempt] = useState(0);
  const key = request === null ? null : JSON.stringify(request);
  useEffect(() => {
    if (context === null) return;
    let cancelled = false;
    dispatch({ type: "start", context, key });
    const timer = setTimeout(async () => {
      try {
        const value = await calculate("preview", JSON.parse(key));
        if (!cancelled) dispatch({ type: "success", context, key, value });
      } catch (error) {
        if (!cancelled)
          dispatch({ type: "error", context, key, error: error.message });
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [context, key, calculate, attempt]);
  return {
    ...previewView(state, context, key),
    retryPreview: () => setAttempt((value) => value + 1),
  };
}
