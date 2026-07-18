"use client";

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
import { useProjectStore } from "@/lib/stores/project.store";
import { toSlug, formatDate } from "@/lib/utils";
import { ReposManager } from "@/components/projects/repos-manager";

interface StepDetailsProps {
  errors: Record<string, string>;
}

const statusValues = ["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const;

export function StepDetails({ errors }: StepDetailsProps) {
  const {
    details,
    repos,
    isSlugEdited,
    setDetails,
    setIsSlugEdited,
    setRepos,
  } = useProjectStore();

  const parsedStartDate = details.startDate
    ? new Date(details.startDate)
    : undefined;
  const parsedEstimatedEndAt = details.estimatedEndAt
    ? new Date(details.estimatedEndAt)
    : undefined;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>Project Name</Label>
          <Input
            value={details.name}
            onChange={(e) => {
              const name = e.target.value;
              setDetails({ name });
              if (!isSlugEdited) {
                setDetails({ slug: toSlug(name) });
              }
            }}
            placeholder="Enter project name"
          />
          <FieldError>{errors.name}</FieldError>
        </Field>

        <Field>
          <Label>Slug</Label>
          <Input
            value={details.slug}
            onChange={(e) => {
              setIsSlugEdited(true);
              setDetails({ slug: e.target.value });
            }}
            onBlur={(e) => {
              setDetails({ slug: toSlug(e.target.value) });
            }}
            placeholder="project-slug"
          />
          <FieldError>{errors.slug}</FieldError>
        </Field>
      </div>

      <Field>
        <Label>Description</Label>
        <Textarea
          value={details.description}
          onChange={(e) => setDetails({ description: e.target.value })}
          placeholder="Enter project description"
          rows={4}
        />
        <FieldError>{errors.description}</FieldError>
      </Field>

      <ReposManager repos={repos} onReposChange={setRepos} errors={errors} />

      <Field>
        <Label>Status</Label>
        <Select
          value={details.status}
          onValueChange={(value) => {
            if (statusValues.includes(value as (typeof statusValues)[number])) {
              setDetails({ status: value as (typeof statusValues)[number] });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>Start Date</Label>
          <DatePicker
            date={parsedStartDate}
            onDateChange={(date) =>
              setDetails({
                startDate: date ? (formatDate(date, "input") ?? "") : "",
              })
            }
          />
          <FieldError>{errors.startDate}</FieldError>
        </Field>

        <Field>
          <Label>Estimated End Date</Label>
          <DatePicker
            date={parsedEstimatedEndAt}
            onDateChange={(date) =>
              setDetails({
                estimatedEndAt: date ? (formatDate(date, "input") ?? "") : "",
              })
            }
          />
          <FieldError>{errors.estimatedEndAt}</FieldError>
        </Field>
      </div>
    </div>
  );
}
