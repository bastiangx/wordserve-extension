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
    name: "WordServe",
    description: "Fast autosuggestions and completions for any website",
    options_ui: {
      page: "settings.html",
      open_in_tab: true,
    },
    permissions: ["tabs", "activeTab", "scripting", "storage", "downloads"],
    commands: {
      "wordserve-open-settings": {
        suggested_key: {
          default: "Ctrl+Shift+Y",
          mac: "Command+Shift+Y",
        },
        description: "Open settings page",
      },
    },
    ...(manifestVersion === 3
      ? {
          content_security_policy: {
            extension_pages:
              "script-src 'self'; object-src 'self'; upgrade-insecure-requests;",
          },
        }
      : {
          content_security_policy: "script-src 'self'; object-src 'self';",
        }),
    web_accessible_resources:
      manifestVersion === 3
        ? [
            {
              resources: ["data/*.bin", "asset-manifest.json"],
              matches: ["http://*/*", "https://*/*"],
            },
          ]
        : ["data/*.bin", "asset-manifest.json"],
  }),
});
