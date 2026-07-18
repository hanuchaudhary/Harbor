"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  IconBuilding,
  IconUsersGroup,
  IconFolder,
  IconSend,
  IconChevronUp,
  IconChevronDown,
  IconRefresh,
} from "@tabler/icons-react";

import { organizationsApi, type OrgSettings } from "@/lib/api";
import { toSlug, formatDate, cn } from "@/lib/utils";
import {
  DEFAULT_WORKFLOW_STATUSES,
  WORKFLOW_COLOR_OPTIONS,
  type WorkflowStatusConfig,
  type WorkflowStatusColor,
} from "@/lib/workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function workflowEqual(
  a: WorkflowStatusConfig[],
  b: WorkflowStatusConfig[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every((row, i) => {
    const other = b[i]!;
    return (
      row.id === other.id &&
      row.label === other.label &&
      row.color === other.color &&
      row.order === other.order &&
      row.enabled === other.enabled &&
      row.isDone === other.isDone
    );
  });
}

export function SettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<OrgSettings>({
    queryKey: ["org-settings"],
    queryFn: () => organizationsApi.getSettings(),
  });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logo, setLogo] = useState("");
  const [defaultTrackerView, setDefaultTrackerView] = useState("kanban");
  const [weekStartsOn, setWeekStartsOn] = useState("monday");
  const [workflow, setWorkflow] = useState<WorkflowStatusConfig[]>(
    DEFAULT_WORKFLOW_STATUSES,
  );

  useEffect(() => {
    if (!data?.organization) return;
    setName(data.organization.name);
    setSlug(data.organization.slug);
    setLogo(data.organization.logo ?? "");
    setDefaultTrackerView(
      String(data.organization.preferences.defaultTrackerView ?? "kanban"),
    );
    setWeekStartsOn(
      String(data.organization.preferences.weekStartsOn ?? "monday"),
    );
    const saved = data.organization.preferences.workflowStatuses;
    setWorkflow(
      saved?.length
        ? [...saved].sort((a, b) => a.order - b.order)
        : DEFAULT_WORKFLOW_STATUSES,
    );
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      organizationsApi.updateSettings({
        name: name.trim(),
        slug: toSlug(slug.trim()),
        logo: logo.trim() || null,
        preferences: {
          defaultTrackerView,
          weekStartsOn,
          workflowStatuses: workflow.map((row, index) => ({
            ...row,
            order: index,
          })),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-settings"] });
      queryClient.invalidateQueries({ queryKey: ["org-workflow"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      toast.success("Settings saved");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <h1>Settings</h1>
        <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Could not load organization settings.
        </div>
      </div>
    );
  }

  const org = data.organization;
  const savedWorkflow = org.preferences.workflowStatuses?.length
    ? [...org.preferences.workflowStatuses].sort((a, b) => a.order - b.order)
    : DEFAULT_WORKFLOW_STATUSES;

  const hasChanges =
    name.trim() !== org.name ||
    toSlug(slug.trim()) !== org.slug ||
    (logo.trim() || null) !== (org.logo ?? null) ||
    defaultTrackerView !==
      String(org.preferences.defaultTrackerView ?? "kanban") ||
    weekStartsOn !== String(org.preferences.weekStartsOn ?? "monday") ||
    !workflowEqual(workflow, savedWorkflow);

  const moveRow = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= workflow.length) return;
    setWorkflow((rows) => {
      const copy = [...rows];
      const tmp = copy[index]!;
      copy[index] = copy[next]!;
      copy[next] = tmp;
      return copy.map((row, order) => ({ ...row, order }));
    });
  };

  const updateRow = (
    index: number,
    patch: Partial<WorkflowStatusConfig>,
  ) => {
    setWorkflow((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1>Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage organization details, workspace defaults, and Kanban
            workflow.
          </p>
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={!hasChanges || mutation.isPending}
        >
          {mutation.isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl ml-auto">
        <div className="border px-5 py-4 flex items-center gap-3">
          <IconUsersGroup className="size-4 stroke-1.5 text-muted-foreground" />
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Members
            </p>
            <p className="text-2xl font-montreal-medium">{data.counts.members}</p>
          </div>
        </div>
        <div className="border px-5 py-4 flex items-center gap-3">
          <IconFolder className="size-4 stroke-1.5 text-muted-foreground" />
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Projects
            </p>
            <p className="text-2xl font-montreal-medium">
              {data.counts.projects}
            </p>
          </div>
        </div>
        <div className="border px-5 py-4 flex items-center gap-3">
          <IconSend className="size-4 stroke-1.5 text-muted-foreground" />
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Pending invites
            </p>
            <p className="text-2xl font-montreal-medium">
              {data.counts.pendingInvites}
            </p>
          </div>
        </div>
      </div>

      <section className="border max-w-3xl ml-auto">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <IconBuilding className="size-4 stroke-1.5 text-muted-foreground" />
          <h2 className="text-sm font-montreal-medium">Organization</h2>
        </div>
        <div className="p-5 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Organization name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-slug">Slug</Label>
            <Input
              id="org-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onBlur={() => setSlug(toSlug(slug))}
              placeholder="organization-slug"
            />
            <p className="text-xs text-muted-foreground">
              Used in links and org identity. Lowercase letters, numbers, and
              hyphens.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-logo">Logo URL</Label>
            <Input
              id="org-logo"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Organization ID
              </p>
              <p className="font-mono text-xs break-all">{org.id}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Onboarding
              </p>
              <p>
                {org.onboardingCompletedAt
                  ? `Completed ${formatDate(org.onboardingCompletedAt) ?? ""}`
                  : "Not completed"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border max-w-3xl ml-auto">
        <div className="px-5 py-4 border-b">
          <h2 className="text-sm font-montreal-medium">Workspace defaults</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Defaults for tracker and calendar views across the organization.
          </p>
        </div>
        <div className="p-5 space-y-5">
          <div className="space-y-2">
            <Label>Default tracker view</Label>
            <Select
              value={defaultTrackerView}
              onValueChange={setDefaultTrackerView}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kanban">Kanban</SelectItem>
                <SelectItem value="list">List</SelectItem>
                <SelectItem value="timeline">Timeline</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Week starts on</Label>
            <Select value={weekStartsOn} onValueChange={setWeekStartsOn}>
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="border max-w-3xl ml-auto">
        <div className="px-5 py-4 border-b flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-montreal-medium">Workflow / Kanban</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Reorder columns, rename labels, pick colors, and choose which
              statuses are available. System keys stay fixed.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWorkflow(DEFAULT_WORKFLOW_STATUSES)}
          >
            <IconRefresh className="size-3.5 stroke-1.5 mr-1.5" />
            Reset
          </Button>
        </div>
        <ul className="divide-y">
          {workflow.map((row, index) => (
            <li
              key={row.id}
              className={cn(
                "px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center",
                !row.enabled && "opacity-60",
              )}
            >
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => moveRow(index, -1)}
                  aria-label="Move up"
                >
                  <IconChevronUp className="size-4 stroke-1.5" />
                </button>
                <button
                  type="button"
                  className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={index === workflow.length - 1}
                  onClick={() => moveRow(index, 1)}
                  aria-label="Move down"
                >
                  <IconChevronDown className="size-4 stroke-1.5" />
                </button>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      row.color === "neutral" ? "default" : row.color
                    }
                    size="sm"
                  >
                    {row.id}
                  </Badge>
                  <Input
                    value={row.label}
                    onChange={(e) =>
                      updateRow(index, { label: e.target.value })
                    }
                    className="h-9"
                    placeholder="Column label"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={row.color}
                    onValueChange={(value) =>
                      updateRow(index, {
                        color: value as WorkflowStatusColor,
                      })
                    }
                  >
                    <SelectTrigger size="sm" className="w-36">
                      <SelectValue placeholder="Color" />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKFLOW_COLOR_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) =>
                        updateRow(index, { enabled: e.target.checked })
                      }
                      className="accent-foreground"
                    />
                    Enabled
                  </label>

                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.isDone}
                      onChange={(e) =>
                        updateRow(index, { isDone: e.target.checked })
                      }
                      className="accent-foreground"
                    />
                    Done column
                  </label>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
