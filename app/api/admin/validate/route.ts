import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { key } = await req.json();

  const adminKey = process.env.ADMIN_REGISTER_KEY;

  if (!adminKey) {
    return NextResponse.json(
      { error: "Registration is disabled" },
      { status: 403 },
    );
  }
  
  if (key !== adminKey) {
    return NextResponse.json({ error: "Invalid key" }, { status: 401 });
  }

  return NextResponse.json({ valid: true });
}
