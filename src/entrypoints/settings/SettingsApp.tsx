"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import { FaGithub } from "react-icons/fa";
import { SiKofi } from "react-icons/si";
import {
  Trash2,
  Plus,
  Palette,
  SettingsIcon,
  Globe,
  Shield,
  Keyboard,
  X,
  Glasses,
  RotateCcw,
  Save,
  Minus,
} from "lucide-react";

interface WordServeSettings {
  minWordLength: number;
  maxSuggestions: number;
  debounceTime: number;
  numberSelection: boolean;
  showRankingOverride: boolean;
  compactMode: boolean;
  ghostTextEnabled: boolean;
  fontSize: number;
  fontWeight:
  | "thin"
  | "extralight"
  | "light"
  | "normal"
  | "medium"
  | "semibold"
  | "bold"
  | "extrabold"
  | "black";
  abbreviationsEnabled: boolean;
  autoInsertion: boolean;
  autoInsertionCommitMode: "space-commits" | "enter-only";
  smartBackspace: boolean;
  accessibility: {
    boldSuffix: boolean;
    uppercaseSuggestions: boolean;
    prefixColorIntensity: "normal" | "muted" | "faint" | "accent";
    ghostTextColorIntensity: "normal" | "muted" | "faint" | "accent";
    customColor?: string;
    customFontFamily?: string;
    customFontSize?: number;
  };
  domains: {
    blacklistMode: boolean;
    blacklist: string[];
    whitelist: string[];
  };
}

const DEFAULT_SETTINGS: WordServeSettings = {
  minWordLength: 3,
  maxSuggestions: 64,
  debounceTime: 100,
  numberSelection: true,
  showRankingOverride: false,
  compactMode: false,
  ghostTextEnabled: true,
  fontSize: 14,
  fontWeight: "normal",
  abbreviationsEnabled: true,
  autoInsertion: true,
  autoInsertionCommitMode: "space-commits",
  smartBackspace: true,
  accessibility: {
    boldSuffix: false,
    uppercaseSuggestions: false,
    prefixColorIntensity: "normal",
    ghostTextColorIntensity: "muted",
  },
  domains: {
    blacklistMode: true,
    blacklist: [
      "*.paypal.com",
      "*.stripe.com",
      "*.checkout.com",
      "*.square.com",
      "*.braintreepayments.com",
      "*.authorize.net",
      "*.payment.*",
      "*checkout*",
      "*payment*",
      "*billing*",
      "*.bank.*",
      "*banking*",
      "online.chase.com",
      "www.wellsfargo.com",
      "www.bankofamerica.com",
      "secure.*",
      "login.*",
      "auth.*",
      "*signin*",
      "*signup*",
    ],
    whitelist: [],
  },
};

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
  const [newDomainInput, setNewDomainInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState("general");

  useEffect(() => {
    loadSettings();
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

      const tabs = await browser.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          try {
            await browser.tabs.sendMessage(tab.id, {
              type: "settingsUpdated",
              settings: pendingSettings,
            });
          } catch (error) {
            console.error("Failed to send settings update to tab:", error);
          }
        }
      }

      setSettings(pendingSettings);
      showNotification("success", "Preference saved successfully!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      showNotification("error", "Failed to save Preferences");
    }
  };

  const discardChanges = () => {
    setPendingSettings(settings);
  };

  const showNotification = (type: "success" | "error", message: string) => {
    if (type === "success") {
      toast.success(message);
    } else {
      toast.error(message);
    }
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

  const addDomain = (listType: "blacklist" | "whitelist") => {
    if (!newDomainInput.trim()) return;

    const currentList = pendingSettings.domains[listType];
    if (!currentList.includes(newDomainInput.trim())) {
      updatePendingDomainSetting(listType, [
        ...currentList,
        newDomainInput.trim(),
      ]);
    }
    setNewDomainInput("");
  };

  const removeDomain = (
    listType: "blacklist" | "whitelist",
    domain: string
  ) => {
    const currentList = pendingSettings.domains[listType];
    updatePendingDomainSetting(
      listType,
      currentList.filter((d) => d !== domain)
    );
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

  const validateAndUpdateNumber = (
    key: keyof WordServeSettings,
    value: string,
    min: number,
    max: number
  ) => {
    const numValue = Number.parseInt(value);
    if (isNaN(numValue)) {
      showNotification("error", `Invalid number entered for ${key}`);
      return;
    }
    if (numValue < min) {
      showNotification("error", `Value must be at least ${min}`);
      updatePendingSetting(key, min as any);
      return;
    }
    if (numValue > max) {
      showNotification("error", `Value must be at most ${max}`);
      updatePendingSetting(key, max as any);
      return;
    }
    updatePendingSetting(key, numValue as any);
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

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <Card className="rounded-md card">
        <CardContent className="space-y-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="minWordLength">Minimum word length</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustNumber("minWordLength", -1, 1, 10)}
                  disabled={pendingSettings.minWordLength <= 1}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="minWordLength"
                  type="number"
                  min="1"
                  max="10"
                  value={pendingSettings.minWordLength}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") return;
                    const numValue = parseInt(value);
                    if (!isNaN(numValue)) {
                      updatePendingSetting("minWordLength", numValue);
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (!value) {
                      updatePendingSetting("minWordLength", 1);
                      return;
                    }
                    const numValue = parseInt(value);
                    if (isNaN(numValue) || numValue < 1) {
                      updatePendingSetting("minWordLength", 1);
                    } else if (numValue > 10) {
                      updatePendingSetting("minWordLength", 10);
                    }
                  }}
                  className="text-center max-w-20"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustNumber("minWordLength", 1, 1, 10)}
                  disabled={pendingSettings.minWordLength >= 10}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Words shorter than this won't trigger suggestions
              </p>
            </div>

            <div className="space-y-2 max-w-xs">
              <Label htmlFor="maxSuggestions">Maximum suggestions</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustNumber("maxSuggestions", -4, 1, 100)}
                  disabled={pendingSettings.maxSuggestions <= 1}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="maxSuggestions"
                  type="number"
                  min="1"
                  max="100"
                  step="4"
                  value={pendingSettings.maxSuggestions}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") return; // Allow empty for editing
                    const numValue = parseInt(value);
                    if (!isNaN(numValue)) {
                      updatePendingSetting("maxSuggestions", numValue);
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (!value) {
                      updatePendingSetting("maxSuggestions", 1);
                      return;
                    }
                    const numValue = parseInt(value);
                    if (isNaN(numValue) || numValue < 1) {
                      updatePendingSetting("maxSuggestions", 1);
                    } else if (numValue > 100) {
                      updatePendingSetting("maxSuggestions", 100);
                    }
                  }}
                  className="text-center max-w-20"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustNumber("maxSuggestions", 4, 1, 100)}
                  disabled={pendingSettings.maxSuggestions >= 100}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Maximum number of suggestions to show
              </p>
            </div>

            <div className="space-y-2 max-w-xs">
              <Label htmlFor="debounceTime">Response delay (ms)</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustNumber("debounceTime", -50, 0, 1000)}
                  disabled={pendingSettings.debounceTime <= 0}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="debounceTime"
                  type="number"
                  min="0"
                  max="1000"
                  step="50"
                  value={pendingSettings.debounceTime}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") return; // Allow empty for editing
                    const numValue = parseInt(value);
                    if (!isNaN(numValue)) {
                      updatePendingSetting("debounceTime", numValue);
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (!value) {
                      updatePendingSetting("debounceTime", 0);
                      return;
                    }
                    const numValue = parseInt(value);
                    if (isNaN(numValue) || numValue < 0) {
                      updatePendingSetting("debounceTime", 0);
                    } else if (numValue > 1000) {
                      updatePendingSetting("debounceTime", 1000);
                    }
                  }}
                  className="text-center max-w-20"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustNumber("debounceTime", 50, 0, 1000)}
                  disabled={pendingSettings.debounceTime >= 1000}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Delay before showing suggestions while typing
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Number selection</Label>
                <p className="text-sm text-muted-foreground">
                  Use number keys to select suggestions
                </p>
              </div>
              <Switch
                checked={pendingSettings.numberSelection}
                onCheckedChange={(checked) =>
                  updatePendingSetting("numberSelection", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Show ranking override</Label>
                <p className="text-sm text-muted-foreground">
                  Display ranking numbers in suggestion list
                </p>
              </div>
              <Switch
                checked={pendingSettings.showRankingOverride}
                onCheckedChange={(checked) =>
                  updatePendingSetting("showRankingOverride", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Compact mode</Label>
                <p className="text-sm text-muted-foreground">
                  Reduce spacing and padding in suggestions
                </p>
              </div>
              <Switch
                checked={pendingSettings.compactMode}
                onCheckedChange={(checked) =>
                  updatePendingSetting("compactMode", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Ghost text</Label>
                <p className="text-sm text-muted-foreground">
                  Show preview text inline with typing
                </p>
              </div>
              <Switch
                checked={pendingSettings.ghostTextEnabled}
                onCheckedChange={(checked) =>
                  updatePendingSetting("ghostTextEnabled", checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderBehaviorSettings = () => (
    <div className="space-y-6">
      <Card className="rounded-md card">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Abbreviations</Label>
                <p className="text-sm text-muted-foreground">
                  Enable expansion of common abbreviations
                </p>
              </div>
              <Switch
                checked={pendingSettings.abbreviationsEnabled}
                onCheckedChange={(checked) =>
                  updatePendingSetting("abbreviationsEnabled", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Auto insertion</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically insert suggestions when typing
                </p>
              </div>
              <Switch
                checked={pendingSettings.autoInsertion}
                onCheckedChange={(checked) =>
                  updatePendingSetting("autoInsertion", checked)
                }
              />
            </div>

            {pendingSettings.autoInsertion && (
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="autoInsertionCommitMode">Commit mode</Label>
                <Select
                  value={pendingSettings.autoInsertionCommitMode}
                  onValueChange={(value: "space-commits" | "enter-only") =>
                    updatePendingSetting("autoInsertionCommitMode", value)
                  }
                >
                  <SelectTrigger id="autoInsertionCommitMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="space-commits">Space commits</SelectItem>
                    <SelectItem value="enter-only">Enter only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  How to confirm auto-inserted suggestions
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Smart backspace</Label>
                <p className="text-sm text-muted-foreground">
                  Intelligently handle backspace in suggestions
                </p>
              </div>
              <Switch
                checked={pendingSettings.smartBackspace}
                onCheckedChange={(checked) =>
                  updatePendingSetting("smartBackspace", checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <Card className="rounded-md card">
        <CardContent className="space-y-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="fontSize">Font size (px)</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustNumber("fontSize", -1, 8, 32)}
                  disabled={pendingSettings.fontSize <= 8}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="fontSize"
                  type="number"
                  min="8"
                  max="32"
                  value={pendingSettings.fontSize}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || value === "0") return;
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 8 && numValue <= 32) {
                      updatePendingSetting("fontSize", numValue);
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (!value || value === "0") {
                      updatePendingSetting("fontSize", 8);
                      return;
                    }
                    const numValue = parseInt(value);
                    if (isNaN(numValue) || numValue < 8) {
                      updatePendingSetting("fontSize", 8);
                    } else if (numValue > 32) {
                      updatePendingSetting("fontSize", 32);
                    }
                  }}
                  className="text-center max-w-20"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustNumber("fontSize", 1, 8, 32)}
                  disabled={pendingSettings.fontSize >= 32}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Size of text in suggestions
              </p>
            </div>

            <div className="space-y-2 max-w-xs">
              <Label htmlFor="fontWeight">Font weight</Label>
              <Select
                value={pendingSettings.fontWeight}
                onValueChange={(value: WordServeSettings["fontWeight"]) =>
                  updatePendingSetting("fontWeight", value)
                }
              >
                <SelectTrigger id="fontWeight">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thin">Thin</SelectItem>
                  <SelectItem value="extralight">Extra Light</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="semibold">Semi Bold</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="extrabold">Extra Bold</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Weight of text in suggestions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAccessibilitySettings = () => (
    <div className="space-y-6">
      <Card className="rounded-md card">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Bold suffix</Label>
                <p className="text-sm text-muted-foreground">
                  Make the completion part of suggestions bold
                </p>
              </div>
              <Switch
                checked={pendingSettings.accessibility.boldSuffix}
                onCheckedChange={(checked) =>
                  updatePendingAccessibilitySetting("boldSuffix", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Uppercase suggestions</Label>
                <p className="text-sm text-muted-foreground">
                  Convert all suggestions to uppercase
                </p>
              </div>
              <Switch
                checked={pendingSettings.accessibility.uppercaseSuggestions}
                onCheckedChange={(checked) =>
                  updatePendingAccessibilitySetting(
                    "uppercaseSuggestions",
                    checked
                  )
                }
              />
            </div>

            <div className="space-y-2 max-w-xs">
              <Label htmlFor="prefixColorIntensity">
                Prefix color intensity
              </Label>
              <Select
                value={pendingSettings.accessibility.prefixColorIntensity}
                onValueChange={(
                  value: "normal" | "muted" | "faint" | "accent"
                ) =>
                  updatePendingAccessibilitySetting(
                    "prefixColorIntensity",
                    value
                  )
                }
              >
                <SelectTrigger id="prefixColorIntensity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="muted">Muted</SelectItem>
                  <SelectItem value="faint">Faint</SelectItem>
                  <SelectItem value="accent">Accent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 max-w-xs">
              <Label htmlFor="ghostTextColorIntensity">
                Ghost text color intensity
              </Label>
              <Select
                value={pendingSettings.accessibility.ghostTextColorIntensity}
                onValueChange={(
                  value: "normal" | "muted" | "faint" | "accent"
                ) =>
                  updatePendingAccessibilitySetting(
                    "ghostTextColorIntensity",
                    value
                  )
                }
              >
                <SelectTrigger id="ghostTextColorIntensity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="muted">Muted</SelectItem>
                  <SelectItem value="faint">Faint</SelectItem>
                  <SelectItem value="accent">Accent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 max-w-xs">
              <Label htmlFor="customColor">Custom color (optional)</Label>
              <Input
                id="customColor"
                type="color"
                value={pendingSettings.accessibility.customColor || "#000000"}
                onChange={(e) =>
                  updatePendingAccessibilitySetting(
                    "customColor",
                    e.target.value
                  )
                }
                className="h-10"
              />
            </div>

            <div className="space-y-2 max-w-xs">
              <Label htmlFor="customFontFamily">
                Custom font family (optional)
              </Label>
              <Input
                id="customFontFamily"
                type="text"
                placeholder="e.g., Arial, sans-serif"
                value={pendingSettings.accessibility.customFontFamily || ""}
                onChange={(e) =>
                  updatePendingAccessibilitySetting(
                    "customFontFamily",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="space-y-2 max-w-xs">
              <Label htmlFor="customFontSize">
                Custom font size (optional)
              </Label>
              <Input
                id="customFontSize"
                type="number"
                min="8"
                max="32"
                placeholder="14"
                value={pendingSettings.accessibility.customFontSize || ""}
                onChange={(e) =>
                  updatePendingAccessibilitySetting(
                    "customFontSize",
                    e.target.value ? Number.parseInt(e.target.value) : undefined
                  )
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDomainSettings = () => (
    <div className="space-y-6">
      <Card className="rounded-md card">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Domain filtering mode</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, WordServe works on all sites except blacklisted
                  ones
                </p>
              </div>
              <Switch
                checked={pendingSettings.domains.blacklistMode}
                onCheckedChange={(checked) =>
                  updatePendingDomainSetting("blacklistMode", checked)
                }
              />
            </div>

            {!pendingSettings.domains.blacklistMode && (
              <div className="flex items-start gap-3 p-4 bg-blue-50/10 border border-blue-500/20 rounded-md">
                <Shield className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">
                    Whitelist mode active
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    WordServe will only work on domains you explicitly allow.
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Input
                placeholder="Enter domain (e.g., *.example.com, secure.*, exact.domain.com)"
                value={newDomainInput}
                onChange={(e) => setNewDomainInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDomain(
                      pendingSettings.domains.blacklistMode
                        ? "blacklist"
                        : "whitelist"
                    );
                  }
                }}
                className="max-w-md"
              />
              <Button
                onClick={() =>
                  addDomain(
                    pendingSettings.domains.blacklistMode
                      ? "blacklist"
                      : "whitelist"
                  )
                }
                disabled={!newDomainInput.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    {pendingSettings.domains.blacklistMode
                      ? "Blacklisted domains"
                      : "Whitelisted domains"}
                  </h4>
                  <Badge variant="secondary">
                    {pendingSettings.domains.blacklistMode
                      ? pendingSettings.domains.blacklist.length
                      : pendingSettings.domains.whitelist.length}{" "}
                    domains
                  </Badge>
                </div>

                <div className="max-h-60 overflow-y-auto border rounded-md p-3 bg-muted/50">
                  {(pendingSettings.domains.blacklistMode
                    ? pendingSettings.domains.blacklist
                    : pendingSettings.domains.whitelist
                  ).length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No domains{" "}
                      {pendingSettings.domains.blacklistMode
                        ? "blacklisted"
                        : "whitelisted"}{" "}
                      yet
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(pendingSettings.domains.blacklistMode
                        ? pendingSettings.domains.blacklist
                        : pendingSettings.domains.whitelist
                      ).map((domain) => (
                        <Badge
                          key={domain}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {domain}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 ml-1"
                            onClick={() =>
                              removeDomain(
                                pendingSettings.domains.blacklistMode
                                  ? "blacklist"
                                  : "whitelist",
                                domain
                              )
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <strong>Pattern examples:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>
                      <code>*.paypal.com</code> - matches all paypal.com
                      subdomains
                    </li>
                    <li>
                      <code>*payment*</code> - matches any domain containing
                      "payment"
                    </li>
                    <li>
                      <code>secure.*</code> - matches any domain starting with
                      "secure."
                    </li>
                    <li>
                      <code>exact.domain.com</code> - matches only this exact
                      domain
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "general":
        return renderGeneralSettings();
      case "behavior":
        return renderBehaviorSettings();
      case "appearance":
        return renderAppearanceSettings();
      case "accessibility":
        return renderAccessibilitySettings();
      case "domains":
        return renderDomainSettings();
      default:
        return renderGeneralSettings();
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
      <Toaster />
    </>
  );
}
