import { Label } from "@/components/ui/label";
import UserAvatar from "@/components/user-avatar";
import {
  AddProjectMember,
  RemoveMemberButton,
} from "@/components/projects/add-project-member";
import { ROLE } from "@/types/types";

interface MembersTabProps {
  projectSlug: string;
  role: ROLE;
  isEditable: boolean;
  data: {
    members: Array<{
      id: string;
      userId: string;
      user: { id: string; name: string; email: string; image: string };
    }>;
    clients?: Array<{
      user: { id: string; name: string; email: string; image: string };
    }>;
  };
}

export function MembersTab({
  projectSlug,
  isEditable,
  data,
  role,
}: MembersTabProps) {
  const clients = data.clients ?? [];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label>Team Members ({data.members.length})</Label>
        {!isEditable && (
          <AddProjectMember
            projectSlug={projectSlug}
            existingMemberIds={data.members.map((m) => m.user.id)}
            existingClientIds={clients.map((c) => c.user.id)}
          />
        )}
      </div>

      {data.members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No team members yet.</p>
      ) : (
        <div className="border divide-y">
          {data.members.map(({ user }) => (
            <div
              key={user.id}
              className="flex items-center justify-between gap-3 p-3 bg-card"
            >
              <div className="flex items-center gap-3">
                <UserAvatar src={user.image} alt={user.name} />
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              {!isEditable && (
                <RemoveMemberButton
                  projectSlug={projectSlug}
                  userId={user.id}
                  userName={user.name}
                  type="member"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {role === "ADMIN" && (
        <div className="pt-4">
          <Label>Clients ({clients.length})</Label>
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-6">
              No clients yet.
            </p>
          ) : (
            <div className="mt-2 border divide-y">
              {clients.map(({ user }) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 p-3 bg-card"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar src={user.image} alt={user.name} />
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  {!isEditable && (
                    <RemoveMemberButton
                      projectSlug={projectSlug}
                      userId={user.id}
                      userName={user.name}
                      type="client"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
