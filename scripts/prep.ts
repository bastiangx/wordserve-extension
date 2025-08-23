#!/usr/bin/env bun

/**
 * Fetches WordServe dictionary data assets.
 * Most important bits are the .bin files in public/data/ .
 * 
 * This script downloads them from the GitHub release assets 
 * and verifies the checksums.
 *
 * Usage: `bun run scripts/prep.ts [--force]`
 * --force: re-download all assets even if they exist
 */

import { createHash } from "crypto";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join, resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import * as fflate from "fflate";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const publicDir = join(projectRoot, "public");
const GITHUB_REPO = "bastiangx/wordserve";
const TARGET_RELEASE_VERSION = "v0.1.2-beta";

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  assets: ReleaseAsset[];
}

interface DownloadResult {
  success: boolean;
  error?: string;
  assetsDownloaded?: string[];
}

export class WordServeDownloader {
  private readonly publicDir: string;
  private readonly quiet: boolean;

  constructor(publicDir = "public", quiet = false) {
    this.publicDir = publicDir;
    this.quiet = quiet;
  }

  private log(message: string) {
    if (!this.quiet) {
      console.log(message);
    }
  }

  private async getLatestRelease(): Promise<GitHubRelease> {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch release info: ${response.status} ${response.statusText}`
      );
    }
    return await response.json();
  }

  // Downloads a file and saves it to outputPath
  private async downloadFile(
    url: string,
    outputPath: string,
    name: string
  ): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download ${name}: ${response.status} ${response.statusText}`
      );
    }
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    const hash = createHash("sha256").update(uint8Array).digest("hex");
    const sizeMB = (uint8Array.length / (1024 * 1024)).toFixed(2);

    writeFileSync(outputPath, uint8Array);
    this.log(`✓ ${name} (${sizeMB}MB, SHA256: ${hash.substring(0, 12)}...)`);
  }

  // Downloads and extracts data.zip, verifies checksums
  private async downloadDataFiles(): Promise<void> {
    const baseUrl = `https://github.com/${GITHUB_REPO}/releases/download/${TARGET_RELEASE_VERSION}`;
    const dataZipUrl = `${baseUrl}/data.zip`;
    const checksumsUrl = `${baseUrl}/checksums.txt`;
    const response = await fetch(dataZipUrl);
    const zipBuffer = await response.arrayBuffer();
    const zipUint8 = new Uint8Array(zipBuffer);
    const unzipped = fflate.unzipSync(zipUint8);
    const dataDir = join(this.publicDir, "data");
    const checksumsPath = join(dataDir, "checksums.txt");
    const checksumsContent = readFileSync(checksumsPath, "utf-8");
    const expectedHashByName: Record<string, string> = {};
    const extractedFiles: string[] = [];
    let extractedCount = 0;

    if (!response.ok) {
      throw new Error(
        `Failed to download data.zip: ${response.status} ${response.statusText}`
      );
    }
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    for (const [filename, fileData] of Object.entries(unzipped)) {
      if (filename.endsWith(".bin")) {
        const outputPath = join(dataDir, filename);
        writeFileSync(outputPath, fileData);
        extractedFiles.push(outputPath);
        extractedCount++;
      }
    }
    await this.downloadFile(checksumsUrl, checksumsPath, "checksums.txt");
    for (const line of checksumsContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^([a-f0-9]{64})\s+(.+)$/i);
      if (match) {
        const [, hash, nameRaw] = match;
        const name = basename(nameRaw.trim());
        expectedHashByName[name] = hash.toLowerCase();
      }
    }
    for (const filePath of extractedFiles) {
      const fileName = basename(filePath);
      const expected = expectedHashByName[fileName];
      if (!expected) {
        this.log(`No checksum: ${fileName}`);
        continue;
      }
      const fileBuffer = readFileSync(filePath);
      const actual = createHash("sha256").update(fileBuffer).digest("hex");
      if (actual !== expected) {
        throw new Error(
          `Checksum mismatch for ${fileName}: expected ${expected}, got ${actual}`
        );
      }
    }
  }

  // Lists which required assets are missing
  private checkExistingAssets(): { missing: string[]; existing: string[] } {
    const dataDir = join(this.publicDir, "data");
    const missing: string[] = [];
    const existing: string[] = [];
    const requiredAssets = [
      join(dataDir, "dict_0001.bin"),
      join(dataDir, "dict_0002.bin"),
      join(dataDir, "dict_0003.bin"),
      join(dataDir, "dict_0004.bin"),
      join(dataDir, "dict_0005.bin"),
      join(dataDir, "dict_0006.bin"),
      join(dataDir, "dict_0007.bin"),
    ];

    for (const asset of requiredAssets) {
      if (existsSync(asset)) {
        existing.push(asset);
      } else {
        missing.push(asset);
      }
    }
    return { missing, existing };
  }

  // Downloads missing assets, or all if force=true
  public async downloadAssets(force = false): Promise<DownloadResult> {
    try {
      const { missing } = this.checkExistingAssets();
      if (!force && missing.length === 0) {
        this.log("All assets already exist");
        return { success: true, assetsDownloaded: [] };
      }
      if (!existsSync(this.publicDir)) {
        mkdirSync(this.publicDir, { recursive: true });
      }
      const dataMissing = missing.some((path) => path.includes("dict_"));
      if (force || dataMissing) {
        await this.downloadDataFiles();
      }
      return {
        success: true,
        assetsDownloaded: force ? ["all"] : missing,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

async function main() {
  const force = process.argv.includes("--force") || process.argv.includes("-f");
  const quiet = process.argv.includes("--quiet") || process.argv.includes("-q");
  const downloader = new WordServeDownloader(publicDir, quiet);
  const result = await downloader.downloadAssets(force);
  if (!result.success) {
    console.error("Fetch failed:", result.error);
    process.exit(1);
  }
}

main();
