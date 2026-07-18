import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, email: true, image: true, role: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch members" },
      { status: 500 },
    );
  }
}
