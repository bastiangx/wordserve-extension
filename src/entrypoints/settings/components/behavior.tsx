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

export interface BehaviorSettingsProps {
  pendingSettings: DefaultConfig;
  updatePendingSetting: (key: keyof DefaultConfig, value: any) => void;
}

export function BehaviorSettings({
  pendingSettings,
  updatePendingSetting,
}: BehaviorSettingsProps) {
  return (
    <div className="space-y-6">
      <Card className="border-transparent">
        <CardContent className="space-y-2 p-2">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label>Abbreviations</Label>
                <p className="text-sm text-muted-foreground">
                  Custom shortcut words (cAsE SensItiVe)
                </p>
              </div>
              <Switch
                checked={pendingSettings.abbreviationsEnabled}
                onCheckedChange={(checked) =>
                  updatePendingSetting("abbreviationsEnabled", checked)
                }
              />
            </div>
            <div className="flex justify-between">
              <div className="space-y-2">
                <Label>Abbrv. insert mode</Label>
                <Label className="text-sm text-muted-foreground">
                  How abbreviations are inserted
                </Label>
                <div className="h-1" />
                <Label className="text-sm text-muted-foreground">
                  Immediate: Inserts as soon as shortcut is typed.
                </Label>
                <Label className="text-sm text-muted-foreground">
                  Space: insert only upon pressing [space] key.
                </Label>
              </div>
              <Select
                value={pendingSettings.abbreviationInsertMode}
                onValueChange={(val) =>
                  updatePendingSetting("abbreviationInsertMode", val)
                }
              >
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="space">On space (shows hint)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label>Smart backspace</Label>
                <p className="text-sm text-muted-foreground">
                  Restores original text when backspacing over an inserted
                  suggestion
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
}
