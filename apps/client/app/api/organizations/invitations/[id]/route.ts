import { NextRequest, NextResponse } from "next/server";

import prisma from "@repo/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!invitation) {
    return NextResponse.json(
      { message: "Invitation not found" },
      { status: 404 },
    );
  }

  if (invitation.status !== "pending") {
    return NextResponse.json(
      { message: "Invitation is no longer valid" },
      { status: 400 },
    );
  }

  if (invitation.expiresAt < new Date()) {
    return NextResponse.json(
      { message: "Invitation has expired" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    organizationName: invitation.organization.name,
    organizationSlug: invitation.organization.slug,
  });
}
