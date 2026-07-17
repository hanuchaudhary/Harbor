"use client";

import { type ReactNode, useEffect } from "react";
import axios from "axios";

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth/auth.client";
import { UserDropdown } from "./user-dropdown";
import Image from "next/image";
import { BrandsProjectsCollapsible } from "./brands-projects";
import DashboardNavbar from "./DashboardNavbar";
import ChannelSidebar from "./channel-sidebar";
import { NavigationSidebar } from "./navigation-sidebar";
import { useChat } from "@/hooks/use-chat";
import { ProjectQueries } from "@/lib/query/query.func";
import { ROLE } from "@/types/types";
import { Badge } from "../ui/badge";
import { roleVariant } from "@/lib/constants";
import Link from "next/link";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { useSession } = authClient;
  const { data, isPending: isSessionLoading } = useSession();
  const { isLoadingChannels } = useChat();
  const { isLoading: isLoadingProjects } = useQuery({
    queryKey: ProjectQueries.keys.all(),
    queryFn: ProjectQueries.fetchAll,
  });

  const isLoadingSidebar =
    isSessionLoading || isLoadingChannels || isLoadingProjects;

  useEffect(() => {
    if (!data?.user) return;

    const updateStatus = async () => {
      try {
        await axios.post("/api/active");
      } catch (error) {
        console.error("Failed to update active status:", error);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000); // 1 min

    return () => clearInterval(interval);
  }, [data?.user]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full font-montreal-regular">
        <Sidebar className="border-r">
          <SidebarHeader className="border-b p-0">
            <Link
              href={
                data?.user.role === "CLIENT"
                  ? `/${data?.user.id}`
                  : "/dashboard"
              }
              className="flex items-center gap-3 divide-x"
            >
              <div className="p-4">
                <Image
                  src="/logo.svg"
                  alt="Harbor Logo"
                  className="rounded-sm"
                  width={28}
                  height={20}
                  unoptimized
                />
              </div>
              <div>
                <p className="text-lg leading-2">Harbor</p>
                {data?.user?.role && (
                  <Badge
                    size="sm"
                    className="-mx-1"
                    variant={roleVariant[data?.user?.role! as ROLE]}
                  >
                    {data?.user?.role}
                  </Badge>
                )}
              </div>
            </Link>
          </SidebarHeader>
          <SidebarContent className="py-3 px-1 scrollbar-hidden">
            {isLoadingSidebar ? (
              <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
                <IconLoader2 className="animate-spin h-8 w-8 text-red-400" />
              </div>
            ) : (
              <>
                <NavigationSidebar pathname={pathname} isLoading={false} />
                <ChannelSidebar pathname={pathname} isLoading={false} />
                {data?.user.role !== "CLIENT" && (
                  <SidebarGroup>
                    <SidebarGroupLabel className="mb-1.5">
                      PROJECTS
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu className="">
                        <BrandsProjectsCollapsible isLoading={false} />
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                )}
              </>
            )}
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <UserDropdown
              email={data?.user?.email}
              name={data?.user?.name}
              role={data?.user?.role as ROLE}
              image={data?.user.image}
            />
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-auto">
          <DashboardNavbar />
          <div className="md:px-12 md:pt-28 p-4 pt-22">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
