import { Elysia } from "elysia";

import { fromResponse } from "../../lib/from-response";
import * as list from "./service/list";
import * as byId from "./service/by-id";
import * as members from "./service/members";
import * as messages from "./service/messages";
import * as message from "./service/message";
import * as read from "./service/read";

export const channelRoutes = new Elysia({
  prefix: "/api/channels",
  tags: ["Channels"],
})
  .get("/", async ({ request, set }) =>
    fromResponse(set, await list.GET(request)),
  )
  .post("/", async ({ request, set }) =>
    fromResponse(set, await list.POST(request)),
  )
  .get("/:channelId", async ({ request, set, params }) =>
    fromResponse(set, await byId.GET(request, params)),
  )
  .patch("/:channelId", async ({ request, set, params }) =>
    fromResponse(set, await byId.PATCH(request, params)),
  )
  .delete("/:channelId", async ({ request, set, params }) =>
    fromResponse(set, await byId.DELETE(request, params)),
  )
  .get("/:channelId/members", async ({ request, set, params }) =>
    fromResponse(set, await members.GET(request, params)),
  )
  .get("/:channelId/messages", async ({ request, set, params }) =>
    fromResponse(set, await messages.GET(request, params)),
  )
  .post("/:channelId/messages", async ({ request, set, params }) =>
    fromResponse(set, await messages.POST(request, params)),
  )
  .patch("/:channelId/messages/:messageId", async ({ request, set, params }) =>
    fromResponse(set, await message.PATCH(request, params)),
  )
  .delete("/:channelId/messages/:messageId", async ({ request, set, params }) =>
    fromResponse(set, await message.DELETE(request, params)),
  )
  .patch("/:channelId/read", async ({ request, set, params }) =>
    fromResponse(set, await read.PATCH(request, params)),
  );
