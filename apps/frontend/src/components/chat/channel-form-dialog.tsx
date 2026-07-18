"use client";

import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Hash, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Channel,
  ChannelType,
  CreateChannelPayload,
  ProjectQueries,
  UpdateChannelPayload,
} from "@/lib/query/query.func";

const channelTypes: Array<{
  value: ChannelType;
  label: string;
  description: string;
}> = [
  { value: "ALL", label: "Everyone", description: "Visible to all team members" },
  {
    value: "PROJECT_MANAGERS",
    label: "Project managers",
    description: "Visible to project managers",
  },
  {
    value: "ANNOUNCEMENT",
    label: "Announcements",
    description: "Only admins can publish",
  },
  {
    value: "PROJECT_DEV_PM",
    label: "Project team",
    description: "Developers and project managers",
  },
  {
    value: "PROJECT_CLIENT_PM",
    label: "Project clients",
    description: "Clients and project managers",
  },
  {
    value: "PROJECT_CLIENT_ADMIN",
    label: "Project private",
    description: "Clients and admins",
  },
];

const projectChannelTypes = new Set<ChannelType>([
  "PROJECT_DEV_PM",
  "PROJECT_CLIENT_PM",
  "PROJECT_CLIENT_ADMIN",
]);

interface ChannelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "rename";
  channel?: Channel;
  isPending?: boolean;
  onSubmit: (
    payload: CreateChannelPayload | UpdateChannelPayload,
  ) => Promise<unknown>;
}

export function ChannelFormDialog({
  open,
  onOpenChange,
  mode,
  channel,
  isPending = false,
  onSubmit,
}: ChannelFormDialogProps) {
  const [name, setName] = useState(channel?.name ?? "");
  const [description, setDescription] = useState(channel?.description ?? "");
  const [type, setType] = useState<ChannelType>(channel?.type ?? "ALL");
  const [projectId, setProjectId] = useState(channel?.projectId ?? "");
  const [error, setError] = useState("");

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ProjectQueries.keys.all(),
    queryFn: ProjectQueries.fetchAll,
    enabled: open && mode === "create",
    staleTime: 60_000,
  });

  const needsProject = projectChannelTypes.has(type);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Enter a channel name.");
      return;
    }
    if (needsProject && !projectId) {
      setError("Select a project for this channel.");
      return;
    }

    setError("");
    const payload =
      mode === "create"
        ? {
            name: trimmedName,
            description: description.trim() || undefined,
            type,
            projectId: needsProject ? projectId : undefined,
          }
        : {
            name: trimmedName,
            description: description.trim() || undefined,
          };

    await onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center border bg-muted/40">
            <Hash className="size-5" />
          </div>
          <DialogTitle>
            {mode === "create" ? "Create channel" : "Rename channel"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a focused space for conversations and updates."
              : "Update how this channel appears across the workspace."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="channel-name">Name</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Product launches"
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-description">Description</Label>
            <Textarea
              id="channel-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What should people use this channel for?"
              maxLength={500}
              rows={3}
            />
          </div>

          {mode === "create" && (
            <>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select
                  value={type}
                  onValueChange={(value) => {
                    setType(value as ChannelType);
                    setProjectId("");
                    setError("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channelTypes.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex flex-col items-start">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {needsProject && (
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          isLoadingProjects
                            ? "Loading projects..."
                            : "Select a project"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {mode === "create" ? "Create channel" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
