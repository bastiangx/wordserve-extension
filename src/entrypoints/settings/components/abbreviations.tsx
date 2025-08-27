"use client";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DefaultConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Download, Upload, Plus, Trash2 } from "lucide-react";

interface Props {
  pendingSettings: DefaultConfig;
  updatePendingSetting: <K extends keyof DefaultConfig>(
    key: K,
    value: DefaultConfig[K]
  ) => void;
}

type SortMode = "newest" | "oldest" | "az" | "za";

export function AbbreviationsSettings({
  pendingSettings,
  updatePendingSetting,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sort, setSort] = useState<SortMode>("newest");
  const [localRows, setLocalRows] = useState<
    Array<{ id: string; key: string; value: string; createdAt: number }>
  >([]);
  useEffect(() => {
    const now = Date.now();
    const existingByKey = new Map(localRows.map((r) => [r.key, r]));
    const rows: Array<{
      id: string;
      key: string;
      value: string;
      createdAt: number;
    }> = [];
    for (const [k, v] of Object.entries(pendingSettings.abbreviations || {})) {
      const ex = existingByKey.get(k);
      rows.push(
        ex ?? {
          id: `${k}-${now}-${Math.random().toString(36).slice(2, 8)}`,
          key: k,
          value: v,
          createdAt: now,
        }
      );
    }
    setLocalRows(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSettings.abbreviations]);
  const entries = useMemo(() => {
    const arr = [...localRows];
    switch (sort) {
      case "newest":
        arr.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "oldest":
        arr.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case "az":
        arr.sort((a, b) => a.key.localeCompare(b.key));
        break;
      case "za":
        arr.sort((a, b) => b.key.localeCompare(a.key));
        break;
    }
    return arr;
  }, [localRows, sort]);
  const setMap = (map: Record<string, string>) => {
    updatePendingSetting("abbreviations", map as any);
  };
  const onKeyLocalChange = (id: string, newKey: string) => {
    setLocalRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, key: newKey } : r))
    );
  };
  const onKeyCommit = (id: string) => {
    const row = localRows.find((r) => r.id === id);
    if (!row) return;
    const map = { ...(pendingSettings.abbreviations || {}) } as Record<
      string,
      string
    >;
    const trimmed = row.key.trim();
    const originalKey = Object.entries(map).find(
      ([k, v]) =>
        v === row.value && !localRows.find((rr) => rr.id !== id && rr.key === k)
    )?.[0];
    // If renaming to empty, keep previous key
    if (!trimmed) {
      setLocalRows((rows) =>
        rows.map((r) =>
          r.id === id ? { ...r, key: originalKey ?? row.key } : r
        )
      );
      return;
    }
    // If the new key collides with another existing map key (not the same row), block
    if (map[trimmed] !== undefined && trimmed !== originalKey) {
      toast.error("That shortcut already exists");
      setLocalRows((rows) =>
        rows.map((r) => (r.id === id ? { ...r, key: originalKey ?? r.key } : r))
      );
      return;
    }
    // Apply rename in map: find previous key by value or same key
    const prevKey = originalKey ?? row.key;
    if (prevKey !== trimmed) {
      const value = map[prevKey];
      delete map[prevKey];
      map[trimmed] = value ?? row.value;
      setMap(map);
    } else if (map[trimmed] === undefined) {
      map[trimmed] = row.value;
      setMap(map);
    }
  };
  const onValueChange = (id: string, newVal: string) => {
    setLocalRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, value: newVal } : r))
    );
    const row = localRows.find((r) => r.id === id);
    if (!row) return;
    const map = { ...(pendingSettings.abbreviations || {}) } as Record<
      string,
      string
    >;
    const key = row.key.trim() || row.key;
    map[key] = newVal;
    setMap(map);
  };
  const addRow = () => {
    const base = "NEW";
    const map = { ...(pendingSettings.abbreviations || {}) } as Record<
      string,
      string
    >;
    let k = base;
    let i = 1;
    while (map[k] !== undefined) {
      k = `${base}${i++}`;
    }
    map[k] = "";
    setMap(map);
  };
  const removeRow = (key: string) => {
    const map = { ...(pendingSettings.abbreviations || {}) } as Record<
      string,
      string
    >;
    delete map[key];
    setMap(map);
  };
  const exportJSON = async () => {
    try {
      const data = JSON.stringify(
        {
          type: "wordserve/abbreviations",
          version: 1,
          data: pendingSettings.abbreviations || {},
        },
        null,
        2
      );
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const downloads: any =
        (globalThis as any).browser?.downloads ||
        (globalThis as any).chrome?.downloads;
      if (downloads?.download) {
        try {
          await downloads.download({
            url,
            filename: "wordserve-abbreviations.json",
            saveAs: true,
            conflictAction: "prompt",
          });
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          toast.success("Exported abbreviations");
          return;
        } catch (e) { }
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = "wordserve-abbreviations.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Exported abbreviations");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export");
    }
  };
  const importJSON = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      let map: Record<string, string> = {};
      if (parsed && typeof parsed === "object") {
        if (
          parsed.type === "wordserve/abbreviations" &&
          parsed.data &&
          typeof parsed.data === "object"
        ) {
          for (const [k, v] of Object.entries(parsed.data)) {
            if (typeof k === "string" && typeof v === "string") {
              map[k] = v;
            }
          }
        } else {
          // Back-compat: allow plain object maps
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof k === "string" && typeof v === "string") {
              map[k] = v;
            }
          }
        }
      }
      setMap(map);
      toast.success("Imported abbreviations");
    } catch (e) {
      console.error(e);
      toast.error("Invalid JSON file");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
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
        <div className="flex gap-2">
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

      <Separator />

      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-2" /> New
        </Button>
      </div>

      <div className="space-y-4">
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No abbreviations yet. Add your first one.
          </p>
        )}
        {entries.map((row) => (
          <div key={row.id} className="rounded-md border p-4 space-y-3">
            <div className="grid grid-cols-12 gap-4 items-start">
              <div className="col-span-12 md:col-span-3 space-y-4">
                <Label className="font-mono text-gray-400" htmlFor={`abbr-key-${row.id}`}>Shortcut</Label>
                <Input
                  className="font-mono text-sm"
                  id={`abbr-key-${row.id}`}
                  value={row.key}
                  onChange={(e) =>
                    onKeyLocalChange(
                      row.id,
                      e.target.value.slice(
                        0,
                        pendingSettings.maxAbbreviationLength
                      )
                    )
                  }
                  onBlur={() => onKeyCommit(row.id)}
                  placeholder="e.g. STR"
                  maxLength={pendingSettings.maxAbbreviationLength}
                />
              </div>
              <div className="col-span-12 md:col-span-8 space-y-4">
                <Label className="font-mono text-gray-400 pt-2 " htmlFor={`abbr-val-${row.id}`}>Target phrase</Label>
                <ScrollArea className="max-h-48  font-mono">
                  <Textarea
                    id={`abbr-val-${row.id}`}
                    value={row.value}
                    onChange={(e) => onValueChange(row.id, e.target.value)}
                    placeholder="Write here..."
                    className="min-h-24 text-sm"
                  />
                </ScrollArea>
              </div>
              <div className="col-span-12 md:col-span-1 flex md:justify-end">
                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeRow(row.key)}
                  aria-label={`Delete ${row.key}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Separator />
      <div className="rounded-md border bg-muted/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge className="text-xs font-mono" variant="secondary">
            FAQ
          </Badge>
          <span className="font-bold text-base">How does this work?</span>
        </div>

        <p className="text-sm text-muted-foreground">
          Abbreviations are easy and <i>fast</i> text shortcuts that expand into longer custom phrases you define.
        </p>

        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>
            <b>Shortcut</b> is the abbreviation you type into the text field.
            (e.g. "brb")
          </li>
          <li>
            <b>Target phrase</b> is the full text that the shortcut expands to.
            (e.g. "be right back")
          </li>
        </ul>
      </div>
    </div>
  );
}
