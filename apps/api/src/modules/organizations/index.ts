import { Elysia } from "elysia";
import { prisma } from "@repo/db";

import {
  authError,
  badRequest,
  forbidden,
  notFound,
} from "../../lib/http";
import {
  ensureActiveOrganization,
  getUserOnboardingState,
  isOrgAdmin,
  requireActiveMembership,
  requireSession,
} from "../../lib/org";

export const organizationRoutes = new Elysia({
  prefix: "/api/organizations",
  tags: ["Organizations"],
})
  .patch("/bootstrap-admin", async ({ request, set }) => {
    const result = await requireActiveMembership(request.headers);
    if ("error" in result) return authError(set, result.error);
    if (!isOrgAdmin(result.memberRole)) return forbidden(set);

    await prisma.user.update({
      where: { id: result.session.user.id },
      data: { role: "ADMIN" },
    });

    return { message: "Admin role synced" };
  })
  .post("/complete-onboarding", async ({ request, set }) => {
    const result = await requireActiveMembership(request.headers);
    if ("error" in result) return authError(set, result.error);
    if (!isOrgAdmin(result.memberRole)) return forbidden(set);

    await prisma.organization.update({
      where: { id: result.organizationId },
      data: { onboardingCompletedAt: new Date() },
    });

    return { message: "Onboarding completed" };
  })
  .get("/onboarding-status", async ({ request, set }) => {
    const result = await requireSession(request.headers);
    if ("error" in result) return authError(set, result.error);

    const state = await getUserOnboardingState(result.session.user.id);
    const activeOrganizationId = await ensureActiveOrganization(
      result.session,
    );

    return {
      needsOnboarding: state.needsOnboarding,
      reason: "reason" in state ? state.reason : undefined,
      organizationId:
        "organizationId" in state ? state.organizationId : undefined,
      activeOrganizationId,
      memberships: state.memberships.map((m) => ({
        organizationId: m.organizationId,
        role: m.role,
        organization: m.organization,
      })),
    };
  })
  .get("/invitations/:id", async ({ params, set }) => {
    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!invitation) return notFound(set, "Invitation not found");

    if (invitation.status !== "pending") {
      return badRequest(set, "Invitation is no longer valid");
    }

    if (invitation.expiresAt < new Date()) {
      return badRequest(set, "Invitation has expired");
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      organizationName: invitation.organization.name,
      organizationSlug: invitation.organization.slug,
    };
  });
