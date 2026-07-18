export function canReadProjectActivity({
  role,
  isMember,
  isClient,
}: {
  role: string;
  isMember: boolean;
  isClient: boolean;
}) {
  return role === "ADMIN" || isMember || isClient;
}
