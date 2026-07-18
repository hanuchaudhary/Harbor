import { AdminDashboard } from "@/screens/admin/admin-dashboard";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { userId } = await searchParams;
  return <AdminDashboard initialActivityUserId={userId} />;
}
