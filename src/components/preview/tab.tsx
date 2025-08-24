import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DefaultConfig } from "@/types";
import { MenuPreview } from "./PMenu";
import React from "react";

export interface PreviewTabProps {
  settings: DefaultConfig;
}

// Disaply a live preview of the menu based on the current live settings
export const PreviewTab: React.FC<PreviewTabProps> = ({ settings }) => {
  return (
    <Card className="rounded-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Live preview</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <MenuPreview settings={settings} />
      </CardContent>
    </Card>
  );
};
