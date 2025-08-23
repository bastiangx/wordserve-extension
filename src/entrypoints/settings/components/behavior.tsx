import React from "react";
import { Badge } from "@/components/ui/badge";
import { CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
                <Label>
                  Abbreviations
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
                          Abbrv. are shortcut words that expand into longer
                          phrases.
                        </p>
                        <Separator className="my-2 bg-slate-500" />
                        <p>Example: "brb" expands to "be right back".</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <p className="font-mono text-xs text-muted-foreground">
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
                <Label>
                  Abbrv. insert mode
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
                          When automatic, abbr. are expanded as soon as you
                          finish typing them (case sensitive)
                        </p>
                        <Separator className="my-2 bg-slate-500" />
                        <p>
                          Otherwise, abbr. are <b>only</b> expanded when you
                          press the space bar after typing them.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Label className="text-xs font-mono text-muted-foreground">
                  How abbreviations are inserted
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
                  <SelectItem value="immediate">Automatic</SelectItem>
                  <SelectItem value="space">via Space key</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label>Smart backspace</Label>
                <p className="text-xs font-mono text-muted-foreground lg:max-w-[65ch] max-w-[45ch]">
                  Restores original text when backspacing over an inserted
                  word
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
