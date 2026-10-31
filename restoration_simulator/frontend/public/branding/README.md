# Algarroba identity

The original [Logo.png](../Logo.png) is the supplied design sheet. Production assets separate the central symbol and wordmark from its heading, paper background and example tiles.

- [algarroba-symbol.png](algarroba-symbol.png): transparent tree/profile/root/carob-pod symbol, 1254 × 1254.
- [algarroba-wordmark.png](algarroba-wordmark.png): transparent Algarroba lettering, 2172 × 724.
- [algarroba-icon.svg](algarroba-icon.svg): self-contained compact icon and browser favicon. It embeds the original-colour symbol, with safe space on a rounded ivory tile in both OS appearances.

The PNG assets were extracted/adapted with the built-in image generation tool, using the supplied sheet as the reference. They were visually checked against it; these are raster derivatives, not a claim of pixel-identical vector reconstruction. The original sheet is retained. [generation-prompts.json](generation-prompts.json) contains the exact prompts and source paths; [manifest.json](manifest.json) contains dimensions and checksums.

## Interface use

The header combines the symbol, supplied serif wordmark and “Restoration planning” descriptor. The footer repeats the name and symbol. The symbol retains its original forest green and brown carob pod in both themes, on a rounded ivory tile (`#FFF9EF`, border `#E5D8C5`). Its displayed size is 60 px on desktop, 48 px on phones and 28 px in the footer, plus tile padding. Only the wordmark reverses to white in dark mode. Logo-load errors remain outside the fixed-size tiles.

The Carob & Clay palette in `src/styles.css` uses warm ivory (`#F8F3E9`), cream panels (`#FFFDF7`) and white raised surfaces in light mode. Dark mode uses charcoal (`#23211F`), brown-grey panels (`#302D29`) and lighter raised surfaces (`#403B34`). Controls have distinct backgrounds and input borders. Primary actions use forest green / sage; selections, focus and answer changes use clay (`#A94E35` / `#EFAB89`). Carob brown remains an identity accent.

Status colours are independent of selection: green for positive outcomes, amber for unanswered conditions, red for conflicts and slate for research-only assessments. Success messages must not reuse the clay selection border. Filled actions and timeline bars use their paired foreground. Theme controls retain Light, Dark and System and the existing preference key.

Supporting sage, water-blue and harvest-gold surfaces add colour to the masthead, workspace buttons, summary values and funding metrics. Project uses a carob accent, Site Designer sage and Funding Navigator blue. These accents do not change funding outcomes. Circumstance nodes use the existing green/amber/red condition colours, with coloured rails and text/symbol labels. A lavender mixed node shows result counts across programmes. An explicit working-option radio focuses colours on one option; opening another card's details leaves that colour basis unchanged. Clay outlines identify the working option and active question, while a subtle blue border identifies open details. Inset changed-answer highlights remain independent of status fills. Amount-only nodes explicitly describe amount conditions rather than eligibility. Original logo PNGs and species colours remain unchanged.

Species colour identities are unchanged. The drawing ground has a dedicated `--drawing-ground` token (`#F8F3E9` / `#292621`) rather than borrowing the UI hover colour; species and key contrast checks use the actual drawing/panel surfaces. Botanical-image backgrounds remain black in dark mode, photographs retain their colours and PDF page contents remain white/black without filters.

Major headings use the configured system serif stack. Form labels, tables, quantities and body copy use the system sans-serif stack; no web font service is required. A static, decorative branch/root/pod SVG replaces the introductory sun. It is hidden from assistive technology.

The header home link supplies an accessible brand name, so its two decorative images have empty alternative text. Failed logo loads display an explicit error. Phone layouts reduce the logo size and wrap header controls; both themes preserve visible keyboard focus. The original design sheet is never rendered as the production header.

This change does not rename the repository directory, Conda environment, project-save keys, scenario identifiers or stored project names.

## Verification

Run the frontend suite and production build, then the isolated `tests/browser/appearance.cjs` workflow and existing funding/designer workflows. Appearance checks cover both themes at desktop, 390 and 320 px, system preference changes, theme-colour metadata, keyboard focus, source-colour symbols, favicon rendering and explicit failed-image errors. Text targets are 4.5:1; essential control/focus/graph indicators and species fills target 3:1. Use isolated saves and API/preview ports; preserve the active project. Screenshots and reports go to ignored `test-artifacts/` directories.
