"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { BRAND, PROJECT_STATUS } from "@/types/types";
import { ProjectQueries } from "@/lib/query/query.func";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface BrandProjectsViewProps {
  brand: BRAND;
  brandName: string;
}

const statusVariant: Record<
  PROJECT_STATUS,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  ON_HOLD: "secondary",
  COMPLETED: "outline",
  ARCHIVED: "destructive",
};

const statusLabel: Record<PROJECT_STATUS, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export function BrandProjectsView({
  brand,
  brandName,
}: BrandProjectsViewProps) {
  const { data, isLoading } = useQuery({
    queryKey: ProjectQueries.keys.byBrand(brand),
    queryFn: () => ProjectQueries.fetchByBrand(brand),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{brandName}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data
              ? `${data.length} project${data.length !== 1 ? "s" : ""}`
              : ""}
          </p>
        </div>
        <Button asChild>
          <Link href={`/projects/new?brand=${brand}`}>Create Project</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((project) => (
            <div
              key={project.id}
              className="border rounded-lg p-4 space-y-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-medium text-sm leading-snug line-clamp-2">
                  {project.name}
                </h2>
                <Badge
                  variant={statusVariant[project.status]}
                  className="shrink-0"
                >
                  {statusLabel[project.status]}
                </Badge>
              </div>

              {project.description && (
                <p className="text-muted-foreground text-xs line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                <span>
                  {project._count.members} member
                  {project._count.members !== 1 ? "s" : ""}
                </span>
                <span>·</span>
                <span>
                  {project._count.tasks} task
                  {project._count.tasks !== 1 ? "s" : ""}
                </span>
                {project.budget && (
                  <>
                    <span>·</span>
                    <span>
                      {project.currency}{" "}
                      {Number(project.budget).toLocaleString()}
                    </span>
                  </>
                )}
              </div>

              {(project.startDate || project.estimatedEndAt) && (
                <div className="text-xs text-muted-foreground">
                  {project.startDate && (
                    <span>
                      Start: {new Date(project.startDate).toLocaleDateString()}
                    </span>
                  )}
                  {project.startDate && project.estimatedEndAt && (
                    <span> · </span>
                  )}
                  {project.estimatedEndAt && (
                    <span>
                      Due:{" "}
                      {new Date(project.estimatedEndAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm">No projects yet</p>
          <p className="text-muted-foreground text-xs mt-1">
            Create a project to get started
          </p>
        </div>
      )}
    </div>
  );
}
