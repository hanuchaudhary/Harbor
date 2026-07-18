"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { http } from "@/lib/api/http";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StepAssets } from "@/components/projects/create/step-assets";
import { StepDetails } from "@/components/projects/create/step-details";
import { StepDocs } from "@/components/projects/create/step-docs";
import { ProjectQueries } from "@/lib/query/query.func";
import { useProjectStore } from "@/lib/stores/project.store";
import { toSlug } from "@/lib/utils";
import { projectDetailsSchema } from "@repo/validators";

const steps = ["Project Details", "Docs", "Assets"] as const;

export function CreateProjectPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    currentStep,
    details,
    repos,
    docs,
    assets,
    nextStep,
    previousStep,
    skipCurrentStep,
    reset,
  } = useProjectStore();

  const createProjectMutation = useMutation({
    mutationFn: ProjectQueries.create,
    onSuccess: () => {
      toast.success("Project created successfully");
      queryClient.invalidateQueries({ queryKey: ProjectQueries.keys.all() });
      reset();
      navigate("/projects");
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Failed to create project",
        );
        return;
      }
      toast.error("Failed to create project");
    },
  });

  const validateDetails = () => {
    const result = projectDetailsSchema.safeParse({
      name: details.name.trim(),
      slug: details.slug.trim(),
      description: details.description.trim() || undefined,
      status: details.status || undefined,
      startDate: details.startDate || undefined,
      estimatedEndAt: details.estimatedEndAt || undefined,
      repos: repos
        .filter((repo) => repo.name.trim() || repo.url.trim())
        .map((repo) => ({
          name: repo.name.trim(),
          url: repo.url.trim(),
        })),
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (key && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const onNext = () => {
    if (currentStep === 1) {
      if (!validateDetails()) return;
    }
    nextStep();
  };

  const onSubmit = () => {
    if (!validateDetails()) return;

    createProjectMutation.mutate({
      name: details.name.trim(),
      slug: toSlug(details.slug.trim()),
      description: details.description.trim() || undefined,
      status: details.status,
      startDate: details.startDate || undefined,
      estimatedEndAt: details.estimatedEndAt || undefined,
      repos: repos
        .filter((repo) => repo.name.trim() && repo.url.trim())
        .map((repo) => ({
          name: repo.name.trim(),
          url: repo.url.trim(),
        })),
      docs: docs
        .filter((doc) => doc.title.trim())
        .map((doc) => ({
          title: doc.title.trim(),
          content: doc.content.trim() || undefined,
        })),
      assets: assets
        .filter(
          (asset) =>
            asset.name.trim() &&
            asset.fileUrl.trim() &&
            asset.fileType.trim() &&
            asset.fileSize.trim(),
        )
        .map((asset) => ({
          name: asset.name.trim(),
          fileUrl: asset.fileUrl.trim(),
          fileType: asset.fileType.trim(),
          fileSize: Number(asset.fileSize),
          tags: asset.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        })),
    });
  };

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-10rem)]">
      <div>
        <h1>Create Project</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Step {currentStep} of {steps.length}: {steps[currentStep - 1]}
        </p>
      </div>

      <div className="space-y-5 col-span-5 mt-6 pb-12 max-w-4xl px-6 ml-auto">
        {currentStep === 1 && <StepDetails errors={errors} />}
        {currentStep === 2 && <StepDocs />}
        {currentStep === 3 && <StepAssets />}
      </div>

      <div className="flex items-center justify-end gap-3 absolute bottom-0 right-0">
        <Button onClick={reset} variant="outline" asChild>
          <Link to="/projects">Cancel</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={previousStep}
          disabled={currentStep === 1 || createProjectMutation.isPending}
        >
          Back
        </Button>

        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (currentStep === 3) {
                  onSubmit();
                  return;
                }
                skipCurrentStep();
              }}
              disabled={createProjectMutation.isPending}
            >
              {currentStep === 3 ? "Skip & Create Project" : "Skip Step"}
            </Button>
          )}

          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={onNext}
              disabled={createProjectMutation.isPending}
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={createProjectMutation.isPending}
            >
              {createProjectMutation.isPending
                ? "Creating..."
                : "Create Project"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
