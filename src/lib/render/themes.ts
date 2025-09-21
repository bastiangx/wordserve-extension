export type ThemeId =
  | "dark"
  | "light"
  | "catppuccin-mocha"
  | "catppuccin-macchiato"
  | "catppuccin-frappe"
  | "catppuccin-latte"
  | "iv-spade"
  | "iceberg-dark"
  | "iceberg-light"
  | "nord-dark"
  | "nord-light"
  | "mountain"
  | "dracula"
  | "everblush"
  | "blueberry"
  | "darling"
  | "poimandres-dark"
  | "poimandres-light";

export const DARK_THEMES: { id: ThemeId; label: string }[] = [
  { id: "dark", label: "Rosé Pine" },
  { id: "catppuccin-mocha", label: "Catppuccin Mocha" },
  { id: "catppuccin-macchiato", label: "Catppuccin Macchiato" },
  { id: "catppuccin-frappe", label: "Catppuccin Frappé" },
  { id: "iv-spade", label: "IV spade" },
  { id: "iceberg-dark", label: "Iceberg dark" },
  { id: "nord-dark", label: "Nord dark" },
  { id: "mountain", label: "Mountain" },
  { id: "dracula", label: "Dracula" },
  { id: "everblush", label: "Everblush" },
  { id: "poimandres-dark", label: "Poimandres" },
];

export const LIGHT_THEMES: { id: ThemeId; label: string }[] = [
  { id: "light", label: "Rosé Pine Dawn" },
  { id: "catppuccin-latte", label: "Catppuccin Latte" },
  { id: "iceberg-light", label: "Iceberg" },
  { id: "nord-light", label: "Nord" },
  { id: "blueberry", label: "Blueberry" },
  { id: "darling", label: "Darling" },
  { id: "poimandres-light", label: "Poimandres light" },
];

export function themeToClass(id: ThemeId): string {
  switch (id) {
    case "dark":
      return "ws-theme-dark"; // existing default dark tokens
    case "light":
      return "ws-theme-light"; // existing light tokens
    case "catppuccin-mocha":
      return "ws-theme-catppuccin-mocha";
    case "catppuccin-macchiato":
      return "ws-theme-catppuccin-macchiato";
    case "catppuccin-frappe":
      return "ws-theme-catppuccin-frappe";
    case "catppuccin-latte":
      return "ws-theme-catppuccin-latte";
    case "iv-spade":
      return "ws-theme-iv-spade";
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
    case "poimandres-dark":
      return "ws-theme-poimandres-dark";
    case "poimandres-light":
      return "ws-theme-poimandres-light";
    default:
      return "ws-theme-dark";
  }
}

export function isLightTheme(id: ThemeId): boolean {
  return [
    "light",
    "catppuccin-latte",
    "iceberg-light",
    "nord-light",
    "blueberry",
    "darling",
    "poimandres-light",
  ].includes(id);
}
