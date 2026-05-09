"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { AlertCircle, ArrowUpDown, CreditCard, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type Payment,
  useSuperAdminPayments,
} from "@/features/payments/hooks/use-super-admin-payments";
import { parseStoredInstant } from "@/core/utils/date-time";

const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) =>
      format(
        parseStoredInstant(row.getValue("createdAt") as string | Date),
        "dd MMM yyyy, hh:mm a",
      ),
  },
  {
    accessorKey: "user.fullName",
    header: "User",
    cell: ({ row }) => {
      const user = row.original.user;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{user.fullName || "N/A"}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "razorpayOrderId",
    header: "Order ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.getValue("razorpayOrderId") || "-"}
      </span>
    ),
  },

  {
    accessorKey: "festival.name",
    header: "Festival",
    cell: ({ row }) => row.original.festival?.name || "-",
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(amount / 100); // Amount is in paise

      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;

      let variant: "default" | "secondary" | "destructive" | "outline" =
        "outline";
      if (status === "COMPLETED") variant = "default"; // shadcn's default is closer to primary
      if (status === "PENDING") variant = "secondary";
      if (status === "FAILED") variant = "destructive";
      if (status === "EXPIRED") variant = "destructive";

      // Custom color overrides if badge variants aren't enough
      let className = "";
      if (status === "COMPLETED")
        className =
          "bg-green-100 text-green-800 border-green-200 hover:bg-green-100";
      if (status === "PENDING")
        className =
          "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100";
      if (status === "FAILED" || status === "EXPIRED")
        className = "bg-red-100 text-red-800 border-red-200 hover:bg-red-100";

      return (
        <Badge variant={variant} className={className}>
          {status}
        </Badge>
      );
    },
  },
];

export function PaymentsTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { data: payments = [], isLoading } = useSuperAdminPayments();

  const table = useReactTable({
    data: payments,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center border rounded-md">
        <div className="flex flex-col items-center gap-2">
          <CreditCard className="h-8 w-8 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading payments...</p>
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center border rounded-md bg-muted/10">
        <div className="flex flex-col items-center gap-2 text-center max-w-sm">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <h3 className="font-semibold text-lg">No Payments Found</h3>
          <p className="text-sm text-muted-foreground">
            No payment transactions have been recorded on the platform yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter emails..."
            value={
              (table.getColumn("user.fullName")?.getFilterValue() as string) ??
              ""
            }
            onChange={(event) =>
              // Note: Filtering by nested accessor might need custom filter function or flattened data if simple string match fails,
              // but usually works if accessor is set correctly.
              // Wait, default filter on accessorKey "user.fullName" works on the value returned by accessor.
              // Actually, let's filter by the email/name column we displayed.
              // But accessors with dots require careful handling in some versions.
              // For simplicity, let's stick to filtering by email or simple text.
              // Let's filter global or one specific column.
              table
                .getColumn("user.fullName")
                ?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Total: {payments.length} transactions
          </span>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
