import browser from "webextension-polyfill";
import {DEFAULT_SETTINGS} from "@/lib/defaults";

async function cryptoDigestSHA256(data: Uint8Array): Promise<string> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

// Remove unused default export and fix exception handling
export default defineBackground(() => {
  console.log("WordServe background script loaded");

  class BackgroundWordServeWASM {
    private isInitialized = false;
    private isLoading = false;
    get ready(): boolean {
      return this.isInitialized;
    }
    async initialize(): Promise<void> {
      if (this.isInitialized || this.isLoading) return;
      this.isLoading = true;
      try {
        self.importScripts(browser.runtime.getURL("wasm_exec.js" as any));
        const wasmResponse = await fetch(
          browser.runtime.getURL("wordserve.wasm" as any)
        );
        if (!wasmResponse.ok) {
          // Fix: Log error and return/re-throw properly
          console.error(`WASM fetch failed with status ${wasmResponse.status}`);
          throw new Error(`wasm fetch ${wasmResponse.status}`);
        }
        const wasmBytes = await wasmResponse.arrayBuffer();
        const go = new (globalThis as any).Go();
        const wasmModule = await WebAssembly.instantiate(
          wasmBytes,
          go.importObject
        );
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("WASM initialization timeout")),
            10000
          );
          (globalThis as any).wasmReady = () => {
            clearTimeout(timeout);
            this.isInitialized = true;
            resolve();
          };
          go.run(wasmModule.instance).catch((error: any) => {
            clearTimeout(timeout);
            reject(new Error(`Go program failed: ${error}`));
          });
        });
      } catch (e) {
        console.error("WASM initialization failed:", e);
        this.isLoading = false;
        throw e;
      } finally {
        this.isLoading = false;
      }
    }
    async completeMsgPack(packed: Uint8Array) {
      if (!this.isInitialized) {
        console.error("WASM not initialized for completeMsgPack");
        throw new Error("WASM not initialized");
      }
      console.debug(
        "[WordServe] WASM calling wasmCompleter.complete with:",
        packed
      );

      try {
        const result = (globalThis as any).wasmCompleter.complete(packed);
        console.debug(
          "[WordServe] WASM completer returned type:",
          typeof result,
          "instanceof Uint8Array:",
          result instanceof Uint8Array
        );
        console.debug("[WordServe] WASM completer result:", result);

        if (result && typeof result === "object" && result.error) {
          console.error("WASM completer returned error:", result.error);
          throw new Error(result.error);
        }
        return result;
      } catch (error) {
        console.error("[WordServe] WASM completer error:", error);
        throw error;
      }
    }
    async getStats() {
      if (!this.isInitialized) {
        console.error("WASM not initialized for getStats");
        throw new Error("WASM not initialized");
      }
      return (globalThis as any).wasmCompleter.stats();
    }
    async completeRaw(prefix: string, limit: number) {
      if (!this.isInitialized) {
        console.error("WASM not initialized for completeRaw");
        throw new Error("WASM not initialized");
      }
      const result = (globalThis as any).wasmCompleter.completeRaw(
        prefix,
        limit
      );
      if (result.error) {
        console.error("Raw completion error:", result.error);
        throw new Error(result.error);
      }
      return result.suggestions;
    }
  }

  let wasmInstance: BackgroundWordServeWASM | null = null;

  function broadcast(type: string, payload: any = {}) {
    browser.tabs.query({}).then((tabs) => {
      for (const tab of tabs)
        if (tab.id)
          browser.tabs
            .sendMessage(tab.id, { type, ...payload })
            .catch(() => {});
    });
  }

  async function recordError(message: string) {
    try {
      await browser.storage.local.set({
        wordserveLastError: { message, ts: Date.now() },
      });
    } catch {}
    console.error("WordServe error:", message);
    broadcast("wordserve-error", { message });
  }

  const MIN_CHUNK_BYTES = 200; // sanity
  const EXPECTED_CHUNKS = 7;

  async function loadDictionaryData() {
    if (!wasmInstance) return;
    try {
      // Attempt to fetch asset manifest for integrity (non-fatal)
      let manifest: Record<string, { sha256?: string }> | null = null;
      try {
        const resp = await fetch(
          browser.runtime.getURL("asset-manifest.json" as any)
        );
        if (resp.ok) {
          const data = await resp.json();
          manifest = {};
          for (const a of data.assets || []) {
            manifest[a.path] = { sha256: a.sha256 };
          }
        }
      } catch {}
      const chunkPromises: Promise<Uint8Array>[] = [];
      for (let i = 1; i <= EXPECTED_CHUNKS; i++) {
        const chunkNum = String(i).padStart(4, "0");
        chunkPromises.push(
          fetch(browser.runtime.getURL(`data/dict_${chunkNum}.bin` as any))
            .then((r) => {
              if (!r.ok) {
                console.error(`Failed to fetch dict_${chunkNum} with status ${r.status}`);
                throw new Error(`dict_${chunkNum} status ${r.status}`);
              }
              return r.arrayBuffer();
            })
            .then((b) => new Uint8Array(b))
        );
      }
      const chunks = await Promise.all(chunkPromises);
      if (chunks.length !== EXPECTED_CHUNKS) {
        console.error(`Expected ${EXPECTED_CHUNKS} chunks, got ${chunks.length}`);
        throw new Error(
          `expected ${EXPECTED_CHUNKS} chunks, got ${chunks.length}`
        );
      }
      // Hash verify wasm + words.txt if manifest provides
      if (manifest) {
        try {
          const wasmSpec = manifest["wordserve.wasm"];
          if (wasmSpec?.sha256) {
            const wasmBuf = new Uint8Array(
              await (
                await fetch(browser.runtime.getURL("wordserve.wasm" as any))
              ).arrayBuffer()
            );
            const wasmHash = await cryptoDigestSHA256(wasmBuf);
            if (wasmHash !== wasmSpec.sha256) {
              console.error("Hash mismatch for wordserve.wasm");
              throw new Error("hash mismatch for wordserve.wasm");
            }
          }
          const wordsSpec = manifest["data/words.txt"];
          if (wordsSpec?.sha256) {
            const wordsBuf = new Uint8Array(
              await (
                await fetch(browser.runtime.getURL("data/words.txt" as any))
              ).arrayBuffer()
            );
            const wordsHash = await cryptoDigestSHA256(wordsBuf);
            if (wordsHash !== wordsSpec.sha256) {
              console.error("Hash mismatch for data/words.txt");
              throw new Error("hash mismatch for data/words.txt");
            }
          }
        } catch (ihErr) {
          console.warn("Integrity check (non-fatal) failed:", ihErr);
        }
      }
      for (let i = 0; i < chunks.length; i++) {
        const chk = chunks[i];
        if (chk.byteLength < MIN_CHUNK_BYTES) {
          console.error(`Chunk ${i} too small (${chk.byteLength} bytes)`);
          throw new Error(`chunk ${i} too small (${chk.byteLength} bytes)`);
        }
        // Hash verification if manifest present
        if (manifest) {
          const path = `data/dict_${String(i + 1).padStart(4, "0")}.bin`;
          const spec = manifest[path];
          if (spec?.sha256) {
            const hash = await cryptoDigestSHA256(chk);
            if (hash !== spec.sha256) {
              console.error(`Hash mismatch for ${path}`);
              throw new Error(`hash mismatch for ${path}`);
            }
          }
        }
      }
      if ((globalThis as any).wasmCompleter?.initWithBinaryData) {
        const result = (globalThis as any).wasmCompleter.initWithBinaryData(
          chunks
        );
        if (!result?.success) {
          console.error("Failed to load dictionary:", result?.error);
          throw new Error(result?.error || "Failed to load dictionary");
        }
        await browser.storage.local.set({
          wordserveDictMeta: { words: result.wordCount, chunks: result.chunks },
        });
        console.log(
          `WordServe loaded ${result.wordCount} words from ${result.chunks} chunks`
        );
      } else {
        console.error("WASM completer not available");
        throw new Error("WASM completer not available");
      }
    } catch (err) {
      await recordError(`Binary dictionary load failed: ${String(err)}`);
      try {
        const response = await fetch(
          browser.runtime.getURL("data/words.txt" as any)
        );
        if (!response.ok) {
          console.error(`Failed to fetch words.txt with status ${response.status}`);
          throw new Error(`words.txt status ${response.status}`);
        }
        const text = await response.text();
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const result = (globalThis as any).wasmCompleter.initWithData(data);
        if (!result.success) {
          console.error("Failed to load text dictionary:", result.error);
          throw new Error(result.error || "Failed to load text dictionary");
        }
        await browser.storage.local.set({
          wordserveDictMeta: { words: result.wordCount, chunks: 0 },
        });
        console.log(
          `WordServe loaded ${result.wordCount} words from text file`
        );
      } catch (fallbackErr) {
        await recordError(`Dictionary fallback failed: ${String(fallbackErr)}`);
      }
    }
  }

  async function initializeWASM() {
    try {
      wasmInstance = new BackgroundWordServeWASM();
      await wasmInstance.initialize();
      await loadDictionaryData();
      broadcast("wordserve-ready");
      console.log("WordServe WASM initialized in background");
    } catch (e) {
      await recordError(`Initialization failed: ${String(e)}`);
    }
  }

  // Update onMessage listener to fix TypeScript typing errors
  browser.runtime.onMessage.addListener(
    (
      message: any,
      sender: browser.Runtime.MessageSender,
      sendResponse: (response: any) => void
    ): true => {
      if (message.type === "wordserve-status") {
        sendResponse({ ready: !!(wasmInstance && wasmInstance.ready) });
        return true;
      }
      if (message.type === "wordserve-last-error") {
        (async () => {
          const data = await browser.storage.local.get("wordserveLastError");
          sendResponse(data.wordserveLastError || null);
        })();
        return true;
      }
      if (message.type === "wordserve-dict-meta") {
        (async () => {
          const data = await browser.storage.local.get("wordserveDictMeta");
          sendResponse(data.wordserveDictMeta || null);
        })();
        return true;
      }
      if (message.type === "wordserve-complete-msgpack") {
        (async () => {
          try {
            if (!wasmInstance?.ready) {
              sendResponse({ error: "WASM not ready" });
              return;
            }
            // Accept base64 payload (preferred) or legacy forms
            let packed: Uint8Array | null = null;
            if (typeof message.payloadB64 === "string") {
              try {
                const bin = atob(message.payloadB64);
                const arr = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                packed = arr;
              } catch (e) {
                console.error("[WordServe] Failed to decode base64 payload", e);
              }
            } else if (message.payload instanceof Uint8Array) {
              packed = message.payload;
            } else if (
              message.payload &&
              typeof message.payload === "object" &&
              "length" in message.payload
            ) {
              const len = message.payload.length >>> 0;
              const arr = new Uint8Array(len);
              for (let i = 0; i < len; i++) arr[i] = message.payload[i] & 0xff;
              packed = arr;
            }
            if (!packed) {
              console.error(
                "[WordServe] Invalid payload format",
                message.payloadB64?.length,
                typeof message.payload
              );
              sendResponse({ error: "Invalid payload format" });
              return;
            }

            console.debug(
              "[WordServe] Background calling wasmCompleter.complete with packed bytes len:",
              packed.byteLength
            );

            const result = await wasmInstance.completeMsgPack(packed);
            console.debug(
              "[WordServe] Background received WASM result type:",
              typeof result,
              "isUint8",
              result instanceof Uint8Array
            );

            let payloadB64: string | undefined;
            if (result instanceof Uint8Array) {
              let binary = "";
              for (let i = 0; i < result.length; i++) binary += String.fromCharCode(result[i]);
              payloadB64 = btoa(binary);
            }
            sendResponse({ payloadB64 });
          } catch (e) {
            console.error("[WordServe] Background WASM error:", e);
            sendResponse({ error: String(e) });
          }
        })();
        return true;
      }
      if (message.type === "wordserve-complete") {
        (async () => {
          try {
            if (!wasmInstance?.ready) {
              sendResponse({ error: "WASM not ready" });
              return;
            }
            const { prefix, limit } = message;
            const clamped = Math.max(1, Math.min(limit || 20, 128));
            const suggestions = await wasmInstance.completeRaw(prefix, clamped);
            sendResponse({ suggestions });
          } catch (e) {
            sendResponse({ error: String(e) });
          }
        })();
        return true;
      }
      if (message.type === "wordserve-stats") {
        (async () => {
          try {
            if (!wasmInstance?.ready) {
              sendResponse({ error: "WASM not ready" });
              return;
            }
            const stats = await wasmInstance.getStats();
            sendResponse({ stats });
          } catch (e) {
            sendResponse({ error: String(e) });
          }
        })();
        return true;
      }
      if (message.type === "updateSettings") {
        (async () => {
          try {
            await browser.storage.sync.set({
              wordserveSettings: message.settings,
            });
            const tabs = await browser.tabs.query({});
            for (const tab of tabs)
              if (tab.id && tab.id !== sender.tab?.id)
                browser.tabs
                  .sendMessage(tab.id, {
                    type: "settingsUpdated",
                    settings: message.settings,
                  })
                  .catch(() => {});
            sendResponse({ success: true });
          } catch (e) {
            sendResponse({ success: false, error: String(e) });
          }
        })();
        return true;
      }
      if (message.type === "domain-override") {
        (async () => {
          try {
            if (message.mode === "allowAlways" && message.host) {
              const data = await browser.storage.sync.get("wordserveSettings");
              const settings = data.wordserveSettings as any;
              if (settings && settings.domains) {
                const { whitelist } = settings.domains;
                if (!whitelist.includes(message.host)) {
                  whitelist.push(message.host);
                  await browser.storage.sync.set({
                    wordserveSettings: settings,
                  });
                  broadcast("domainSettingsChanged", {
                    settings: settings.domains,
                  });
                }
              }
            }
            sendResponse({ success: true });
          } catch (e) {
            sendResponse({ success: false, error: String(e) });
          }
        })();
        return true;
      }
      return true;
    }
  );

  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
      try {
        await browser.storage.sync.set({ wordserveSettings: DEFAULT_SETTINGS });
      } catch (e) {
        await recordError(`Default settings init failed: ${String(e)}`);
      }
    }
  });

  // Fix promise handling for initializeWASM
  (async () => {
    await initializeWASM();
  })();
});
