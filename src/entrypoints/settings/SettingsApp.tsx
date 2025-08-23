"use client";
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
import { GeneralSettings } from "@/entrypoints/settings/components/general";
import { BehaviorSettings } from "@/entrypoints/settings/components/behavior";
import { KeyboardSettings } from "@/entrypoints/settings/components/keyboard";
import { AppearanceSettings } from "@/entrypoints/settings/components/appearance";
import { AccessibilitySettings } from "@/entrypoints/settings/components/accessibility";
import { DomainSettingsComponent } from "@/entrypoints/settings/components/domain";
import { MenuPreview } from "@/components/preview";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
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
import { Label } from "@radix-ui/react-label";
import { AbbreviationsSettings } from "@/entrypoints/settings/components/abbreviations";

const menuItems = [
  { id: "general", label: "General", icon: SettingsIcon, desc: "" },
  {
    id: "behavior",
    label: "Behavior",
    icon: BookType,
    desc: "Insertions & input control",
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
    label: "Keyboard",
    icon: Keyboard,
    desc: "Bindings & control",
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
    desc: "Various accessiblity improvements",
  },
];

const LOGO_URL = "icon/48.png";

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
      const result = await browser.storage.sync.get("wordserveSettings");
      const loadedSettings = result.wordserveSettings
        ? normalizeConfig(result.wordserveSettings)
        : normalizeConfig({});
      setSettings(loadedSettings);
      setPendingSettings(loadedSettings);
    } catch (error) {
      console.error("Failed to load settings:", error);
      showNotification("error", "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      const normalized = normalizeConfig(pendingSettings);
      await browser.storage.sync.set({ wordserveSettings: normalized });

      // Only send messages to tabs that might have content scripts
      const tabs = await browser.tabs.query({
        url: ["http://*/*", "https://*/*"],
      });

      let successfulUpdates = 0;
      for (const tab of tabs) {
        if (tab.id) {
          try {
            await browser.tabs.sendMessage(tab.id, {
              type: "settingsUpdated",
              settings: pendingSettings,
            });
            successfulUpdates++;
          } catch (error) {
            console.log(`Failed to update settings in tab ${tab.id}:`, error);
          }
        }
      }
      setSettings(pendingSettings);
      showNotification("success", "Preference saved!");
    } catch (error) {
      console.error("Failed to save settings:", error);
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
          <p className="text-muted-foreground">Loading settings...</p>
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
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
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

          <SidebarGroup>
            <SidebarGroupLabel>Live preview</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-2">
                <MenuPreview settings={pendingSettings} className="w-full" />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-auto">
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
                      Donate!
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
          <div className="mb-2">
            <h1 className="text-2xl font-bold mb-1">{currentSection?.label}</h1>
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
