"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FoodEntryScanner } from "./FoodEntryScanner";
import { FoodEntryConfig } from "./FoodEntryConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FoodEntryDashboardProps {
  festivalId: string;
  initialData: {
    slots: any[];
    sessions: any[];
    activeSessionId: string | null;
    todayString: string;
    recentEntries?: any[];
  };
  role: "ADMIN" | "OWNER" | "VOLUNTEER" | "SUPER_ADMIN";
}

export function FoodEntryDashboard({ festivalId, initialData, role }: FoodEntryDashboardProps) {
  const isAdmin = ["ADMIN", "OWNER", "SUPER_ADMIN"].includes(role);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Food Hall Entry</h2>
      </div>

      <Tabs defaultValue="scanner" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scanner">
            <QrCode className="w-4 h-4 mr-2" />
            Scanner
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="config">
              <Settings className="w-4 h-4 mr-2" />
              Configuration
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="scanner" className="space-y-4">
          <FoodEntryScanner
            festivalId={festivalId}
            initialData={initialData}
          />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="config" className="space-y-4">
            <FoodEntryConfig
              festivalId={festivalId}
              initialSlots={initialData.slots}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
