import { useLayoutEffect, useState } from "react";
import { clientDefaults, required } from "./contracts.js";

export function useTheme() {
  const config = clientDefaults();
  const [appearance, setAppearance] = useState(() => {
    let saved;
    try {
      saved = localStorage.getItem(config.theme_storage_key);
    } catch (e) {
      return {
        preference: config.theme,
        warning: `Theme storage is unavailable (${e.message}). Using the configured theme for this tab.`,
      };
    }
    if (saved === null) return { preference: config.theme, warning: "" };
    if (["system", "light", "dark"].includes(saved))
      return { preference: saved, warning: "" };
    return {
      preference: config.theme,
      warning:
        "The saved theme is invalid. Using the configured theme; choose a theme to replace the invalid preference.",
    };
  });
  useLayoutEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    function apply() {
      const dark =
        appearance.preference === "dark" ||
        (appearance.preference === "system" && system.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.dataset.themePreference = appearance.preference;
      const meta = document.querySelector('meta[name="theme-color"]');
      required(meta !== null, "Missing theme-color metadata.");
      const colour = getComputedStyle(document.documentElement)
        .getPropertyValue("--page")
        .trim();
      required(colour !== "", "Missing --page theme colour.");
      meta.content = colour;
    }
    apply();
    system.addEventListener("change", apply);
    return () => system.removeEventListener("change", apply);
  }, [appearance.preference]);
  function setPreference(value) {
    required(
      ["system", "light", "dark"].includes(value),
      "Unsupported theme selection.",
    );
    let warning = "";
    try {
      localStorage.setItem(config.theme_storage_key, value);
    } catch (e) {
      warning = `Theme preference could not be saved (${e.message}). It applies to this tab only.`;
    }
    setAppearance({ preference: value, warning });
  }
  return [appearance.preference, setPreference, appearance.warning];
}
