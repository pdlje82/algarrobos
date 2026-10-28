# Algarroba identity

The original [Logo.png](../Logo.png) is the supplied design sheet. Production assets separate the central symbol and wordmark from its heading, paper background and example tiles.

- [algarroba-symbol.png](algarroba-symbol.png): transparent tree/profile/root/carob-pod symbol, 1254 × 1254.
- [algarroba-wordmark.png](algarroba-wordmark.png): transparent Algarroba lettering, 2172 × 724.
- [algarroba-icon.svg](algarroba-icon.svg): self-contained compact icon and browser favicon. It embeds the symbol, with safe space on a rounded ivory tile; an OS dark-mode media query provides a white symbol on forest green.

The PNG assets were extracted/adapted with the built-in image generation tool, using the supplied sheet as the reference. They were visually checked against it; these are raster derivatives, not a claim of pixel-identical vector reconstruction. The original sheet is retained. [generation-prompts.json](generation-prompts.json) contains the exact prompts and source paths; [manifest.json](manifest.json) contains dimensions and checksums.

## Interface use

The header combines the symbol, supplied serif wordmark and “Restoration planning” descriptor. The footer repeats the name and symbol. Both logo images have transparent backgrounds; a CSS filter reverses them to white in the selected dark theme. The compact browser icon follows the OS colour preference independently of the application's theme selector.

The palette in `src/styles.css` uses forest green for primary actions, warm ivory for the light background, and restrained carob brown for introductory accents, focus outlines and the footer divider. Dark mode uses a deep green background, light text and a softer brown accent. Botanical-image backgrounds remain black in dark mode; semantic error/delete colours stay red.

Major headings use the configured system serif stack. Form labels, tables, quantities and body copy use the system sans-serif stack; no web font service is required. A static, decorative branch/root/pod SVG replaces the introductory sun. It is hidden from assistive technology.

The header home link supplies an accessible brand name, so its two decorative images have empty alternative text. Failed logo loads display an explicit error. Phone layouts reduce the logo size and wrap header controls; both themes preserve visible keyboard focus. The original design sheet is never rendered as the production header.

This change does not rename the repository directory, Conda environment, project-save keys, scenario identifiers or stored project names.

## Verification

The existing 20 frontend tests, 93 backend tests and production build pass. Browser checks cover light/dark at 1440, 390 and 320 px, system preference changes, theme-colour metadata, keyboard focus, favicon decoding and explicit failed-image errors. Tested body, muted, accent and primary-button colour pairs exceed 4.5:1 in both themes. Screenshots and the browser check report are stored in the ignored `restoration_simulator/test-artifacts/` directory.
