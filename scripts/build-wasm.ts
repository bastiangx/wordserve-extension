#!/usr/bin/env bun

// Simple script to build WASM once and place it in public folder for bundling
// Run this only when you need to rebuild the WASM module

import { spawn } from 'child_process';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const wasmSrcPath = join(projectRoot, 'src', 'lib', 'wordserve-wasm.go');
const wasmOutputFile = join(projectRoot, 'public', 'wordserve-wasm.wasm');
const wasmExecJsFile = join(projectRoot, 'public', 'wasm_exec.js');
const wordserveDir = join(projectRoot, 'wordserve');

function checkTinyGo(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('tinygo', ['version'], { stdio: 'pipe' });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

function getTinyGoRoot(): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn('tinygo', ['env', 'TINYGOROOT'], { stdio: 'pipe' });
    let output = '';
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.on('close', (code) => {
      resolve(code === 0 ? output.trim() : null);
    });
    
    proc.on('error', () => resolve(null));
  });
}

function copyWasmExecJs(tinygoRoot: string): boolean {
  try {
    const sourceFile = join(tinygoRoot, 'targets', 'wasm_exec.js');
    if (!existsSync(sourceFile)) {
      console.error(`Error: wasm_exec.js not found at ${sourceFile}`);
      return false;
    }
    
    copyFileSync(sourceFile, wasmExecJsFile);
    console.log(`Copied wasm_exec.js to: ${wasmExecJsFile}`);
    return true;
  } catch (error) {
    console.error('Error copying wasm_exec.js:', error);
    return false;
  }
}

function buildWasm(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log('Building WASM with TinyGo...');
    
    // Ensure public directory exists
    const publicDir = dirname(wasmOutputFile);
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true });
    }

    const buildArgs = [
      'build',
      '-o', wasmOutputFile,
      '-target', 'wasm',
      '--no-debug',
      '-opt', '2',
      wasmSrcPath
    ];

    console.log(`Running: tinygo ${buildArgs.join(' ')}`);
    
    const proc = spawn('tinygo', buildArgs, {
      stdio: 'inherit',
      cwd: wordserveDir,
      env: {
        ...process.env,
        GOOS: 'js',
        GOARCH: 'wasm'
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ WASM built successfully: ${wasmOutputFile}`);
        resolve(true);
      } else {
        console.error(`❌ TinyGo build failed with exit code ${code}`);
        resolve(false);
      }
    });

    proc.on('error', (error) => {
      console.error('❌ Error running TinyGo:', error);
      resolve(false);
    });
  });
}

async function main() {
  console.log('🚀 Building WordServe WASM module for bundling...');
  
  // Check if TinyGo is installed
  if (!(await checkTinyGo())) {
    console.error('❌ TinyGo is not installed or not in PATH');
    console.error('Please install TinyGo: https://tinygo.org/getting-started/install/');
    process.exit(1);
  }

  // Get TinyGo root for wasm_exec.js
  const tinygoRoot = await getTinyGoRoot();
  if (!tinygoRoot) {
    console.error('❌ Could not determine TinyGo root directory');
    process.exit(1);
  }

  // Check dependencies
  if (!existsSync(wordserveDir)) {
    console.error(`❌ WordServe source directory not found: ${wordserveDir}`);
    console.error('Please ensure the wordserve Go project is available');
    process.exit(1);
  }

  if (!existsSync(wasmSrcPath)) {
    console.error(`❌ WASM source file not found: ${wasmSrcPath}`);
    process.exit(1);
  }

  // Copy wasm_exec.js
  if (!copyWasmExecJs(tinygoRoot)) {
    process.exit(1);
  }

  // Build WASM
  if (!(await buildWasm())) {
    process.exit(1);
  }

  console.log('✅ WASM build completed! Files are now in public/ for bundling.');
  console.log('💡 The extension will load these files from the bundled assets.');
}

// Run if this script is executed directly
const isMain = process.argv[1]?.includes('build-wasm.ts');

if (isMain) {
  main().catch((error) => {
    console.error('❌ Build failed:', error);
    process.exit(1);
  });
}