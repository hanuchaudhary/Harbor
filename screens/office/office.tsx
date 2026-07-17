"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { useOfficeStore, ActiveUser } from "@/lib/stores/office.store";
import { Skeleton } from "@/components/ui/skeleton";
import UserAvatar from "@/components/user-avatar";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function Office() {
  const { activeUsers, setActiveUsers } = useOfficeStore();
  const router = useRouter();
  const { role } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["active-users"],
    queryFn: () =>
      axios
        .get<{ activeUsers: ActiveUser[] }>("/api/active")
        .then((r) => r.data),
    refetchInterval: 1000 * 60,
  });

  useEffect(() => {
    if (data?.activeUsers) {
      setActiveUsers(data.activeUsers);
    }
  }, [data, setActiveUsers]);

  const gridItems = Array.from(
    { length: 12 },
    (_, i) => activeUsers[i] || null,
  );

  if (isLoading && activeUsers.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-xl font-montreal-medium">Office</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            See who's currently active in the organization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-montreal-medium">Office</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          See who's currently active in the organization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border divide-y divide-x">
        {gridItems.map((user, i) => (
          <div
            key={user?.id || `empty-${i}`}
            className="flex flex-col items-center gap-3 px-4 py-14 hover:shadow-sm transition-shadow"
          >
            {user ? (
              <div
                className="cursor-pointer flex flex-col items-center group"
                onClick={() =>
                  role === "ADMIN" && router.push(`/admin/users/${user.id}`)
                }
              >
                <UserAvatar alt={user.name} src={user.image || ""} size="lg" />
                <div className="flex-1 min-w-0 text-center">
                  <p className="font-montreal-medium text-sm truncate group-hover:underline">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate group-hover:underline">
                    {user.email}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full h-full opacity-20">
                <div className="h-10 w-10 rounded-full bg-muted" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
