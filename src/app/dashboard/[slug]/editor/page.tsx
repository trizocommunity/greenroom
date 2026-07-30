import { redirect } from "next/navigation";

/** Legacy path — editor lives at /{slug}/editor */
export default async function DashboardEditorRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/${slug}/editor`);
}
