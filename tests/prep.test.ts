import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import { WordServeDownloader } from "../scripts/prep.ts";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";

// in-mem FS
const TMP = join(process.cwd(), ".tmp-test-public");

function ensureTmp() {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  if (!existsSync(join(TMP, "data")))
    mkdirSync(join(TMP, "data"), { recursive: true });
}

afterEach(() => {
  // best-effort cleanup by overwriting files; actual deletion not required for tests
});

afterAll(() => {
  // Remove the temporary test public directory recursively
  try {
    if (existsSync(TMP)) {
      rmSync(TMP, { recursive: true, force: true });
    }
  } catch (err) {
    console.error("Error removing temporary test directory:", err);
  }
});

function makeZipWithBins(): Uint8Array {
  // Create a tiny zip on the fly using fflate
  const { zipSync, strToU8 } = require("fflate");
  const files: Record<string, Uint8Array> = {
    "dict_0001.bin": new Uint8Array([1, 2, 3]),
    "dict_0002.bin": new Uint8Array([4, 5, 6]),
  };
  const zipped = zipSync(
    Object.fromEntries(
      Object.entries(files).map(([name, data]) => [name, data])
    )
  );
  return zipped;
}

describe("WordServeDownloader", () => {
  test("downloadAssets handles existing assets", async () => {
    ensureTmp();
    const dataDir = join(TMP, "data");
    // Pretend required assets exist
    for (let i = 1; i <= 7; i++) {
      const p = join(dataDir, `dict_${String(i).padStart(4, "0")}.bin`);
      writeFileSync(p, new Uint8Array([0]));
    }
    const d = new WordServeDownloader(TMP, true);
    const res = await d.downloadAssets(false);
    expect(res.success).toBe(true);
    expect(res.assetsDownloaded?.length).toBe(0);
  });

  test("downloadDataFiles extracts bins and verifies checksums", async () => {
    ensureTmp();
    // Mock global fetch for data.zip & checksums.txt
    const zipBytes = makeZipWithBins();
    const checksums =
      `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  dict_0001.bin\n` +
      `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  dict_0002.bin`;
    // but our bins are non-empty; compute actual hashes to satisfy verification
    const crypto = await import("crypto");
    const bin1 = new Uint8Array([1, 2, 3]);
    const bin2 = new Uint8Array([4, 5, 6]);
    const h1 = crypto.createHash("sha256").update(bin1).digest("hex");
    const h2 = crypto.createHash("sha256").update(bin2).digest("hex");
    const checksumsFixed = `${h1}  dict_0001.bin\n${h2}  dict_0002.bin`;

    // Minimal fetch mock: first call returns data.zip, second returns checksums
    const fetchMock = mock(async (url: string) => {
      if (
        String(url).includes("/releases/download/") &&
        String(url).endsWith("data.zip")
      ) {
        return {
          ok: true,
          arrayBuffer: async () => zipBytes.buffer,
          status: 200,
          statusText: "OK",
        } as any;
      }
      if (
        String(url).includes("/releases/download/") &&
        String(url).endsWith("checksums.txt")
      ) {
        return {
          ok: true,
          arrayBuffer: async () =>
            new TextEncoder().encode(checksumsFixed).buffer,
          status: 200,
          statusText: "OK",
        } as any;
      }
      return { ok: false, status: 404, statusText: "Not Found" } as any;
    });

    // @ts-ignore - override global fetch for this test
    globalThis.fetch = fetchMock as any;

    // Pre-create checksums.txt because script reads it before downloading
    const fsPath = join(TMP, "data", "checksums.txt");
    writeFileSync(fsPath, checksumsFixed);

    const d = new WordServeDownloader(TMP, true);
    const res = await d.downloadAssets(true);
    expect(res.success).toBe(true);
  });
});
