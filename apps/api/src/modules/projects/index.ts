import { Elysia } from "elysia";

import { fromResponse } from "../../lib/from-response";
import * as list from "./service/list";
import * as bySlug from "./service/by-slug";
import * as members from "./service/members";
import * as docs from "./service/docs";
import * as assets from "./service/assets";
import * as activity from "./service/activity";
import * as analytics from "./service/analytics";

/** Projects controller — 1 Elysia instance = 1 controller */
export const projectRoutes = new Elysia({
  prefix: "/api/projects",
  tags: ["Projects"],
})
  .get("/", async ({ request, set }) =>
    fromResponse(set, await list.GET(request)),
  )
  .post("/", async ({ request, set }) =>
    fromResponse(set, await list.POST(request)),
  )
  .get("/:slug", async ({ request, set, params }) =>
    fromResponse(set, await bySlug.GET(request, params)),
  )
  .patch("/:slug", async ({ request, set, params }) =>
    fromResponse(set, await bySlug.PATCH(request, params)),
  )
  .delete("/:slug", async ({ request, set, params }) =>
    fromResponse(set, await bySlug.DELETE(request, params)),
  )
  .post("/:slug/members", async ({ request, set, params }) =>
    fromResponse(set, await members.POST(request, params)),
  )
  .delete("/:slug/members", async ({ request, set, params }) =>
    fromResponse(set, await members.DELETE(request, params)),
  )
  .post("/:slug/docs", async ({ request, set, params }) =>
    fromResponse(set, await docs.POST(request, params)),
  )
  .patch("/:slug/docs", async ({ request, set, params }) =>
    fromResponse(set, await docs.PATCH(request, params)),
  )
  .delete("/:slug/docs", async ({ request, set, params }) =>
    fromResponse(set, await docs.DELETE(request, params)),
  )
  .post("/:slug/assets", async ({ request, set, params }) =>
    fromResponse(set, await assets.POST(request, params)),
  )
  .patch("/:slug/assets", async ({ request, set, params }) =>
    fromResponse(set, await assets.PATCH(request, params)),
  )
  .delete("/:slug/assets", async ({ request, set, params }) =>
    fromResponse(set, await assets.DELETE(request, params)),
  )
  .get("/:slug/activity", async ({ request, set, params }) =>
    fromResponse(set, await activity.GET(request, params)),
  )
  .get("/:slug/analytics", async ({ request, set, params }) =>
    fromResponse(set, await analytics.GET(request, params)),
  );
