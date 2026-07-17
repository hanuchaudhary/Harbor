import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { S3Fncs } from "@/lib/s3/s3.func";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { key, contentType } = await request.json();
  if (
    !key ||
    typeof key !== "string" ||
    !contentType ||
    typeof contentType !== "string"
  ) {
    return NextResponse.json(
      { message: "key and contentType are required" },
      { status: 400 },
    );
  }

  const presignedUrl = await S3Fncs.getPresignedUrl(key, contentType);
  const fileUrl = `${process.env.S3_PUBLIC_URL}/${key}`;

  return NextResponse.json({ presignedUrl, fileUrl });
}
