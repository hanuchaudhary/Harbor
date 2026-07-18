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
import {
  parseOrgPreferences,
  resolveWorkflowStatuses,
  getEnabledWorkflowStatuses,
  validateWorkflowStatusesInput,
  type OrgPreferences,
} from "../../lib/workflow";

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
  .get("/workflow", async ({ request, set }) => {
    const result = await requireActiveMembership(request.headers);
    if ("error" in result) return authError(set, result.error);

    const preferences = parseOrgPreferences(result.organization.metadata);
    const statuses = resolveWorkflowStatuses(preferences);
    const enabled = getEnabledWorkflowStatuses(preferences);

    return {
      statuses,
      enabled,
      preferences: {
        defaultTrackerView: preferences.defaultTrackerView ?? "kanban",
        weekStartsOn: preferences.weekStartsOn ?? "monday",
      },
    };
  })
  .get("/settings", async ({ request, set }) => {
    const result = await requireActiveMembership(request.headers);
    if ("error" in result) return authError(set, result.error);
    if (!isOrgAdmin(result.memberRole)) return forbidden(set);

    const [memberCount, projectCount, inviteCount] = await Promise.all([
      prisma.member.count({ where: { organizationId: result.organizationId } }),
      prisma.project.count({
        where: { organizationId: result.organizationId },
      }),
      prisma.invitation.count({
        where: { organizationId: result.organizationId, status: "pending" },
      }),
    ]);

    const preferences = parseOrgPreferences(result.organization.metadata);
    const workflowStatuses = resolveWorkflowStatuses(preferences);

    return {
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        logo: result.organization.logo ?? null,
        onboardingCompletedAt: result.organization.onboardingCompletedAt,
        preferences: {
          ...preferences,
          workflowStatuses,
        },
      },
      counts: {
        members: memberCount,
        projects: projectCount,
        pendingInvites: inviteCount,
      },
    };
  })
  .patch("/settings", async ({ request, set }) => {
    const result = await requireActiveMembership(request.headers);
    if ("error" in result) return authError(set, result.error);
    if (!isOrgAdmin(result.memberRole)) return forbidden(set);

    const body = (await request.json()) as {
      name?: string;
      slug?: string;
      logo?: string | null;
      preferences?: OrgPreferences;
    };

    const name = body.name?.trim();
    const slug = body.slug?.trim().toLowerCase();
    const logo =
      body.logo === undefined
        ? undefined
        : body.logo === null || body.logo.trim() === ""
          ? null
          : body.logo.trim();

    if (name !== undefined && name.length < 2) {
      return badRequest(set, "Organization name must be at least 2 characters");
    }

    if (slug !== undefined) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return badRequest(
          set,
          "Slug must be lowercase letters, numbers, and hyphens",
        );
      }
      const taken = await prisma.organization.findFirst({
        where: {
          slug,
          NOT: { id: result.organizationId },
        },
        select: { id: true },
      });
      if (taken) return badRequest(set, "That slug is already taken");
    }

    let metadata: string | undefined;
    if (body.preferences !== undefined) {
      const existing = parseOrgPreferences(result.organization.metadata);
      const nextPrefs: OrgPreferences = { ...existing };

      if (body.preferences.defaultTrackerView !== undefined) {
        nextPrefs.defaultTrackerView = String(
          body.preferences.defaultTrackerView,
        );
      }
      if (body.preferences.weekStartsOn !== undefined) {
        nextPrefs.weekStartsOn = String(body.preferences.weekStartsOn);
      }

      if (body.preferences.workflowStatuses !== undefined) {
        const validated = validateWorkflowStatusesInput(
          body.preferences.workflowStatuses,
        );
        if (!validated.ok) {
          return badRequest(set, validated.error);
        }
        nextPrefs.workflowStatuses = validated.value;
      }

      metadata = JSON.stringify(nextPrefs);
    }

    const organization = await prisma.organization.update({
      where: { id: result.organizationId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(logo !== undefined ? { logo } : {}),
        ...(metadata !== undefined ? { metadata } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        metadata: true,
        onboardingCompletedAt: true,
      },
    });

    const preferences = parseOrgPreferences(organization.metadata);
    const workflowStatuses = resolveWorkflowStatuses(preferences);

    return {
      message: "Organization settings updated",
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        onboardingCompletedAt: organization.onboardingCompletedAt,
        preferences: {
          ...preferences,
          workflowStatuses,
        },
      },
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
