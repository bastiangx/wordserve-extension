import { normalizeConfig } from "@/lib/config";
import { SuggestEngine } from "@/lib/suggest";
import browser from "webextension-polyfill";
import { DEFAULT_SETTINGS } from "@/types";

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

export default defineBackground(() => {
  class BackgroundSuggest {
    private isInitialized = false;
    private isLoading = false;
    private engine: SuggestEngine | null = null;

    get ready(): boolean {
      return this.isInitialized;
    }

    async initialize(): Promise<void> {
      if (this.isInitialized || this.isLoading) return;
      this.isLoading = true;
      try {
        this.engine = new SuggestEngine();
        this.isInitialized = true;
      } catch (e) {
        console.error("Engine init failed:", e);
        this.isLoading = false;
        throw e;
      } finally {
        this.isLoading = false;
      }
    }
    getStats() {
      if (!this.engine) throw new Error("engine not ready");
      return this.engine.stats();
    }
    completeRaw(prefix: string, limit: number) {
      if (!this.engine) throw new Error("engine not ready");
      return this.engine.complete(prefix, limit);
    }
    loadChunks(chunks: Uint8Array[]) {
      if (!this.engine) throw new Error("engine not ready");
      return this.engine.initializeFromChunks(chunks);
    }
    dispose() {
      this.isInitialized = false;
      this.engine = null;
    }
  }

  let engineInstance: BackgroundSuggest | null = null;

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
    if (!engineInstance) return;
    try {
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
      } catch { }
      const chunkPromises: Promise<Uint8Array>[] = [];
      for (let i = 1; i <= EXPECTED_CHUNKS; i++) {
        const chunkNum = String(i).padStart(4, "0");
        chunkPromises.push(
          fetch(browser.runtime.getURL(`data/dict_${chunkNum}.bin` as any))
            .then((r) => {
              if (!r.ok) {
                console.error(
                  `Failed to fetch dict_${chunkNum} with status ${r.status}`
                );
                throw new Error(`dict_${chunkNum} status ${r.status}`);
              }
              return r.arrayBuffer();
            })
            .then((b) => new Uint8Array(b))
        );
      }
      const chunks = await Promise.all(chunkPromises);
      if (chunks.length !== EXPECTED_CHUNKS) {
        console.error(
          `Expected ${EXPECTED_CHUNKS} chunks, got ${chunks.length}`
        );
        throw new Error(
          `expected ${EXPECTED_CHUNKS} chunks, got ${chunks.length}`
        );
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
      if (engineInstance) {
        const result = engineInstance.loadChunks(chunks);
        if (!result || !result.success)
          throw new Error("dictionary parse failed");
        await browser.storage.local.set({
          wordserveDictMeta: { words: result.wordCount, chunks: result.chunks },
        });
      }
    } catch (err) {
      console.error("WordServe: Dictionary load error:", err);
      await recordError(`Binary dictionary load failed: ${String(err)}`);
    }
  }

  async function initializeEngine() {
    try {
      engineInstance = new BackgroundSuggest();
      await engineInstance.initialize();
      await loadDictionaryData();
      broadcast("wordserve-ready");
    } catch (e) {
      console.error("WordServe: engine initialization failed:", e);
      await recordError(`Initialization failed: ${String(e)}`);
    }
  }

  browser.runtime.onMessage.addListener(
    (
      message: any,
      sender: browser.Runtime.MessageSender,
      sendResponse: (response: any) => void
    ): true => {
      if (message.type === "wordserve-status") {
        sendResponse({ ready: !!(engineInstance && engineInstance.ready) });
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
      if (message.type === "wordserve-complete") {
        (async () => {
          try {
            if (!engineInstance?.ready) {
              sendResponse({ error: "engine not ready" });
              return;
            }
            const { prefix, limit } = message;
            const clamped = Math.max(1, Math.min(limit || 20, 128));
            const base = engineInstance.completeRaw(prefix, clamped);
            const suggestions = base.map((s, i) => ({
              word: s.word,
              rank: i + 1,
              frequency: s.frequency,
            }));
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
            if (!engineInstance?.ready) {
              sendResponse({ error: "engine not ready" });
              return;
            }
            const stats = engineInstance.getStats();
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
      if (message.type === "wordserve-open-settings") {
        (async () => {
          try {
            await browser.runtime.openOptionsPage();
            sendResponse({ success: true });
          } catch (e) {
            sendResponse({ success: false, error: String(e) });
          }
        })();
        return true;
      }
      if (message.type === "wordserve-toggle-global") {
        (async () => {
          try {
            const data = await browser.storage.sync.get("globalEnabled");
            const next = !data.globalEnabled;
            await browser.storage.sync.set({ globalEnabled: next });
            broadcast("wordserve-toggle", { enabled: next });
            sendResponse({ success: true, enabled: next });
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
      if (message.type === "wordserve-open-shortcuts-manager") {
        (async () => {
          try {
            // Prefer native API if available (Firefox)
            if ((browser as any).commands?.openShortcutSettings) {
              await (browser as any).commands.openShortcutSettings();
              sendResponse({ success: true });
              return;
            }
          } catch {}
          try {
            // Try Chromium shortcuts page; may be blocked on some versions
            await browser.tabs.create({ url: "chrome://extensions/shortcuts" });
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
        await browser.storage.sync.set({
          wordserveSettings: normalizeConfig(DEFAULT_SETTINGS),
        });
      } catch (e) {
        await recordError(`Default settings init failed: ${String(e)}`);
      }
    }
  });

  // Commands from manifest (toggle/open settings)
  browser.commands?.onCommand.addListener(async (command) => {
    try {
      if (command === "wordserve-toggle-global") {
        const data = await browser.storage.sync.get("globalEnabled");
        const next = !data.globalEnabled;
        await browser.storage.sync.set({ globalEnabled: next });
        broadcast("wordserve-toggle", { enabled: next });
      } else if (command === "wordserve-open-settings") {
        await browser.runtime.openOptionsPage();
      }
    } catch (e) {
      await recordError(`Command failed: ${String(e)}`);
    }
  });
  (async () => {
    await initializeEngine();
  })();
});
