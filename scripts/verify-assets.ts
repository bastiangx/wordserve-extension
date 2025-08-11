#!/usr/bin/env bun

/**
 * Verifies WASM + dictionary assets exist, sizes sane, optional hashing.
 */

import {existsSync, readFileSync, statSync} from "fs";
import {join} from "path";
import crypto from "crypto";

interface AssetSpec {
  path: string;
  minBytes: number;
  maxBytes?: number;
  sha256?: string;
}

const root = process.cwd();
const assets: AssetSpec[] = [
  { path: "public/wordserve.wasm", minBytes: 10_000 },
  { path: "public/wasm_exec.js", minBytes: 1_000 },
  { path: "public/data/words.txt", minBytes: 100_000 },
  { path: "public/data/dict_0001.bin", minBytes: 200 },
  { path: "public/data/dict_0002.bin", minBytes: 200 },
  { path: "public/data/dict_0003.bin", minBytes: 200 },
  { path: "public/data/dict_0004.bin", minBytes: 200 },
  { path: "public/data/dict_0005.bin", minBytes: 200 },
  { path: "public/data/dict_0006.bin", minBytes: 200 },
  { path: "public/data/dict_0007.bin", minBytes: 200 },
];

// If an asset-manifest.json exists (produced by gen-asset-manifest.ts), use it for hash verification
try {
  const manifestPath = "public/asset-manifest.json";
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const map: Record<string, string> = {};
    for (const entry of manifest.assets || []) {
      map["public/" + entry.path] = entry.sha256;
    }
    for (const spec of assets) {
      if (map[spec.path]) spec.sha256 = map[spec.path];
    }
  }
} catch (e) {
  console.warn("verify-assets: unable to apply manifest hashes:", e);
}

let ok = true;
for (const spec of assets) {
  try {
    const abs = join(root, spec.path);
    const st = statSync(abs);
    if (st.size < spec.minBytes) {
      console.error(
        `FAIL: ${spec.path} too small (${st.size} bytes < ${spec.minBytes})`
      );
      ok = false;
    }
    if (spec.maxBytes && st.size > spec.maxBytes) {
      console.error(
        `FAIL: ${spec.path} too large (${st.size} bytes > ${spec.maxBytes})`
      );
      ok = false;
    }
    if (spec.sha256) {
      const hash = crypto
        .createHash("sha256")
        .update(readFileSync(abs))
        .digest("hex");
      if (hash !== spec.sha256) {
        console.error(
          `FAIL: ${spec.path} hash mismatch (${hash} != ${spec.sha256})`
        );
        ok = false;
      }
    }
  } catch (e) {
    console.error(`FAIL: missing asset ${spec.path}: ${e}`);
    ok = false;
  }
}

if (!ok) {
  process.exit(1);
} else {
  console.log("All WordServe assets verified");
}
