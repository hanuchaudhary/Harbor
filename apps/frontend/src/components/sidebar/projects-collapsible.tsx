"use client";

import { Link, useLocation, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";

import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ProjectQueries } from "@/lib/query/query.func";
import { Minus, Plus } from "lucide-react";

export function ProjectsCollapsible({
  isLoading = false,
}: {
  isLoading?: boolean;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ProjectQueries.keys.all(),
    queryFn: ProjectQueries.fetchAll,
  });

  if (isLoading) return null;

  if (!data?.length) {
    return (
      <p className="text-sm text-muted-foreground px-4">No projects found</p>
    );
  }

  return (
    <Collapsible className="group/collapsible" defaultOpen={true}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <Link to="/projects" className="flex items-center gap-2">
              All projects
            </Link>
            <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
            <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="pl-4 capitalize">
            {data.map((project) => (
              <SidebarMenuSubItem
                key={project.id}
                onClick={() => navigate(`/projects/${project.slug}`)}
              >
                <SidebarMenuSubButton
                  className="py-4"
                  isActive={pathname === `/projects/${project.slug}`}
                >
                  {project.name}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
