#!/usr/bin/env bun

/**
 * Settings Implementation Audit
 * Checks if all defined settings are actually implemented and used
 */

import { readFileSync } from "fs";
import { join } from "path";

interface SettingDefinition {
  name: string;
  type: string;
  defaultValue: any;
  implemented: boolean;
  usedInDOM: boolean;
  usedInUI: boolean;
  issues: string[];
}

function auditSettings() {
  console.log("🔍 WordServe Settings Implementation Audit\n");

  // Define all settings that should be implemented
  const expectedSettings: SettingDefinition[] = [
    {
      name: "compactMode",
      type: "boolean",
      defaultValue: false,
      implemented: false,
      usedInDOM: false,
      usedInUI: false,
      issues: [],
    },
    {
      name: "rankingPosition",
      type: '"left" | "right"',
      defaultValue: "right",
      implemented: false,
      usedInDOM: false,
      usedInUI: false,
      issues: [],
    },
    {
      name: "menuBorderRadius",
      type: "boolean",
      defaultValue: true,
      implemented: false,
      usedInDOM: false,
      usedInUI: false,
      issues: [],
    },
    {
      name: "themeMode",
      type: '"adaptive" | "isolated"',
      defaultValue: "isolated",
      implemented: false,
      usedInDOM: false,
      usedInUI: false,
      issues: [],
    },
    {
      name: "showRankingOverride",
      type: "boolean",
      defaultValue: false,
      implemented: false,
      usedInDOM: false,
      usedInUI: false,
      issues: [],
    },
    {
      name: "numberSelection",
      type: "boolean",
      defaultValue: true,
      implemented: false,
      usedInDOM: false,
      usedInUI: false,
      issues: [],
    },
  ];

  // Read key files
  const domManagerPath = join(process.cwd(), "src/lib/dom.ts");
  const settingsUIPath = join(
    process.cwd(),
    "src/entrypoints/settings/SettingsApp.tsx"
  );
  const menuComponentPath = join(
    process.cwd(),
    "src/components/wordserve/menu.tsx"
  );
  const renderComponentPath = join(
    process.cwd(),
    "src/components/wordserve/render.tsx"
  );
  const contentScriptPath = join(process.cwd(), "src/entrypoints/content.ts");

  let domContent = "";
  let settingsContent = "";
  let menuContent = "";
  let renderContent = "";
  let contentContent = "";

  try {
    domContent = readFileSync(domManagerPath, "utf-8");
    settingsContent = readFileSync(settingsUIPath, "utf-8");
    menuContent = readFileSync(menuComponentPath, "utf-8");
    renderContent = readFileSync(renderComponentPath, "utf-8");
    contentContent = readFileSync(contentScriptPath, "utf-8");
  } catch (error) {
    console.error("❌ Error reading files:", error);
    process.exit(1);
  }

  // Check each setting
  for (const setting of expectedSettings) {
    console.log(`\n🔧 Checking ${setting.name}:`);

    // Check if used in DOM manager
    if (
      domContent.includes(`settings.${setting.name}`) ||
      domContent.includes(`this.settings.${setting.name}`)
    ) {
      setting.usedInDOM = true;
      console.log(`  ✅ Used in DOM manager`);
    } else {
      setting.issues.push("Not used in DOM manager");
      console.log(`  ❌ Not used in DOM manager`);
    }

    // Check if in settings UI
    if (
      settingsContent.includes(setting.name) &&
      settingsContent.includes("updatePendingSetting")
    ) {
      setting.usedInUI = true;
      console.log(`  ✅ Settings UI implemented`);
    } else if (settingsContent.includes(setting.name)) {
      console.log(`  ⚠️  Partially implemented in settings UI`);
      setting.issues.push("Settings UI partially implemented");
    } else {
      setting.issues.push("No settings UI");
      console.log(`  ❌ No settings UI`);
    }

    // Check if in menu component (use prop mapping)
    let menuPropName = setting.name;
    if (setting.name === "showRankingOverride") menuPropName = "showRanking";
    if (setting.name === "numberSelection") menuPropName = "showNumbers";
    if (setting.name === "menuBorderRadius") menuPropName = "borderRadius";

    if (
      menuContent.includes(menuPropName) ||
      renderContent.includes(menuPropName)
    ) {
      console.log(`  ✅ Used in menu component (as ${menuPropName})`);
    } else {
      console.log(
        `  ❌ Not used in menu component (looking for ${menuPropName})`
      );
      setting.issues.push("Not used in menu rendering");
    }

    // Check if has default value in content script
    if (
      contentContent.includes(
        `${setting.name}: ${JSON.stringify(setting.defaultValue)}`
      )
    ) {
      setting.implemented = true;
      console.log(`  ✅ Default value set correctly`);
    } else {
      setting.issues.push("Default value missing or incorrect");
      console.log(`  ❌ Default value missing or incorrect`);
    }
  }

  // Summary
  console.log("\n📊 Summary:");
  console.log("============");

  const fullyImplemented = expectedSettings.filter(
    (s) => s.implemented && s.usedInDOM && s.usedInUI && s.issues.length === 0
  );
  const partiallyImplemented = expectedSettings.filter(
    (s) => (s.usedInDOM || s.usedInUI) && s.issues.length > 0
  );
  const notImplemented = expectedSettings.filter(
    (s) => !s.usedInDOM && !s.usedInUI
  );

  console.log(
    `✅ Fully implemented: ${fullyImplemented.length}/${expectedSettings.length}`
  );
  if (fullyImplemented.length > 0) {
    fullyImplemented.forEach((s) => console.log(`   - ${s.name}`));
  }

  console.log(
    `⚠️  Partially implemented: ${partiallyImplemented.length}/${expectedSettings.length}`
  );
  if (partiallyImplemented.length > 0) {
    partiallyImplemented.forEach((s) =>
      console.log(`   - ${s.name}: ${s.issues.join(", ")}`)
    );
  }

  console.log(
    `❌ Not implemented: ${notImplemented.length}/${expectedSettings.length}`
  );
  if (notImplemented.length > 0) {
    notImplemented.forEach((s) => console.log(`   - ${s.name}`));
  }

  if (fullyImplemented.length === expectedSettings.length) {
    console.log("\n🎉 All settings are fully implemented!");
    return true;
  } else {
    console.log("\n🚨 Some settings need attention!");
    return false;
  }
}

// Run the audit
const success = auditSettings();
process.exit(success ? 0 : 1);
