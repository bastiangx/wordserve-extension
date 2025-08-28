"use client";
import { AbbreviationsSettings } from "@/entrypoints/settings/components/abbreviations";
import { AccessibilitySettings } from "@/entrypoints/settings/components/accessibility";
import { DomainSettingsComponent } from "@/entrypoints/settings/components/domain";
import { AppearanceSettings } from "@/entrypoints/settings/components/appearance";
import { BehaviorSettings } from "@/entrypoints/settings/components/behavior";
import { KeyboardSettings } from "@/entrypoints/settings/components/keyboard";
import { GeneralSettings } from "@/entrypoints/settings/components/general";
import { Label } from "@radix-ui/react-label";
import { FaGithub } from "react-icons/fa";
import {
  Glasses,
  Globe,
  Keyboard,
  Palette,
  RotateCcw,
  BookType,
  Save,
  SettingsIcon,
  X,
  FastForward,
} from "lucide-react";
import type { DefaultConfig } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { normalizeConfig } from "@/lib/config";
import { MenuPreview } from "@/components/preview";
import { useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  detectEnvironment,
  validateKeyBindings,
  formatIssue,
  findDuplicateKeybinds,
} from "@/lib/input/validate";
import type { KeyChord } from "@/lib/input/kbd";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const menuItems = [
  { id: "general", label: "General", icon: SettingsIcon, desc: "Main options" },
  {
    id: "behavior",
    label: "Behavior",
    icon: BookType,
    desc: "Insertions & interactions",
  },
  {
    id: "abbreviations",
    label: "Abbreviations",
    icon: FastForward,
    desc: "Make text shortcuts that expand into longer phrases",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    desc: "Suggestion menu's UI",
  },
  {
    id: "keyboard",
    label: "Keybinds",
    icon: Keyboard,
    desc: "Keyboard & input control",
  },
  {
    id: "domain",
    label: "Domain",
    icon: Globe,
    desc: "Control when WordServe comes to life",
  },
  {
    id: "accessibility",
    label: "Accessibility",
    icon: Glasses,
    desc: "Various accessiblity options",
  },
];

const LOGO_URL = "icon/48.png";

// SettingsApp manages the config state
function SettingsApp() {
  const [settings, setSettings] = useState<DefaultConfig>(DEFAULT_SETTINGS);
  const [pendingSettings, setPendingSettings] =
    useState<DefaultConfig>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState("general");

  useEffect(() => {
    (async () => {
      await loadSettings();
    })();
  }, []);

  useEffect(() => {
    const hasChanges =
      JSON.stringify(settings) !== JSON.stringify(pendingSettings);
    setHasChanges(hasChanges);
  }, [settings, pendingSettings]);

  const loadSettings = async () => {
    try {
      // Prefer sync storage; fall back to local on Firefox or error
      let result: any = {};
      try {
        if ((browser as any).storage?.sync?.get) {
          result = await (browser as any).storage.sync.get("wordserveSettings");
        } else {
          result = await browser.storage.local.get("wordserveSettings");
        }
      } catch (e) {
        result = await browser.storage.local.get("wordserveSettings");
      }
      const loadedSettings = result.wordserveSettings
        ? normalizeConfig(result.wordserveSettings)
        : normalizeConfig({});
      // Merge browser command shortcuts for toggle/open into our settings
      const merged = await mergeBrowserCommandsIntoSettings(loadedSettings);
      setSettings(merged);
      setPendingSettings(merged);
    } catch (error) {
      console.error("Settings load failed:", error);
      showNotification("error", "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };
  // Map a browser command shortcut string (e.g., "Ctrl+Shift+Y") into our KeyChord
  const parseBrowserShortcut = (s?: string | null): KeyChord | null => {
    if (!s) return null;
    const parts = s.split("+").map((p) => p.trim());
    const mods: Array<"ctrl" | "alt" | "shift" | "cmd"> = [];
    let key = "";
    for (const p of parts) {
      switch (p) {
        case "Ctrl":
          mods.push("ctrl");
          continue;
        case "Alt":
          mods.push("alt");
          continue;
        case "Shift":
          mods.push("shift");
          continue;
        case "Command":
          mods.push("cmd");
          continue;
        case "MacCtrl":
          mods.push("ctrl");
          continue;
      }
      const map: Record<string, string> = {
        Comma: "comma",
        Period: "period",
        Home: "home",
        End: "end",
        PageUp: "pageup",
        PageDown: "pagedown",
        Space: "space",
        Insert: "insert",
        Delete: "forwarddelete",
        Up: "up",
        Down: "down",
        Left: "left",
        Right: "right",
      };
      if (map[p]) {
        key = map[p];
      } else if (/^[A-Z]$/.test(p)) {
        key = p.toLowerCase();
      } else if (/^[0-9]$/.test(p)) {
        key = p;
      }
    }
    if (!key) return null;
    return { key, modifiers: Array.from(new Set(mods)) } as KeyChord;
  };

  // Format our KeyChord into a browser commands shortcut string for the platform
  const formatBrowserShortcut = (
    c: KeyChord,
    platform: "mac" | "win" | "linux" | "other"
  ): string => {
    const parts: string[] = [];
    const has = (m: string) => (c.modifiers || []).includes(m as any);
    if (platform === "mac") {
      if (has("cmd")) parts.push("Command");
      if (has("ctrl")) parts.push("MacCtrl");
    } else {
      if (has("ctrl")) parts.push("Ctrl");
    }
    if (has("alt")) parts.push("Alt");
    if (has("shift")) parts.push("Shift");
    const key = c.key;
    const rev: Record<string, string> = {
      comma: "Comma",
      period: "Period",
      home: "Home",
      end: "End",
      pageup: "PageUp",
      pagedown: "PageDown",
      space: "Space",
      forwarddelete: "Delete",
      up: "Up",
      down: "Down",
      left: "Left",
      right: "Right",
    };
    if (rev[key]) {
      parts.push(rev[key]);
    } else if (/^[a-z]$/.test(key)) {
      parts.push(key.toUpperCase());
    } else if (/^[0-9]$/.test(key)) {
      parts.push(key);
    } else if (/^f([1-9]|1[0-9]|20)$/.test(key)) {
      parts.push(key.toUpperCase());
    } else {
      // unsupported -> empty string; the update will likely fail
      parts.push("");
    }
    return parts.filter(Boolean).join("+");
  };

  const mergeBrowserCommandsIntoSettings = async (
    base: DefaultConfig
  ): Promise<DefaultConfig> => {
    try {
      const cmds = await (browser as any).commands?.getAll?.();
      if (!Array.isArray(cmds)) return base;
      const byName: Record<string, { shortcut?: string | null }> = {};
      for (const c of cmds) byName[c.name] = c;
      const next = { ...base } as DefaultConfig;
      const patchAction = (
        action: keyof DefaultConfig["keyBindings"],
        name: string
      ) => {
        const sc = byName[name]?.shortcut || "";
        const chord = parseBrowserShortcut(sc);
        if (chord) {
          const list = next.keyBindings[action] || [];
          const sig = (c: KeyChord) =>
            `${(c.modifiers || []).slice().sort().join("+")}::${c.key}`;
          const exists = list.some((c) => sig(c) === sig(chord));
          if (!exists) {
            next.keyBindings[action] = [...list, chord];
          }
        }
      };
      patchAction("toggleGlobal", "wordserve-toggle-global");
      patchAction("openSettings", "wordserve-open-settings");
      return next;
    } catch {
      return base;
    }
  };

  const saveSettings = async () => {
    try {
      // 1) Hard-stop on duplicate chords across actions
      const dups = findDuplicateKeybinds(pendingSettings.keyBindings);
      if (dups.length > 0) {
        const lines = dups
          .map(
            (d) =>
              `${(d.chord.modifiers || []).slice().sort().join("+")}${
                (d.chord.modifiers || []).length ? "+" : ""
              }${d.chord.key} used in: ${d.actions.join(", ")}`
          )
          .join("\n");
        toast.error(`Duplicate combos found:\n${lines}`, { duration: 5000 });
        return;
      }
      const normalized = normalizeConfig(pendingSettings);
      // Validate keybindings against browser/OS reserved combos
      const env = detectEnvironment();
      const issues = validateKeyBindings(normalized.keyBindings, env);
      const errors = issues.filter((i) => i.level === "error");
      const warns = issues.filter((i) => i.level === "warn");
      if (errors.length > 0) {
        toast.error(
          `Some combos clash with browser shortcuts and were not saved.`,
          { duration: 3500 }
        );
        // Discard offending chords from the pending settings and proceed
        const cleaned = { ...normalized } as typeof normalized;
        const discardSig = new Set(
          errors.map(
            (e) =>
              `${e.action}::${(e.chord.modifiers || [])
                .slice()
                .sort()
                .join("+")}::${e.chord.key}`
          )
        );
        const kb: any = { ...cleaned.keyBindings };
        for (const e of errors) {
          kb[e.action] = (kb[e.action] || []).filter(
            (c: any) =>
              !discardSig.has(
                `${e.action}::${(c.modifiers || [])
                  .slice()
                  .sort()
                  .join("+")}::${c.key}`
              )
          );
        }
        cleaned.keyBindings = kb;
        // Also reflect the cleaned version in pendingSettings to keep UI in sync
        setPendingSettings(cleaned);
        // Continue with cleaned configs
        try {
          if ((browser as any).storage?.sync?.set) {
            await (browser as any).storage.sync.set({ wordserveSettings: cleaned });
          }
        } catch (e) {}
        try {
          await browser.storage.local.set({ wordserveSettings: cleaned });
        } catch (e) {}
      } else {
        try {
          if ((browser as any).storage?.sync?.set) {
            await (browser as any).storage.sync.set({ wordserveSettings: normalized });
          }
        } catch (e) {}
        try {
          await browser.storage.local.set({ wordserveSettings: normalized });
        } catch (e) {}
      }
      if (warns.length > 0) {
        toast.warning(
          `Some keybinds may be intercepted by the browser:\n` +
            warns.map((w) => `- ${formatIssue(w)}`).join("\n"),
          { duration: 5000 }
        );
      }
      // Push manifest command updates for toggle/open
      try {
        const env2 = detectEnvironment();
        const plat = env2.platform;
        const updateCmd = async (
          action: keyof DefaultConfig["keyBindings"],
          name: string
        ) => {
          const first = (normalized.keyBindings[action] || [])[0];
          if (!first) {
            // clear to manifest defaults
            if ((browser as any).commands?.reset) {
              await (browser as any).commands.reset({ name });
            }
            return;
          }
          const shortcut = formatBrowserShortcut(first, plat);
          if ((browser as any).commands?.update) {
            await (browser as any).commands.update({ name, shortcut });
          }
        };
        await updateCmd("toggleGlobal", "wordserve-toggle-global");
        await updateCmd("openSettings", "wordserve-open-settings");
      } catch {}

      // Best-effort notify all tabs; avoid Firefox host permission errors
      try {
        const tabs = await browser.tabs.query({});
        let successfulUpdates = 0;
        for (const tab of tabs) {
          if (tab.id) {
            try {
              await browser.tabs.sendMessage(tab.id, {
                type: "settingsUpdated",
                settings: pendingSettings,
              });
              successfulUpdates++;
            } catch (error) {}
          }
        }
      } catch (e) {
        // Ignore broadcast failures; settings have already been saved
      }
      setSettings(pendingSettings);
      showNotification("success", "Preference saved!");
    } catch (error) {
      console.error("Settings save failed:", error);
      showNotification("error", "Failed to save preference");
    }
  };
  const discardChanges = () => {
    setPendingSettings(settings);
  };
  const showNotification = (type: "success" | "error", message: string) => {
    setTimeout(() => {
      if (type === "success") {
        toast.success(message, { duration: 2000 });
      } else {
        toast.error(message, { duration: 3000 });
      }
    }, 0);
  };

  const updatePendingSetting = <K extends keyof DefaultConfig>(
    key: K,
    value: DefaultConfig[K]
  ) => {
    setPendingSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updatePendingAccessibilitySetting = <
    K extends keyof DefaultConfig["accessibility"]
  >(
    key: K,
    value: DefaultConfig["accessibility"][K]
  ) => {
    setPendingSettings((prev) => ({
      ...prev,
      accessibility: { ...prev.accessibility, [key]: value },
    }));
  };

  const updatePendingDomainSetting = <K extends keyof DefaultConfig["domains"]>(
    key: K,
    value: DefaultConfig["domains"][K]
  ) => {
    setPendingSettings((prev) => ({
      ...prev,
      domains: { ...prev.domains, [key]: value },
    }));
  };

  const resetToDefaults = () => {
    setPendingSettings(DEFAULT_SETTINGS);
  };

  const adjustNumber = (
    key: keyof DefaultConfig,
    delta: number,
    min: number,
    max: number
  ) => {
    const currentValue = pendingSettings[key] as number;
    const newValue = Math.max(min, Math.min(max, currentValue + delta));
    updatePendingSetting(key, newValue as any);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case "general":
        return (
          <GeneralSettings
            pendingSettings={pendingSettings}
            updatePendingSetting={updatePendingSetting}
            adjustNumber={adjustNumber}
          />
        );
      case "behavior":
        return (
          <BehaviorSettings
            pendingSettings={pendingSettings}
            updatePendingSetting={updatePendingSetting}
          />
        );
      case "keyboard":
        return (
          <KeyboardSettings
            pendingSettings={pendingSettings}
            updatePendingSetting={updatePendingSetting}
          />
        );
      case "appearance":
        return (
          <AppearanceSettings
            pendingSettings={pendingSettings}
            updatePendingSetting={updatePendingSetting}
            adjustNumber={adjustNumber}
          />
        );
      case "accessibility":
        return (
          <AccessibilitySettings
            pendingSettings={pendingSettings.accessibility}
            updatePendingAccessibilitySetting={
              updatePendingAccessibilitySetting
            }
          />
        );
      case "domain":
        return (
          <DomainSettingsComponent
            pendingSettings={pendingSettings.domains}
            updatePendingDomainSetting={updatePendingDomainSetting}
          />
        );
      case "abbreviations":
        return (
          <AbbreviationsSettings
            pendingSettings={pendingSettings}
            updatePendingSetting={updatePendingSetting}
          />
        );
    }
  };

  const currentSection = menuItems.find((item) => item.id === activeSection);

  return (
    <SidebarProvider>
      <Sidebar className="h-svh">
        <SidebarHeader>
          <Button
            variant="ghost"
            className="px-2 py-2 h-auto justify-start gap-2"
            onClick={() =>
              window.open(
                "https://github.com/bastiangx/wordserve-plugin",
                "_blank"
              )
            }
          >
            <img src={LOGO_URL} alt="WordServe" className="h-6 w-6" />
            <h2 className="text-lg font-semibold">WordServe</h2>
            <FaGithub className="h-4 w-4 ml-auto" />
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      className="text-base"
                      isActive={activeSection === item.id}
                      onClick={() => setActiveSection(item.id)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <SidebarMenuButton className="text-destructive hover:text-destructive hover:bg-destructive/10 justify-start">
                        <RotateCcw className="h-4 w-4" />
                        <span>Reset Settings</span>
                      </SidebarMenuButton>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset all settings?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will restore all settings to their default
                          values. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={resetToDefaults}
                          className="bg-destructive/10 text-destructive hover:bg-destructive/12"
                        >
                          Reset settings
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <Separator />

          <SidebarGroup>
            <SidebarGroupLabel className="font-mono pl-2">
              Live preview
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-2">
                <MenuPreview settings={pendingSettings} className="w-full" />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-auto font-mono">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <div className="flex flex-col gap-6 w-full p-1 items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="
                        p-4 text-muted-foreground hover:bg-interaction hover:text-interaction-foreground"
                      onClick={() =>
                        window.open("https://ko-fi.com/bastiangx", "_blank")
                      }
                    >
                      <img
                        className="h-16 w-16 mb-6 "
                        src="https://files.catbox.moe/aw4243.gif"
                      />
                      Support the project!
                    </Button>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1 select-none pointer-events-none">
                      Made with{" "}
                      <img
                        src="https://files.catbox.moe/acsv6z.svg"
                        alt="heart"
                        className="h-4 w-4 inline-block px-0.5 select-none"
                      />{" "}
                      by bastian
                    </Label>
                  </div>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="h-svh">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-2">
                  {currentSection && (
                    <currentSection.icon className="h-4 w-4" />
                  )}
                  {currentSection?.label}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-3 p-3">
          <div className="m-2">
            <h4 className="text-sm text-muted-foreground">
              {currentSection?.desc}
            </h4>
          </div>

          {renderContent()}

          {hasChanges && (
            <div className="fixed bottom-4 right-4 z-50 flex gap-2">
              <Button
                variant="outline"
                onClick={discardChanges}
                className="hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Discard
              </Button>
              <Button variant="secondary" onClick={saveSettings}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function SettingsAppWithToast() {
  return (
    <>
      <SettingsApp />
      <Toaster position="top-right" visibleToasts={3} />
    </>
  );
}
