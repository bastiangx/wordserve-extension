import {browser} from "wxt/browser";
import {decode, encode} from "@msgpack/msgpack";
import type {RawSuggestion, WASMCompleterStats} from "@/types";

// Base64 helpers for safe message passing of binary msgpack payloads
function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa !== "undefined") {
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  // Fallback (should not hit in browser)
  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob !== "undefined") {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

// Using shared RawSuggestion interface from src/types
type Suggestion = RawSuggestion;

// WASMCompleterStats now from central types

const MAX_SUGGESTION_LIMIT = 128;
const DEFAULT_SUGGESTION_LIMIT = 20;

interface QueuedComplete {
  prefix: string;
  limit: number;
  resolve: (value: Suggestion[]) => void;
  reject: (reason?: any) => void;
}

export class WordServeWASMProxy {
  private isReady = false;
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;
  private queue: QueuedComplete[] = [];
  private statusCheckTimer: number | null = null;
  private destroyed = false;

  constructor() {
    this.readyPromise = new Promise((res) => (this.readyResolve = res));
    browser.runtime.onMessage.addListener(this.handleMessage);
    this.pollStatus();
  }

  private handleMessage = (message: any) => {
    if (message?.type === "wordserve-ready") {
      this.setReady();
    }
  };

  private pollStatus() {
    if (this.destroyed || this.isReady) return;
    browser.runtime
      .sendMessage({ type: "wordserve-status" })
      .then((res: any) => {
        if (res?.ready) {
          this.setReady();
        } else if (!this.isReady) {
          this.statusCheckTimer = window.setTimeout(
            () => this.pollStatus(),
            500
          );
        }
      })
      .catch(() => {
        this.statusCheckTimer = window.setTimeout(() => this.pollStatus(), 800);
      });
  }

  private flushQueue() {
    if (!this.isReady) return;
    const pending = [...this.queue];
    this.queue.length = 0;
    pending.forEach((item) => {
      this.complete(item.prefix, item.limit).then(item.resolve, item.reject);
    });
  }

  private setReady() {
    if (this.isReady) return;
    this.isReady = true;
    if (this.readyResolve) this.readyResolve();
    this.flushQueue();
  }

  public async waitForReady(): Promise<void> {
    if (this.isReady) return;
    return this.readyPromise || Promise.resolve();
  }

  public async complete(
    prefix: string,
    limit: number = DEFAULT_SUGGESTION_LIMIT
  ): Promise<Suggestion[]> {
    if (this.destroyed) return [];
    if (!this.isReady) {
      return new Promise<Suggestion[]>((resolve, reject) => {
        this.queue.push({
          prefix,
          limit,
          resolve,
          reject,
        });
      });
    }
    const clamped = Math.max(
      1,
      Math.min(limit || DEFAULT_SUGGESTION_LIMIT, MAX_SUGGESTION_LIMIT)
    );
    try {
      const request = { p: prefix, l: clamped };
      const packed = encode(request) as Uint8Array;
      const payloadB64 = bytesToBase64(packed);
      console.debug("[WordServe] WASM sending message:", {
        type: "wordserve-complete-msgpack",
        prefix,
        limit: clamped,
        b64Len: payloadB64.length,
      });

      const response = await browser.runtime.sendMessage({
        type: "wordserve-complete-msgpack",
        payloadB64,
      });

      console.debug("[WordServe] WASM received response:", response);

      if (!response) throw new Error("No response");
      if (response.error) throw new Error(response.error);
      let responseBytes: Uint8Array | null = null;
      if (response.payloadB64 && typeof response.payloadB64 === "string") {
        responseBytes = base64ToBytes(response.payloadB64);
      } else if (response.payload instanceof Uint8Array) {
        responseBytes = response.payload;
      } else if (
        response.payload &&
        typeof response.payload === "object" &&
        "length" in response.payload
      ) {
        // legacy object form of Uint8Array
        const len = (response.payload as any).length >>> 0;
        const tmp = new Uint8Array(len);
        for (let i = 0; i < len; i++)
          tmp[i] = (response.payload as any)[i] & 0xff;
        responseBytes = tmp;
      }
      if (!responseBytes) {
        console.debug("[WordServe] No binary payload present");
        return [];
      }
      const decoded: any = decode(responseBytes);
      console.debug("[WordServe] Decoded response:", decoded);

      if (!decoded || !Array.isArray(decoded.s)) return [];
      return decoded.s.map((s: any) => ({
        word: s.w,
        frequency: 0,
        rank: s.r,
      }));
    } catch (error) {
      console.debug("[WordServe] WASM complete error:", error);
      return [];
    }
  }

  public async getStats(): Promise<WASMCompleterStats> {
    if (!this.isReady) await this.waitForReady();
    try {
      const response = await browser.runtime.sendMessage({
        type: "wordserve-stats",
      });
      if (response?.error) throw new Error(response.error);
      return response?.stats || { totalWords: 0, maxFrequency: 0 };
    } catch (_e) {
      return { totalWords: 0, maxFrequency: 0 };
    }
  }

  public get ready(): boolean {
    return this.isReady;
  }

  public destroy() {
    this.destroyed = true;
    if (this.statusCheckTimer) window.clearTimeout(this.statusCheckTimer);
    // Cannot remove specific listener easily with bound method in MV3 polyfill, safe to leave.
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
