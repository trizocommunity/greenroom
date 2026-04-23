"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TeamInfo = {
  teamNumber: number;
  members: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: TeamInfo[];
  onConfirm: (assignments: Array<{ teamNumber: number; code: string }>) => void;
};

const CODES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export function CodeLetterSpinWheel({
  open,
  onOpenChange,
  teams,
  onConfirm,
}: Props) {
  const [confirmed, setConfirmed] = useState(false);

  const totalTeams = teams.length;
  const totalMembers = teams.reduce((sum, team) => sum + team.members, 0);

  // Auto-assign codes sequentially
  const assignments = teams.map((team, index) => ({
    teamNumber: team.teamNumber,
    code: CODES[index % CODES.length],
  }));

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm(assignments);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setConfirmed(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            Confirm Code Assignment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl p-6 space-y-4 border"
          >
            {/* Total Teams */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Total Teams
                  </div>
                  <div className="text-3xl font-bold">{totalTeams}</div>
                </div>
              </div>
            </div>

            {/* Total Members */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Total Members
                  </div>
                  <div className="text-3xl font-bold">{totalMembers}</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Code Preview */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground text-center">
              Codes will be assigned automatically:
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {assignments.map((assignment) => {
                const team = teams.find(
                  (t) => t.teamNumber === assignment.teamNumber,
                );
                return (
                  <div
                    key={assignment.teamNumber}
                    className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm font-medium">
                      Team {assignment.teamNumber}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        ({team?.members} members)
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {assignment.code}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Each team will receive one code letter. All
            team members will share the same code.
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={confirmed}
            >
              <Check className="mr-2 h-4 w-4" />
              {confirmed ? "Assigning..." : `Assign ${totalTeams} Codes`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
