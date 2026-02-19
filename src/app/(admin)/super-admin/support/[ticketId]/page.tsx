import AdminTicketDetailsClient from "./AdminTicketDetailsClient";

export default async function AdminTicketDetailsPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  return <AdminTicketDetailsClient ticketId={ticketId} />;
}
