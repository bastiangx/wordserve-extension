export default defineBackground(() => {
  console.log('WordServe background script loaded');

  // WASM functionality
  class BackgroundWordServeWASM {
    private isInitialized = false;
    private isLoading = false;

    async initialize(): Promise<void> {
      if (this.isInitialized || this.isLoading) {
        return;
      }
      this.isLoading = true;
      try {
        // Use importScripts for service worker context
        self.importScripts(browser.runtime.getURL("wasm_exec.js" as any));
        
        const wasmResponse = await fetch(
          browser.runtime.getURL("wordserve-wasm.wasm" as any)
        );
        const wasmBytes = await wasmResponse.arrayBuffer();

        // Create Go runtime and instantiate WASM
        const go = new (globalThis as any).Go();
        const wasmModule = await WebAssembly.instantiate(
          wasmBytes,
          go.importObject
        );

        // Wait for WASM to signal readiness
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("WASM initialization timeout"));
          }, 10000);

          (globalThis as any).wasmReady = () => {
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

    async complete(prefix: string, limit: number = 20) {
      if (!this.isInitialized) {
        throw new Error("WASM not initialized");
      }

      const result = (globalThis as any).wasmCompleter.completeRaw(
        prefix,
        limit
      );
      if (result.error) {
        throw new Error(result.error);
      }
      return result.suggestions;
    }

    async getStats() {
      if (!this.isInitialized) {
        throw new Error("WASM not initialized");
      }
      return (globalThis as any).wasmCompleter.stats();
    }

    get ready(): boolean {
      return this.isInitialized;
    }
  }

  let wasmInstance: BackgroundWordServeWASM | null = null;

  // Initialize WASM when background script loads
  async function initializeWASM() {
    try {
      wasmInstance = new BackgroundWordServeWASM();
      await wasmInstance.initialize();

      // Load dictionary data
      await loadDictionaryData();

      console.log("WordServe WASM initialized in background");
    } catch (error) {
      console.error("Failed to initialize WordServe WASM:", error);
    }
  }

  async function loadDictionaryData() {
    if (!wasmInstance) return;

    try {
      // Load binary dictionary chunks
      const chunkPromises = [];
      for (let i = 1; i <= 7; i++) {
        const chunkNum = String(i).padStart(4, "0");
        chunkPromises.push(
          fetch(browser.runtime.getURL(`data/dict_${chunkNum}.bin` as any))
            .then((response) => response.arrayBuffer())
            .then((buffer) => new Uint8Array(buffer))
        );
      }

      const chunks = await Promise.all(chunkPromises);

      if ((globalThis as any).wasmCompleter?.initWithBinaryData) {
        const result = (globalThis as any).wasmCompleter.initWithBinaryData(
          chunks
        );

        if (!result?.success) {
          throw new Error(result?.error || "Failed to load dictionary");
        }

        console.log(
          `WordServe loaded ${result.wordCount} words from ${result.chunks} chunks`
        );
      } else {
        throw new Error("WASM completer not available");
      }
    } catch (error) {
      console.warn(
        "Failed to load binary dictionary, trying text fallback:",
        error
      );

      try {
        const response = await fetch(
          browser.runtime.getURL("data/words.txt" as any)
        );
        const text = await response.text();

        // Use initWithData for text format
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const result = (globalThis as any).wasmCompleter.initWithData(data);

        if (!result.success) {
          throw new Error(result.error || "Failed to load text dictionary");
        }

        console.log(
          `WordServe loaded ${result.wordCount} words from text file`
        );
      } catch (textError) {
        throw new Error(`Failed to load any dictionary data: ${textError}`);
      }
    }
  }

  // Handle messages (both settings and WASM)
  browser.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
      // Handle WASM completion messages
      if (message.type === "wordserve-complete") {
        (async () => {
          try {
            if (!wasmInstance || !wasmInstance.ready) {
              sendResponse({ error: "WASM not ready" });
              return;
            }

            const { prefix, limit } = message;
            const suggestions = await wasmInstance.complete(prefix, limit || 20);
            sendResponse({ suggestions });
          } catch (error) {
            sendResponse({ error: (error as Error).message });
          }
        })();
        return true;
      }

      if (message.type === "wordserve-stats") {
        (async () => {
          try {
            if (!wasmInstance || !wasmInstance.ready) {
              sendResponse({ error: "WASM not ready" });
              return;
            }

            const stats = await wasmInstance.getStats();
            sendResponse({ stats });
          } catch (error) {
            sendResponse({ error: (error as Error).message });
          }
        })();
        return true;
      }

      // Handle settings updates
      if (message.type === 'updateSettings') {
        (async () => {
          try {
            await browser.storage.sync.set({ wordserveSettings: message.settings });
            
            // Notify all content scripts about the update
            const tabs = await browser.tabs.query({});
            for (const tab of tabs) {
              if (tab.id && tab.id !== sender.tab?.id) {
                try {
                  await browser.tabs.sendMessage(tab.id, {
                    type: 'settingsUpdated',
                    settings: message.settings,
                  });
                } catch (error) {
                  // Ignore errors for tabs without content script
                }
              }
            }
            
            sendResponse({ success: true });
          } catch (error) {
            console.error('Failed to update settings:', error);
            sendResponse({ success: false, error: String(error) });
          }
        })();
        return true;
      }
    }
  );

  // Initialize default settings on extension install
  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      const defaultSettings = {
        minWordLength: 3,
        maxSuggestions: 64,
        debounceTime: 100,
        numberSelection: true,
        showRankingOverride: false,
        compactMode: false,
        ghostTextEnabled: true,
        fontSize: "editor",
        fontWeight: "normal",
        debugMode: false,
        abbreviationsEnabled: true,
        autoInsertion: true,
        autoInsertionCommitMode: "space-commits",
        smartBackspace: true,
        accessibility: {
          boldSuffix: false,
          uppercaseSuggestions: false,
          prefixColorIntensity: "normal",
          ghostTextColorIntensity: "muted",
        },
        domains: {
          blacklistMode: true,
          blacklist: [
            "*.paypal.com",
            "*.stripe.com",
            "*.checkout.com",
            "*.square.com",
            "*.braintreepayments.com",
            "*.authorize.net",
            "*.payment.*",
            "*checkout*",
            "*payment*",
            "*billing*",
            "*.bank.*",
            "*banking*",
            "online.chase.com",
            "www.wellsfargo.com",
            "www.bankofamerica.com",
            "secure.*",
            "login.*",
            "auth.*",
            "*signin*",
            "*signup*",
          ],
          whitelist: [],
        },
      };

      try {
        await browser.storage.sync.set({ wordserveSettings: defaultSettings });
        console.log('WordServe: Default settings initialized');
      } catch (error) {
        console.error('WordServe: Failed to initialize default settings:', error);
      }
    }
  });

  // Handle context menu actions (future feature)
  browser.contextMenus?.onClicked?.addListener((info, tab) => {
    if (info.menuItemId === 'wordserve-toggle' && tab?.id) {
      browser.tabs.sendMessage(tab.id, { type: 'toggleWordServe' });
    }
  });

  // Initialize WASM when background script starts
  initializeWASM();
});
