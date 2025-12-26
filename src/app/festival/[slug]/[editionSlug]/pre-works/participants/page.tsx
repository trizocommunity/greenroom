"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import {
  useParticipants,
  useCreateParticipant,
  useDeleteParticipant,
  useGroups,
  useCategories,
} from "@/components/festival/editions/pre-works/hooks";
import { Loader2, Trash2, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFestival } from "@/components/festival/FestivalContext";

export default function ParticipantsPage() {
  const { activeEdition } = useFestival();
  const editionId = activeEdition?.id;

  const [filterGroup, setFilterGroup] = useState<string>("ALL");

  const { data: participants, isLoading } = useParticipants(
    editionId || "",
    filterGroup === "ALL" ? undefined : filterGroup,
  );
  const { data: groups } = useGroups(editionId || "");
  const { data: categories } = useCategories(editionId || "");

  const createMutation = useCreateParticipant(editionId || "");
  const deleteMutation = useDeleteParticipant(editionId || "");

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    groupId: "",
    gender: "MALE",
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.categoryId || !formData.groupId) return;
    await createMutation.mutateAsync(formData);
    setIsOpen(false);
    setFormData({ name: "", categoryId: "", groupId: "", gender: "MALE" });
  };

  if (!editionId) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Participants</h1>
          <p className="text-muted-foreground">Register participants.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>Add Participant</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Participant</DialogTitle>
              <DialogDescription>Add a new participant.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(val) =>
                    setFormData({ ...formData, categoryId: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="group">Group / Institution</Label>
                <Select
                  value={formData.groupId}
                  onValueChange={(val) =>
                    setFormData({ ...formData, groupId: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups?.map((grp: any) => (
                      <SelectItem key={grp.id} value={grp.id}>
                        {grp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Full Name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(val) =>
                    setFormData({ ...formData, gender: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Register
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Groups</SelectItem>
            {groups?.map((grp: any) => (
              <SelectItem key={grp.id} value={grp.id}>
                {grp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants?.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
                    >
                      No participants found.
                    </TableCell>
                  </TableRow>
                )}
                {participants?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div>{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.gender}
                      </div>
                    </TableCell>
                    <TableCell>{item.group?.name}</TableCell>
                    <TableCell>{item.category?.name}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Are you sure?"))
                            deleteMutation.mutate(item.id);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
        💡 <strong>Tip:</strong> Create participants before assigning them to
        programmes.
      </div>
    </div>
  );
}
