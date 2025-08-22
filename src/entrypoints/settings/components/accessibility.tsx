import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DefaultConfig } from "@/types";
import { Separator } from "@/components/ui/separator";

export interface AccessibilitySettingsProps {
  pendingSettings: DefaultConfig["accessibility"];
  updatePendingAccessibilitySetting: (
    key: keyof DefaultConfig["accessibility"],
    value: any
  ) => void;
}

export function AccessibilitySettings({
  pendingSettings,
  updatePendingAccessibilitySetting,
}: AccessibilitySettingsProps) {
  return (
    <div className="space-y-2">
      <Card className="border-transparent">
        <CardContent className="space-y-2 p-4">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label>Bold suffix</Label>
              </div>
              <Switch
                checked={pendingSettings.boldSuffix}
                onCheckedChange={(checked) =>
                  updatePendingAccessibilitySetting("boldSuffix", checked)
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Uppercase letters</Label>
              </div>
              <Switch
                checked={pendingSettings.uppercaseSuggestions}
                onCheckedChange={(checked) =>
                  updatePendingAccessibilitySetting(
                    "uppercaseSuggestions",
                    checked
                  )
                }
              />
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <Label htmlFor="prefixColorIntensity">Prefix color intensity</Label>
              </div>
              <Select
                value={pendingSettings.prefixColorIntensity}
                onValueChange={(
                  value: "normal" | "muted" | "faint" | "accent"
                ) =>
                  updatePendingAccessibilitySetting(
                    "prefixColorIntensity",
                    value
                  )
                }
              >
                <SelectTrigger id="prefixColorIntensity" className="w-32">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
