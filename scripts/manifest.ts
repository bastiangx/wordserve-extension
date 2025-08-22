#!/usr/bin/env bun

/**
 * Generates a JSON manifest with size + sha256 for WASM + dictionary assets.
 * This is used for build-time and runtime integrity verification.
 */

import { readFileSync, statSync, writeFileSync } from "fs";
import crypto from "crypto";

interface ManifestEntry {
  path: string;
  bytes: number;
  sha256: string;
}

const assets = [
  "public/data/dict_0001.bin",
  "public/data/dict_0002.bin",
  "public/data/dict_0003.bin",
  "public/data/dict_0004.bin",
  "public/data/dict_0005.bin",
  "public/data/dict_0006.bin",
  "public/data/dict_0007.bin",
];

const manifest: ManifestEntry[] = [];
let failed = false;
for (const p of assets) {
  try {
    const st = statSync(p);
    const buf = readFileSync(p);
    const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
    manifest.push({ path: p.replace(/^public\//, ""), bytes: st.size, sha256 });
  } catch (e) {
    console.error(`gen-asset-manifest: missing asset ${p}: ${e}`);
    failed = true;
  }
}

if (failed) process.exit(1);

const outPath = "public/asset-manifest.json";
writeFileSync(
  outPath,
  JSON.stringify(
    { generated: new Date().toISOString(), assets: manifest },
    null,
    2
  )
);
