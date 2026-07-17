import { CreateInviteDialog } from "@/components/admin/create-invite-dialog";
import { InvitesTable } from "@/components/admin/invites-table";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invites Management ",
  description: "Manage and send invitations to new team members.",
};

export default function page() {
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
