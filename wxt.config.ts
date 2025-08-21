import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  vite: () => ({
    css: {
      postcss: "./postcss.config.cjs",
    },
    server: {
      watch: {
        ignored: ["**/data/**", "**/public/data/**"],
      },
    },
  }),
  manifest: ({ manifestVersion }) => ({
    options_ui: {
      page: "settings.html",
      open_in_tab: true,
    },
    permissions: ["tabs", "scripting", "storage"],
    ...(manifestVersion === 3
      ? {
          content_security_policy: {
            extension_pages:
              "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; upgrade-insecure-requests;",
          },
        }
      : {
          content_security_policy:
            "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
        }),
    web_accessible_resources:
      manifestVersion === 3
        ? [
            {
              resources: [
                "wasm_exec.js",
                "wordserve.wasm",
                "data/*.bin",
                "asset-manifest.json",
              ],
              matches: ["<all_urls>"],
            },
          ]
        : [
            "wasm_exec.js",
            "wordserve.wasm",
            "data/*.bin",
            "asset-manifest.json",
          ],
  }),
});
