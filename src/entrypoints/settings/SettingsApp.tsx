"use client";
import { FaGithub } from "react-icons/fa";
import { SiKofi } from "react-icons/si";
import {
  Glasses,
  Globe,
  Keyboard,
  Palette,
  RotateCcw,
  Save,
  SettingsIcon,
  X,
} from "lucide-react";
import type { WordServeSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { GeneralSettings } from "@/entrypoints/settings/components/general";
import { BehaviorSettings } from "@/entrypoints/settings/components/behavior.tsx";
import { KeyboardSettings } from "@/entrypoints/settings/components/keyboard";
import { AppearanceSettings } from "@/entrypoints/settings/components/appearance";
import { AccessibilitySettings } from "@/entrypoints/settings/components/accessibility";
import { DomainSettingsComponent } from "@/entrypoints/settings/components/domain";
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

const navigationItems = [
  {
    id: "general",
    title: "General",
    icon: SettingsIcon,
    description: "Basics & core functionality",
  },
  {
    id: "behavior",
    title: "Behavior",
    icon: Keyboard,
    description: "Input behavior and keyboard shortcuts",
  },
  {
    id: "keyboard",
    title: "Keyboard",
    icon: Keyboard,
    description: "Keyboard shortcuts and bindings",
  },
  {
    id: "appearance",
    title: "Appearance",
    icon: Palette,
    description: "Visual appearance and styling",
  },
  {
    id: "accessibility",
    title: "Accessibility",
    icon: Glasses,
    description: "Accessibility features and customization",
  },
  {
    id: "domains",
    title: "Domains",
    icon: Globe,
    description: "Domain management and security",
  },
];

const LOGO_URL = "icon/48.png";

function SettingsApp() {
  const [settings, setSettings] = useState<WordServeSettings>(DEFAULT_SETTINGS);
  const [pendingSettings, setPendingSettings] =
    useState<WordServeSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState("general");

  useEffect(() => {
    // Fix promise handling
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
        ? { ...DEFAULT_SETTINGS, ...result.wordserveSettings }
        : DEFAULT_SETTINGS;
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
      await browser.storage.sync.set({ wordserveSettings: pendingSettings });

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
            // Silently ignore tabs without content scripts
            // This is expected behavior for tabs that don't support the extension
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
    // Use setTimeout to defer toast rendering and avoid blocking the main thread
    setTimeout(() => {
      if (type === "success") {
        toast.success(message, { duration: 2000 });
      } else {
        toast.error(message, { duration: 3000 });
      }
    }, 0);
  };

  const updatePendingSetting = <K extends keyof WordServeSettings>(
    key: K,
    value: WordServeSettings[K]
  ) => {
    setPendingSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updatePendingAccessibilitySetting = <
    K extends keyof WordServeSettings["accessibility"]
  >(
    key: K,
    value: WordServeSettings["accessibility"][K]
  ) => {
    setPendingSettings((prev) => ({
      ...prev,
      accessibility: { ...prev.accessibility, [key]: value },
    }));
  };

  const updatePendingDomainSetting = <
    K extends keyof WordServeSettings["domains"]
  >(
    key: K,
    value: WordServeSettings["domains"][K]
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
    key: keyof WordServeSettings,
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
      case "domains":
        return (
          <DomainSettingsComponent
            pendingSettings={pendingSettings.domains}
            updatePendingDomainSetting={updatePendingDomainSetting}
          />
        );
      default:
        return (
          <GeneralSettings
            pendingSettings={pendingSettings}
            updatePendingSetting={updatePendingSetting}
            adjustNumber={adjustNumber}
          />
        );
    }
  };

  const currentSection = navigationItems.find(
    (item) => item.id === activeSection
  );

  return (
    <SidebarProvider>
      <Sidebar>
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
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeSection === item.id}
                      onClick={() => setActiveSection(item.id)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Danger Zone</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <SidebarMenuButton className="text-destructive hover:text-destructive">
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
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Button
                    variant="ghost"
                    className="px-2 py-2 h-auto justify-center gap-2 w-full hover:bg-secondary hover:text-secondary-foreground"
                    onClick={() =>
                      window.open("https://ko-fi.com/bastiangx", "_blank")
                    }
                  >
                    <SiKofi className="h-4 w-4" />
                    <span>Support us!</span>
                  </Button>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-2">
                  {currentSection && (
                    <currentSection.icon className="h-4 w-4" />
                  )}
                  {currentSection?.title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">{currentSection?.title}</h1>
            <p className="text-muted-foreground">
              {currentSection?.description}
            </p>
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
      <Toaster
        position="top-right"
        visibleToasts={3}
      />
    </>
  );
}
