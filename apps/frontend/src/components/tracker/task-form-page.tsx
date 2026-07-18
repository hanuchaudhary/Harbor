"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconArrowLeft } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldError } from "@/components/ui/field";
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
import { MultiSelect } from "@/components/ui/multi-select";
import { TagInput } from "@/components/ui/tag-input";
import {
  ProjectQueries,
  TaskQueries,
  TagQueries,
  MemberQueries,
} from "@/lib/query/query.func";
import { Task, TASK_STATUS, PRIORITY } from "@/types/types";
import { formatDate } from "@/lib/utils";
import BackButton from "../back";
import { useOrgWorkflow } from "@/hooks/use-org-workflow";

const priorityOptions: { value: PRIORITY; label: string }[] = [
  { value: PRIORITY.LOW, label: "Low" },
  { value: PRIORITY.MEDIUM, label: "Medium" },
  { value: PRIORITY.HIGH, label: "High" },
  { value: PRIORITY.CRITICAL, label: "Critical" },
];

interface TaskFormPageProps {
  task?: Task | null;
  defaultProjectId?: string;
  defaultStatus?: TASK_STATUS;
}

interface FormState {
  title: string;
  description: string;
  projectId: string;
  repoId: string;
  status: TASK_STATUS;
  priority: PRIORITY;
  startDate: string;
  endDate: string;
}

const empty: FormState = {
  title: "",
  description: "",
  projectId: "",
  repoId: "",
  status: TASK_STATUS.TODO,
  priority: PRIORITY.MEDIUM,
  startDate: "",
  endDate: "",
};

const toDateInput = (v: string | null) =>
  v ? new Date(v).toISOString().split("T")[0] : "";

const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function TaskFormPage({
  task,
  defaultProjectId,
  defaultStatus,
}: TaskFormPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enabledColumns, statuses } = useOrgWorkflow();
  const isEdit = !!task;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>(() => {
    if (task) {
      return {
        title: task.title,
        description: task.description ?? "",
        projectId: task.projectId,
        repoId: task.repoId ?? "",
        status: task.status,
        priority: task.priority,
        startDate: formatDate(task.startDate, "input") || "",
        endDate: formatDate(task.endDate, "input") || "",
      };
    }
    return {
      ...empty,
      projectId: defaultProjectId ?? "",
      status: defaultStatus ?? TASK_STATUS.TODO,
    };
  });

  const statusOptions = (() => {
    const cols = [...enabledColumns];
    if (!cols.some((c) => c.id === form.status)) {
      const current = statuses.find((s) => s.id === form.status);
      if (current) cols.unshift(current);
    }
    return cols.map((c) => ({ value: c.id, label: c.label }));
  })();

  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    () =>
      task?.assignees
        ?.filter((a) => {
          // will be refined once we know which are clients
          return true;
        })
        .map((a) => a.user.id) ?? [],
  );
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>(
    () => task?.tags?.map((t) => t.tag.id) ?? [],
  );

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? "",
        projectId: task.projectId,
        repoId: task.repoId ?? "",
        status: task.status,
        priority: task.priority,
        startDate: formatDate(task.startDate, "input") || "",
        endDate: formatDate(task.endDate, "input") || "",
      });
      setTagIds(task.tags?.map((t) => t.tag.id) ?? []);
    }
  }, [task]);

  const { data: projects } = useQuery({
    queryKey: ProjectQueries.keys.all(),
    queryFn: ProjectQueries.fetchAll,
  });

  const selectedProject = projects?.find((p) => p.id === form.projectId);
  const projectRepos = selectedProject?.repos ?? [];

  const { data: teamMembers = [] } = useQuery({
    queryKey: MemberQueries.keys.team(),
    queryFn: MemberQueries.fetchTeam,
  });

  const { data: clientMembers = [] } = useQuery({
    queryKey: MemberQueries.keys.clients(),
    queryFn: MemberQueries.fetchClients,
  });

  const { data: allTags = [] } = useQuery({
    queryKey: TagQueries.keys.all(),
    queryFn: TagQueries.fetchAll,
  });

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = "Title is required";
    if (!form.projectId) next.projectId = "Project is required";
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (end < start) {
        next.endDate = "End date cannot be earlier than start date";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: TaskQueries.create,
    onSuccess: (data) => {
      toast.success("Task created");
      queryClient.invalidateQueries({ queryKey: TaskQueries.keys.all() });
      navigate(`/tracker`);
    },
    onError: () => toast.error("Failed to create task"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof TaskQueries.update>[1] & {
        assigneeIds?: string[];
        clientIds?: string[];
        tagIds?: string[];
      };
    }) => {
      const { assigneeIds, clientIds, tagIds, ...basicFields } = payload;
      const allAssigneeIds = [...(assigneeIds || []), ...(clientIds || [])];

      await TaskQueries.update(id, basicFields);

      if (assigneeIds !== undefined || clientIds !== undefined) {
        await TaskQueries.updateAssignees(id, allAssigneeIds);
      }

      if (tagIds !== undefined) {
        await TaskQueries.updateTags(id, tagIds);
      }

      return await TaskQueries.fetchById(id);
    },
    onSuccess: (data) => {
      toast.success("Task updated");
      queryClient.invalidateQueries({ queryKey: TaskQueries.keys.all() });
      queryClient.invalidateQueries({
        queryKey: TaskQueries.keys.detail(data.id),
      });
      navigate(`/tracker/${data.id}`);
    },
    onError: () => toast.error("Failed to update task"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      title: form.title.trim(),
      description: form.description || undefined,
      projectId: form.projectId,
      repoId: form.repoId || undefined,
      status: form.status,
      priority: form.priority,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
      clientIds: clientIds.length > 0 ? clientIds : undefined,
      tagIds: tagIds.length > 0 ? tagIds : undefined,
    };
    if (isEdit && task) {
      updateMutation.mutate({ id: task.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="mx-auto space-y-8">
      <div className="">
        <div className="mb-4">
          <BackButton />
        </div>
        <h1>{isEdit ? "Edit Task" : "Create Task"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEdit
            ? "Make changes to your task and save them."
            : "Fill in the details below to create a new task."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 col-span-6 max-w-4xl px-6 ml-auto"
      >
        <Field>
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
            placeholder="Task title"
            value={form.title}
            onChange={(e) => set("title")(e.target.value)}
          />
          {errors.title && <FieldError>{errors.title}</FieldError>}
        </Field>

        <Field>
          <Label htmlFor="task-description">Description</Label>
          <Textarea
            id="task-description"
            placeholder="Optional description"
            rows={4}
            value={form.description}
            onChange={(e) => set("description")(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field>
            <Label>Project</Label>
            <Select value={form.projectId} onValueChange={set("projectId")}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {(projects ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.projectId && <FieldError>{errors.projectId}</FieldError>}
          </Field>

          {projectRepos.length > 0 && (
            <Field>
              <Label>Repository</Label>
              <Select value={form.repoId} onValueChange={set("repoId")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a repository" />
                </SelectTrigger>
                <SelectContent>
                  {projectRepos.map((repo) => (
                    <SelectItem key={repo.id} value={repo.id}>
                      {repo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field>
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => set("status")(v as TASK_STATUS)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <Label>Priority</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => set("priority")(v as PRIORITY)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label>Start Date</Label>
            <DatePicker
              date={form.startDate ? new Date(form.startDate) : undefined}
              onDateChange={(date) =>
                set("startDate")(date ? formatDate(date, "input") || "" : "")
              }
              placeholder="Pick a date"
              dateFormat="MMM d, yyyy"
            />
          </Field>
          <Field>
            <Label>End Date</Label>
            <DatePicker
              date={form.endDate ? new Date(form.endDate) : undefined}
              onDateChange={(date) =>
                set("endDate")(date ? formatDate(date, "input") || "" : "")
              }
              placeholder="Pick a date"
              dateFormat="MMM d, yyyy"
              disabled={(date) =>
                form.startDate ? date < new Date(form.startDate) : false
              }
            />
            {errors.endDate && <FieldError>{errors.endDate}</FieldError>}
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <Label>Assignees</Label>
            <MultiSelect
              options={teamMembers.map((m) => ({
                value: m.id,
                label: m.name,
                image: m.image,
                subtitle: m.email,
              }))}
              value={assigneeIds}
              onChange={setAssigneeIds}
              placeholder="Select team members…"
            />
          </Field>

          <Field>
            <Label>
              Clients{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <MultiSelect
              options={clientMembers.map((m) => ({
                value: m.id,
                label: m.name,
                image: m.image,
                subtitle: m.email,
              }))}
              value={clientIds}
              onChange={setClientIds}
              placeholder="Select clients…"
            />
          </Field>
        </div>

        <Field>
          <Label>
            Tags{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <TagInput tags={allTags} value={tagIds} onChange={setTagIds} />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
