import { CreateInviteDialog } from "@/components/admin/create-invite-dialog";
import { UsersTable } from "@/components/admin/users-table";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users Management ",
  description: "Manage all users, roles, and permissions across the platform.",
};

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1>Users</h1>
          <p className="text-muted-foreground">
            Manage all users and their roles
          </p>
        </div>
        <CreateInviteDialog />
      </div>
      <UsersTable />
    </div>
  );
}
