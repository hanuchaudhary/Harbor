"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboardingStore } from "@/lib/stores/onboarding.store";
import { toSlug } from "@/lib/utils";

interface StepOrgProps {
  errors: Record<string, string>;
}

export function StepOrg({ errors }: StepOrgProps) {
  const { org, isSlugEdited, setOrg, setIsSlugEdited } = useOnboardingStore();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          id="org-name"
          value={org.name}
          placeholder="Acme Studio"
          onChange={(e) => {
            const name = e.target.value;
            setOrg({
              name,
              ...(!isSlugEdited ? { slug: toSlug(name) } : {}),
            });
          }}
        />
        {errors.name ? (
          <p className="text-sm text-destructive">{errors.name}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-slug">Slug</Label>
        <Input
          id="org-slug"
          value={org.slug}
          placeholder="acme-studio"
          onChange={(e) => {
            setIsSlugEdited(true);
            setOrg({ slug: toSlug(e.target.value) });
          }}
        />
        <p className="text-xs text-muted-foreground">
          Used in URLs and invites. Lowercase letters, numbers, hyphens.
        </p>
        {errors.slug ? (
          <p className="text-sm text-destructive">{errors.slug}</p>
        ) : null}
      </div>
    </div>
  );
}
