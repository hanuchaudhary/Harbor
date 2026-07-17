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
import { useEditProjectStore } from "@/lib/stores/edit-project.store";
import { toSlug, formatDate } from "@/lib/utils";
import { BRAND } from "@/types/types";
import { ReposManager } from "@/components/projects/repos-manager";
import { Slider } from "@/components/ui/slider";

const statusValues = ["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const;
const currencyValues = ["USD", "EUR", "INR", "AED"] as const;

interface EditDetailsProps {
  errors: Record<string, string>;
}

export function EditDetails({ errors }: EditDetailsProps) {
  const {
    details,
    repos,
    isSlugEdited,
    setDetails,
    setIsSlugEdited,
    setRepos,
  } = useEditProjectStore();

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
              if (!isSlugEdited) setDetails({ slug: toSlug(name) });
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
            onBlur={(e) => setDetails({ slug: toSlug(e.target.value) })}
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
      </Field>
      <div>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[details.progressPct]}
          className="w-full accent-primary mt-1"
          onValueChange={(values) => {
            console.log(values[0]);
            setDetails({ progressPct: values[0] });
          }}
        />
        <div>
          <span className="text-xs text-muted-foreground">
            {details.progressPct}% complete
          </span>
        </div>
      </div>

      <ReposManager repos={repos} onReposChange={setRepos} errors={errors} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>Brand</Label>
          <Select
            value={details.brand}
            onValueChange={(v) => setDetails({ brand: v as BRAND })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OCEANLAB">OceanLab</SelectItem>
              <SelectItem value="WATERMELON">Watermelon</SelectItem>
              <SelectItem value="XOCKET">Xocket</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <Label>Status</Label>
          <Select
            value={details.status}
            onValueChange={(v) => {
              if (statusValues.includes(v as (typeof statusValues)[number])) {
                setDetails({ status: v as (typeof statusValues)[number] });
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>Currency</Label>
          <Select
            value={details.currency}
            onValueChange={(v) => {
              if (
                currencyValues.includes(v as (typeof currencyValues)[number])
              ) {
                setDetails({ currency: v as (typeof currencyValues)[number] });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="INR">INR</SelectItem>
              <SelectItem value="AED">AED</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <Label>Budget</Label>
          <Input
            value={details.budget}
            onChange={(e) => setDetails({ budget: e.target.value })}
            type="number"
            min={0}
            step="0.01"
            placeholder="Enter budget amount"
          />
          <FieldError>{errors.budget}</FieldError>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>Start Date</Label>
          <DatePicker
            date={parsedStartDate}
            onDateChange={(date) =>
              setDetails({
                startDate: date ? formatDate(date, "input") || "" : "",
              })
            }
          />
        </Field>

        <Field>
          <Label>Estimated End Date</Label>
          <DatePicker
            date={parsedEstimatedEndAt}
            onDateChange={(date) =>
              setDetails({
                estimatedEndAt: date ? formatDate(date, "input") || "" : "",
              })
            }
          />
        </Field>
      </div>
    </div>
  );
}
