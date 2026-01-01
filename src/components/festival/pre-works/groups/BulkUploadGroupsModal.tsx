"use client";

import { bulkCreateGroupsAction } from "@/server/actions/group.actions";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  BulkUploadFlow,
  type ParsedItem,
} from "@/components/common/bulk-upload/BulkUploadFlow";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// --- Types & Schema ---

interface GroupData {
  name: string;
}

const GroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type GroupFormValues = z.infer<typeof GroupSchema>;

// --- Parsing Logic ---

const parseGroupRow = (row: any[], index: number): ParsedItem<GroupData> => {
  const name = row[0]?.toString().trim() || "";

  const errors: string[] = [];
  if (!name) errors.push("Name is required");

  return {
    id: "", // Will be filled by flow
    originalRowIndex: index,
    data: {
      name,
    },
    isValid: errors.length === 0,
    errors,
  };
};

// --- Edit Component ---

function GroupEditForm({
  data,
  onSave,
  onCancel,
}: {
  data: GroupData;
  onSave: (updated: GroupData) => void;
  onCancel: () => void;
}) {
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(GroupSchema),
    defaultValues: {
      name: data.name,
    },
  });

  const onSubmit = (values: GroupFormValues) => {
    onSave({
      name: values.name,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Red House" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Form>
  );
}

// --- Main Component ---

interface BulkUploadGroupsModalProps {
  festivalId: string;
  trigger?: React.ReactNode;
}

export function BulkUploadGroupsModal({
  festivalId,
  trigger,
}: BulkUploadGroupsModalProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleCommit = async (validItems: GroupData[]) => {
    const groupsToCreate = validItems.map((p) => ({
      name: p.name,
    }));

    const result = await bulkCreateGroupsAction(festivalId, groupsToCreate);

    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ["groups", festivalId] });
      router.refresh();
    }
    return {
      success: result.success,
      count: result.count,
      error: result.error,
    };
  };

  return (
    <BulkUploadFlow<GroupData>
      trigger={trigger}
      title="Bulk Upload Groups"
      templateName="groups_template.xlsx"
      templateHeaders={["Group Name"]}
      templateData={[
        ["Red House"],
        ["Blue House"],
        ["Green House"],
        ["Yellow House"],
      ]}
      parseRow={parseGroupRow}
      onCommit={handleCommit}
      EditComponent={GroupEditForm}
      columns={[
        {
          header: "Group Name",
          width: "300px",
          cell: (item) => <span className="font-semibold">{item.name}</span>,
        },
      ]}
    />
  );
}
