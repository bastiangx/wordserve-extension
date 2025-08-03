import { browser } from "wxt/browser";

export interface Suggestion {
  word: string;
  frequency: number;
  rank: number;
}

export interface WASMCompleterStats {
  totalWords: number;
  maxFrequency: number;
  [key: string]: number;
}

export class WordServeWASMProxy {
  private isReady = false;

  constructor() {
    // No initialization needed - background handles WASM
    this.isReady = true;
  }

  public async waitForReady(): Promise<void> {
    // Background script handles WASM initialization
    return Promise.resolve();
  }

  public async complete(
    prefix: string,
    limit: number = 20
  ): Promise<Suggestion[]> {
    try {
      const response = await browser.runtime.sendMessage({
        type: "wordserve-complete",
        prefix,
        limit,
      });

      if (!response) {
        throw new Error("No response from background script");
      }

      if (response.error) {
        throw new Error(response.error);
      }

      return response.suggestions || [];
    } catch (error) {
      console.error("WordServe completion failed:", error);
      return [];
    }
  }

  public async getStats(): Promise<WASMCompleterStats> {
    try {
      const response = await browser.runtime.sendMessage({
        type: "wordserve-stats",
      });

      if (!response) {
        throw new Error("No response from background script");
      }

      if (response.error) {
        throw new Error(response.error);
      }

      return response.stats || { totalWords: 0, maxFrequency: 0 };
    } catch (error) {
      console.error("WordServe stats failed:", error);
      return { totalWords: 0, maxFrequency: 0 };
    }
  }

  public get ready(): boolean {
    return this.isReady;
  }
}

// Global instance
let wasmInstance: WordServeWASMProxy | null = null;

export function getWASMInstance(): WordServeWASMProxy {
  if (!wasmInstance) {
    wasmInstance = new WordServeWASMProxy();
  }
  return wasmInstance;
}

export default WordServeWASMProxy;
