"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MOCK_RESULTS } from "@/data/mockFestivalData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { useFestival } from "@/components/festival/FestivalContext";

export default function ResultsPage() {
  const festival = useFestival();
  const [activeTab, setActiveTab] = useState("programs");

  const topThree = MOCK_RESULTS.filter(r => r.position <= 3).sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Festival Results</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Celebrating the achievements and outstanding performances of our talented participants.
            </p>
        </div>

        <Tabs defaultValue="programs" className="w-full" onValueChange={setActiveTab}>
          <div className="flex justify-center mb-8">
             <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                <TabsTrigger value="programs">By Program</TabsTrigger>
                <TabsTrigger value="teams">Team Standings</TabsTrigger>
             </TabsList>
          </div>

          <TabsContent value="programs" className="space-y-6">
             {MOCK_RESULTS.map((result, i) => (
                <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                >
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xl">{result.programName}</CardTitle>
                            <Badge variant="secondary">{result.category}</Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${
                                        result.position === 1 ? 'bg-yellow-100 text-yellow-600' :
                                        result.position === 2 ? 'bg-gray-100 text-gray-600' :
                                        'bg-orange-100 text-orange-600'
                                    }`}>
                                        <Trophy className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">{result.winner}</p>
                                        <p className="text-sm text-muted-foreground">{result.team}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-bold block" style={{ color: festival.accentColor }}>{result.points}</span>
                                    <span className="text-xs text-muted-foreground uppercase">Points</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
             ))}
          </TabsContent>

          <TabsContent value="teams">
            {/* Podium Visual */}
            <div className="flex justify-center items-end gap-4 h-64 mb-12 px-4">
                {[
                  { pos: 2, height: 'h-40', color: 'bg-gray-200' },
                  { pos: 1, height: 'h-52', color: 'bg-yellow-100 border-yellow-200' },
                  { pos: 3, height: 'h-32', color: 'bg-orange-100' }
                ].map((podium) => {
                   const winner = topThree.find(r => r.position === podium.pos);
                   if (!winner) return null;
                   return (
                       <motion.div 
                            key={podium.pos}
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            className={`flex flex-col items-center justify-end w-1/3 max-w-[200px] rounded-t-xl border ${podium.color} p-4 text-center ${podium.height}`}
                       >
                           <Trophy className={`w-8 h-8 mb-2 ${podium.pos === 1 ? 'text-yellow-500' : 'text-foreground/50'}`} />
                           <p className="font-bold text-lg leading-tight mb-1">{winner.team}</p>
                           <p className="text-sm text-muted-foreground">{winner.points} pts</p>
                           <div className="mt-4 font-bold text-2xl opacity-25">#{podium.pos}</div>
                       </motion.div>
                   )
                })}
            </div>

            <div className="text-center text-muted-foreground">
                <p>Full team standings table would go here.</p>
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
