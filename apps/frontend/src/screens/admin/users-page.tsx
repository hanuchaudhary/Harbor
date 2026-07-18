import { CreateInviteDialog } from "@/components/admin/create-invite-dialog";
import { UsersTable } from "@/components/admin/users-table";

export function UsersPage() {
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
