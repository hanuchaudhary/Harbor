import { UserDetailScreen } from "@/screens/admin/user-detail-screen";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return {
    title: "User Details",
    description: "View and manage user information, roles, and permissions.",
  };
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UserDetailScreen userId={id} />;
}
