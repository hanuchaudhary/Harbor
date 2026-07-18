"use client";

import { SidebarTrigger } from "../ui/sidebar";
import { cn } from "@/lib/utils";
import { UserDropdown } from "./user-dropdown";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth/auth.client";
import { getRouteLabel } from "@/lib/constants";
import { useChat } from "@/hooks/use-chat";
import { useMemo } from "react";
import { RunningTimerIndicator } from "@/components/timer/running-timer-indicator";

export default function DashboardNavbar() {
  const pathname = usePathname();
  const { useSession } = authClient;
  const { data } = useSession();
  const { channels } = useChat();

  const routeLabel = useMemo(() => {
    if (pathname.startsWith("/channels/")) {
      const channelId = pathname.split("/channels/")[1];
      const channel = channels.find((ch) => ch.id === channelId);
      return channel ? `# ${channel.name}` : "Channel";
    }
    return getRouteLabel(pathname);
  }, [pathname, channels]);

  return (
    <div
      className={cn(
        "fixed top-0 z-20 border-b bg-background w-full md:max-w-[calc(100%-16rem)] h-15 flex items-center print:hidden",
      )}
    >
      <div className="flex items-center justify-between w-full px-6">
        <SidebarTrigger className="md:hidden" />
        <p className="uppercase font-montreal-mono font-semibold text-sm">
          {routeLabel}
        </p>
        <div className="flex items-center gap-2">
          <RunningTimerIndicator />
          <UserDropdown
            onHeader={true}
            email={data?.user?.email}
            name={data?.user?.name}
            image={data?.user.image}
          />
        </div>
      </div>
    </div>
  );
}
