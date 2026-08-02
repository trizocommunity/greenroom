import { redirect } from "next/navigation";

export default async function AnnouncerOverviewRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/dashboard/${slug}/event-works/announcer`);
}
