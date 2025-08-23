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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label>Bold prefix</Label>
              </div>
              <Switch
                checked={pendingSettings.boldPrefix}
                onCheckedChange={(checked) =>
                  updatePendingAccessibilitySetting("boldPrefix", checked)
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-2">
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

            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label>Dyslexic-friendly font</Label>
              </div>
              <Switch
                checked={pendingSettings.dyslexicFont || false}
                onCheckedChange={(checked) =>
                  updatePendingAccessibilitySetting("dyslexicFont", checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
