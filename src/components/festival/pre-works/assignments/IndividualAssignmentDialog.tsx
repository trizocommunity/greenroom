"use client";

import { Check, Loader2, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignments } from "@/hooks/useAssignments";
import { useCategories } from "@/hooks/useCategories";
import { useProgrammes } from "@/hooks/useProgrammes";
import { useStudents } from "@/hooks/useStudents";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface IndividualAssignmentDialogProps {
  festivalId: string;
  trigger?: React.ReactNode;
}

export function IndividualAssignmentDialog({
  festivalId,
  trigger,
}: IndividualAssignmentDialogProps) {
  const [open, setOpen] = useState(false);
  const { createAssignment, isCreating, assignments } = useAssignments(festivalId);
  const { students } = useStudents(festivalId);
  const { programmes } = useProgrammes(festivalId);
  const { categories } = useCategories(festivalId);

  const [formData, setFormData] = useState({
    categoryId: "",
    studentId: "",
  });
  
  // Multi-select state for programmes
  const [selectedProgrammeIds, setSelectedProgrammeIds] = useState<string[]>([]);
  const [programmeSearch, setProgrammeSearch] = useState("");

  // Reset when opening
  useEffect(() => {
    if (open) {
      setFormData({ categoryId: "", studentId: "" });
      setSelectedProgrammeIds([]);
      setProgrammeSearch("");
    }
  }, [open]);

  // 1. Categories: Only SINGLE
  const individualCategories = categories.filter((c: any) => c.type === "SINGLE");

  // 2. Students: Filter by Category
  const filteredStudents = students.filter((s: any) => {
    if (!formData.categoryId) return false;
    return s.categoryId === formData.categoryId;
  });

  // 3. Programmes: Filter by Category
  // We list ALL programmes in the category. 
  // We should indicate which ones are already assigned.
  const categoryProgrammes = programmes.filter((p: any) => {
    if (!formData.categoryId) return false;
    if (p.categoryId !== formData.categoryId) return false;
    
    // Search filter
    if (programmeSearch && !p.name.toLowerCase().includes(programmeSearch.toLowerCase())) {
       return false;
    }
    
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId || selectedProgrammeIds.length === 0) return;

    try {
      await Promise.all(
        selectedProgrammeIds.map((progId) => 
          createAssignment({
             programmeId: progId,
             studentId: formData.studentId,
          })
        )
      );
      
      toast.success(`Successfully assigned to ${selectedProgrammeIds.length} programmes`);
      setOpen(false);
    } catch (error) {
      // Hook handles toast error
    }
  };

  const toggleProgramme = (id: string) => {
     setSelectedProgrammeIds(prev => {
        if (prev.includes(id)) {
           return prev.filter(p => p !== id);
        } else {
           return [...prev, id];
        }
     });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Individual
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Individual Assignment</DialogTitle>
          <DialogDescription>
            Assign a student to multiple programmes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* 1. Category Selection */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(val) => {
                setFormData({ categoryId: val, studentId: "" });
                setSelectedProgrammeIds([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {individualCategories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Student Selection */}
          <div className="space-y-2">
            <Label>Student</Label>
            <Select
              value={formData.studentId}
              onValueChange={(val) => {
                setFormData((prev) => ({ ...prev, studentId: val }));
                setSelectedProgrammeIds([]);
              }}
              disabled={!formData.categoryId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !formData.categoryId
                      ? "Select Category first"
                      : "Select Student"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredStudents.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.registrationNumber || "No Reg"}) - {s.group?.name}
                  </SelectItem>
                ))}
                {filteredStudents.length === 0 && formData.categoryId && (
                  <SelectItem value="none" disabled>
                    No students in this category
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Programme Selection (Multi-select) */}
          <div className="space-y-2 flex-1 flex flex-col min-h-0">
             <div className="flex items-center justify-between">
                <Label>Programmes</Label>
                {selectedProgrammeIds.length > 0 && <Badge variant="secondary">{selectedProgrammeIds.length} selected</Badge>}
             </div>
             
             {formData.categoryId && (
                <div className="relative">
                   <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                   <Input 
                      placeholder="Search programmes..." 
                      className="pl-8 h-8 text-xs mb-2" 
                      value={programmeSearch}
                      onChange={(e) => setProgrammeSearch(e.target.value)}
                   />
                </div>
             )}

             <div className="border rounded-md flex-1 overflow-hidden relative bg-muted/10">
                {!formData.studentId ? (
                   <div className=" flex items-center justify-center text-sm text-muted-foreground p-4 text-center">
                      {formData.categoryId ? "Select a student to view available programmes." : "Select a category to view available students."}
                   </div>
                ) : categoryProgrammes.length === 0 ? (
                   <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground p-4 text-center">
                      No programmes found.
                   </div>
                ) : (
                   <ScrollArea className="h-[200px] p-1">
                      <div className="space-y-1">
                         {categoryProgrammes.map((p: any) => {
                            const isSelected = selectedProgrammeIds.includes(p.id);
                            // Check assignment status SPECIFIC to this student
                            const alreadyAssigned = assignments.some(
                               (a: any) => a.programmeId === p.id && a.studentId === formData.studentId
                            );

                            return (
                               <button
                                  key={p.id}
                                  type="button"
                                  disabled={alreadyAssigned}
                                  onClick={() => toggleProgramme(p.id)}
                                  className={cn(
                                     "w-full flex items-center justify-between p-2.5 rounded-sm border text-sm transition-all text-left group",
                                     alreadyAssigned 
                                        ? "opacity-60 bg-muted cursor-not-allowed border-transparent" 
                                        : isSelected 
                                           ? "bg-primary/5 border-primary shadow-sm" 
                                           : "bg-background hover:bg-muted/50 border-transparent hover:border-border"
                                  )}
                               >
                                  <div className="flex flex-col gap-0.5">
                                     <span className={cn("font-medium", alreadyAssigned && "line-through decoration-muted-foreground/50")}>
                                        {p.name}
                                     </span>
                                  </div>
                                  
                                  {alreadyAssigned ? (
                                     <Badge variant="outline" className="text-[10px] h-5 bg-muted">Assigned</Badge>
                                  ) : isSelected && (
                                     <Check className="h-4 w-4 text-primary animate-in zoom-in-50 duration-200" />
                                  )}
                               </button>
                            );
                         })}
                      </div>
                   </ScrollArea>
                )}
             </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || selectedProgrammeIds.length === 0}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Selected
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
