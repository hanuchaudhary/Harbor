import { authClient } from "@/lib/auth.client";
import { asSessionUser } from "@/lib/auth/session";

export const useAuth = () => {
  const { data, isPending } = authClient.useSession();
  const { data: activeOrganization, isPending: isOrgPending } =
    authClient.useActiveOrganization();
  const user = asSessionUser(data?.user);

  if (isPending) {
    return {
      role: null as string | null,
      isPending: true,
      activeOrganization: null,
      orgRole: null as string | null,
      user: null,
      activeOrganizationId: null as string | null,
      isOrgPending: true,
    };
  }

  const members = (activeOrganization as { members?: Array<{ userId: string; role?: string }> } | null)
    ?.members;
  const membership = members?.find((member) => member.userId === user?.id);

  return {
    role: (membership?.role as string | undefined) ?? user?.role ?? null,
    isPending: false,
    isOrgPending,
    user,
    activeOrganization: activeOrganization ?? null,
    orgRole: (membership?.role as string | undefined) ?? null,
    activeOrganizationId: data?.session?.activeOrganizationId ?? null,
  };
};
