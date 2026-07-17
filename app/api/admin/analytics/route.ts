import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getPlatformAnalytics } from "@/lib/analytics/platform";
import {
  canViewPlatformAnalytics,
  parseAnalyticsRange,
} from "@/lib/analytics/utils";
import { auth } from "@/lib/auth/auth";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!canViewPlatformAnalytics(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const requestedRange = parseAnalyticsRange(
    new URL(request.url).searchParams.get("range"),
  );
  if (requestedRange === null) {
    return NextResponse.json(
      { message: "Range must be one of 7, 30, or 90 days" },
      { status: 400 },
    );
  }

  const analytics = await getPlatformAnalytics(requestedRange);
  return NextResponse.json(analytics);
}
