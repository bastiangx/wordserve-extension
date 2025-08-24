import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { DefaultConfig } from "@/types";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CircleHelp } from "lucide-react";

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
        <CardContent className="space-y-2 p-2">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label>
                  Bold suffix
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          asChild
                          variant="outline"
                          className="border-transparent"
                        >
                          <button type="button" aria-label="What is suffix?">
                            <CircleHelp className="size-6 sm:size-7" />
                          </button>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-xs whitespace-normal break-words"
                      >
                        <p>
                          Suffixes are the last few letters of a word that you
                          want to retrieve as suggestions.
                        </p>
                        <Separator className="my-2 bg-slate-500" />
                        <p>
                          If you type "ame", the suggested suffxies could be
                          "rican", "rica", "ndment", etc.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
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
                <Label>
                  Bold prefix
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          asChild
                          variant="outline"
                          className="border-transparent"
                        >
                          <button type="button" aria-label="What is suffix?">
                            <CircleHelp className="size-6 sm:size-7" />
                          </button>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-xs whitespace-normal break-words"
                      >
                        <p>
                          Prefixes are the first few letters of a word that you
                          type.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
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
