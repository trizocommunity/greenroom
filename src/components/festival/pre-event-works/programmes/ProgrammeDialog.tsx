"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useCategories } from "@/api/client/categories";
import {
  useCreateProgramme,
  useProgramme,
  useUpdateProgramme,
} from "@/api/client/programmes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ProgrammeBaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().min(1, "Category is required"),
  type: z.enum(["INDIVIDUAL", "GROUP"]),
  stageType: z.enum(["STAGE", "NON_STAGE"]),
  // Defaults apply when fields are hidden (GROUP vs INDIVIDUAL); missing values become NaN without these.
  maxParticipantsPerGroup: z.coerce.number().min(0).default(1),
  maxTeamsPerGroup: z.coerce.number().min(0).default(1),
  maxStudentsPerTeam: z.coerce.number().min(0).default(1),
});

const ProgrammeSchema = ProgrammeBaseSchema.superRefine((data, ctx) => {
  if (data.type === "INDIVIDUAL") {
    if (data.maxParticipantsPerGroup < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be at least 1",
        path: ["maxParticipantsPerGroup"],
      });
    }
  } else {
    if (data.maxTeamsPerGroup < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be at least 1",
        path: ["maxTeamsPerGroup"],
      });
    }
    if (data.maxStudentsPerTeam < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be at least 1",
        path: ["maxStudentsPerTeam"],
      });
    }
  }
});

type ProgrammeFormValues = z.infer<typeof ProgrammeBaseSchema>;

interface ProgrammeDialogProps {
  festivalId: string;
  programme?: any;
  trigger?: React.ReactNode;
  readOnly?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProgrammeDialog({
  festivalId,
  programme,
  trigger,
  readOnly = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: ProgrammeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen =
    isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;

  const createProgramme = useCreateProgramme();
  const updateProgramme = useUpdateProgramme();
  const { data: categories = [] } = useCategories(festivalId);

  const form = useForm<ProgrammeFormValues>({
    resolver: zodResolver(ProgrammeSchema as any),
    mode: "onChange",
    // Keep values for fields hidden when type toggles (GROUP vs INDIVIDUAL).
    // Otherwise Zod fails on unregistered fields and the submit button stays disabled.
    shouldUnregister: false,
    defaultValues: {
      name: "",
      categoryId: "",
      type: "INDIVIDUAL",
      stageType: "STAGE",
      maxParticipantsPerGroup: 1,
      maxTeamsPerGroup: 1,
      maxStudentsPerTeam: 1,
    },
  });

  const isEditing = !!programme;
  const isLoadingAction =
    createProgramme.isPending || updateProgramme.isPending;
  const { isValid } = form.formState;

  // Fetch details if viewing (readOnly)
  const { data: details, isLoading: isLoadingDetails } = useProgramme(
    festivalId,
    open && readOnly ? programme?.id : undefined,
  );

  useEffect(() => {
    if (open) {
      if (programme) {
        form.reset({
          name: programme.name || "",
          categoryId: programme.categoryId || "",
          type: programme.type || "INDIVIDUAL",
          stageType: programme.stageType || "STAGE",
          maxParticipantsPerGroup: programme.maxParticipantsPerGroup || 1,
          maxTeamsPerGroup: programme.maxTeamsPerGroup || 1,
          maxStudentsPerTeam: programme.maxStudentsPerTeam || 1,
        });
      } else {
        form.reset({
          name: "",
          categoryId: "",
          type: "INDIVIDUAL",
          stageType: "STAGE",
          maxParticipantsPerGroup: 1,
          maxTeamsPerGroup: 1,
          maxStudentsPerTeam: 1,
        });
      }
      form.trigger();
    }
  }, [open, programme, form]);

  const programmeType = form.watch("type");

  const syncHiddenLimitFields = useCallback(
    (type: ProgrammeFormValues["type"]) => {
      if (type === "GROUP") {
        const current = form.getValues("maxParticipantsPerGroup");
        if (current === undefined || Number.isNaN(Number(current))) {
          form.setValue("maxParticipantsPerGroup", 1, { shouldValidate: true });
        }
      } else {
        const teams = form.getValues("maxTeamsPerGroup");
        const students = form.getValues("maxStudentsPerTeam");
        if (teams === undefined || Number.isNaN(Number(teams))) {
          form.setValue("maxTeamsPerGroup", 1, { shouldValidate: true });
        }
        if (students === undefined || Number.isNaN(Number(students))) {
          form.setValue("maxStudentsPerTeam", 1, { shouldValidate: true });
        }
      }
    },
    [form],
  );

  useEffect(() => {
    if (!open || readOnly) return;
    syncHiddenLimitFields(programmeType);
    void form.trigger();
  }, [programmeType, open, readOnly, form, syncHiddenLimitFields]);

  const onSubmit = async (data: ProgrammeFormValues) => {
    if (readOnly) return;
    try {
      if (isEditing && programme) {
        await updateProgramme.mutateAsync({
          festivalId,
          programmeId: programme.id,
          data,
        });
      } else {
        await createProgramme.mutateAsync({ festivalId, data });
      }
      setOpen(false);
    } catch (error: any) {
      // Inline error handling
      const message = error.message || "An error occurred";
      if (message.toLowerCase().includes("already exists")) {
        form.setError("name", { message });
      } else {
        toast.error(message);
      }
    }
  };

  const renderDetails = () => {
    if (isLoadingDetails) {
      return (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!details) return <div className="p-4">Failed to load details.</div>;

    const assignments = details.assignments || [];

    return (
      <div className="flex flex-col flex-1 min-h-0 space-y-4 py-1">
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground">Category</span>
              <div className="font-medium">{details.category?.name}</div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Type</span>
              <div className="flex gap-2">
                <Badge variant="outline">{details.type}</Badge>
                <Badge variant="secondary">
                  {details.stageType === "STAGE" ? "Stage" : "Off-Stage"}
                </Badge>
              </div>
            </div>
            {details.type === "INDIVIDUAL" ? (
              <div className="space-y-1">
                <span className="text-muted-foreground">Max Entries/Group</span>
                <div className="font-medium">
                  {details.maxParticipantsPerGroup}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Max Teams/Group</span>
                  <div className="font-medium">{details.maxTeamsPerGroup}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Students/Team</span>
                  <div className="font-medium">
                    {details.maxStudentsPerTeam}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                Assigned Students ({assignments.length})
              </h4>
            </div>
            <div className="rounded-md border flex-1 min-h-[200px] max-h-[350px] overflow-hidden flex flex-col">
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Group</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment: any, index: number) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="text-muted-foreground text-xs">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {assignment.student?.name}
                        </TableCell>
                        <TableCell>
                          {assignment.student?.group ? (
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    assignment.student.group.color || "#2563eb",
                                }}
                              />
                              <span className="font-medium">
                                {assignment.student.group.name}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {assignments.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="h-24 text-center text-muted-foreground"
                        >
                          <div className="flex flex-col items-center justify-center gap-1">
                            <User className="h-5 w-5 text-muted-foreground/50" />
                            <span className="text-xs">No assignments yet</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        </div>

        <DrawerFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </DrawerFooter>
      </div>
    );
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DrawerTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Programme
            </Button>
          )}
        </DrawerTrigger>
      )}
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {readOnly
              ? form.getValues("name")
              : isEditing
                ? "Edit Programme"
                : "Create Programme"}
          </DrawerTitle>
          <DrawerDescription>
            {readOnly
              ? "View programme details and assignments."
              : "Configure programme rules."}
          </DrawerDescription>
        </DrawerHeader>

        {readOnly ? (
          renderDetails()
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex-1 overflow-y-auto px-1 min-h-0 space-y-3 sm:space-y-4 py-1 pb-5">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingAction}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name} ({cat.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Programme Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Recitation"
                          disabled={isLoadingAction}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          onValueChange={(
                            value: ProgrammeFormValues["type"],
                          ) => {
                            field.onChange(value);
                            syncHiddenLimitFields(value);
                          }}
                          value={field.value}
                          disabled={isLoadingAction}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="INDIVIDUAL">
                              Individual
                            </SelectItem>
                            <SelectItem value="GROUP">Group</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stageType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stage Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isLoadingAction}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select stage type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="STAGE">On Stage</SelectItem>
                            <SelectItem value="OFF_STAGE">Off Stage</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {programmeType === "INDIVIDUAL" ? (
                    <FormField
                      control={form.control}
                      name="maxParticipantsPerGroup"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Max Participants Per Group</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              disabled={isLoadingAction}
                              {...field}
                              value={field.value ?? 0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name="maxTeamsPerGroup"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Teams Per Group</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                disabled={isLoadingAction}
                                {...field}
                                value={field.value ?? 0}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxStudentsPerTeam"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Students Per Team</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                disabled={isLoadingAction}
                                {...field}
                                value={field.value ?? 0}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              </div>

              <DrawerFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isLoadingAction}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!isValid || isLoadingAction}>
                  {isLoadingAction && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? "Save Changes" : "Create"}
                </Button>
              </DrawerFooter>
            </form>
          </Form>
        )}
      </DrawerContent>
    </Drawer>
  );
}
