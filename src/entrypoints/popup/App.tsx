import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import "../../globals.css";
import "./App.css";

export default function App() {
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [siteEnabled, setSiteEnabled] = useState(true);
  const [currentHost, setCurrentHost] = useState("");

  useEffect(() => {
    loadToggles();
  }, []);

  const loadToggles = async () => {
    const result = await browser.storage.sync.get([
      "globalEnabled",
      "siteOverrides",
      "wordserveSettings",
    ]);
    const ge = result.globalEnabled;
    const overrides = result.siteOverrides || {};
    const settings = result.wordserveSettings || {};

    setGlobalEnabled(ge !== undefined ? ge : true);

    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const url = tabs[0]?.url || "";
    const host = new URL(url).hostname || "";
    setCurrentHost(host);
    const se = overrides[host];
    setSiteEnabled(se !== undefined ? se : true);
  };

  const toggleGlobal = async (val: boolean) => {
    setGlobalEnabled(val);
    await browser.storage.sync.set({ globalEnabled: val });
  };

  const toggleSite = async (val: boolean) => {
    setSiteEnabled(val);
    const result = await browser.storage.sync.get("siteOverrides");
    const overrides = result.siteOverrides || {};
    overrides[currentHost] = val;
    await browser.storage.sync.set({ siteOverrides: overrides });
  };

  const toggleBlacklistMode = async (val: boolean) => {
    const result = await browser.storage.sync.get("wordserveSettings");
    const settings = result.wordserveSettings || {};
    const newSettings = {
      ...settings,
      domains: {
        ...settings.domains,
        blacklistMode: val,
      },
    };
    await browser.storage.sync.set({ wordserveSettings: newSettings });
  };

  const openSettings = () => {
    browser.runtime.openOptionsPage();
  };

  return (
    <div className="w-80 p-4 bg-background text-foreground font-sans">
      <div className="flex justify-between items-center mb-4">
        <img src="/icon/32.png" alt="Logo" className="h-8" />
        <img src="/icon/16.png" alt="Status" className="h-4" />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Enable/Disable the plugin</Label>
          <Switch checked={globalEnabled} onCheckedChange={toggleGlobal} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Enabled on this site</Label>
          <Switch checked={siteEnabled} onCheckedChange={toggleSite} />
        </div>
        <Button onClick={openSettings} className="w-full">
          Settings
        </Button>
      </div>
    </div>
  );
}
