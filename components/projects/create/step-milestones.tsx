"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
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
import { useProjectStore } from "@/lib/stores/project.store";

const statusOptions = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DELAYED", label: "Delayed" },
] as const;

const statusColor: Record<string, string> = {
  NOT_STARTED: "bg-muted-foreground/40",
  IN_PROGRESS: "bg-blue-500",
  COMPLETED: "bg-emerald-500",
  DELAYED: "bg-red-500",
};

export function StepMilestones() {
  const { milestones, setMilestone, addMilestone, removeMilestone } =
    useProjectStore();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Milestones (Optional)</h2>
        <Button type="button" variant="outline" onClick={addMilestone}>
          <Plus className="w-4 h-4" />
          Add Milestone
        </Button>
      </div>

      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No milestones added yet. You can skip this step.
        </p>
      ) : (
        <div className="relative">
          <div className="absolute left-2.25 top-4 bottom-4 w-px bg-border" />

          <div className="space-y-6">
            {milestones.map((milestone, index) => (
              <div key={`milestone-${index}`} className="flex gap-5">
                <div className="flex flex-col items-center shrink-0 pt-1">
                  <div
                    className={`w-5 h-5 rounded-full border-2 border-background ring-2 ring-border shrink-0 ${statusColor[milestone.status]}`}
                  />
                </div>

                <div className="flex-1 border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Milestone {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMilestone(index)}
                      className="h-7 px-2 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <Field>
                    <Label>Title</Label>
                    <Input
                      value={milestone.title}
                      onChange={(e) =>
                        setMilestone(index, { title: e.target.value })
                      }
                      placeholder="Milestone title"
                    />
                  </Field>

                  <Field>
                    <Label>Description</Label>
                    <Textarea
                      value={milestone.description}
                      onChange={(e) =>
                        setMilestone(index, { description: e.target.value })
                      }
                      placeholder="Optional description"
                      rows={2}
                    />
                  </Field>

                  <div className="grid grid-cols-3 gap-3">
                    <Field>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={milestone.startDate}
                        onChange={(e) =>
                          setMilestone(index, { startDate: e.target.value })
                        }
                      />
                    </Field>
                    <Field>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={milestone.endDate}
                        onChange={(e) =>
                          setMilestone(index, { endDate: e.target.value })
                        }
                      />
                    </Field>
                    <Field>
                      <Label>Status</Label>
                      <Select
                        value={milestone.status}
                        onValueChange={(v) =>
                          setMilestone(index, {
                            status:
                              v as (typeof statusOptions)[number]["value"],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
