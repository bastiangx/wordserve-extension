# Dictionary assets and build scripts

`scripts/` folder contains small build time helpers:

1. `prep.ts`

 Fetches the dictionary binaries required by the extension to work.

2. `manifest.ts`

Generates `public/asset-manifest.json` with size and SHA-256.

## Dictionary (*.bin files)

WordServe ships prebuilt dictionary files stored under `public/data/` (e.g., `dict_0001.bin` … `dict_0007.bin`).

These files contain serialized radix trie structures derived from the ~70,000-word dataset produced by the
**Wordserve [Go library](https://github.com/bastiangx/wordserve/)**.

> The compressed radix trie format enables fast, low-memory prefix traversal,  minimal overhead, lowered space usage, and better serialization.

> Read more in [internal documentation](https://github.com/bastiangx/wordserve/tree/main/docs)


##### Why fetch at build?

The dictionary is moderately large and rarely changes compared to the code. Keeping it as a separate download allows us to focus on logic changes without bloating the repo.

### Security

`prep.ts` downloads a specific, pinned release version, not "latest".
It then verifies a `checksums.txt` file for the archive and each extracted `.bin` file.

- If any checksum fails, the script aborts.
- `manifest.ts` writes a JSON manifest with byte sizes and hashes.

## Usage

```sh
bun install

bun run prep         # fetch pinned data assets

bun run build        # Chromium bundle
bun run build:firefox
```

If in need to force a download

```sh
bun run prep:force
```
