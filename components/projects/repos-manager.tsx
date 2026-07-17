"use client";

import { Field, FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { useGithubRepos } from "@/hooks/use-github-repos";
import ConnectGithub from "@/components/connect-github";
import { Skeleton } from "@/components/ui/skeleton";

interface Repo {
  id?: string;
  name: string;
  url: string;
}

interface ReposManagerProps {
  repos: Repo[];
  onReposChange: (repos: Repo[]) => void;
  errors?: Record<string, string>;
}

export function ReposManager({
  repos,
  onReposChange,
  errors,
}: ReposManagerProps) {
  const { repos: githubRepos, isLoading, githubLinked } = useGithubRepos();

  const selectedValues = repos.map((repo) => {
    if (repo.url.startsWith("https://github.com/")) {
      return repo.url.replace("https://github.com/", "");
    }
    return `${repo.url}`;
  });

  const handleChange = (values: string[]) => {
    const newRepos = values.map((value) => {
      const parts = value.split("/");
      return {
        name: parts[1] || value,
        url: `https://github.com/${value}`,
      };
    });
    onReposChange(newRepos);
  };

  if (!githubLinked) {
    return (
      <Field>
        <Label>GitHub Repositories</Label>
        <ConnectGithub />
        {errors?.repos && <FieldError>{errors.repos}</FieldError>}
      </Field>
    );
  }

  if (isLoading) {
    return (
      <Field>
        <Label>GitHub Repositories</Label>
        <Skeleton className="h-11 w-full" />
      </Field>
    );
  }

  if (!githubRepos) {
    return (
      <Field>
        <Label>GitHub Repositories</Label>
        <p className="text-sm text-red-500">
          Failed to load repositories. Please try again.
        </p>
        {errors?.repos && <FieldError>{errors.repos}</FieldError>}
      </Field>
    );
  }

  const options = githubRepos.map((repo) => ({
    value: `${repo.owner}/${repo.name}`,
    label: repo.name,
    subtitle: `${repo.owner}${repo.private ? " • Private" : ""}`,
  }));

  return (
    <Field>
      <Label>GitHub Repositories</Label>
      <MultiSelect
        options={options.map((option) => ({
          value: option.value,
          label: option.label,
          subtitle: option.subtitle,
          image: "/github.svg",
        }))}
        value={selectedValues}
        onChange={handleChange}
        placeholder="Select repositories"
        maxDisplay={4}
      />
      <p className="text-xs text-muted-foreground mt-1">
        Select one or more repositories for this project
      </p>
      {errors?.repos && <FieldError>{errors.repos}</FieldError>}
    </Field>
  );
}
