"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOnboardingStore } from "@/lib/stores/onboarding.store";
import { toSlug } from "@/lib/utils";

interface StepProjectProps {
  errors: Record<string, string>;
}

export function StepProject({ errors }: StepProjectProps) {
  const {
    project,
    isProjectSlugEdited,
    setProject,
    setIsProjectSlugEdited,
  } = useOnboardingStore();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Create your first project, or skip and add one later.
      </p>

      <div className="space-y-2">
        <Label htmlFor="project-name">Project name</Label>
        <Input
          id="project-name"
          value={project.name}
          placeholder="Website redesign"
          onChange={(e) => {
            const name = e.target.value;
            setProject({
              name,
              ...(!isProjectSlugEdited ? { slug: toSlug(name) } : {}),
            });
          }}
        />
        {errors.name ? (
          <p className="text-sm text-destructive">{errors.name}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-slug">Slug</Label>
        <Input
          id="project-slug"
          value={project.slug}
          placeholder="website-redesign"
          onChange={(e) => {
            setIsProjectSlugEdited(true);
            setProject({ slug: toSlug(e.target.value) });
          }}
        />
        {errors.slug ? (
          <p className="text-sm text-destructive">{errors.slug}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-description">Description</Label>
        <Textarea
          id="project-description"
          value={project.description}
          placeholder="Optional short description"
          rows={3}
          onChange={(e) => setProject({ description: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={project.status}
          onValueChange={(value) =>
            setProject({
              status: value as typeof project.status,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ON_HOLD">On hold</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
