import { Elysia } from "elysia";

import { auth } from "../../lib/auth";
import { S3Fncs } from "../../lib/s3/s3.func";

export const uploadRoutes = new Elysia({
  prefix: "/api/upload",
  tags: ["Upload"],
}).post("/presigned", async ({ request, set }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    set.status = 401;
    return { message: "Unauthorized" };
  }

  const { key, contentType } = (await request.json()) as {
    key?: string;
    contentType?: string;
  };

  if (
    !key ||
    typeof key !== "string" ||
    !contentType ||
    typeof contentType !== "string"
  ) {
    set.status = 400;
    return { message: "key and contentType are required" };
  }

  const presignedUrl = await S3Fncs.getPresignedUrl(key, contentType);
  const fileUrl = `${process.env.S3_PUBLIC_URL}/${key}`;

  return { presignedUrl, fileUrl };
});
