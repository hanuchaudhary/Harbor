import { auth } from "../../../lib/auth";

import { prisma } from "@repo/db";

export async function GET(request: Request, params: Record<string, string>) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { channelId } = params;

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                lastSeenAt: true,
                role: true,
              },
            },
          },
        },
        project: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    role: true,
                    lastSeenAt: true,
                  },
                },
              },
            },
            clients: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    lastSeenAt: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!channel) {
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }

    if (channel.type === "ALL" || channel.type === "ANNOUNCEMENT") {
      const allUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          lastSeenAt: true,
        },
        orderBy: { name: "asc" },
      });
      return Response.json({ members: allUsers });
    }

    if (channel.type === "PROJECT_MANAGERS") {
      const pms = await prisma.user.findMany({
        where: { isActive: true, role: "PROJECT_MANAGER" },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          lastSeenAt: true,
        },
        orderBy: { name: "asc" },
      });
      return Response.json({ members: pms });
    }

    if (channel.projectId && channel.project) {
      const projectMembers = channel.project.members.map((m) => m.user);
      const projectClients = channel.project.clients.map((c) => c.user);

      let filtered: typeof projectMembers = [];

      if (channel.type === "PROJECT_DEV_PM") {
        filtered = projectMembers.filter(
          (u) => u.role === "DEVELOPER" || u.role === "PROJECT_MANAGER",
        );
      } else if (channel.type === "PROJECT_CLIENT_PM") {
        const pmAndDevs = projectMembers.filter(
          (u) => u.role === "PROJECT_MANAGER",
        );
        filtered = [...pmAndDevs, ...projectClients];
      } else if (channel.type === "PROJECT_CLIENT_ADMIN") {
        const admins = projectMembers.filter((u) => u.role === "ADMIN");
        filtered = [...admins, ...projectClients];
      } else {
        filtered = [...projectMembers, ...projectClients];
      }

      const unique = Array.from(
        new Map(filtered.map((u) => [u.id, u])).values(),
      );
      return Response.json({ members: unique });
    }

    const members = channel.members.map((m) => m.user);
    return Response.json({ members });
  } catch (error) {
    console.error("Error fetching channel members:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
