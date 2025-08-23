import React, { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Download, Upload } from "lucide-react";
import type { DomainSettings } from "@/lib/domains";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { validateUserDomainInput } from "@/lib/domains";
import { toast } from "sonner";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  type SortMode = "newest" | "oldest" | "az" | "za";
  const [sort, setSort] = useState<SortMode>("newest");

  const domainRoot = (pattern: string) =>
    pattern.startsWith("*.") ? pattern.slice(2) : pattern;

  const hasConflict = (
    pattern: string,
    target: "blacklist" | "whitelist"
  ): { duplicate: boolean; crossConflict: boolean } => {
    const sanitized = pattern;
    const thisList = pendingSettings[target];
    const otherList =
      pendingSettings[target === "blacklist" ? "whitelist" : "blacklist"];
    const root = domainRoot(sanitized);
    const duplicate = thisList.some((p) => domainRoot(p) === root);
    const crossConflict = otherList.some((p) => domainRoot(p) === root);
    return { duplicate, crossConflict };
  };

  const addDomain = (listType: "blacklist" | "whitelist") => {
    const raw = newDomainInput.trim();
    if (!raw) return;
    const res = validateUserDomainInput(raw);
    if (!res.ok) {
      toast.error(res.reason);
      return;
    }
    const sanitized = res.value;
    const { duplicate, crossConflict } = hasConflict(sanitized, listType);
    if (duplicate) {
      toast.error("That domain is already in the list");
      return;
    }
    if (crossConflict) {
      toast.error(
        `Conflicts with the ${
          listType === "blacklist" ? "whitelist" : "blacklist"
        }. Remove it there first.`
      );
      return;
    }
    const currentList = pendingSettings[listType];
    updatePendingDomainSetting(listType, [...currentList, sanitized]);
    setNewDomainInput("");
    toast.success("Added domain");
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

  const sortList = (list: string[]): string[] => {
    switch (sort) {
      case "newest":
        return [...list].reverse();
      case "oldest":
        return [...list];
      case "az":
        return [...list].sort((a, b) => a.localeCompare(b));
      case "za":
        return [...list].sort((a, b) => b.localeCompare(a));
    }
  };

  const viewList = useMemo(() => {
    return pendingSettings.blacklistMode
      ? sortList(pendingSettings.blacklist)
      : sortList(pendingSettings.whitelist);
  }, [
    pendingSettings.blacklistMode,
    pendingSettings.blacklist,
    pendingSettings.whitelist,
    sort,
  ]);

  const exportJSON = async () => {
    try {
      const data = {
        type: "wordserve/domains",
        version: 1,
        blacklistMode: pendingSettings.blacklistMode,
        blacklist: pendingSettings.blacklist,
        whitelist: pendingSettings.whitelist,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const downloads: any =
        (globalThis as any).browser?.downloads ||
        (globalThis as any).chrome?.downloads;
      if (downloads?.download) {
        try {
          await downloads.download({
            url,
            filename: "wordserve-domains.json",
            saveAs: true,
            conflictAction: "prompt",
          });
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          toast.success("Exported domains");
          return;
        } catch (e) {}
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = "wordserve-domains.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Exported domains");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export");
    }
  };

  const importJSON = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || parsed.type !== "wordserve/domains") {
        toast.error("Not a WordServe domain settings file");
        return;
      }
      const nextBlacklistMode = !!parsed.blacklistMode;
      const inArr = (arr: any): string[] => (Array.isArray(arr) ? arr : []);
      const sanitizeMany = (arr: string[]) => {
        const byRoot = new Map<string, string>();
        for (const raw of arr) {
          const res = validateUserDomainInput(String(raw || ""));
          if (res.ok) {
            const r = domainRoot(res.value);
            if (!byRoot.has(r)) byRoot.set(r, res.value);
          }
        }
        return Array.from(byRoot.values());
      };
      let nextBlacklist = sanitizeMany(inArr(parsed.blacklist));
      let nextWhitelist = sanitizeMany(inArr(parsed.whitelist));
      // Remove cross-conflicts by root
      const wlRoots = new Set(nextWhitelist.map(domainRoot));
      nextBlacklist = nextBlacklist.filter((p) => !wlRoots.has(domainRoot(p)));
      const blRoots = new Set(nextBlacklist.map(domainRoot));
      nextWhitelist = nextWhitelist.filter((p) => !blRoots.has(domainRoot(p)));

      updatePendingDomainSetting("blacklistMode", nextBlacklistMode);
      updatePendingDomainSetting("blacklist", nextBlacklist);
      updatePendingDomainSetting("whitelist", nextWhitelist);
      toast.success("Imported domains");
    } catch (e) {
      console.error(e);
      toast.error("Invalid JSON file");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-transparent">
        <CardContent className="space-y-2 p-2">
          <div className="space-y-6">
            <div className="flex items-center justify-between ">
              <div className="space-y-2">
                <Label>Blacklist mode</Label>
                <p className="text-sm text-muted-foreground lg:max-w-[65ch] max-w-[45ch]">
                  Blacklist mode enables suggestions on all domains except the
                  list below. IF turned off, WordServe will only work on the
                  domains in the whitelist you specify.
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
                <div className="flex gap-2 items-center">
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) importJSON(f);
                      e.currentTarget.value = ""; // reset
                    }}
                  />
                  <div className="ml-auto flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Download className="h-4 w-4 mr-2" /> Import
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportJSON}>
                      <Upload className="h-4 w-4 mr-2" /> Export
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label>
                    {pendingSettings.blacklistMode
                      ? "Blocked domains (blacklist)"
                      : "Allowed domains (whitelist)"}
                  </Label>
                  <div className="flex gap-4 items-center">
                    <Label>Sort</Label>
                    <select
                      className="border rounded-md px-2 py-1 text-sm bg-background"
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortMode)}
                    >
                      <option value="newest">New → old</option>
                      <option value="oldest">Old → new</option>
                      <option value="az">A → Z</option>
                      <option value="za">Z → A</option>
                    </select>
                  </div>
                </div>

                {!pendingSettings.blacklistMode && (
                  <ScrollArea className="h-64 rounded-md border p-2">
                    <div className="flex flex-wrap gap-2">
                      {viewList.map((domain) => (
                        <Badge
                          key={domain}
                          variant="secondary"
                          className="gap-1"
                        >
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
                          No domains found! Add new ones from the input above.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                )}

                {pendingSettings.blacklistMode && (
                  <ScrollArea className="h-64 rounded-md border p-2">
                    <div className="flex flex-wrap gap-2">
                      {viewList.map((domain) => (
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
                  </ScrollArea>
                )}
              </div>
            </div>

            <Separator />
            <Separator />

            <div className="rounded-md border bg-muted/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="text-xs" variant="secondary">
                  FAQ
                </Badge>
                <span className="font-bold text-base">How does this work?</span>
              </div>

              <p className="text-sm text-muted-foreground">
                Normally, WordServe will work on <i>almost</i> all websites.
                There are exceptions such as browser-protected pages or places
                where you type passwords, addresses, or credit card details.
              </p>

              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>
                  <b>Blacklist:</b> Enables suggestions on all domains except
                  those you add to the <i>naughty</i> list above. (ON by
                  default)
                </li>
                <li>
                  <b>Whitelist:</b> Disables suggestions on all domains except
                  those you add to the whitelist above. (OFF by default)
                </li>
              </ul>
            </div>

            <Separator />

            <div className="text-sm text-muted-foreground space-y-2">
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
