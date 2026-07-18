import { Navigate, Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { authClient, useSession } from "@/lib/auth.client";
import { asSessionUser } from "@/lib/auth/session";
import { organizationsApi } from "@/lib/api";

const PUBLIC_ROUTES = [
  "/",
  "/signin",
  "/register",
  "/accept-invite",
  "/forgot",
  "/reset",
];

function isPublicPath(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function AuthGate({ children }: { children?: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const location = useLocation();
  const pathname = location.pathname;
  const publicPath = isPublicPath(pathname);
  const onOnboarding = pathname.startsWith("/onboarding");
  const user = asSessionUser(session?.user);

  const onboardingQuery = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: () => organizationsApi.onboardingStatus(),
    enabled: !!user,
    staleTime: 30_000,
    retry: false,
  });

  // Keep client session in sync when the API auto-selects an active org.
  useEffect(() => {
    const orgId = onboardingQuery.data?.activeOrganizationId;
    const current = session?.session?.activeOrganizationId;
    if (!orgId || orgId === current) return;

    void authClient.organization.setActive({ organizationId: orgId });
  }, [
    onboardingQuery.data?.activeOrganizationId,
    session?.session?.activeOrganizationId,
  ]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    if (publicPath) return <>{children ?? <Outlet />}</>;
    return <Navigate to="/signin" replace state={{ from: pathname }} />;
  }

  const needsOnboarding = Boolean(onboardingQuery.data?.needsOnboarding);

  if (onboardingQuery.isLoading && !publicPath) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (needsOnboarding && !onOnboarding && !publicPath) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!needsOnboarding && onOnboarding) {
    return <Navigate to="/projects" replace />;
  }

  if (pathname === "/signin" || pathname === "/register") {
    if (needsOnboarding) return <Navigate to="/onboarding" replace />;
    const role = user.role;
    if (role === "ADMIN") return <Navigate to="/admin" replace />;
    if (role === "CLIENT") return <Navigate to={`/${user.id}`} replace />;
    return <Navigate to="/projects" replace />;
  }

  return <>{children ?? <Outlet />}</>;
}

export function ProtectedLayout() {
  return (
    <AuthGate>
      <Outlet />
    </AuthGate>
  );
}

export function RoleGate({
  allow,
  children,
}: {
  allow: string[];
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const role = asSessionUser(session?.user)?.role;
  if (!role || !allow.includes(role)) {
    return <Navigate to="/projects" replace />;
  }
  return <>{children}</>;
}
