"use client";

import { useMemo } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { http as axios } from "@/lib/api/http";
import {
  IconBell,
  IconBrandAsana,
  IconBuildingBridge2,
  IconBuildingSkyscraper,
  IconChartHistogram,
  IconDashboard,
  IconLayoutDashboard,
  IconSend,
  IconSettings,
  IconUserCircle,
  IconUsersGroup,
} from "@tabler/icons-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth.client";
import { asSessionUser } from "@/lib/auth/session";
import { ROLE } from "@/types/types";

interface NavigationSidebarProps {
  pathname: string;
  isLoading?: boolean;
}

export function NavigationSidebar({
  pathname,
}: NavigationSidebarProps) {
  const { useSession } = authClient;
  const { data } = useSession();

  const { data: unreadCount } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: async () => {
      const { data } = await axios.get<{ unreadCount: number }>(
        "/api/notifications",
      );
      return data.unreadCount ?? 0;
    },
    enabled: !!data?.user,
    refetchInterval: 60000,
  });

  const menuItems = useMemo(() => {
    if (!data?.user) return [];

    const profileItem = {
      title: "Profile",
      icon: IconUserCircle,
      url: "/profile",
    };

    const notificationsItem = {
      title: "Notifications",
      icon: IconBell,
      url: "/notifications",
    };

    const role = data.user.role as ROLE;

    if (data.user.role === "ADMIN" || data.user.role === "PROJECT_MANAGER") {
      return [
        {
          title: "Dashboard",
          icon: IconLayoutDashboard,
          url: "/admin",
        },
        {
          title: "Analytics",
          icon: IconChartHistogram,
          url: "/analytics",
        },
        {
          title: "Projects",
          icon: IconBuildingBridge2,
          url: "/projects",
        },
        ...(role === "ADMIN"
          ? [
              {
                title: "Users",
                icon: IconUsersGroup,
                url: "/admin/users",
              },
              {
                title: "Invites",
                icon: IconSend,
                url: "/admin/invites",
              },
              {
                title: "Settings",
                icon: IconSettings,
                url: "/admin/settings",
              },
            ]
          : []),
        {
          title: "Tracker",
          icon: IconBrandAsana,
          url: "/tracker",
        },
        {
          title: "Office",
          icon: IconBuildingSkyscraper,
          url: "/office",
        },
        notificationsItem,
        profileItem,
      ];
    } else if (role === "DEVELOPER") {
      return [
        {
          title: "Dashboard",
          icon: IconLayoutDashboard,
          url: "/dashboard",
        },
        {
          title: "Projects",
          icon: IconBuildingBridge2,
          url: "/projects",
        },
        {
          title: "Tracker",
          icon: IconDashboard,
          url: "/tracker",
        },
        {
          title: "Office",
          icon: IconUsersGroup,
          url: "/office",
        },
        notificationsItem,
        profileItem,
      ];
    } else if (role === "CLIENT") {
      return [
        {
          title: "Dashboard",
          icon: IconLayoutDashboard,
          url: `/${data.user.id}`,
        },
        notificationsItem,
        profileItem,
      ];
    } else {
      return [];
    }
  }, [data?.user]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="mb-1.5">Navigation</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {menuItems.map((item) => {
            const isActive =
              pathname === item.url ||
              (item.url !== "/dashboard" &&
                item.url !== "/admin" &&
                pathname.startsWith(item.url + "/")) ||
              (item.url === "/admin" && pathname === "/admin") ||
              (item.url === "/dashboard" && pathname === "/dashboard");

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className="group"
                >
                  <Link to={item.url} className="flex items-center gap-3">
                    <item.icon className="h-7 w-7 stroke-1" />
                    <span>{item.title}</span>
                    {item.url === "/notifications" &&
                      (unreadCount ?? 0) > 0 && (
                        <Badge
                          variant="red"
                          size="sm"
                          className="ml-auto min-w-5 h-5 px-1.5 justify-center"
                        >
                          {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
                        </Badge>
                      )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
