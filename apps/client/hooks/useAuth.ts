import { authClient } from "@/lib/auth/auth.client";

export const useAuth = () => {
  const { data, isPending } = authClient.useSession();
  const { data: activeOrganization, isPending: isOrgPending } =
    authClient.useActiveOrganization();

  if (isPending) {
    return {
      role: null,
      isPending: true,
      activeOrganization: null,
      orgRole: null,
    };
  }

  const membership = activeOrganization?.members?.find(
    (member) => member.userId === data?.user.id,
  );

  return {
    role: (membership?.role as string | undefined) ?? data?.user.role ?? null,
    isPending: false,
    isOrgPending,
    user: data?.user,
    activeOrganization: activeOrganization ?? null,
    orgRole: (membership?.role as string | undefined) ?? null,
    activeOrganizationId: data?.session?.activeOrganizationId ?? null,
  };
};
