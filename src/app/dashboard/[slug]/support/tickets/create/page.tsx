import CreateTicketForm from "./CreateTicketForm";

export default async function CreateTicketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CreateTicketForm slug={slug} />;
}
