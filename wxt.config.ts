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
  manifest: {
    options_ui: {
      page: "settings.html",
      open_in_tab: true,
    },
    permissions: ["tabs", "scripting", "storage"],
    web_accessible_resources: [
      {
        resources: ["wasm_exec.js", "wordserve.wasm", "data/*.bin"],
        matches: ["<all_urls>"],
      },
    ],
  },
});
