"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ProjectQueries } from "@/lib/query/query.func";
import { cn } from "@/lib/utils";

interface MilestonesTabProps {
  projectSlug: string;
  isEditable: boolean;
  milestones: Array<{
    id: string;
    title: string;
    description: string | null;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
  }>;
}

export function MilestonesTab({
  projectSlug,
  isEditable,
  milestones,
}: MilestonesTabProps) {
  const [editingMilestone, setEditingMilestone] = useState<{
    id?: string;
    title: string;
    description: string;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
    startDate: Date | null;
    endDate: Date | null;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    milestoneId: string | null;
    milestoneTitle: string;
  }>({ open: false, milestoneId: null, milestoneTitle: "" });

  const queryClient = useQueryClient();

  const saveMilestoneMutation = useMutation({
    mutationFn: async (milestone: {
      id?: string;
      title: string;
      description: string;
      status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
      startDate: Date | null;
      endDate: Date | null;
    }) => {
      if (milestone.id) {
        return axios.patch(
          `/api/projects/${projectSlug}/milestones/${milestone.id}`,
          {
            title: milestone.title,
            description: milestone.description || null,
            status: milestone.status,
            startDate: milestone.startDate
              ? milestone.startDate.toISOString()
              : null,
            endDate: milestone.endDate ? milestone.endDate.toISOString() : null,
          },
        );
      } else {
        return axios.post(`/api/projects/${projectSlug}/milestones`, {
          title: milestone.title,
          description: milestone.description || null,
          status: milestone.status,
          startDate: milestone.startDate
            ? milestone.startDate.toISOString()
            : null,
          endDate: milestone.endDate ? milestone.endDate.toISOString() : null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ProjectQueries.keys.detail(projectSlug),
      });
      toast.success(
        editingMilestone?.id ? "Milestone updated" : "Milestone created",
      );
      setEditingMilestone(null);
    },
    onError: () => {
      toast.error("Failed to save milestone");
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      return axios.delete(
        `/api/projects/${projectSlug}/milestones/${milestoneId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ProjectQueries.keys.detail(projectSlug),
      });
      toast.success("Milestone deleted");
    },
    onError: () => {
      toast.error("Failed to delete milestone");
    },
  });

  const updateMilestoneStatusMutation = useMutation({
    mutationFn: async ({
      milestoneId,
      status,
    }: {
      milestoneId: string;
      status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
    }) => {
      return axios.patch(
        `/api/projects/${projectSlug}/milestones/${milestoneId}`,
        {
          status,
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ProjectQueries.keys.detail(projectSlug),
      });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  return (
    <>
      <div className="space-y-4">
        {!isEditable && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setEditingMilestone({
                  title: "",
                  description: "",
                  status: "NOT_STARTED",
                  startDate: null,
                  endDate: null,
                })
              }
            >
              <Plus className="w-4 h-4" />
              Add Milestone
            </Button>
          </div>
        )}
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground">No milestones yet.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-2.25 top-4 bottom-4 w-px bg-border" />
            <div className="space-y-6">
              {milestones.map((milestone) => {
                const dotColor =
                  milestone.status === "COMPLETED"
                    ? "bg-emerald-600"
                    : milestone.status === "IN_PROGRESS"
                      ? "bg-blue-500"
                      : milestone.status === "DELAYED"
                        ? "bg-red-500"
                        : "bg-muted-foreground/40";
                return (
                  <div key={milestone.id} className="flex gap-5">
                    <div className="flex flex-col items-center shrink-0 pt-1">
                      <div
                        className={`relative w-5 h-5 rounded-full border-2 border-background ring-2 ring-border shrink-0 ${dotColor}`}
                      />
                    </div>
                    <div className="flex-1 border p-4 space-y-1 group relative">
                      {!isEditable && (
                        <div className="absolute bottom-0 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() =>
                              setEditingMilestone({
                                id: milestone.id,
                                title: milestone.title,
                                description: milestone.description || "",
                                status: milestone.status,
                                startDate: milestone.startDate
                                  ? new Date(milestone.startDate)
                                  : null,
                                endDate: milestone.endDate
                                  ? new Date(milestone.endDate)
                                  : null,
                              })
                            }
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteConfirm({
                                open: true,
                                milestoneId: milestone.id,
                                milestoneTitle: milestone.title,
                              });
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{milestone.title}</p>
                        <Select
                          value={milestone.status}
                          onValueChange={(v) =>
                            updateMilestoneStatusMutation.mutate({
                              milestoneId: milestone.id,
                              status: v as
                                | "NOT_STARTED"
                                | "IN_PROGRESS"
                                | "COMPLETED"
                                | "DELAYED",
                            })
                          }
                          disabled={isEditable}
                        >
                          <SelectTrigger className="h-6 text-xs w-32 px-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NOT_STARTED">
                              Not Started
                            </SelectItem>
                            <SelectItem value="IN_PROGRESS">
                              In Progress
                            </SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="DELAYED">Delayed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {milestone.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {milestone.description}
                        </p>
                      )}
                      {(milestone.startDate || milestone.endDate) && (
                        <p className="text-xs text-muted-foreground font-montreal-mono uppercase font-semibold">
                          {milestone.startDate
                            ? formatDate(milestone.startDate, "short")
                            : "—"}
                          {" → "}
                          {milestone.endDate
                            ? formatDate(milestone.endDate, "short")
                            : "—"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={!!editingMilestone}
        onOpenChange={(open) => !open && setEditingMilestone(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMilestone?.id ? "Edit Milestone" : "Create Milestone"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editingMilestone?.title || ""}
                onChange={(e) =>
                  setEditingMilestone(
                    editingMilestone
                      ? { ...editingMilestone, title: e.target.value }
                      : null,
                  )
                }
                placeholder="Milestone title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editingMilestone?.description || ""}
                onChange={(e) =>
                  setEditingMilestone(
                    editingMilestone
                      ? { ...editingMilestone, description: e.target.value }
                      : null,
                  )
                }
                placeholder="Milestone description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editingMilestone?.status}
                onValueChange={(v) =>
                  setEditingMilestone(
                    editingMilestone
                      ? {
                          ...editingMilestone,
                          status: v as
                            | "NOT_STARTED"
                            | "IN_PROGRESS"
                            | "COMPLETED"
                            | "DELAYED",
                        }
                      : null,
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="DELAYED">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <DatePicker
                  date={editingMilestone?.startDate || undefined}
                  onDateChange={(date) =>
                    setEditingMilestone(
                      editingMilestone
                        ? { ...editingMilestone, startDate: date || null }
                        : null,
                    )
                  }
                  placeholder="Pick a date"
                  className={cn(
                    !editingMilestone?.startDate && "text-muted-foreground",
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <DatePicker
                  date={editingMilestone?.endDate || undefined}
                  onDateChange={(date) =>
                    setEditingMilestone(
                      editingMilestone
                        ? { ...editingMilestone, endDate: date || null }
                        : null,
                    )
                  }
                  placeholder="Pick a date"
                  disabled={(date) =>
                    editingMilestone?.startDate
                      ? date < editingMilestone.startDate
                      : false
                  }
                  className={cn(
                    !editingMilestone?.endDate && "text-muted-foreground",
                  )}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setEditingMilestone(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                editingMilestone &&
                saveMilestoneMutation.mutate(editingMilestone)
              }
              disabled={
                !editingMilestone?.title.trim() ||
                (editingMilestone?.startDate &&
                  editingMilestone?.endDate &&
                  editingMilestone.endDate < editingMilestone.startDate) ||
                saveMilestoneMutation.isPending
              }
            >
              {saveMilestoneMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          !open &&
          setDeleteConfirm({
            open: false,
            milestoneId: null,
            milestoneTitle: "",
          })
        }
        title="Delete Milestone"
        description={`Are you sure you want to delete "${deleteConfirm.milestoneTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => {
          if (deleteConfirm.milestoneId) {
            deleteMilestoneMutation.mutate(deleteConfirm.milestoneId);
          }
          setDeleteConfirm({
            open: false,
            milestoneId: null,
            milestoneTitle: "",
          });
        }}
        variant="destructive"
      />
    </>
  );
}
