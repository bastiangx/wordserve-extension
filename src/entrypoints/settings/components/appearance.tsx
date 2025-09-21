import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus } from "lucide-react";
import type { DefaultConfig } from "@/types";
import { DARK_THEMES, LIGHT_THEMES, type ThemeId } from "@/lib/render/themes";

export interface AppearanceSettingsProps {
  pendingSettings: DefaultConfig;
  updatePendingSetting: (key: keyof DefaultConfig, value: any) => void;
  adjustNumber: (
    key: keyof DefaultConfig,
    delta: number,
    min: number,
    max: number
  ) => void;
}

export function AppearanceSettings({
  pendingSettings,
  updatePendingSetting,
  adjustNumber,
}: AppearanceSettingsProps) {
  const [inputValues, setInputValues] = useState({
    fontSize:
      typeof pendingSettings.fontSize === "number"
        ? pendingSettings.fontSize.toString()
        : pendingSettings.fontSize.toString(),
  });

  // Update input values when pendingSettings changes (from buttons or external updates)
  useEffect(() => {
    setInputValues({
      fontSize:
        typeof pendingSettings.fontSize === "number"
          ? pendingSettings.fontSize.toString()
          : pendingSettings.fontSize.toString(),
    });
  }, [pendingSettings.fontSize]);

  const validateAndUpdateSetting = (
    key: keyof DefaultConfig,
    value: string,
    min: number,
    max: number,
    defaultValue: number
  ) => {
    if (!value || value.trim() === "") {
      updatePendingSetting(key, defaultValue);
      return;
    }
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < min) {
      updatePendingSetting(key, min);
    } else if (numValue > max) {
      updatePendingSetting(key, max);
    } else {
      updatePendingSetting(key, numValue);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-transparent">
        <CardContent className="space-y-6 p-2">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <Label className="text-base" htmlFor="theme">
                  Theme
                </Label>
              </div>
              <Select
                value={(pendingSettings.theme as ThemeId) ?? "dark"}
                onValueChange={(value: ThemeId) =>
                  updatePendingSetting("theme", value)
                }
              >
                <SelectTrigger id="theme" className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Dark</SelectLabel>
                    {DARK_THEMES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Light</SelectLabel>
                    {LIGHT_THEMES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Font family */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Text font</Label>
                <Select
                  value={
                    (pendingSettings.fontFamilyList?.[0] as any) ||
                    "JetBrains Mono"
                  }
                  onValueChange={(value: string) => {
                    updatePendingSetting("fontFamilyList", [value]);
                  }}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JetBrains Mono">
                      JetBrains mono
                    </SelectItem>
                    <SelectItem value="Atkinson Hyperlegible">
                      Atkinson hyperlegible
                    </SelectItem>
                    <SelectItem value="OpenDyslexic">OpenDyslexic</SelectItem>
                    <SelectItem value="Monaco">Monaco</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-2">
                  <Label className="text-base" htmlFor="customFontList">
                    Use local font
                  </Label>
                  <p className="text-xs font-mono text-muted-foreground max-w-[28ch]">
                    Has to be installed on your system
                  </p>
                </div>
                <Input
                  id="customFontList"
                  placeholder="'Moranga', 'Inter', sans-serif"
                  value={pendingSettings.customFontList || ""}
                  onChange={(e) =>
                    updatePendingSetting("customFontList", e.target.value)
                  }
                  className="max-w-xs flex-1"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <Label className="text-base" htmlFor="fontSize">
                  Font size [px]
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustNumber("fontSize", -1, 8, 32)}
                  disabled={
                    typeof pendingSettings.fontSize === "number" &&
                    pendingSettings.fontSize <= 8
                  }
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="fontSize"
                  type="number"
                  min="8"
                  max="32"
                  value={inputValues.fontSize}
                  onChange={(e) => {
                    setInputValues((prev) => ({
                      ...prev,
                      fontSize: e.target.value,
                    }));
                  }}
                  onBlur={(e) => {
                    validateAndUpdateSetting(
                      "fontSize",
                      e.target.value,
                      8,
                      32,
                      8
                    );
                  }}
                  className="text-center max-w-20"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => adjustNumber("fontSize", 1, 12, 28)}
                  disabled={
                    typeof pendingSettings.fontSize === "number" &&
                    pendingSettings.fontSize >= 32
                  }
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <Label className="text-base" htmlFor="fontWeight">
                  Font weight
                </Label>
              </div>
              <Select
                value={String(pendingSettings.fontWeight || 400)}
                onValueChange={(value: string) =>
                  updatePendingSetting("fontWeight", parseInt(value, 10))
                }
              >
                <SelectTrigger id="fontWeight" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100 – Thin</SelectItem>
                  <SelectItem value="200">200 – Extra Light</SelectItem>
                  <SelectItem value="300">300 – Light</SelectItem>
                  <SelectItem value="400">400 – Regular</SelectItem>
                  <SelectItem value="500">500 – Medium</SelectItem>
                  <SelectItem value="600">600 – Semi Bold</SelectItem>
                  <SelectItem value="700">700 – Bold</SelectItem>
                  <SelectItem value="800">800 – Extra Bold</SelectItem>
                  <SelectItem value="900">900 – Black</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label className="text-base">Italic font</Label>
              </div>
              <Switch
                checked={pendingSettings.fontItalic || false}
                onCheckedChange={(checked) =>
                  updatePendingSetting("fontItalic", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label className="text-base">Bold font</Label>
              </div>
              <Switch
                checked={pendingSettings.fontBold || false}
                onCheckedChange={(checked) =>
                  updatePendingSetting("fontBold", checked)
                }
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label className="text-base">Compact mode</Label>
                <p className="text-xs font-mono text-muted-foreground">
                  Reduces spacing and padding
                </p>
              </div>
              <Switch
                checked={pendingSettings.compactMode}
                onCheckedChange={(checked) =>
                  updatePendingSetting("compactMode", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label className="text-base">Ranking number position</Label>
                <p className="text-xs font-mono text-muted-foreground">
                  Relative to the suggestion texts
                </p>
              </div>
              <Select
                value={pendingSettings.rankingPosition}
                onValueChange={(value: "left" | "right") =>
                  updatePendingSetting("rankingPosition", value)
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label className="text-base">Ranking render override</Label>
                <p className="text-xs font-mono text-muted-foreground lg:max-w-[65ch] max-w-[45ch] ">
                  Always show rankings even when digit selection is off
                </p>
              </div>
              <Switch
                checked={pendingSettings.showRankingOverride}
                onCheckedChange={(checked) =>
                  updatePendingSetting("showRankingOverride", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Bordered menu</Label>
              </div>
              <Switch
                checked={pendingSettings.menuBorder}
                onCheckedChange={(checked) =>
                  updatePendingSetting("menuBorder", checked)
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Rounded corners</Label>
              </div>
              <Switch
                checked={pendingSettings.menuBorderRadius}
                onCheckedChange={(checked) =>
                  updatePendingSetting("menuBorderRadius", checked)
                }
              />
            </div>

            <Separator />

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-base">Prefix intensity</Label>
                <Select
                  value={pendingSettings.accessibility.prefixColorIntensity}
                  onValueChange={(
                    value: "normal" | "muted" | "faint" | "accent"
                  ) =>
                    updatePendingSetting("accessibility", {
                      ...pendingSettings.accessibility,
                      prefixColorIntensity: value,
                    })
                  }
                >
                  <SelectTrigger className="w-32">
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

              <div className="flex items-center justify-between">
                <Label className="text-base">Suffix intensity</Label>
                <Select
                  value={pendingSettings.accessibility.suffixColorIntensity}
                  onValueChange={(
                    value: "normal" | "muted" | "faint" | "accent"
                  ) =>
                    updatePendingSetting("accessibility", {
                      ...pendingSettings.accessibility,
                      suffixColorIntensity: value,
                    })
                  }
                >
                  <SelectTrigger className="w-32">
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

              <Separator />

              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <Label className="min-w-[120px] text-base">
                    Custom prefix color
                  </Label>
                  <Input
                    type="color"
                    value={
                      pendingSettings.accessibility.prefixColor || "#e0def4"
                    }
                    onChange={(e) =>
                      updatePendingSetting("accessibility", {
                        ...pendingSettings.accessibility,
                        prefixColor: e.target.value,
                      })
                    }
                    className="w-16 p-0 h-8"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updatePendingSetting("accessibility", {
                        ...pendingSettings.accessibility,
                        prefixColor: undefined,
                      })
                    }
                  >
                    Reset
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="min-w-[120px] text-base">
                    Custom suffix color
                  </Label>
                  <Input
                    type="color"
                    value={
                      pendingSettings.accessibility.suffixColor || "#a8a5c3"
                    }
                    onChange={(e) =>
                      updatePendingSetting("accessibility", {
                        ...pendingSettings.accessibility,
                        suffixColor: e.target.value,
                      })
                    }
                    className="w-16 p-0 h-8"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updatePendingSetting("accessibility", {
                        ...pendingSettings.accessibility,
                        suffixColor: undefined,
                      })
                    }
                  >
                    Reset
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="min-w-[120px] text-base">
                    Ranking text color
                  </Label>
                  <Input
                    type="color"
                    value={
                      pendingSettings.accessibility.rankingTextColor ||
                      "#6c7086"
                    }
                    onChange={(e) =>
                      updatePendingSetting("accessibility", {
                        ...pendingSettings.accessibility,
                        rankingTextColor: e.target.value,
                      })
                    }
                    className="w-16 p-0 h-8"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updatePendingSetting("accessibility", {
                        ...pendingSettings.accessibility,
                        rankingTextColor: undefined,
                      })
                    }
                  >
                    Reset
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="min-w-[120px] text-base">
                    Ranking border color
                  </Label>
                  <Input
                    type="color"
                    value={
                      pendingSettings.accessibility.rankingBorderColor ||
                      "#6c7086"
                    }
                    onChange={(e) =>
                      updatePendingSetting("accessibility", {
                        ...pendingSettings.accessibility,
                        rankingBorderColor: e.target.value,
                      })
                    }
                    className="w-16 p-0 h-8"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updatePendingSetting("accessibility", {
                        ...pendingSettings.accessibility,
                        rankingBorderColor: undefined,
                      })
                    }
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
