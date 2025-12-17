"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListFilter, Grid3X3 } from "lucide-react";

interface Program {
  id: string;
  name: string;
  category: string;
}

interface SessionsClientProps {
  programs: Program[];
  accentColor: string;
}

const categoryColors: Record<string, string> = {
  JUNIOR: "bg-blue-100 text-blue-700 border-blue-200",
  SUBJUNIOR: "bg-green-100 text-green-700 border-green-200",
  SENIOR: "bg-purple-100 text-purple-700 border-purple-200",
};

export function SessionsClient({ programs, accentColor }: SessionsClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const categories = [...new Set(programs.map(p => p.category))];
  
  const filteredPrograms = selectedCategory
    ? programs.filter(p => p.category === selectedCategory)
    : programs;

  if (programs.length === 0) {
    return (
      <div className="py-16 text-center">
        <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg text-muted-foreground">
          No sessions/programs available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <ListFilter className="h-5 w-5 text-muted-foreground" />
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          style={selectedCategory === null ? { backgroundColor: accentColor } : undefined}
        >
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            style={selectedCategory === category ? { backgroundColor: accentColor } : undefined}
          >
            {category}
          </Button>
        ))}
      </div>
      
      {/* Programs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrograms.map((program) => (
          <Card key={program.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{program.name}</h3>
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
      
      <p className="text-sm text-muted-foreground text-center">
        Showing {filteredPrograms.length} of {programs.length} programs
      </p>
    </div>
  );
}
