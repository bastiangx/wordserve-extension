export type Suggestion = { word: string; frequency: number };

// TS implementation of prefix word suggestion engine
// Based on Go implementation in WordServe
// Had to use native impl because ov MV3 issues with WASM on webworkers.

type CapitalInfo = {
  isAllUpper: boolean;
  isTitle: boolean;
  upperPositions: Set<number>;
};

function isRepetitive(s: string): boolean {
  if (s.length <= 2) return false;
  const c = s[0];
  for (let i = 1; i < s.length; i++) if (s[i] !== c) return false;
  return true;
}

function getCapitalInfo(prefix: string): { lower: string; info: CapitalInfo } {
  // Check if any capital letters exist first
  let hasCapitals = false;
  for (let i = 0; i < prefix.length; i++) {
    const ch = prefix[i];
    if (ch >= 'A' && ch <= 'Z') {
      hasCapitals = true;
      break;
    }
  }
  if (!hasCapitals) {
    return {
      lower: prefix.toLowerCase(),
      info: { isAllUpper: false, isTitle: false, upperPositions: new Set() },
    };
  }
  const isAllUpper = prefix.toUpperCase() === prefix && /[A-Z]/.test(prefix);
  const isTitle =
    prefix.length > 0 &&
    prefix[0] === prefix[0].toUpperCase() &&
    prefix.slice(1) === prefix.slice(1).toLowerCase();
  const upperPositions = new Set<number>();
  for (let i = 0; i < prefix.length; i++) {
    const ch = prefix[i];
    if (ch >= 'A' && ch <= 'Z') upperPositions.add(i);
  }
  return {
    lower: prefix.toLowerCase(),
    info: { isAllUpper, isTitle, upperPositions },
  };
}

function applyCapital(word: string, info: CapitalInfo, prefixLen: number): string {
  if (word.length === 0) return word;
  const chars = word.split("");
  if (info.isAllUpper) {
    for (let i = 0; i < chars.length; i++) chars[i] = chars[i].toUpperCase();
    return chars.join("");
  }
  if (info.isTitle) {
    chars[0] = chars[0].toUpperCase();
    for (let i = 1; i < chars.length; i++) chars[i] = chars[i].toLowerCase();
    return chars.join("");
  }
  for (let i = 0; i < Math.min(prefixLen, chars.length); i++) {
    if (info.upperPositions.has(i)) chars[i] = chars[i].toUpperCase();
    else chars[i] = chars[i].toLowerCase();
  }
  for (let i = prefixLen; i < chars.length; i++) chars[i] = chars[i].toLowerCase();
  return chars.join("");
}

function lowerBound(arr: string[], key: string): number {
  let lo = 0,
    hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] < key) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function binarySearchRange(arr: string[], prefix: string): [number, number] {
  const start = lowerBound(arr, prefix);
  // Any string starting with prefix is < prefix + \uffff in JS lexicographic order
  const endKey = prefix + "\uffff";
  const end = lowerBound(arr, endKey);
  return [start, end];
}

export class SuggestEngine {
  private words: string[] = [];
  private scores: number[] = [];
  private sortedIdx: number[] = [];
  private lexWords: string[] = [];
  private ready = false;
  private totalWords = 0;
  private maxFrequency = 0;
  private loadedChunks = 0;

  initializeFromChunks(chunks: Uint8Array[]): { success: boolean; wordCount: number; chunks: number } {
    if (!Array.isArray(chunks) || chunks.length === 0) return { success: false, wordCount: 0, chunks: 0 };
    const words: string[] = [];
    const scores: number[] = [];
    let maxFreq = 0;
    let total = 0;
  const decoder = new TextDecoder();
  for (const chunk of chunks) {
      try {
        const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        let off = 0;
        if (off + 4 > view.byteLength) throw new Error("invalid header");
        const count = view.getInt32(off, true);
        off += 4;
        for (let i = 0; i < count; i++) {
          if (off + 2 > view.byteLength) throw new Error("unexpected EOF len");
          const wlen = view.getUint16(off, true);
          off += 2;
          if (off + wlen > view.byteLength) throw new Error("unexpected EOF word");
          const bytes = new Uint8Array(view.buffer, view.byteOffset + off, wlen);
          off += wlen;
          if (off + 2 > view.byteLength) throw new Error("unexpected EOF rank");
          const rank = view.getUint16(off, true);
          off += 2;
      const word = decoder.decode(bytes).toLowerCase();
          const score = 65535 - rank + 1;
          words.push(word);
          scores.push(score);
          if (score > maxFreq) maxFreq = score;
          total++;
        }
      } catch (e) {
        return { success: false, wordCount: 0, chunks: 0 };
      }
    }
  const idx = Array.from({ length: words.length }, (_, i) => i);
  idx.sort((a, b) => (words[a] < words[b] ? -1 : words[a] > words[b] ? 1 : 0));
  const lex = new Array<string>(idx.length);
  for (let k = 0; k < idx.length; k++) lex[k] = words[idx[k]];
    this.words = words;
    this.scores = scores;
    this.sortedIdx = idx;
  this.lexWords = lex;
    this.ready = true;
    this.totalWords = total;
    this.maxFrequency = maxFreq;
    this.loadedChunks = chunks.length;
    return { success: true, wordCount: total, chunks: chunks.length };
  }

  stats() {
    return {
      totalWords: this.totalWords,
      maxFrequency: this.maxFrequency,
      loadedChunks: this.loadedChunks,
      availableChunks: this.loadedChunks,
      chunkLoader: 0,
      isReady: this.ready,
    };
  }

  complete(prefix: string, limit: number): Suggestion[] {
    if (!this.ready) return [];
    const lim = Math.max(1, Math.min(limit || 20, 128));
    const { lower, info } = getCapitalInfo(prefix);
    const minThreshold = lower.length <= 2 || isRepetitive(lower) ? 24 : 20;
    if (lower.length === 0) return [];
  // prefix range over cached lexicographically sorted words
  const [start, end] = binarySearchRange(this.lexWords, lower);
    const target = lim + Math.floor(lim / 2);

    const seen = new Set<string>();
    const picked: Suggestion[] = [];
    for (let k = start; k < end && picked.length < target; k++) {
      const i = this.sortedIdx[k];
      const w = this.words[i];
      if (w.length === lower.length && w === lower) continue;
      if (seen.has(w)) continue;
      const f = this.scores[i];
      if (f < minThreshold) continue;
      seen.add(w);
      picked.push({ word: w, frequency: f });
    }

    picked.sort((a, b) => b.frequency - a.frequency);
    const out = picked.slice(0, lim).map((s) => ({
      word: applyCapital(s.word, info, prefix.length),
      frequency: s.frequency,
    }));
    return out;
  }
}
