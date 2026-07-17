"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectQueries } from "@/lib/query/query.func";
import { useEditProjectStore } from "@/lib/stores/edit-project.store";
import { toSlug } from "@/lib/utils";
import { EditDetails } from "@/components/projects/detail/edit-details";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface EditProjectPageProps {
  projectSlug: string;
}

export function EditProjectPage({ projectSlug }: EditProjectPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    initialized,
    details,
    repos,
    originalDetails,
    originalRepos,
    initialize,
    reset,
  } = useEditProjectStore();

  const { data, isLoading } = useQuery({
    queryKey: ProjectQueries.keys.detail(projectSlug),
    queryFn: () => ProjectQueries.fetchBySlug(projectSlug),
  });

  useEffect(() => {
    if (data && !initialized) {
      initialize(data);
    }
  }, [data, initialized, initialize]);

  useEffect(() => {
    return () => reset();
  }, [projectSlug, reset]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updatedSlug = toSlug(details.slug.trim());

      const reposChanged =
        JSON.stringify(repos.map((r) => ({ name: r.name, url: r.url }))) !==
        JSON.stringify(
          originalRepos.map((r) => ({ name: r.name, url: r.url })),
        );

      const detailsChanged =
        details.name.trim() !== originalDetails.name ||
        updatedSlug !== originalDetails.slug ||
        (details.description.trim() || null) !==
          (originalDetails.description || null) ||
        details.brand !== originalDetails.brand ||
        details.status !== originalDetails.status ||
        details.currency !== originalDetails.currency ||
        (details.budget.trim() || null) !== (originalDetails.budget || null) ||
        (details.startDate || null) !== (originalDetails.startDate || null) ||
        (details.estimatedEndAt || null) !==
          (originalDetails.estimatedEndAt || null) ||
        details.progressPct !== originalDetails.progressPct ||
        reposChanged;

      if (!detailsChanged) {
        return { project: { slug: projectSlug } };
      }

      const projectResponse = await axios.patch(
        `/api/projects/${projectSlug}`,
        {
          name: details.name.trim(),
          slug: updatedSlug,
          description: details.description.trim() || null,
          brand: details.brand,
          status: details.status,
          currency: details.currency,
          budget: details.budget.trim() || null,
          progressPct: details.progressPct,
          startDate: details.startDate || null,
          estimatedEndAt: details.estimatedEndAt || null,
          repos: repos
            .filter((repo) => repo.name.trim() && repo.url.trim())
            .map((repo) => ({
              name: repo.name.trim(),
              url: repo.url.trim(),
            })),
        },
      );

      return projectResponse.data;
    },
    onSuccess: (response) => {
      toast.success("Project updated successfully");
      queryClient.invalidateQueries({ queryKey: ProjectQueries.keys.all() });
      queryClient.invalidateQueries({
        queryKey: ProjectQueries.keys.detail(projectSlug),
      });
      const updatedSlug = response?.project?.slug || projectSlug;
      router.push(`/projects/${updatedSlug}`);
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Failed to update project",
        );
        return;
      }
      toast.error("Failed to update project");
    },
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!details.name.trim()) errs.name = "Project name is required";
    if (!details.slug.trim()) errs.slug = "Slug is required";
    else if (!slugRegex.test(details.slug.trim()))
      errs.slug = "Slug must be lowercase and use hyphens only";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = () => {
    if (!validate()) return;
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Project not found</p>;
  }

  return (
    <div className="pb-12 gap-4 relative">
      <div className="">
        <div>
          <h1>Edit Project</h1>
          <p className="text-sm text-muted-foreground mt-1">{data.name}</p>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <Button variant="outline" asChild>
            <Link href={`/projects/${projectSlug}`}>Cancel</Link>
          </Button>
          <Button onClick={onSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl px-6 ml-auto mt-6">
        <EditDetails errors={errors} />
      </div>
    </div>
  );
}
