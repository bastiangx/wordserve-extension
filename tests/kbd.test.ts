import { describe, expect, test } from "bun:test";
import { parseChordString, formatChords, normalizeEventKey, eventMatchesAny } from "@/lib/input/kbd";

describe("kbd parser", () => {
  test("parses simple chord and formatting", () => {
    const chords = parseChordString("cmd+shift+k");
    expect(chords.length).toBe(1);
    expect(chords[0].key).toBe("k");
    expect(new Set(chords[0].modifiers)).toEqual(new Set(["cmd", "shift"]));
    expect(formatChords(chords)).toContain("cmd+shift+k");
  });
  test("parses multiple chords separated by comma, ignores whitespace", () => {
    const chords = parseChordString(" escape , alt + comma ");
    expect(chords.length).toBe(2);
    expect(chords[0].key).toBe("escape");
    expect(chords[1].key).toBe("comma");
    expect(chords[1].modifiers).toContain("alt");
  });
  test("normalizes event keys", () => {
    expect(normalizeEventKey("Enter", "Enter")).toBe("enter");
    expect(normalizeEventKey("ArrowUp", "ArrowUp")).toBe("up");
    expect(normalizeEventKey("1", "Numpad1")).toBe("keypad1");
  });
  test("event matching works", () => {
    const chords = parseChordString("ctrl+alt+comma");
    const ev = { key: ",", code: ",", metaKey: false, ctrlKey: true, altKey: true, shiftKey: false } as any;
    expect(eventMatchesAny(ev, chords)).toBe(true);
  });
});
