"use client";

import { IconLayoutKanban, IconList, IconTimeline } from "@tabler/icons-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ViewMode } from "./tracker-view";
import { useOrgWorkflow } from "@/hooks/use-org-workflow";

interface Project {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TrackerFiltersProps {
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  projects: Project[];
  projectFilter: string;
  onProjectFilterChange: (v: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  members: Member[];
  assigneeFilter: string;
  onAssigneeFilterChange: (v: string) => void;
  currentUserId?: string;
  tags: Tag[];
  tagFilter: string;
  onTagFilterChange: (v: string) => void;
}

export function TrackerFilters({
  view,
  onViewChange,
  projects,
  projectFilter,
  onProjectFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  statusFilter,
  onStatusFilterChange,
  members,
  assigneeFilter,
  onAssigneeFilterChange,
  currentUserId,
  tags,
  tagFilter,
  onTagFilterChange,
}: TrackerFiltersProps) {
  const { enabledColumns } = useOrgWorkflow();

  return (
    <div className="flex flex-wrap items-center gap-3">
      {currentUserId && (
        <button
          onClick={() =>
            onAssigneeFilterChange(
              assigneeFilter === "MY_TASKS" ? "ALL" : "MY_TASKS",
            )
          }
          className={`px-3 py-3 border text-sm transition-colors cursor-pointer ${
            assigneeFilter === "MY_TASKS"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Tasks
        </button>
      )}
      <Select value={projectFilter} onValueChange={onProjectFilterChange}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All projects</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All priorities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All priorities</SelectItem>
          <SelectItem value="LOW">Low</SelectItem>
          <SelectItem value="MEDIUM">Medium</SelectItem>
          <SelectItem value="HIGH">High</SelectItem>
          <SelectItem value="CRITICAL">Critical</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={assigneeFilter === "MY_TASKS" ? "ALL" : assigneeFilter}
        onValueChange={onAssigneeFilterChange}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All assignees" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All assignees</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={tagFilter} onValueChange={onTagFilterChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All tags" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All tags</SelectItem>
          {tags.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2 rounded-full shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                {t.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {view === "list" && (
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {enabledColumns.map((col) => (
              <SelectItem key={col.id} value={col.id}>
                {col.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="ml-auto flex items-center border divide-x">
        <button
          onClick={() => onViewChange("list")}
          className={`px-3 py-2 transition-colors cursor-pointer ${
            view === "list"
              ? "dark:bg-red-950 text-foreground bg-red-300"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <IconList className="h-4 w-4" />
        </button>
        <button
          onClick={() => onViewChange("kanban")}
          className={`px-3 py-2 transition-colors cursor-pointer ${
            view === "kanban"
              ? "dark:bg-red-950 text-foreground bg-red-300"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <IconLayoutKanban className="h-4 w-4" />
        </button>
        <button
          onClick={() => onViewChange("timeline")}
          className={`px-3 py-2 transition-colors cursor-pointer ${
            view === "timeline"
              ? "dark:bg-red-950 text-foreground bg-red-300"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <IconTimeline className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
