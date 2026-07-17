"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Edit } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectQueries, TaskQueries } from "@/lib/query/query.func";
import { authClient } from "@/lib/auth/auth.client";
import {
  DetailsTab,
  MembersTab,
  DocsTab,
  MilestonesTab,
  AssetsTab,
  ActivityTab,
  TasksTab,
  AnalyticsTab,
} from "@/components/projects/detail";
import { ROLE } from "@/types/types";

const statusVariant = {
  ACTIVE: "emerald",
  ON_HOLD: "yellow",
  COMPLETED: "blue",
  ARCHIVED: "red",
} as const;

const statusLabel = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
} as const;

interface ProjectDetailViewProps {
  projectSlug: string;
}

interface ProjectDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  repos: Array<{
    id: string;
    name: string;
    url: string;
  }>;
  prodUrl: string | null;
  devUrl: string | null;
  status: keyof typeof statusVariant;
  budget: string | null;
  currency: string;
  startDate: string | null;
  estimatedEndAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  members: Array<{
    id: string;
    userId: string;
    user: { id: string; name: string; email: string; image: string };
  }>;
  docs: Array<{
    id: string;
    title: string;
    content: string;
    updatedAt: string;
  }>;
  assets: Array<{
    id: string;
    name: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    folder: string | null;
    tags: string[];
    updatedAt: string;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    description: string | null;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
  }>;
  clients?: Array<{
    user: { id: string; name: string; email: string; image: string };
  }>;
  _count: {
    tasks: number;
    milestones: number;
    docs: number;
    assets: number;
  };
}

export function ProjectDetailView({ projectSlug }: ProjectDetailViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const validTabs = [
    "details",
    "members",
    "docs",
    "milestones",
    "assets",
    "activity",
    "tasks",
    "analytics",
  ] as const;
  type TabType = (typeof validTabs)[number];

  const urlTab = searchParams.get("tab");
  const initialTab = (
    validTabs.includes(urlTab as TabType) ? urlTab : "details"
  ) as TabType;

  const [tab, setTab] = useState<TabType>(initialTab);

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && validTabs.includes(urlTab as TabType)) {
      setTab(urlTab as TabType);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: TabType) => {
    setTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const session = authClient.useSession().data;
  const role = session?.user.role as ROLE;
  const isEditable = role === "CLIENT" || role === "DEVELOPER";

  const { data, isLoading } = useQuery<ProjectDetail | null>({
    queryKey: ProjectQueries.keys.detail(projectSlug),
    queryFn: () => ProjectQueries.fetchBySlug(projectSlug),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: TaskQueries.keys.byProject(data?.id ?? ""),
    queryFn: () => TaskQueries.fetchAll(data?.id),
    enabled: !!data?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Project not found</p>;
  }

  const tabs: {
    id: typeof tab;
    label: string;
    count?: number;
    adminOnly?: boolean;
  }[] = [
    { id: "details", label: "Details" },
    { id: "tasks", label: "Tasks", count: data._count.tasks },
    { id: "activity", label: "Activity" },
    { id: "milestones", label: "Milestones", count: data._count.milestones },
    {
      id: "members",
      label: "Members",
      count: data.members.length + (data.clients?.length ?? 0),
    },
    { id: "docs", label: "Docs", count: data._count.docs },
    { id: "assets", label: "Assets", count: data._count.assets },
    { id: "analytics", label: "Analytics", adminOnly: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="leading-tight">{data.name}</h1>
          <p className="text-sm text-muted-foreground">{data.slug}</p>
          <Badge variant={statusVariant[data.status]}>
            {statusLabel[data.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(role === "ADMIN" || role === "PROJECT_MANAGER") && (
            <Button variant="outline" asChild>
              <Link href={`/projects/${projectSlug}/edit`}>
                Edit <Edit className="stroke-1" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Members",
            value: data.members.length + (data.clients?.length ?? 0),
          },
          { label: "Tasks", value: data._count.tasks },
          { label: "Milestones", value: data._count.milestones },
          { label: "Docs", value: data._count.docs },
        ].map(({ label, value }) => (
          <div key={label} className="border p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-medium">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-0 border w-fit divide-x">
        {tabs
          .filter((t) => !t.adminOnly || role === "ADMIN")
          .map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`relative flex items-center gap-1.5 px-4 py-2 text-xs transition-colors cursor-pointer font-montreal-mono uppercase font-semibold ${
                tab === t.id
                  ? "text-foreground dark:bg-red-950 bg-red-200"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span
                  className={`text-xs px-1.5 rounded-full tabular-nums ${
                    tab === t.id
                      ? "bg-muted text-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
      </div>

      {tab === "details" && <DetailsTab data={data} />}

      {tab === "members" && (
        <MembersTab
          role={role}
          projectSlug={projectSlug}
          isEditable={isEditable}
          data={data!}
        />
      )}

      {tab === "docs" && (
        <DocsTab
          projectSlug={projectSlug}
          isEditable={false}
          docs={data.docs}
        />
      )}

      {tab === "milestones" && (
        <MilestonesTab
          projectSlug={projectSlug}
          isEditable={isEditable}
          milestones={data.milestones}
        />
      )}

      {tab === "assets" && (
        <AssetsTab
          projectSlug={projectSlug}
          isEditable={isEditable}
          assets={data.assets}
        />
      )}

      {tab === "activity" && <ActivityTab projectSlug={projectSlug} />}

      {tab === "tasks" && <TasksTab isEditable={isEditable} tasks={tasks} />}

      {tab === "analytics" && role === "ADMIN" && (
        <AnalyticsTab projectSlug={projectSlug} />
      )}
    </div>
  );
}
