import { ClientPage } from "@/screens/client/ClientPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client",
};

export default async function page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClientPage id={id} />;
}
