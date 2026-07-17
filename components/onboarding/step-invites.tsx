"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOnboardingStore } from "@/lib/stores/onboarding.store";

const ROLES = [
  "DEVELOPER",
  "PROJECT_MANAGER",
  "ADMIN",
  "CLIENT",
  "PARTNER",
] as const;

interface StepInvitesProps {
  errors: Record<string, string>;
}

export function StepInvites({ errors }: StepInvitesProps) {
  const { invites, addInvite, removeInvite, setInvite } = useOnboardingStore();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Invite teammates now, or skip and do it later from Invites.
      </p>

      {invites.map((invite, index) => (
        <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor={`invite-email-${index}`}>Email</Label>
            <Input
              id={`invite-email-${index}`}
              type="email"
              value={invite.email}
              placeholder="teammate@example.com"
              onChange={(e) => setInvite(index, { email: e.target.value })}
            />
          </div>
          <div className="w-full space-y-2 sm:w-48">
            <Label>Role</Label>
            <Select
              value={invite.role}
              onValueChange={(value) =>
                setInvite(index, {
                  role: value as (typeof ROLES)[number],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            disabled={invites.length === 1}
            onClick={() => removeInvite(index)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}

      {errors.invites ? (
        <p className="text-sm text-destructive">{errors.invites}</p>
      ) : null}

      <Button type="button" variant="outline" onClick={addInvite}>
        <Plus className="size-4" />
        Add another
      </Button>
    </div>
  );
}
