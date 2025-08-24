/// <reference lib="dom" />
import { describe, expect, test } from "bun:test";
import { SuggestEngine } from "@/lib/suggest";

function makeChunk(words: Array<{ word: string; rank: number }>): Uint8Array {
  // Binary format per initializeFromChunks: 
  // [count:u32][[wlen:u16][word][rank:u16]]*
  const encoder = new TextEncoder();
  const wordBytes = words.map(({ word }) => encoder.encode(word));
  let size = 4; // count
  for (let i = 0; i < words.length; i++) {
    size += 2 + wordBytes[i].length + 2;
  }
  const buf = new Uint8Array(size);
  const view = new DataView(buf.buffer);
  let off = 0;
  view.setInt32(off, words.length, true);
  off += 4;
  for (let i = 0; i < words.length; i++) {
    view.setUint16(off, wordBytes[i].length, true);
    off += 2;
    buf.set(wordBytes[i], off);
    off += wordBytes[i].length;
    view.setUint16(off, words[i].rank, true);
    off += 2;
  }
  return buf;
}

describe("SuggestEngine", () => {
  test("initializeFromChunks parses and sets ready", () => {
    const engine = new SuggestEngine();
    const chunk = makeChunk([
      { word: "apple", rank: 10 },
      { word: "app", rank: 100 },
      { word: "application", rank: 20 },
      { word: "banana", rank: 30 },
    ]);
    const res = engine.initializeFromChunks([chunk]);
    expect(res.success).toBe(true);
    expect(res.wordCount).toBe(4);
    const stats = engine.stats();
    expect(stats.isReady).toBe(true);
    expect(stats.totalWords).toBe(4);
  });

  test("complete respects limit and capi", () => {
    const engine = new SuggestEngine();
    const chunk = makeChunk([
      { word: "apple", rank: 1000 },
      { word: "application", rank: 2000 },
      { word: "apply", rank: 3000 },
      { word: "app", rank: 4000 },
      { word: "apparent", rank: 5000 },
      { word: "Apartment", rank: 6000 },
    ]);
    engine.initializeFromChunks([chunk]);
    const res = engine.complete("App", 3);
    expect(res.length).toBeGreaterThan(0);
    expect(res.length).toBeLessThanOrEqual(3);
    // check capitalization
    for (const s of res) {
      expect(s.word.startsWith("App") || s.word.startsWith("App".toLowerCase())).toBe(true);
    }
  });

  test("complete returns empty when not ready", () => {
    const engine = new SuggestEngine();
    const res = engine.complete("app", 5);
    expect(res.length).toBe(0);
  });
});


