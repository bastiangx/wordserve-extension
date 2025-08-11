import React from 'react';
import {Card, CardContent} from "@/components/ui/card";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";
import type {WordServeSettings} from "@/types";

export interface BehaviorSettingsProps {
  pendingSettings: WordServeSettings;
  updatePendingSetting: (key: keyof WordServeSettings, value: any) => void;
}

export function BehaviorSettings({ pendingSettings, updatePendingSetting }: BehaviorSettingsProps) {
  return (
    <div className="space-y-6">
      <Card className="rounded-md card">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Abbreviations</Label>
                <p className="text-sm text-muted-foreground">Enable expansion of common abbreviations</p>
              </div>
              <Switch
                checked={pendingSettings.abbreviationsEnabled}
                onCheckedChange={(checked) => updatePendingSetting("abbreviationsEnabled", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Auto insertion</Label>
                <p className="text-sm text-muted-foreground">Automatically insert suggestions when typing</p>
              </div>
              <Switch
                checked={pendingSettings.autoInsertion}
                onCheckedChange={(checked) => updatePendingSetting("autoInsertion", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Smart backspace</Label>
                <p className="text-sm text-muted-foreground">Intelligently handle backspace in suggestions</p>
              </div>
              <Switch
                checked={pendingSettings.smartBackspace}
                onCheckedChange={(checked) => updatePendingSetting("smartBackspace", checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
