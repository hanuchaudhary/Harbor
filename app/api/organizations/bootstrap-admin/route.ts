import { NextResponse } from "next/server";

import {
  isOrgAdmin,
  requireActiveMembership,
} from "@/lib/auth/org";
import prisma from "@/lib/prisma";

/** Sync User.role to ADMIN for org creators (legacy session role checks). */
export async function PATCH() {
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

  await prisma.user.update({
    where: { id: result.session.user.id },
    data: { role: "ADMIN" },
  });

  return NextResponse.json({ message: "Admin role synced" });
}
