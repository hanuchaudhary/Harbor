import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";

const adminOnlyRoutes = [
  "/register",
  "/admin/users",
  "/admin/projects",
  "/admin/invites",
  // "/projects/new",
];
const operationsRoutes = ["/admin", "/analytics"];

export default async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  // console.log("Proxy middleware running for:", request.nextUrl.pathname);
  const { pathname } = request.nextUrl;
  const role = session?.user?.role;

  if (!session) {
    if (pathname !== "/signin") {
      return NextResponse.redirect(new URL("/signin", request.url));
    }
    return NextResponse.next();
  }

  if (session && pathname === "/signin") {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    } else if (role === "CLIENT") {
      return NextResponse.redirect(new URL(`/${session.user.id}`, request.url));
    } else {
      return NextResponse.redirect(new URL("/projects", request.url));
    }
  }

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
  matcher: ["/signin", "/admin/:path*", "/analytics", "/projects/new"],
};
