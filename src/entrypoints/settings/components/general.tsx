import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";
import type { WordServeSettings } from "@/types";

export interface GeneralSettingsProps {
  pendingSettings: WordServeSettings;
  updatePendingSetting: (key: keyof WordServeSettings, value: any) => void;
  adjustNumber: (
    key: keyof WordServeSettings,
    delta: number,
    min: number,
    max: number
  ) => void;
}

export function GeneralSettings({
  pendingSettings,
  updatePendingSetting,
  adjustNumber,
}: GeneralSettingsProps) {
  return (
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
                    if (value === "") return;
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
                    if (value === "") return;
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
        </CardContent>
      </Card>
    </div>
  );
}
