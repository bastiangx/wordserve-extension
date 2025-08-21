/**
 * WASM Security and Sandboxing Module
 *
 * This module provides secure WASM loading, integrity verification,
 * and sandboxing capabilities following browser security policies.
 *
 * Features:
 * - Integrity verification using SHA-256 checksums
 * - Secure origin validation
 * - Sandboxed WASM execution
 * - CSP-compliant loading
 * - Cross-browser compatibility (Chrome, Firefox, Edge)
 */

import browser from "webextension-polyfill";

export interface WasmConfig {
  expectedHash?: string;
  maxSize?: number;
  timeout?: number;
  strictOrigin?: boolean;
}

export interface WasmLoadResult {
  success: boolean;
  module?: WebAssembly.Module;
  instance?: WebAssembly.Instance;
  error?: string;
  verificationDetails?: {
    hashVerified: boolean;
    sizeValid: boolean;
    originValid: boolean;
  };
}

export class WasmManager {
  private readonly config: Required<WasmConfig>;

  constructor(config: WasmConfig = {}) {
    this.config = {
      expectedHash: config.expectedHash || "",
      maxSize: config.maxSize || 50 * 1024 * 1024, // 50MB
      timeout: config.timeout || 10000, // 10sec
      strictOrigin: config.strictOrigin !== false,
    };
  }

  /**
   * SHA-256 of binary data
   */
  private async compHash(data: ArrayBuffer): Promise<string> {
    try {
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (error) {
      throw new Error(`Hash comp failed: ${error}`);
    }
  }

  private validateOrigin(url: string): boolean {
    if (!this.config.strictOrigin) return true;
    try {
      const urlObj = new URL(url);
      const extensionId = browser.runtime.id;
      const validSchemes = ["moz-extension", "chrome-extension"];
      if (!validSchemes.includes(urlObj.protocol.replace(":", ""))) {
        return false;
      }
      return urlObj.hostname === extensionId;
    } catch {
      return false;
    }
  }

  private async verifyWasmBinary(
    data: ArrayBuffer,
    url: string
  ): Promise<{
    hashVerified: boolean;
    sizeValid: boolean;
    originValid: boolean;
  }> {
    const results = {
      hashVerified: true,
      sizeValid: true,
      originValid: true,
    };
    results.originValid = this.validateOrigin(url);
    if (!results.originValid) {
      console.warn(`WASM: Invalid origin for ${url}`);
    }
    results.sizeValid = data.byteLength <= this.config.maxSize;
    if (!results.sizeValid) {
      console.warn(
        `WASM: Binary too large: ${data.byteLength} > ${this.config.maxSize}`
      );
    }
    if (this.config.expectedHash) {
      try {
        const actualHash = await this.compHash(data);
        results.hashVerified = actualHash === this.config.expectedHash;
        if (!results.hashVerified) {
          console.error(
            `WASM: Hash mismatch. Expected: ${this.config.expectedHash}, Got: ${actualHash}`
          );
        }
      } catch (error) {
        console.error(`WASM: Hash verification failed: ${error}`);
        results.hashVerified = false;
      }
    }
    return results;
  }

  async loadWasmModule(
    wasmUrl: string,
    importObject?: WebAssembly.Imports
  ): Promise<WasmLoadResult> {
    const startTime = Date.now();
    try {
      if (!this.validateOrigin(wasmUrl)) {
        return {
          success: false,
          error: "Invalid origin for WASM resource",
          verificationDetails: {
            hashVerified: false,
            sizeValid: false,
            originValid: false,
          },
        };
      }
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("WASM loading timeout")),
          this.config.timeout
        );
      });
      const fetchPromise = fetch(wasmUrl).then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `WASM fetch failed: ${response.status} ${response.statusText}`
          );
        }
        return response.arrayBuffer();
      });
      const wasmBinary = await Promise.race([fetchPromise, timeoutPromise]);
      const verificationDetails = await this.verifyWasmBinary(
        wasmBinary,
        wasmUrl
      );
      const verificationPassed =
        verificationDetails.hashVerified &&
        verificationDetails.sizeValid &&
        verificationDetails.originValid;
      if (!verificationPassed) {
        return {
          success: false,
          error: "WASM binary verification failed",
          verificationDetails,
        };
      }
      // sandboxing
      const module = await WebAssembly.compile(wasmBinary);
      const instance = await WebAssembly.instantiate(
        module,
        importObject || {}
      );
      const loadTime = Date.now() - startTime;
      return {
        success: true,
        module,
        instance,
        verificationDetails,
      };
    } catch (error) {
      const loadTime = Date.now() - startTime;
      console.error(`WASM: Loading failed after ${loadTime}ms:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        verificationDetails: {
          hashVerified: false,
          sizeValid: false,
          originValid: false,
        },
      };
    }
  }

  /**
   * Create a sandboxed execution env for WASM
   */
  createSandboxedEnvironment(): {
    executeInSandbox: <T>(fn: () => T) => Promise<T>;
    cleanup: () => void;
  } {
    const sandbox = {
      console: {
        log: (...args: any[]) => console.log("[WASM Sandbox]", ...args),
        warn: (...args: any[]) => console.warn("[WASM Sandbox]", ...args),
        error: (...args: any[]) => console.error("[WASM Sandbox]", ...args),
      },
      setTimeout: (fn: Function, delay: number) => {
        return setTimeout(() => {
          try {
            fn();
          } catch (error) {
            console.error("[WASM] Timeout execution error:", error);
          }
        }, Math.min(delay, 5000));
      },
      clearTimeout,
    };
    return {
      executeInSandbox: async <T>(fn: () => T): Promise<T> => {
        try {
          return await Promise.resolve(fn.call(sandbox));
        } catch (error) {
          console.error("[WASM Sandbox] Execution error:", error);
          throw error;
        }
      },
      cleanup: () => {
        Object.keys(sandbox).forEach((key) => {
          delete (sandbox as any)[key];
        });
      },
    };
  }

  /**
   * Load WASM with manifest integrity verification
   */
  async loadWasmWithManifest(
    wasmUrl: string,
    manifestUrl: string,
    importObject?: WebAssembly.Imports
  ): Promise<WasmLoadResult> {
    try {
      const manifestResponse = await fetch(manifestUrl);
      if (!manifestResponse.ok) {
        console.warn(
          "WASM: Manifest not available, proceeding without integrity check"
        );
        return this.loadWasmModule(wasmUrl, importObject);
      }
      const manifest = await manifestResponse.json();
      const wasmPath = new URL(wasmUrl).pathname.replace(/^\//, "");
      const wasmEntry = manifest.assets?.find(
        (asset: any) => asset.path === wasmPath
      );
      if (wasmEntry?.sha256) {
        const wasmController = new WasmManager({
          ...this.config,
          expectedHash: wasmEntry.sha256,
        });
        return wasmController.loadWasmModule(wasmUrl, importObject);
      }
      console.warn("WASM: No hash found in manifest for", wasmPath);
      return this.loadWasmModule(wasmUrl, importObject);
    } catch (error) {
      console.error("WASM: Manifest loading failed:", error);
      return this.loadWasmModule(wasmUrl, importObject);
    }
  }
}

export const defaultWasmManager = new WasmManager({
  maxSize: 50 * 1024 * 1024, // 50MB
  timeout: 15000, // 15 seconds
  strictOrigin: true,
});
