import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { getUserOnboardingState } from "@/lib/auth/org";

const publicRoutes = [
  "/",
  "/signin",
  "/register",
  "/accept-invite",
  "/forgot",
  "/reset",
];

const adminOnlyRoutes = ["/admin/users", "/admin/invites"];
const operationsRoutes = ["/admin", "/analytics"];

export default async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const { pathname } = request.nextUrl;
  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (!session) {
    if (isPublic) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  const onboarding = await getUserOnboardingState(session.user.id);
  const onOnboarding = pathname.startsWith("/onboarding");

  if (onboarding.needsOnboarding && !onOnboarding && !isPublic) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (!onboarding.needsOnboarding && onOnboarding) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  if (pathname === "/signin" || pathname === "/register") {
    if (onboarding.needsOnboarding) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    const role =
      onboarding.memberships.find(
        (m) =>
          m.organizationId === session.session.activeOrganizationId,
      )?.role ?? session.user.role;

    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (role === "CLIENT") {
      return NextResponse.redirect(
        new URL(`/${session.user.id}`, request.url),
      );
    }
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  if (onOnboarding || isPublic) {
    return NextResponse.next();
  }

  const activeMembership = onboarding.memberships.find(
    (m) => m.organizationId === session.session.activeOrganizationId,
  );
  const role = activeMembership?.role ?? session.user.role;

  if (adminOnlyRoutes.some((route) => pathname.startsWith(route))) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/projects", request.url));
    }
  }

  if (operationsRoutes.includes(pathname)) {
    if (role !== "ADMIN" && role !== "PROJECT_MANAGER") {
      return NextResponse.redirect(new URL("/projects", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/signin",
    "/register",
    "/onboarding",
    "/accept-invite",
    "/admin/:path*",
    "/analytics",
    "/projects/:path*",
    "/tracker/:path*",
    "/dashboard",
    "/office",
    "/profile",
    "/notifications",
  ],
};
