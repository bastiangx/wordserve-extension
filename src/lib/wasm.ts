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
  workerEnvironment?: {
    executeInWorker: <T>(operation: string, data?: any) => Promise<T>;
    cleanup: () => void;
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

  /**
   * WASM worker env
   */
  makeWorkerEnv(): {
    executeInWorker: <T>(operation: string, data?: any) => Promise<T>;
    cleanup: () => void;
  } {
    const workerCode = `
      let wasmInstance = null;
      let wasmModule = null;
      
      self.onmessage = async function(e) {
        const { id, operation, data, wasmBinary, importObject } = e.data;
        
        try {
          switch (operation) {
            case 'init':
              wasmModule = await WebAssembly.compile(wasmBinary);
              wasmInstance = await WebAssembly.instantiate(wasmModule, importObject || {});
              self.postMessage({ id, success: true, result: 'initialized' });
              break;
              
            case 'complete':
              if (!wasmInstance || !wasmInstance.exports.completeMsgPack) {
                throw new Error('WASM not initialized or completeMsgPack not available');
              }
              const result = wasmInstance.exports.completeMsgPack(data);
              self.postMessage({ id, success: true, result });
              break;
              
            case 'completeRaw':
              if (!wasmInstance || !wasmInstance.exports.completeRaw) {
                throw new Error('WASM not initialized or completeRaw not available');
              }
              const rawResult = wasmInstance.exports.completeRaw(data.prefix, data.limit);
              self.postMessage({ id, success: true, result: rawResult });
              break;
              
            case 'getStats':
              if (!wasmInstance || !wasmInstance.exports.stats) {
                throw new Error('WASM not initialized or stats not available');
              }
              const stats = wasmInstance.exports.stats();
              self.postMessage({ id, success: true, result: stats });
              break;
              
            default:
              throw new Error('Unknown operation: ' + operation);
          }
        } catch (error) {
          self.postMessage({ 
            id, 
            success: false, 
            error: error.message || String(error) 
          });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));
    const pendingOperations = new Map<
      string,
      { resolve: Function; reject: Function }
    >();
    worker.onmessage = (e) => {
      const { id, success, result, error } = e.data;
      const pending = pendingOperations.get(id);
      if (pending) {
        pendingOperations.delete(id);
        if (success) {
          pending.resolve(result);
        } else {
          pending.reject(new Error(error));
        }
      }
    };
    worker.onerror = (error) => {
      console.error("[WASM Worker] Error:", error);
      pendingOperations.forEach(({ reject }) => {
        reject(new Error("Worker error"));
      });
      pendingOperations.clear();
    };
    return {
      executeInWorker: <T>(operation: string, data?: any): Promise<T> => {
        return new Promise((resolve, reject) => {
          const id = Math.random().toString(36).substring(2, 11);
          pendingOperations.set(id, { resolve, reject });

          const timeout = setTimeout(() => {
            pendingOperations.delete(id);
            reject(new Error("Worker operation timeout"));
          }, 10000);
          pendingOperations.set(id, {
            resolve: (result: T) => {
              clearTimeout(timeout);
              resolve(result);
            },
            reject: (error: Error) => {
              clearTimeout(timeout);
              reject(error);
            },
          });
          worker.postMessage({ id, operation, data });
        });
      },
      cleanup: () => {
        pendingOperations.clear();
        worker.terminate();
        URL.revokeObjectURL(blob as any);
      },
    };
  }

  /**
   * Load WASM worker
   */
  async loadWasmWorker(
    wasmUrl: string,
    manifestUrl: string,
    importObject?: WebAssembly.Imports
  ): Promise<WasmLoadResult> {
    try {
      const manifestResponse = await fetch(manifestUrl);
      if (!manifestResponse.ok) {
        return {
          success: false,
          error: `Manifest loading failed: ${manifestResponse.status} ${manifestResponse.statusText}`,
          verificationDetails: {
            hashVerified: false,
            sizeValid: false,
            originValid: false,
          },
        };
      }
      const manifest = await manifestResponse.json();
      const wasmPath = new URL(wasmUrl).pathname.replace(/^\//, "");
      const wasmEntry = manifest.assets?.find(
        (asset: any) => asset.path === wasmPath
      );
      if (!wasmEntry?.sha256) {
        return {
          success: false,
          error: `No SHA-256 hash found in manifest for ${wasmPath}`,
          verificationDetails: {
            hashVerified: false,
            sizeValid: false,
            originValid: false,
          },
        };
      }
      const wasmResponse = await fetch(wasmUrl);
      if (!wasmResponse.ok) {
        return {
          success: false,
          error: `WASM fetch failed: ${wasmResponse.status} ${wasmResponse.statusText}`,
        };
      }
      const wasmBinary = await wasmResponse.arrayBuffer();
      const verificationDetails = await this.verifyWasmBinary(
        wasmBinary,
        wasmUrl
      );
      const actualHash = await this.compHash(wasmBinary);
      if (actualHash !== wasmEntry.sha256) {
        return {
          success: false,
          error: `WASM hash verification failed. Expected: ${wasmEntry.sha256}, Got: ${actualHash}`,
          verificationDetails: {
            ...verificationDetails,
            hashVerified: false,
          },
        };
      }
      const workerEnv = this.makeWorkerEnv();
      try {
        await workerEnv.executeInWorker("init", { wasmBinary, importObject });
        return {
          success: true,
          workerEnvironment: workerEnv,
          verificationDetails: {
            ...verificationDetails,
            hashVerified: true,
          },
        };
      } catch (error) {
        workerEnv.cleanup();
        return {
          success: false,
          error: `Worker initialization failed: ${error}`,
          verificationDetails: {
            ...verificationDetails,
            hashVerified: false,
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Worker-based WASM loading failed: ${error}`,
        verificationDetails: {
          hashVerified: false,
          sizeValid: false,
          originValid: false,
        },
      };
    }
  }
}

export const workerWasmManager = new WasmManager({
  maxSize: 50 * 1024 * 1024, // 50MB
  timeout: 20000, // 20sec
  strictOrigin: true,
});
