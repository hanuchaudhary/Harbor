import { prisma } from "@repo/db";

import { auth } from "./auth";

export type OrgRole =
  | "ADMIN"
  | "PROJECT_MANAGER"
  | "DEVELOPER"
  | "CLIENT"
  | "PARTNER";

type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;
export type Session = NonNullable<SessionResult>;

export type AuthError = {
  error: { status: 401 | 400 | 403; message: string };
};

export type SessionOk = {
  session: Session;
};

export type MembershipOk = {
  session: Session;
  organizationId: string;
  memberRole: OrgRole;
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    metadata: string | null;
    onboardingCompletedAt: Date | null;
  };
};

export async function requireSession(
  headers: Headers,
): Promise<SessionOk | AuthError> {
  const session = await auth.api.getSession({ headers });

  if (!session) {
    return { error: { status: 401, message: "Unauthorized" } };
  }

  return { session };
}

export async function ensureActiveOrganization(
  session: Session,
): Promise<string | null> {
  const currentId = session.session.activeOrganizationId ?? null;

  if (currentId) {
    const stillMember = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: currentId,
          userId: session.user.id,
        },
      },
      select: { id: true },
    });
    if (stillMember) return currentId;
  }

  const membership = await prisma.member.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true },
  });

  if (!membership) return null;

  await prisma.session.update({
    where: { id: session.session.id },
    data: { activeOrganizationId: membership.organizationId },
  });

  session.session.activeOrganizationId = membership.organizationId;
  return membership.organizationId;
}

export async function requireActiveMembership(
  headers: Headers,
): Promise<MembershipOk | AuthError> {
  const result = await requireSession(headers);
  if ("error" in result) {
    return result;
  }

  const { session } = result;
  const organizationId = await ensureActiveOrganization(session);

  if (!organizationId) {
    return {
      error: {
        status: 400,
        message: "No active organization",
      },
    };
  }

  const member = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: session.user.id,
      },
    },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          metadata: true,
          onboardingCompletedAt: true,
        },
      },
    },
  });

  if (!member) {
    return {
      error: {
        status: 403,
        message: "Not a member of the active organization",
      },
    };
  }

  return {
    session,
    organizationId,
    memberRole: member.role as OrgRole,
    organization: member.organization,
  };
}

export function assertOrgRole(
  memberRole: OrgRole,
  allowed: OrgRole[],
): boolean {
  return allowed.includes(memberRole);
}

export function isOrgAdmin(memberRole: OrgRole): boolean {
  return memberRole === "ADMIN";
}

export function isOrgAdminOrPm(memberRole: OrgRole): boolean {
  return memberRole === "ADMIN" || memberRole === "PROJECT_MANAGER";
}

export async function getUserOnboardingState(userId: string) {
  const memberships = await prisma.member.findMany({
    where: { userId },
    select: {
      role: true,
      organizationId: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          onboardingCompletedAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    return {
      needsOnboarding: true as const,
      reason: "no_org" as const,
      memberships,
    };
  }

  const incomplete = memberships.find(
    (m) => m.organization.onboardingCompletedAt === null,
  );

  if (incomplete) {
    return {
      needsOnboarding: true as const,
      reason: "incomplete" as const,
      organizationId: incomplete.organizationId,
      memberships,
    };
  }

  return {
    needsOnboarding: false as const,
    memberships,
  };
}
