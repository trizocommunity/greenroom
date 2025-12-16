"use client";

import { motion } from "framer-motion";
import { MOCK_SESSIONS } from "@/data/mockFestivalData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFestival } from "@/components/festival/FestivalContext";

export default function SessionsPage() {
  const festival = useFestival();

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
            <div>
                <h1 className="text-4xl font-bold tracking-tight mb-2">Program Schedule</h1>
                <p className="text-muted-foreground">Explore all events happening across the festival.</p>
            </div>
            <div className="w-full md:w-auto relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search sessions..." className="pl-9 w-full md:w-[300px]" />
            </div>
        </div>

        <div className="space-y-4">
            {MOCK_SESSIONS.map((session, i) => (
                <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                >
                    <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6 flex flex-col md:flex-row gap-6 md:items-center">
                            
                            <div className="shrink-0 w-24 text-center md:text-left">
                                <span className="font-bold text-lg block">{session.time.split(' ')[0]}</span>
                                <span className="text-xs text-muted-foreground uppercase">{session.time.split(' ')[1]}</span>
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-semibold">{session.title}</h3>
                                    <Badge variant={(session.status === 'LIVE' ? 'destructive' : 'secondary')} className="text-[10px] h-5">
                                        {session.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5" /> {session.venue}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Badge variant="outline" className="text-xs font-normal border-none p-0 bg-transparent text-muted-foreground">
                                            {session.category}
                                        </Badge>
                                    </span>
                                </div>
                            </div>

                            <div>
                                <Badge variant="outline" style={{ borderColor: festival.accentColor, color: festival.accentColor }}>
                                    View Details
                                </Badge>
                            </div>

                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
}
