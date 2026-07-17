"use client";

import { useRef, useState, useEffect } from "react";
import { IconCheck, IconChevronDown, IconTrash } from "@tabler/icons-react";
import { useDebounce } from "@/hooks/use-debounce";

import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { MultiSelect } from "@/components/ui/multi-select";
import { TagInput } from "@/components/ui/tag-input";
import { formatDate } from "@/lib/utils";
import {
  PRIORITY,
  TASK_STATUS,
  type Task,
  type Tag,
  type Member,
} from "@/types/types";
import {
  KANBAN_COLUMNS,
  priorityLabel,
  priorityVariant,
  statusLabel,
  statusVariant,
} from "../constants";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";

const formatDateToString = (date: Date): string => {
  return formatDate(date, "input") ?? "";
};

const PRIORITY_OPTIONS: { value: PRIORITY; label: string }[] = [
  { value: PRIORITY.LOW, label: "Low" },
  { value: PRIORITY.MEDIUM, label: "Medium" },
  { value: PRIORITY.HIGH, label: "High" },
  { value: PRIORITY.CRITICAL, label: "Critical" },
];

function SidebarRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-2.5 px-4">
      <span className="w-24 shrink-0 text-xs text-muted-foreground pt-2 font-montreal-mono uppercase tracking-wide">
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function InlineSelect<T extends string>({
  value,
  options,
  onChange,
  renderValue,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  renderValue?: (v: T) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 text-sm hover:bg-muted px-2 py-1.5 w-full text-left transition-colors"
      >
        <span className="flex-1">
          {renderValue ? renderValue(value) : label}
        </span>
        <IconChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-popover border shadow-md min-w-44 py-1">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left transition-colors ${o.value === value ? "font-medium" : ""}`}
            >
              <span className="w-3.5 shrink-0 flex items-center justify-center">
                {o.value === value && <IconCheck className="h-3 w-3" />}
              </span>
              {renderValue ? renderValue(o.value) : o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface TaskSidebarProps {
  task: Task;
  teamMembers: Member[];
  clientMembers: Member[];
  allTags: Tag[];
  assigneeIds: string[];
  clientIds: string[];
  tagIds: string[];
  onPatch: (payload: Record<string, unknown>) => void;
  onPatchAssignees: (assigneeIds: string[]) => void;
  onPatchTags: (tagIds: string[]) => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function TaskSidebar({
  task,
  teamMembers,
  clientMembers,
  allTags,
  assigneeIds,
  clientIds,
  tagIds,
  onPatch,
  onPatchAssignees,
  onPatchTags,
  onDelete,
  isDeleting,
}: TaskSidebarProps) {
  const [progressPct, setProgressPct] = useState(task.progressPct);
  const debouncedProgress = useDebounce(progressPct, 500);
  const prevProgress = useRef<number>(task.progressPct);
  const [startDate, setStartDate] = useState<Date | undefined>(
    task.startDate ? new Date(task.startDate) : undefined,
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    task.endDate ? new Date(task.endDate) : undefined,
  );

  useEffect(() => {
    if (debouncedProgress === prevProgress.current) return;
    prevProgress.current = debouncedProgress;
    onPatch({ progressPct: debouncedProgress });
  }, [debouncedProgress]);

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    if (date && endDate && endDate < date) {
      setEndDate(date);
      const dateStr = formatDateToString(date);
      onPatch({ startDate: dateStr, endDate: dateStr });
    } else {
      onPatch({ startDate: date ? formatDateToString(date) : undefined });
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date && startDate && date < startDate) {
      return;
    }
    setEndDate(date);
    onPatch({ endDate: date ? formatDateToString(date) : undefined });
  };

  const { role, user } = useAuth();

  return (
    <div className="col-span-3 border-l overflow-y-auto">
      <div className="flex items-center justify-between py-6 border-b px-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest font-montreal-mono">
          Details
        </span>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors text-muted-foreground"
        >
          <IconTrash className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="divide-y">
        <SidebarRow label="Status">
          <InlineSelect
            value={task.status}
            options={KANBAN_COLUMNS.filter((c) =>
              user?.isDesigner
                ? c.id !== TASK_STATUS.CLIENT_REVIEW &&
                  c.id !== TASK_STATUS.DEVELOPMENT
                : true,
            ).map((c) => ({
              value: c.id,
              label: c.label,
            }))}
            onChange={(v) => onPatch({ status: v })}
            renderValue={(v) => (
              <Badge
                variant={statusVariant[v as TASK_STATUS]}
                className="text-xs"
              >
                {statusLabel[v as TASK_STATUS]}
              </Badge>
            )}
          />
        </SidebarRow>

        <SidebarRow label="Priority">
          <InlineSelect
            value={task.priority}
            options={PRIORITY_OPTIONS}
            onChange={(v) => onPatch({ priority: v })}
            renderValue={(v) => (
              <Badge
                variant={priorityVariant[v as PRIORITY]}
                className="text-xs"
              >
                {priorityLabel[v as PRIORITY]}
              </Badge>
            )}
          />
        </SidebarRow>

        <SidebarRow label="Project">
          <span className="text-sm px-2 py-1.5 block text-foreground">
            {task.project.name}
          </span>
        </SidebarRow>

        {task.milestone && (
          <SidebarRow label="Milestone">
            <span className="text-sm px-2 py-1.5 block">
              {task.milestone.title}
            </span>
          </SidebarRow>
        )}

        <SidebarRow label="Assignees">
          <MultiSelect
            options={teamMembers.map((m) => ({
              value: m.id,
              label: m.name,
              image: m.image,
              subtitle: m.email,
            }))}
            value={assigneeIds}
            onChange={(ids) => onPatchAssignees([...ids, ...clientIds])}
            placeholder="No assignees"
          />
        </SidebarRow>

        {role === "ADMIN" && (
          <SidebarRow label="Clients">
            <MultiSelect
              options={clientMembers.map((m) => ({
                value: m.id,
                label: m.name,
                image: m.image,
                subtitle: m.email,
              }))}
              value={clientIds}
              onChange={(ids) => onPatchAssignees([...assigneeIds, ...ids])}
              placeholder="No clients"
            />
          </SidebarRow>
        )}

        <SidebarRow label="Tags">
          <TagInput
            tags={allTags}
            value={tagIds}
            onChange={(ids) => onPatchTags(ids)}
          />
        </SidebarRow>

        {(role === "ADMIN" || role === "PROJECT_MANAGER") && (
          <SidebarRow label="Progress (Client)">
            <Slider
              min={0}
              max={100}
              step={1}
              value={[progressPct]}
              className="w-full accent-primary mt-1"
              onValueChange={(values) => setProgressPct(values[0])}
            />
            <div>
              <span className="text-xs text-muted-foreground">
                {progressPct}% complete
              </span>
            </div>
          </SidebarRow>
        )}

        <SidebarRow label="Start">
          <DatePicker
            date={startDate}
            onDateChange={handleStartDateChange}
            placeholder="No date"
            buttonVariant="ghost"
            dateFormat="MMM d, yyyy"
            buttonClassName="px-2 py-1.5 h-auto hover:bg-muted text-sm"
            iconClassName="mr-2 h-3.5 w-3.5"
          />
        </SidebarRow>

        <SidebarRow label="Due">
          <DatePicker
            date={endDate}
            onDateChange={handleEndDateChange}
            placeholder="No date"
            buttonVariant="ghost"
            dateFormat="MMM d, yyyy"
            disabled={(date) => (startDate ? date < startDate : false)}
            buttonClassName="px-2 py-1.5 h-auto hover:bg-muted text-sm"
            iconClassName="mr-2 h-3.5 w-3.5"
          />
        </SidebarRow>

        <SidebarRow label="Created">
          <span className="text-sm text-muted-foreground px-2 py-1.5 block">
            {formatDate(task.createdAt)}
          </span>
        </SidebarRow>

        <SidebarRow label="Updated">
          <span className="text-sm text-muted-foreground px-2 py-1.5 block">
            {formatDate(task.updatedAt)}
          </span>
        </SidebarRow>

        {task.completedAt && (
          <SidebarRow label="Completed">
            <span className="text-sm text-muted-foreground px-2 py-1.5 block">
              {formatDate(task.completedAt)}
            </span>
          </SidebarRow>
        )}
      </div>
    </div>
  );
}
