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
import type { WordServeSettings } from "@/types";

export interface AccessibilitySettingsProps {
  pendingSettings: WordServeSettings["accessibility"];
  updatePendingAccessibilitySetting: (
    key: keyof WordServeSettings["accessibility"],
    value: any
  ) => void;
}

export function AccessibilitySettings({
  pendingSettings,
  updatePendingAccessibilitySetting,
}: AccessibilitySettingsProps) {
  return (
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
                checked={pendingSettings.boldSuffix}
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
                checked={pendingSettings.uppercaseSuggestions}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
