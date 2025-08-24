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

export interface KeyboardSettingsProps {
  pendingSettings: DefaultConfig;
  updatePendingSetting: (key: keyof DefaultConfig, value: any) => void;
}

export function KeyboardSettings({
  pendingSettings,
  updatePendingSetting,
}: KeyboardSettingsProps) {
  return (
    <div className="space-y-4">
      <Card className="border-transparent">
        <CardContent className="space-y-4 p-2">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label>Digit selection</Label>
                <p className="text-xs font-mono text-muted-foreground">
                  Use [1-9] keys to insert a word quickly
                </p>
              </div>
              <Switch
                checked={pendingSettings.numberSelection}
                onCheckedChange={(checked) =>
                  updatePendingSetting("numberSelection", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <Label>Insert without space</Label>
              </div>
              <div className="flex gap-2 font-mono">
                <Select
                  value={
                    pendingSettings.keyBindings.insertWithoutSpace
                      .modifiers[0] || "none"
                  }
                  onValueChange={(value) =>
                    updatePendingSetting("keyBindings", {
                      ...pendingSettings.keyBindings,
                      insertWithoutSpace: {
                        ...pendingSettings.keyBindings.insertWithoutSpace,
                        modifiers: value === "none" ? [] : [value],
                      },
                    })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="font-mono">
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="ctrl">Ctrl</SelectItem>
                    <SelectItem value="cmd">Cmd</SelectItem>
                    <SelectItem value="alt">Alt</SelectItem>
                    <SelectItem value="shift">Shift</SelectItem>
                  </SelectContent>
                </Select>
                <Label>+</Label>
                <Select
                  value={pendingSettings.keyBindings.insertWithoutSpace.key}
                  onValueChange={(value: "enter" | "tab" | "space") =>
                    updatePendingSetting("keyBindings", {
                      ...pendingSettings.keyBindings,
                      insertWithoutSpace: {
                        ...pendingSettings.keyBindings.insertWithoutSpace,
                        key: value,
                      },
                    })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enter">Enter</SelectItem>
                    <SelectItem value="tab">Tab</SelectItem>
                    <SelectItem value="space">Space</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <Label>Insert with space</Label>
              </div>
              <div className="flex gap-2 font-mono">
                <Select
                  value={
                    pendingSettings.keyBindings.insertWithSpace
                      .modifiers[0] || "none"
                  }
                  onValueChange={(value) =>
                    updatePendingSetting("keyBindings", {
                      ...pendingSettings.keyBindings,
                      insertWithSpace: {
                        ...pendingSettings.keyBindings.insertWithSpace,
                        modifiers: value === "none" ? [] : [value],
                      },
                    })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="font-mono">
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="ctrl">Ctrl</SelectItem>
                    <SelectItem value="cmd">Cmd</SelectItem>
                    <SelectItem value="alt">Alt</SelectItem>
                    <SelectItem value="shift">Shift</SelectItem>
                  </SelectContent>
                </Select>
                <Label>+</Label>
                <Select
                  value={pendingSettings.keyBindings.insertWithSpace.key}
                  onValueChange={(value: "enter" | "tab" | "space") =>
                    updatePendingSetting("keyBindings", {
                      ...pendingSettings.keyBindings,
                      insertWithSpace: {
                        ...pendingSettings.keyBindings.insertWithSpace,
                        key: value,
                      },
                    })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enter">Enter</SelectItem>
                    <SelectItem value="tab">Tab</SelectItem>
                    <SelectItem value="space">Space</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
