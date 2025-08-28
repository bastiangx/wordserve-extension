import { describe, expect, test } from "bun:test";
import { normalizeConfig } from "@/lib/config";

describe("normalizeConfig", () => {
  test("clamps minWordLength and maxSuggestions", () => {
    const cfg = normalizeConfig({ minWordLength: 0, maxSuggestions: 9999 });
    expect(cfg.minWordLength).toBeGreaterThanOrEqual(1);
    expect(cfg.maxSuggestions).toBeLessThanOrEqual(100);
  });

  test("fills defaults and preserves allowed theme", () => {
    const cfg = normalizeConfig({ theme: "light" });
  expect(cfg.theme).toBe("light");
  expect(cfg.debounceTime).toBeDefined();
  expect(Array.isArray(cfg.keyBindings.insertWithSpace)).toBe(true);
  expect(cfg.keyBindings.insertWithSpace.length).toBeGreaterThan(0);
  });

  test("coerces abbreviations map entries to strings", () => {
    const cfg = normalizeConfig({ abbreviations: { HELLO: 42 } });
    expect(cfg.abbreviations.HELLO).toBe("42");
  });
});
