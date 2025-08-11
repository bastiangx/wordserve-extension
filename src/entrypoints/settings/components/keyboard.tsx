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

export interface KeyboardSettingsProps {
  pendingSettings: WordServeSettings;
  updatePendingSetting: (key: keyof WordServeSettings, value: any) => void;
}

export function KeyboardSettings({
  pendingSettings,
  updatePendingSetting,
}: KeyboardSettingsProps) {
  return (
    <div className="space-y-6">
      <Card className="rounded-md card">
        <CardContent className="space-y-6 p-6">
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

            <div className="space-y-4">
              <h3 className="font-medium">Keyboard bindings</h3>

              <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                <div className="space-y-2">
                  <Label>Insert without space</Label>
                  <div className="flex gap-2">
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
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="ctrl">Ctrl</SelectItem>
                        <SelectItem value="cmd">Cmd</SelectItem>
                        <SelectItem value="alt">Alt</SelectItem>
                        <SelectItem value="shift">Shift</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <p className="text-sm text-muted-foreground">
                    Key combination to insert suggestion without adding a space
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Insert with space</Label>
                  <div className="flex gap-2">
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
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="ctrl">Ctrl</SelectItem>
                        <SelectItem value="cmd">Cmd</SelectItem>
                        <SelectItem value="alt">Alt</SelectItem>
                        <SelectItem value="shift">Shift</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <p className="text-sm text-muted-foreground">
                    Key combination to insert suggestion and add a space
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
