import { CreateInviteDialog } from "@/components/admin/create-invite-dialog";
import { InvitesTable } from "@/components/admin/invites-table";

export function InvitesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Invites</h1>
          <p className="text-muted-foreground">
            Manage all invites, resend or revoke them
          </p>
        </div>
        <CreateInviteDialog />
      </div>

      <InvitesTable />
    </div>
  );
}
