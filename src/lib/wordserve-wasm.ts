import { encode, decode } from '@msgpack/msgpack';
import { browser } from 'wxt/browser';

// Types for MessagePack communication
export interface CompletionRequest {
  p: string; // prefix
  l: number; // limit
}

export interface CompletionResponse {
  s: CompletionSuggestion[]; // suggestions
  c: number; // count
}

export interface CompletionSuggestion {
  w: string; // word
  r: number; // rank
}

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

declare global {
  interface Window {
    wasmCompleter: {
      initWithData: (data: Uint8Array) => { success: boolean; wordCount?: number; error?: string };
      initWithBinaryData: (chunks: Uint8Array[]) => { success: boolean; wordCount?: number; chunks?: number; error?: string };
      loadDictionaryChunk: (data: Uint8Array) => { success: boolean; wordCount?: number; error?: string };
      addWord: (word: string, frequency: number) => { success: boolean; error?: string };
      complete: (data: Uint8Array) => Uint8Array | { error: string };
      completeRaw: (prefix: string, limit: number) => { suggestions: Suggestion[]; count: number; error?: string };
      stats: () => WASMCompleterStats;
    };
    wasmReady?: () => void;
  }
}

export class WordServeWASM {
  private isInitialized = false;
  private isLoading = false;
  private readyPromise: Promise<void> | null = null;

  constructor() {
    this.readyPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized || this.isLoading) {
      return;
    }

    this.isLoading = true;

    try {
      // Load wasm_exec.js by injecting its script into the page
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        // @ts-ignore: using dynamic path for wasm_exec.js
        script.src = browser.runtime.getURL('wasm_exec.js' as any);
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load wasm_exec.js script'));
        document.head.appendChild(script);
      });
      
      // Now load the WASM binary
      // @ts-ignore: dynamic asset path
      const wasmResponse = await fetch(browser.runtime.getURL('wordserve-wasm.wasm' as any));
      if (!wasmResponse.ok) {
        throw new Error(`Failed to load WASM: ${wasmResponse.statusText}`);
      }
      
      const wasmBytes = await wasmResponse.arrayBuffer();
      
      // Create Go runtime and instantiate WASM
      const go = new (globalThis as any).Go();
      const wasmModule = await WebAssembly.instantiate(wasmBytes, go.importObject);
      
      // Wait for WASM to signal readiness
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WASM initialization timeout'));
        }, 10000);

        window.wasmReady = () => {
          clearTimeout(timeout);
          this.isInitialized = true;
          resolve();
        };

        // Start the Go program
        go.run(wasmModule.instance).catch((error: any) => {
          clearTimeout(timeout);
          reject(new Error(`Go program failed: ${error}`));
        });
      });
    } catch (error) {
      this.isLoading = false;
      throw new Error(`Failed to initialize WASM: ${error}`);
    } finally {
      this.isLoading = false;
    }
  }

  public async waitForReady(): Promise<void> {
    if (this.readyPromise) {
      await this.readyPromise;
    }
  }

  public async initWithWordsData(wordsData: string): Promise<{ success: boolean; wordCount?: number; error?: string }> {
    await this.waitForReady();
    
    if (!this.isInitialized) {
      throw new Error('WASM not initialized');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(wordsData);
    
    return window.wasmCompleter.initWithData(data);
  }

  public async addWord(word: string, frequency: number): Promise<void> {
    await this.waitForReady();
    
    if (!this.isInitialized) {
      throw new Error('WASM not initialized');
    }

    const result = window.wasmCompleter.addWord(word, frequency);
    if (!result.success) {
      throw new Error(result.error || 'Failed to add word');
    }
  }

  public async complete(prefix: string, limit: number = 20): Promise<Suggestion[]> {
    await this.waitForReady();
    
    if (!this.isInitialized) {
      throw new Error('WASM not initialized');
    }

    try {
      // Use MessagePack for efficient communication
      const request: CompletionRequest = { p: prefix, l: limit };
      const requestData = encode(request);
      const requestArray = requestData instanceof Uint8Array ? requestData : new Uint8Array(requestData);

      const responseArray = window.wasmCompleter.complete(requestArray);
      
      if ('error' in responseArray) {
        throw new Error((responseArray as any).error);
      }

      const responseData = decode(responseArray as Uint8Array) as CompletionResponse;
      
      return responseData.s.map((s, index) => ({
        word: s.w,
        rank: s.r,
        frequency: 65536 - s.r + 1 // Convert rank back to frequency
      }));
    } catch (error) {
      // Fallback to raw method if MessagePack fails
      console.warn('MessagePack completion failed, falling back to raw method:', error);
      return this.completeRaw(prefix, limit);
    }
  }

  public async completeRaw(prefix: string, limit: number = 20): Promise<Suggestion[]> {
    await this.waitForReady();
    
    if (!this.isInitialized) {
      throw new Error('WASM not initialized');
    }

    const result = window.wasmCompleter.completeRaw(prefix, limit);
    
    if (result.error) {
      throw new Error(result.error);
    }

    return result.suggestions;
  }

  public async getStats(): Promise<WASMCompleterStats> {
    await this.waitForReady();
    
    if (!this.isInitialized) {
      throw new Error('WASM not initialized');
    }

    return window.wasmCompleter.stats();
  }

  public get ready(): boolean {
    return this.isInitialized;
  }
}

// Global instance
let wasmInstance: WordServeWASM | null = null;

export function getWASMInstance(): WordServeWASM {
  if (!wasmInstance) {
    wasmInstance = new WordServeWASM();
  }
  return wasmInstance;
}

export default WordServeWASM;