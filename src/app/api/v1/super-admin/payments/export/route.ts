import "server-only";

import { forbidden, unauthorized } from "@/api/lib";
import { getSession } from "@/core/auth/session";
import { adminService } from "@/features/admin/services/admin.service";

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export const GET = async (req: Request) => {
  const session = await getSession();
  if (!session?.userId) return unauthorized();
  if (session.role !== "SUPER_ADMIN") return forbidden();

  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const tier = url.searchParams.get("tier") || undefined;

  const { items } = await adminService.getPaymentsWithMetricsForAdmin({
    q,
    status,
    tier,
    page: 1,
    pageSize: 10000,
  });

  const headers = [
    "Payment ID",
    "Created Date",
    "Status",
    "Amount",
    "Currency",
    "Plan Tier",
    "Customer Name",
    "Customer Email",
    "Razorpay Order ID",
    "Razorpay Payment ID",
    "Festival Context",
    "Valid Until",
  ];

  const rows = items.map((p) => [
    escapeCsvField(p.id),
    escapeCsvField(p.createdAt ? new Date(p.createdAt).toISOString() : ""),
    escapeCsvField(p.status),
    escapeCsvField(p.amount),
    escapeCsvField(p.currency),
    escapeCsvField(p.tier),
    escapeCsvField(p.user?.fullName || "N/A"),
    escapeCsvField(p.user?.email || "N/A"),
    escapeCsvField(p.providerId),
    escapeCsvField(p.referenceId || "N/A"),
    escapeCsvField(p.festival?.name || "Unclaimed Plan Credit"),
    escapeCsvField(p.validUntil ? new Date(p.validUntil).toISOString() : "N/A"),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
    "\r\n",
  );

  const dateStr = new Date().toISOString().split("T")[0];

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-export-${dateStr}.csv"`,
      "Cache-Control": "no-store",
    },
  });
};
