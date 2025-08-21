import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MenuPreview } from "./PMenu";
import type { DefaultConfig } from "@/types";

export interface PreviewTabProps {
  settings: DefaultConfig;
}

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
