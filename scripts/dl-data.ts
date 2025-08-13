#!/usr/bin/env bun

/**
 * Downloads WordServe dictionary data files (.bin files only)
 * from GitHub releases based on TARGET_RELEASE_VERSION.
 * WASM and JS files are built locally, not downloaded.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import crypto from "crypto";
import * as fflate from "fflate";

export const GITHUB_REPO = "bastiangx/wordserve";
export const TARGET_RELEASE_VERSION = "v0.1.2-beta";

interface AssetUrls {
  dataZip: string;
  checksums: string;
}

interface DownloadResult {
  success: boolean;
  error?: string;
  assetsDownloaded?: string[];
}

export class WordServeAssetDownloader {
  private readonly publicDir: string;

  constructor(publicDir = "public") {
    this.publicDir = publicDir;
  }

  private getAssetUrls(): AssetUrls {
    const baseUrl = `https://github.com/${GITHUB_REPO}/releases/download/${TARGET_RELEASE_VERSION}`;
    return {
      dataZip: `${baseUrl}/data.zip`,
      checksums: `${baseUrl}/checksums.txt`,
    };
  }

  private async downloadFile(
    url: string,
    description: string
  ): Promise<ArrayBuffer> {
    console.log(`Downloading ${description} from ${url}`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const sizeInMB = buffer.byteLength / (1024 * 1024);
      console.log(`Downloaded ${description} (${sizeInMB.toFixed(2)}MB)`);

      return buffer;
    } catch (error) {
      throw new Error(
        `Failed to download ${description}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async verifyChecksum(
    data: ArrayBuffer,
    expectedHash: string,
    filename: string
  ): Promise<boolean> {
    const hash = crypto.createHash("sha256");
    hash.update(new Uint8Array(data));
    const actualHash = hash.digest("hex");

    if (actualHash !== expectedHash) {
      console.error(`Checksum mismatch for ${filename}`);
      console.error(`Expected: ${expectedHash}`);
      console.error(`Got:      ${actualHash}`);
      return false;
    }

    console.log(`Checksum verified for ${filename}: ${actualHash}`);
    return true;
  }

  private parseChecksums(checksumsContent: string): Map<string, string> {
    const checksums = new Map<string, string>();
    const lines = checksumsContent.trim().split("\n");

    for (const line of lines) {
      const match = line.match(/^([a-f0-9]{64})\\s+(.+)$/);
      if (match) {
        checksums.set(match[2], match[1]);
      }
    }

    return checksums;
  }

  private extractZipFiles(zipData: ArrayBuffer, outputDir: string): void {
    try {
      // Create output directory
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const zipBytes = new Uint8Array(zipData);
      const unzipped = fflate.unzipSync(zipBytes);

      let extractedCount = 0;
      for (const [filename, fileData] of Object.entries(unzipped)) {
        // Extract .bin files only
        if (filename.endsWith(".bin")) {
          const outputPath = join(outputDir, filename);
          writeFileSync(outputPath, fileData);
          console.log(`Extracted ${filename} (${fileData.length} bytes)`);
          extractedCount++;
        }
      }

      console.log(`Extracted ${extractedCount} files to ${outputDir}`);
    } catch (error) {
      throw new Error(
        `Failed to extract ZIP file: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private checkExistingAssets(): { missing: string[]; existing: string[] } {
    const requiredAssets = [
      "public/data/dict_0001.bin",
      "public/data/dict_0002.bin",
      "public/data/dict_0003.bin",
      "public/data/dict_0004.bin",
      "public/data/dict_0005.bin",
      "public/data/dict_0006.bin",
      "public/data/dict_0007.bin",
    ];

    const missing: string[] = [];
    const existing: string[] = [];

    for (const asset of requiredAssets) {
      if (existsSync(asset)) {
        existing.push(asset);
      } else {
        missing.push(asset);
      }
    }

    return { missing, existing };
  }

  public async downloadAssets(force = false): Promise<DownloadResult> {
    try {
      // Check what's already present
      const { missing, existing } = this.checkExistingAssets();

      if (!force && missing.length === 0) {
        console.log("All WordServe assets already exist, skipping download");
        console.log(`Existing assets: ${existing.length}`);
        return { success: true, assetsDownloaded: [] };
      }

      if (!force && missing.length > 0) {
        console.log(`Missing assets: ${missing.join(", ")}`);
      }

      if (force) {
        console.log("Force download requested, downloading all assets");
      }

      // Ensure public directory exists
      if (!existsSync(this.publicDir)) {
        mkdirSync(this.publicDir, { recursive: true });
      }

      const urls = this.getAssetUrls();
      const downloaded: string[] = [];

      // Download checksums first for verification
      console.log("Downloading checksums for verification...");
      const checksumsData = await this.downloadFile(
        urls.checksums,
        "checksums"
      );
      const checksumsText = new TextDecoder().decode(checksumsData);
      const checksums = this.parseChecksums(checksumsText);

      // Download and extract data.zip
      const dataDir = join(this.publicDir, "data");
      if (force || missing.some((asset) => asset.startsWith("public/data/"))) {
        const dataZipData = await this.downloadFile(urls.dataZip, "data files");

        // Verify data.zip checksum if available
        const expectedHash = checksums.get("data.zip");
        if (expectedHash) {
          const isValid = await this.verifyChecksum(
            dataZipData,
            expectedHash,
            "data.zip"
          );
          if (!isValid) {
            console.warn(
              "Data.zip checksum verification failed, but continuing..."
            );
          }
        } else {
          console.warn(
            "No checksum available for data.zip (this is expected for extra files)"
          );
        }

        this.extractZipFiles(dataZipData, dataDir);
        downloaded.push("data.zip");
      }

      console.log(`Downloaded: ${downloaded.join(", ")}`);
      console.log(`Target version: ${TARGET_RELEASE_VERSION}`);

      return {
        success: true,
        assetsDownloaded: downloaded,
      };
    } catch (error) {
      const errorMsg = `Failed to download WordServe assets: ${
        error instanceof Error ? error.message : String(error)
      }`;
      console.error(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}

async function main() {
  const downloader = new WordServeAssetDownloader();
  const force = process.argv.includes("--force") || process.argv.includes("-f");

  const result = await downloader.downloadAssets(force);

  if (!result.success) {
    console.error(result.error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
