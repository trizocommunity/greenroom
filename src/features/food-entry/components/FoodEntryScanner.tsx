"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserCheck, AlertCircle } from "lucide-react";
import { scanFoodEntryAction } from "../actions/food-entry.actions";
import { QrScanner } from "@/components/festival/event-works/programme-reporting/QrScanner";

interface FoodEntryScannerProps {
  festivalId: string;
  initialData: {
    slots: any[];
    sessions: any[];
    activeSessionId: string | null;
    todayString: string;
    recentEntries?: any[];
  };
}

export function FoodEntryScanner({ festivalId, initialData }: FoodEntryScannerProps) {
  const activeSessionId = initialData.activeSessionId;
  const activeSession = initialData.sessions.find(s => s.id === activeSessionId);
  const slotName = activeSession?.slotName;
  const entries = initialData.recentEntries || [];

  if (!activeSessionId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Active Session</h3>
          <p className="text-muted-foreground">There is no food session currently active based on the festival time.</p>
        </CardContent>
      </Card>
    );
  }

  const handleProcessScan = async (chestNumber: string) => {
    const result = await scanFoodEntryAction({
      festivalId,
      sessionId: activeSessionId,
      chestNumber: chestNumber.trim(),
    });

    if (result.success) {
      return {
        success: true,
        message: "Participant checked in for food successfully!",
        participant: result.entry?.participantId ? {
          id: result.entry.participantId,
          name: result.entry.participantName || "Unknown",
          chestNumber: result.entry.chestNumber || chestNumber,
        } : undefined,
      };
    } else {
      return {
        success: false,
        error: result.error || "Failed to check in participant.",
      };
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Scan Participant</CardTitle>
          <CardDescription>
            Active Session: <strong className="text-foreground">{slotName}</strong> ({activeSession?.scannedCount || 0} scanned)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QrScanner 
            festivalId={festivalId} 
            processAction={handleProcessScan}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Recent Scans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {entries.length === 0 ? (
              <p className="text-muted-foreground text-sm">No entries yet for this session.</p>
            ) : (
              <ul className="space-y-2">
                {entries.slice(0, 10).map((entry) => (
                  <li key={entry.id} className="flex justify-between items-center p-3 border rounded-md">
                    <div>
                      <p className="font-medium">{entry.participantName}</p>
                      <p className="text-sm text-muted-foreground">Chest: {entry.chestNumber}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(entry.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
