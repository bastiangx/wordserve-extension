import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus } from "lucide-react";
import type { DefaultConfig } from "@/types";

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
      <Card className="rounded-md card">
        <CardContent className="space-y-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="fontSize">Font size [px]</Label>
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
                  onClick={() => adjustNumber("fontSize", 1, 8, 32)}
                  disabled={
                    typeof pendingSettings.fontSize === "number" &&
                    pendingSettings.fontSize >= 32
                  }
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
                onValueChange={(value: DefaultConfig["fontWeight"]) =>
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

          <Separator />

          <div className="space-y-4">
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
                <Label>Ranking position</Label>
                <p className="text-sm text-muted-foreground">
                  Position of ranking numbers in suggestion menu
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
              <div className="space-y-1">
                <Label>Menu border</Label>
                <p className="text-sm text-muted-foreground">
                  Show border around suggestion menu
                </p>
              </div>
              <Switch
                checked={pendingSettings.menuBorder}
                onCheckedChange={(checked) =>
                  updatePendingSetting("menuBorder", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Rounded borders</Label>
                <p className="text-sm text-muted-foreground">
                  Use rounded corners for the suggestion menu
                </p>
              </div>
              <Switch
                checked={pendingSettings.menuBorderRadius}
                onCheckedChange={(checked) =>
                  updatePendingSetting("menuBorderRadius", checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
