import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import type { DomainSettings } from "@/lib/domains";
import { Separator } from "@/components/ui/separator";

export interface DomainSettingsProps {
  pendingSettings: DomainSettings;
  updatePendingDomainSetting: <K extends keyof DomainSettings>(
    key: K,
    value: DomainSettings[K]
  ) => void;
}

export function DomainSettingsComponent({
  pendingSettings,
  updatePendingDomainSetting,
}: DomainSettingsProps) {
  const [newDomainInput, setNewDomainInput] = useState("");

  const addDomain = (listType: "blacklist" | "whitelist") => {
    if (!newDomainInput.trim()) return;

    const currentList = pendingSettings[listType];
    if (!currentList.includes(newDomainInput.trim())) {
      updatePendingDomainSetting(listType, [
        ...currentList,
        newDomainInput.trim(),
      ]);
    }
    setNewDomainInput("");
  };

  const removeDomain = (
    listType: "blacklist" | "whitelist",
    domain: string
  ) => {
    const currentList = pendingSettings[listType];
    updatePendingDomainSetting(
      listType,
      currentList.filter((d) => d !== domain)
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-transparent">
        <CardContent className="space-y-2 p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between ">
              <div className="space-y-2">
                <Label>Blacklist mode</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, WordServe will work on all domains except those
                  in the blacklist. When disabled, wordserve will only work on
                  domains in the whitelist.
                </p>
              </div>
              <Switch
                checked={pendingSettings.blacklistMode}
                onCheckedChange={(checked) =>
                  updatePendingDomainSetting("blacklistMode", checked)
                }
              />
            </div>

            <Separator />
            <div className="space-y-8">
              <div className="space-y-4">
                <Label>Add domain</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type here (*.example.com)"
                    value={newDomainInput}
                    onChange={(e) => setNewDomainInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addDomain(
                          pendingSettings.blacklistMode
                            ? "blacklist"
                            : "whitelist"
                        );
                      }
                    }}
                  />
                  <Button
                    variant={"secondary"}
                    onClick={() =>
                      addDomain(
                        pendingSettings.blacklistMode
                          ? "blacklist"
                          : "whitelist"
                      )
                    }
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  {pendingSettings.blacklistMode
                    ? "Blocked domains (blacklist)"
                    : "Allowed domains (whitelist)"}
                </Label>

                {!pendingSettings.blacklistMode && (
                  <div className="flex flex-wrap gap-2">
                    {pendingSettings.whitelist.map((domain) => (
                      <Badge key={domain} variant="secondary" className="gap-1">
                        {domain}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-muted-foreground hover:text-interaction-foreground"
                          onClick={() => removeDomain("whitelist", domain)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {pendingSettings.whitelist.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No domains in whitelist. Add domains to restrict
                        suggestions to specific sites.
                      </p>
                    )}
                  </div>
                )}

                {pendingSettings.blacklistMode && (
                  <div className="flex flex-wrap gap-2">
                    {pendingSettings.blacklist.map((domain) => (
                      <Badge
                        key={domain}
                        variant="destructive"
                        className="gap-1"
                      >
                        {domain}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-muted-foreground hover:text-interaction-foreground"
                          onClick={() => removeDomain("blacklist", domain)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {pendingSettings.blacklist.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No domains blocked. Add domains to disable suggestions
                        on specific sites.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Separator />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong>Pattern examples:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <code>*.paypal.com</code> - matches all paypal.com subdomains
                </li>
                <li>
                  <code>*payment*</code> - matches any domain containing
                  "payment"
                </li>
                <li>
                  <code>secure.*</code> - matches any domain starting with
                  "secure."
                </li>
                <li>
                  <code>exact.domain.com</code> - matches only this exact domain
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
