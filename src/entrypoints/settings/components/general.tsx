import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";
import type { DefaultConfig } from "@/types";

export interface GeneralSettingsProps {
  pendingSettings: DefaultConfig;
  updatePendingSetting: (key: keyof DefaultConfig, value: any) => void;
  adjustNumber: (
    key: keyof DefaultConfig,
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
  const [inputValues, setInputValues] = useState({
    minWordLength: pendingSettings.minWordLength.toString(),
    maxSuggestions: pendingSettings.maxSuggestions.toString(),
    debounceTime: pendingSettings.debounceTime.toString(),
  });

  // Update input values when pendingSettings changes (from buttons or external updates)
  useEffect(() => {
    setInputValues({
      minWordLength: pendingSettings.minWordLength.toString(),
      maxSuggestions: pendingSettings.maxSuggestions.toString(),
      debounceTime: pendingSettings.debounceTime.toString(),
    });
  }, [
    pendingSettings.minWordLength,
    pendingSettings.maxSuggestions,
    pendingSettings.debounceTime,
  ]);

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
                  value={inputValues.minWordLength}
                  onChange={(e) => {
                    setInputValues((prev) => ({
                      ...prev,
                      minWordLength: e.target.value,
                    }));
                  }}
                  onBlur={(e) => {
                    validateAndUpdateSetting(
                      "minWordLength",
                      e.target.value,
                      1,
                      10,
                      1
                    );
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
                  value={inputValues.maxSuggestions}
                  onChange={(e) => {
                    setInputValues((prev) => ({
                      ...prev,
                      maxSuggestions: e.target.value,
                    }));
                  }}
                  onBlur={(e) => {
                    validateAndUpdateSetting(
                      "maxSuggestions",
                      e.target.value,
                      1,
                      100,
                      1
                    );
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
                  value={inputValues.debounceTime}
                  onChange={(e) => {
                    setInputValues((prev) => ({
                      ...prev,
                      debounceTime: e.target.value,
                    }));
                  }}
                  onBlur={(e) => {
                    validateAndUpdateSetting(
                      "debounceTime",
                      e.target.value,
                      0,
                      1000,
                      0
                    );
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
