# Changelog

---

## [0.1.2] - 2025-09-21

Small _patch_ to fix some minor issues [docs, digit selection, Poimandres & Catppuccin themes]

### Fixed

- Digit selection logic would prevent users from either closing the menu or continuing to type normally if the digit index did not exist.
  - Now, if user inputs a digit that is _not_ the shown suggestions, the menu will close and that number will be typed as normal input.
- `ranking-fg` used for menu rendering

### Changed

- Some graphics and badges in README.md
- defaults: digit slection is now off

### Added

- Poimandres theme [dark,light]
- All catppuccin variants [macchiato,mocha,frappe,latte]
- Accent color for all themes
- Review CTA in popup leaf and settings page

### Removed

- README.md documentation's permission `scripting` got removed as it was not used

---
---

## [0.1.1] - 2025-09-08

### Added

- This initial 'CHANGELOG.md' file

### Fixed

- Some useful links were incorrectly blocked due to overly broad domain matching in `types.ts`

### Changed

- Menu rendering logic slightly better, handles edge cases in super long input fields with lots of texts

### Removed

- Wrong domain examples
- Leftover `console.info` logs in `content.ts`
-  `scripting` permission from `wxt.config.ts` as it was not used

---
---

> The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
> and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
