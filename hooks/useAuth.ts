import { authClient } from "@/lib/auth/auth.client";

export const useAuth = () => {
  const { data, isPending } = authClient.useSession();
  if (isPending) {
    return {
      role: null,
      isPending: true,
    };
  }
  return {
    role: data?.user.role,
    isPending: false,
    user: data?.user,
  };
};
