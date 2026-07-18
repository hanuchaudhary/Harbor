import { NextResponse } from "next/server";

import {
  isOrgAdmin,
  requireActiveMembership,
} from "@/lib/auth/org";
import prisma from "@/lib/prisma";

export async function POST() {
  const result = await requireActiveMembership();

  if ("error" in result) {
    return NextResponse.json(
      { message: result.error.message },
      { status: result.error.status },
    );
  }

  if (!isOrgAdmin(result.memberRole)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await prisma.organization.update({
    where: { id: result.organizationId },
    data: { onboardingCompletedAt: new Date() },
  });

  return NextResponse.json({ message: "Onboarding completed" });
}
