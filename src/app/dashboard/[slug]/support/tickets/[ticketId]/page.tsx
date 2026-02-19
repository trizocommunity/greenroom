import TicketDetailsClient from "./TicketDetailsClient";

export default async function TicketDetailsPage({
  params,
}: {
  params: Promise<{ slug: string; ticketId: string }>;
}) {
  const { slug, ticketId } = await params;
  return <TicketDetailsClient slug={slug} ticketId={ticketId} />;
}
