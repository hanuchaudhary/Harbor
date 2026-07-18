import { ClientProjectDetail } from "@/screens/client/ClientProjectDetail";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project",
};

export default async function page({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id, slug } = await params;
  return <ClientProjectDetail slug={slug} userId={id} />;
}
