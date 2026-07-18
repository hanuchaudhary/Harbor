import { NextResponse } from "next/server";

import { getUserOnboardingState, requireSession } from "@/lib/auth/org";

export async function GET() {
  const result = await requireSession();

  if ("error" in result) {
    return NextResponse.json(
      { message: result.error.message },
      { status: result.error.status },
    );
  }

  const state = await getUserOnboardingState(result.session.user.id);

  return NextResponse.json({
    needsOnboarding: state.needsOnboarding,
    reason: "reason" in state ? state.reason : undefined,
    organizationId:
      "organizationId" in state ? state.organizationId : undefined,
    activeOrganizationId: result.session.session.activeOrganizationId ?? null,
  });
}
