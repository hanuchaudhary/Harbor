"use client";

import { useMemo } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { Plus, Minus } from "lucide-react";

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
import { BRANDS } from "@/lib/constants";
import { ProjectQueries } from "@/lib/query/query.func";
import Image from "next/image";

export function BrandsProjectsCollapsible({
  isLoading = false,
}: {
  isLoading?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ProjectQueries.keys.all(),
    queryFn: ProjectQueries.fetchAll,
  });

  const brandProjects = useMemo(() => {
    if (!data?.length) return [];
    return BRANDS.map((brand) => ({
      ...brand,
      projects: data.filter((project) => project.brand === brand.brand),
    })).filter((group) => group.projects.length > 0);
  }, [data]);

  if (!brandProjects.length) {
    return null;
  }

  return (
    <>
      {brandProjects.length > 0 ? (
        brandProjects.map((group) => (
          <Collapsible
            key={group.slug}
            className="group/collapsible"
            defaultOpen={true}
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton>
                  <Link
                    href={`/projects?brand=${group.slug}`}
                    className="flex items-center gap-2"
                  >
                    <Image
                      className={`rounded-sm ${
                        group.slug === "xocket" ? "scale-135" : ""
                      }`}
                      src={group.image}
                      alt={`${group.name} logo`}
                      width={20}
                      height={20}
                    />
                    {group.name}
                  </Link>
                  <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
                  <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub className="pl-4 capitalize">
                  {group.projects.map((project) => (
                    <SidebarMenuSubItem
                      key={project.id}
                      onClick={() => router.push(`/projects/${project.slug}`)}
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
        ))
      ) : (
        <p className="text-sm text-muted-foreground px-4">No projects found</p>
      )}
    </>
  );
}
