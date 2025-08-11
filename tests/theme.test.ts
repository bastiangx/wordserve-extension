// @ts-nocheck

import {buildThemeCSSVars} from "../src/lib/theme";

describe("Theme CSS Vars", () => {
  it("buildThemeCSSVars returns correct CSS var string", () => {
    const cssVars = buildThemeCSSVars();
    const parts = cssVars.split(";").filter((p) => p);
    const expectedVars = [
      "--ws-bg",
      "--ws-bg-alt",
      "--ws-border",
      "--ws-text",
      "--ws-text-muted",
      "--ws-accent",
      "--ws-accent-fg",
      "--ws-danger",
      "--ws-scrollbar",
      "--ws-scrollbar-hover",
      "--ws-radius",
    ];
    for (const v of expectedVars) {
      expect(parts.some((p) => p.startsWith(v + ":"))).toBe(true);
    }
  });
});
