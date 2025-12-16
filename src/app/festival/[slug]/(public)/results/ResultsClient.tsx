"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Trophy, Medal, Award, FileImage } from "lucide-react";

interface Program {
  id: string;
  name: string;
  category: string;
  posterUrl: string | null;
}

interface Team {
  id: string;
  name: string;
  score: number;
  rank: number | null;
}

interface ResultsClientProps {
  programs: Program[];
  teams: Team[];
  accentColor: string;
}

const categoryColors: Record<string, string> = {
  JUNIOR: "bg-blue-100 text-blue-700 border-blue-200",
  SUBJUNIOR: "bg-green-100 text-green-700 border-green-200",
  SENIOR: "bg-purple-100 text-purple-700 border-purple-200",
};

export function ResultsClient({ programs, teams, accentColor }: ResultsClientProps) {
  const [activeTab, setActiveTab] = useState<"program" | "team">("program");
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  
  // Sort teams by rank
  const sortedTeams = [...teams].sort((a, b) => (a.rank || 999) - (b.rank || 999));
  const topTeams = sortedTeams.slice(0, 3);
  const otherTeams = sortedTeams.slice(3);

  return (
    <div className="space-y-6">
      {/* Tab Buttons */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === "program" ? "default" : "ghost"}
          onClick={() => setActiveTab("program")}
          style={activeTab === "program" ? { backgroundColor: accentColor } : undefined}
        >
          Program
        </Button>
        <Button
          variant={activeTab === "team" ? "default" : "ghost"}
          onClick={() => setActiveTab("team")}
          style={activeTab === "team" ? { backgroundColor: accentColor } : undefined}
        >
          Team
        </Button>
      </div>
      
      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "program" && (
          <div className="space-y-4">
            {programs.length === 0 ? (
              <div className="py-16 text-center">
                <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">
                  No program results available yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.map((program) => (
                  <Card 
                    key={program.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedProgram(program)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{program.name}</h3>
                          {program.posterUrl && (
                            <p className="text-sm text-muted-foreground mt-1">
                              📄 Poster available
                            </p>
                          )}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={categoryColors[program.category] || ""}
                        >
                          {program.category}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === "team" && (
          <div className="space-y-8">
            {teams.length === 0 ? (
              <div className="py-16 text-center">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">
                  No team results available yet.
                </p>
              </div>
            ) : (
              <>
                {/* Top 3 Highlights */}
                {topTeams.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {topTeams.map((team, index) => {
                      const icons = [
                        <Trophy key="1" className="h-8 w-8 text-yellow-500" />,
                        <Medal key="2" className="h-8 w-8 text-gray-400" />,
                        <Award key="3" className="h-8 w-8 text-amber-600" />,
                      ];
                      const labels = ["1st Place 🥇", "2nd Place 🥈", "3rd Place 🥉"];
                      
                      return (
                        <Card key={team.id} className="text-center">
                          <CardContent className="pt-6">
                            <div className="mb-3">{icons[index]}</div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {labels[index]}
                            </p>
                            <h3 className="font-bold text-lg">{team.name}</h3>
                            <p 
                              className="text-2xl font-bold mt-2"
                              style={{ color: accentColor }}
                            >
                              {team.score} pts
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
                
                {/* Other Teams Table */}
                {otherTeams.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold">Rank</th>
                          <th className="text-left py-3 px-4 font-semibold">Team</th>
                          <th className="text-right py-3 px-4 font-semibold">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {otherTeams.map((team) => (
                          <tr key={team.id} className="border-t">
                            <td className="py-3 px-4 text-muted-foreground">
                              #{team.rank || "-"}
                            </td>
                            <td className="py-3 px-4 font-medium">{team.name}</td>
                            <td className="py-3 px-4 text-right">{team.score} pts</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </motion.div>
      
      {/* Program Poster Modal */}
      <Dialog open={!!selectedProgram} onOpenChange={() => setSelectedProgram(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProgram?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedProgram?.posterUrl ? (
              <>
                <img
                  src={selectedProgram.posterUrl}
                  alt={`${selectedProgram.name} poster`}
                  className="w-full rounded-lg"
                />
                <a
                  href={selectedProgram.posterUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full gap-2" style={{ backgroundColor: accentColor }}>
                    <Download className="h-4 w-4" />
                    Download Poster
                  </Button>
                </a>
              </>
            ) : (
              <div className="py-12 text-center">
                <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No poster available for this program.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
