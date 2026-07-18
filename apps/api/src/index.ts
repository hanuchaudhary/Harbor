import "dotenv/config";
import cors from "@elysiajs/cors";
import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";

import { betterAuthPlugin, OpenAPI } from "./lib/plugin";
import { activeRoutes } from "./modules/active";
import { adminRoutes } from "./modules/admin";
import { channelRoutes } from "./modules/channels";
import { clientRoutes } from "./modules/client";
import { githubRoutes } from "./modules/github";
import { inviteRoutes } from "./modules/invite";
import { membersRoutes } from "./modules/members";
import { notificationRoutes } from "./modules/notifications";
import { organizationRoutes } from "./modules/organizations";
import { profileRoutes } from "./modules/profile";
import { projectRoutes } from "./modules/projects";
import { tagRoutes } from "./modules/tags";
import { taskRoutes } from "./modules/tasks";
import { timelogRoutes } from "./modules/timelogs";
import { uploadRoutes } from "./modules/upload";
import { userRoutes } from "./modules/users";

const app = new Elysia()
  .use(
    cors({
      origin: [
        "http://localhost:3001",
        "http://localhost:3000",
        "http://localhost:5173",
      ],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )
  .use(
    openapi({
      documentation: {
        info: {
          title: "Harbor API",
          description: "Harbor CRM API",
          version: "1.0.0",
        },
        tags: [
          { name: "Authentication" },
          { name: "Profile" },
          { name: "Members" },
          { name: "Invite" },
          { name: "Organizations" },
          { name: "Projects" },
          { name: "Client" },
          { name: "Tags" },
          { name: "Tasks" },
          { name: "Timelogs" },
          { name: "Active" },
          { name: "Channels" },
          { name: "Users" },
          { name: "Admin" },
          { name: "Notifications" },
          { name: "GitHub" },
          { name: "Upload" },
        ],
        components: await OpenAPI.components,
        paths: await OpenAPI.getPaths(),
      },
    }),
  )
  .use(betterAuthPlugin)
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))
  .use(profileRoutes)
  .use(membersRoutes)
  .use(inviteRoutes)
  .use(organizationRoutes)
  .use(projectRoutes)
  .use(clientRoutes)
  .use(tagRoutes)
  .use(taskRoutes)
  .use(timelogRoutes)
  .use(activeRoutes)
  .use(channelRoutes)
  .use(userRoutes)
  .use(adminRoutes)
  .use(notificationRoutes)
  .use(githubRoutes)
  .use(uploadRoutes)
  .listen(3001);

console.log(
  `🦊 Harbor API running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
