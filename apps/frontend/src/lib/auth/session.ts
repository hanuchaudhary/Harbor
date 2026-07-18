export type SessionUser = {
  id: string;
  name: string;
  email?: string | null;
  image?: string | null;
  role?: string | null;
  githubUsername?: string | null;
  isDesigner?: boolean | null;
};

export function asSessionUser(user: unknown): SessionUser | null {
  if (!user || typeof user !== "object") return null;
  return user as SessionUser;
}
