import { ClientProjectReport } from "@/screens/client/ClientProjectReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Report",
};

export default async function page({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id, slug } = await params;
  return <ClientProjectReport slug={slug} userId={id} />;
}
