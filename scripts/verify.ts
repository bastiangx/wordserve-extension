#!/usr/bin/env bun

import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";
import crypto from "crypto";
import { TARGET_RELEASE_VERSION } from "./dl-data";

// Dynamic import to avoid circular dependency
async function getDownloader() {
  const module = await import("./dl-data");
  return new module.WordServeAssetDownloader();
}

interface AssetSpec {
  path: string;
  minBytes: number;
  maxBytes?: number;
  required: boolean;
}

const root = process.cwd();
const assets: AssetSpec[] = [
  { path: "public/wordserve.wasm", minBytes: 10_000, required: true },
  { path: "public/wasm_exec.js", minBytes: 1_000, required: true },
  { path: "public/data/dict_0001.bin", minBytes: 200, required: true },
  { path: "public/data/dict_0002.bin", minBytes: 200, required: true },
  { path: "public/data/dict_0003.bin", minBytes: 200, required: true },
  { path: "public/data/dict_0004.bin", minBytes: 200, required: true },
  { path: "public/data/dict_0005.bin", minBytes: 200, required: true },
  { path: "public/data/dict_0006.bin", minBytes: 200, required: true },
  { path: "public/data/dict_0007.bin", minBytes: 200, required: true },
];

async function verifyAssetIntegrity(): Promise<{
  ok: boolean;
  missing: string[];
  errors: string[];
}> {
  const errors: string[] = [];
  const missing: string[] = [];

  // SHA-256 hash manifest
  let manifest: Record<string, { sha256?: string }> | null = null;
  const manifestPath = "public/asset-manifest.json";
  if (existsSync(manifestPath)) {
    try {
      const manifestData = JSON.parse(readFileSync(manifestPath, "utf8"));
      manifest = {};
      for (const entry of manifestData.assets || []) {
        manifest["public/" + entry.path] = { sha256: entry.sha256 };
      }
      console.log("Using asset manifest for integrity verification");
    } catch (e) {
      console.warn("Failed to parse asset manifest:", e);
    }
  }

  for (const spec of assets) {
    try {
      const abs = join(root, spec.path);

      if (!existsSync(abs)) {
        missing.push(spec.path);
        if (spec.required) {
          errors.push(`MISSING: ${spec.path}`);
        }
        continue;
      }

      const st = statSync(abs);

      // Size validation
      if (st.size < spec.minBytes) {
        errors.push(
          `INVALID: ${spec.path} too small (${st.size} bytes < ${spec.minBytes})`
        );
        continue;
      }

      if (spec.maxBytes && st.size > spec.maxBytes) {
        errors.push(
          `INVALID: ${spec.path} too large (${st.size} bytes > ${spec.maxBytes})`
        );
        continue;
      }

      // Hash validation if manifest is available
      if (manifest && manifest[spec.path]?.sha256) {
        const expectedHash = manifest[spec.path].sha256;
        const actualHash = crypto
          .createHash("sha256")
          .update(readFileSync(abs))
          .digest("hex");

        if (actualHash !== expectedHash) {
          errors.push(
            `INVALID: ${spec.path} hash mismatch (expected ${expectedHash}, got ${actualHash})`
          );
          continue;
        }
      }

      console.log(`✓ ${spec.path} (${st.size} bytes)`);
    } catch (e) {
      errors.push(`ERROR: Failed to verify ${spec.path}: ${e}`);
    }
  }

  return {
    ok: errors.length === 0,
    missing,
    errors,
  };
}

async function main() {
  console.log(
    `Verifying WordServe assets (target version: ${TARGET_RELEASE_VERSION})...`
  );

  const result = await verifyAssetIntegrity();

  if (result.missing.length > 0) {
    const missingDataFiles = result.missing.filter((path) =>
      path.startsWith("public/data/")
    );
    const missingWasmFiles = result.missing.filter(
      (path) => !path.startsWith("public/data/")
    );

    if (missingWasmFiles.length > 0) {
      console.error(
        "\\nMissing WASM/JS files (these should be built locally):"
      );
      missingWasmFiles.forEach((file) => console.error(`  - ${file}`));
      console.error("Run 'bun run build:wasm' to build these files");
    }

    if (missingDataFiles.length > 0) {
      console.log(`\\nMissing data files detected: ${missingDataFiles.length}`);
      console.log("Attempting to download missing data files...");

      try {
        const downloader = await getDownloader();
        const downloadResult = await downloader.downloadAssets();

        if (!downloadResult.success) {
          console.error("Failed to download data files:", downloadResult.error);
          process.exit(1);
        }
        const reVerifyResult = await verifyAssetIntegrity();
        if (!reVerifyResult.ok) {
          console.error("\\nAsset verification failed after download:");
          reVerifyResult.errors.forEach((err) => console.error(err));
          process.exit(1);
        }
        console.log(
          `Assets verified against version: ${TARGET_RELEASE_VERSION}`
        );
        return;
      } catch (error) {
        console.error("Failed to auto-download data files:", error);
        console.error("Please run 'bun run scripts/dl-data.ts' manually");
        process.exit(1);
      }
    }

    if (missingWasmFiles.length > 0) {
      process.exit(1);
    }
  }

  if (result.errors.length > 0) {
    console.error("\\nAsset verification errors:");
    result.errors.forEach((err) => console.error(err));
    process.exit(1);
  }

  console.log("\\n✅ All WordServe assets verified successfully");
  console.log(`Assets verified against version: ${TARGET_RELEASE_VERSION}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
