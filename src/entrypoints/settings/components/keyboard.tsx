import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { DefaultConfig } from "@/types";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { parseChordString, formatChords } from "@/lib/input/kbd";
import { Button } from "@/components/ui/button";
import { browser } from "wxt/browser";
import { Globe } from "lucide-react";

export interface KeyboardSettingsProps {
  pendingSettings: DefaultConfig;
  updatePendingSetting: (key: keyof DefaultConfig, value: any) => void;
}

export function KeyboardSettings({
  pendingSettings,
  updatePendingSetting,
}: KeyboardSettingsProps) {
  const applyChordInput = (
    field:
      | "insertWithoutSpace"
      | "insertWithSpace"
      | "navUp"
      | "navDown"
      | "closeMenu"
      | "openSettings"
      | "toggleGlobal",
    raw: string
  ) => {
    const chords = parseChordString(raw);
    const next = {
      ...pendingSettings.keyBindings,
      [field]: chords,
    } as DefaultConfig["keyBindings"];
    updatePendingSetting("keyBindings", next as any);
  };
  return (
    <div className="space-y-4">
      <Card className="border-transparent">
        <CardContent className="space-y-4 p-2">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label className="text-base">Manage browser shortcuts</Label>
                <p className="text-xs font-mono text-muted-foreground">
                  Edit global commands
                </p>
              </div>
              <Button
                className="font-mono"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  try {
                    await browser.runtime.sendMessage({
                      type: "wordserve-open-shortcuts-manager",
                    });
                  } catch {}
                }}
              >
                <Globe className="h-4 w-4 mr-2" /> Open manager
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label className="text-base">Digit selection</Label>
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

            <div className="space-y-4">
              <Separator />
              <div className="rounded-md border bg-muted/15 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="text-xs font-mono" variant="secondary">
                    FAQ
                  </Badge>
                  <span className="font-bold text-base">
                    How do I change the keybinds
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-loose">
                  Type sequences like <code>cmd+shift+k</code> or{" "}
                  <code>alt+comma</code> <br />
                  To assign multiple keys or combos for an action, separate with
                  commas: <code>escape, cmd+semicolon</code>
                  <br />
                  <i>Whitespace is ignored.</i>
                </p>
                <Separator className="bg-slate-500" />
                <ul className="list-disc list-inside space-y-1 text-sm leading-loose text-muted-foreground">
                  <li>
                    <b>Modifiers:</b> <code>cmd</code>, <code>alt</code>,{" "}
                    <code>ctrl</code>, <code>shift</code>
                  </li>
                  <li>
                    <b>Letters:</b> <code>a–z</code>
                  </li>
                  <li>
                    <b>Digits:</b> <code>0–9</code> (if digit selection is OFF)
                  </li>
                  <li>
                    <b>Arrows:</b> <code>left</code>, <code>down</code>,{" "}
                    <code>up</code>, <code>right</code>
                  </li>
                  <li>
                    <b>Fn keys:</b> <code>f1–f20</code>
                  </li>
                  <li>
                    <b>Special keys:</b> <code>enter</code>, <code>tab</code>,{" "}
                    <code>space</code>, <code>escape</code>,{" "}
                    <code>backspace</code>, <code>pageUp</code>,{" "}
                    <code>pageDown</code>, <code>home</code>, <code>end</code>,{" "}
                    <code>forwardDelete</code>
                  </li>
                  <li>
                    <b>Punctuation</b>: <code>comma</code>, <code>period</code>,{" "}
                    <code>minus</code>, <code>equal</code>, <code>slash</code>,{" "}
                    <code>backslash</code>, <code>quote</code>,{" "}
                    <code>semicolon</code>, <code>backtick</code>,{" "}
                    <code>leftSquareBracket</code>,{" "}
                    <code>rightSquareBracket</code>
                  </li>
                  <li>
                    <b>Keypad</b>: <code>keypad0-keypad9</code>
                  </li>
                  <li>
                    <b>Keypad specials:</b> <code>keypadEnter</code>,{" "}
                    <code>keypadDivide</code>, <code>keypadMultiply</code>,{" "}
                    <code>keypadSubtract</code>, <code>keypadAdd</code>,{" "}
                    <code>keypadDecimal</code>, <code>keypadEqual</code>,{" "}
                    <code>keypadClear</code>
                  </li>
                </ul>
                <Separator className="bg-slate-500 mb-8" />
                <div className="text-sm text-muted-foreground leading-relaxed">
                  <b>Note</b>: If Digit selection is ON, plain numbers{" "}
                  <code className="text-muted-foreground">1–9</code> will be
                  reserved for quick insert and can’t be used here, unless you
                  turn digit selection OFF (or use combos like{" "}
                  <code className="text-muted-foreground">ctrl+1</code> or{" "}
                  <code className="text-muted-foreground">cmd+5)</code>
                </div>
              </div>
              {(
                [
                  ["insertWithoutSpace", "Insert without space", "enter"],
                  ["insertWithSpace", "Insert with space", "tab"],
                  ["navUp", "Menu [move Up]", "up"],
                  ["navDown", "Menu [move Down]", "down"],
                  ["closeMenu", "Close menu", "escape"],
                  ["openSettings", "Open WordServe's settings", "cmd+comma"],
                ] as const
              ).map(([field, label, placeholder]) => (
                <div
                  key={field}
                  className="flex items-center justify-between gap-4"
                >
                  <Label className="text-base flex-1">{label}</Label>
                  <Input
                    className="font-mono w-80"
                    spellCheck={false}
                    placeholder={String(placeholder)}
                    defaultValue={formatChords(
                      (pendingSettings.keyBindings as any)[field]
                    )}
                    onBlur={(e) => applyChordInput(field, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
