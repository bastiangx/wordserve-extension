export type ThemeId =
  | "dark"
  | "light"
  | "catppuccin-mocha"
  | "iv-space"
  | "iceberg-dark"
  | "iceberg-light"
  | "nord-dark"
  | "nord-light"
  | "mountain"
  | "dracula"
  | "everblush"
  | "blueberry"
  | "darling";

export const DARK_THEMES: { id: ThemeId; label: string }[] = [
  { id: "dark", label: "Rosé Pine (dark)" },
  { id: "catppuccin-mocha", label: "Catppuccin Mocha" },
  { id: "iv-space", label: "IV space" },
  { id: "iceberg-dark", label: "Iceberg dark" },
  { id: "nord-dark", label: "Nord dark" },
  { id: "mountain", label: "Mountain" },
  { id: "dracula", label: "Dracula" },
  { id: "everblush", label: "Everblush" },
];

export const LIGHT_THEMES: { id: ThemeId; label: string }[] = [
  { id: "light", label: "Rosé Pine (light)" },
  { id: "iceberg-light", label: "Iceberg light" },
  { id: "nord-light", label: "Nord light" },
  { id: "blueberry", label: "Blueberry" },
  { id: "darling", label: "Darling" },
];

export function themeToClass(id: ThemeId): string {
  switch (id) {
    case "dark":
      return "ws-theme-dark"; // existing default dark tokens
    case "light":
      return "ws-theme-light"; // existing light tokens
    case "catppuccin-mocha":
      return "ws-theme-catppuccin-mocha";
    case "iv-space":
      return "ws-theme-iv-space";
    case "iceberg-dark":
      return "ws-theme-iceberg-dark";
    case "iceberg-light":
      return "ws-theme-iceberg-light";
    case "nord-dark":
      return "ws-theme-nord-dark";
    case "nord-light":
      return "ws-theme-nord-light";
    case "mountain":
      return "ws-theme-mountain";
    case "dracula":
      return "ws-theme-dracula";
    case "everblush":
      return "ws-theme-everblush";
    case "blueberry":
      return "ws-theme-blueberry";
    case "darling":
      return "ws-theme-darling";
    default:
      return "ws-theme-dark";
  }
}

export function isLightTheme(id: ThemeId): boolean {
  return [
    "light",
    "iceberg-light",
    "nord-light",
    "blueberry",
    "darling",
  ].includes(id);
}
