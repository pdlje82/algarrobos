import { useEffect, useState } from "react";

export function useTheme() {
  const [preference, setPreference] = useState(
    () => document.documentElement.dataset.themePreference || "system",
  );

  useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    function apply() {
      const dark =
        preference === "dark" || (preference === "system" && system.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.dataset.themePreference = preference;
      document.querySelector('meta[name="theme-color"]').content = dark
        ? "#101b15"
        : "#f7f6ef";
    }
    apply();
    try {
      localStorage.setItem("algarrobos-theme", preference);
    } catch {
      // A blocked/full browser store must not stop the theme switch.
    }
    system.addEventListener("change", apply);
    return () => system.removeEventListener("change", apply);
  }, [preference]);

  return [preference, setPreference];
}
