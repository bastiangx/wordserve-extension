import { beforeEach, describe, expect, mock, test } from "bun:test";
import { mock as mockModule } from "bun:test";

// The bg file exports default defineBackground(() => {...}) which runs registration side-effects;
// For testing, we mock browser APIs used inside, and import the module so handlers don't throw.

const tabsStore: any[] = [];
const storage: Record<string, any> = { local: {}, sync: {} };

function MakeMock() {
  const listeners: any[] = [];
  return {
    runtime: {
      onMessage: { addListener: mock((fn: any) => listeners.push(fn)) },
      onInstalled: { addListener: mock((_fn: any) => { }) },
      getURL: (p: string) => `http://localhost/${p || ""}`,
      sendMessage: mock(() => Promise.resolve()),
    },
    tabs: {
      query: mock(async () => tabsStore),
      sendMessage: mock(async () => { }),
    },
    storage: {
      local: {
        set: mock(async (obj: any) => Object.assign(storage.local, obj)),
        get: mock(async (key: string) => ({ [key]: storage.local[key] })),
      },
      sync: {
        set: mock(async (obj: any) => Object.assign(storage.sync, obj)),
        get: mock(async (key: string | string[]) => {
          if (typeof key === "string") return { [key]: storage.sync[key] };
          const out: any = {};
          for (const k of key) out[k] = storage.sync[k];
          return out;
        }),
      },
    },
  } as any;
}

describe("background", () => {
  beforeEach(() => {
    // global defineBackground via WXT
    // @ts-ignore
    globalThis.defineBackground = (fn: any) => fn();
    // Mock webextension API module BEFORE importing bg
    const browserMock = MakeMock();
    mockModule.module("webextension-polyfill", () => ({
      default: browserMock,
      __esModule: true,
    }));
    // Stub global fetch to satisfy bg binary loads
    // @ts-ignore
    globalThis.fetch = async (url: string) => {
      const u = String(url);
      if (u.endsWith("asset-manifest.json")) {
        return {
          ok: true,
          json: async () => ({ assets: [] }),
          status: 200,
          statusText: "OK",
        } as any;
      }
      if (u.includes("/data/dict_") && u.endsWith(".bin")) {
        const buf = new Uint8Array(256).buffer; // >= MIN_CHUNK_BYTES
        return {
          ok: true,
          arrayBuffer: async () => buf,
          status: 200,
          statusText: "OK",
        } as any;
      }
      return { ok: false, status: 404, statusText: "Not Found" } as any;
    };
  });

  test("module can import and register", async () => {
    const mod = await import("@/entrypoints/background.ts");
    expect(mod).toBeDefined();
  });
});
