"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X } from "lucide-react";

import { inviteSchema, InviteType } from "@/validations/validation";
import { InviteQueries, ProjectQueries } from "@/lib/query/query.func";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { IconPlus } from "@tabler/icons-react";

export function CreateInviteDialog() {
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: projectsData } = useQuery({
    queryKey: ProjectQueries.keys.all(),
    queryFn: () => ProjectQueries.fetchAll(),
  });

  const {
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InviteType>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      emails: [],
      role: "DEVELOPER",
      expiry: "1D",
      projectId: "",
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: (data: InviteType) => InviteQueries.create(data),
    onSuccess: () => {
      toast.success("Invites created successfully");
      queryClient.invalidateQueries({ queryKey: InviteQueries.keys.all() });
      reset();
      setEmails([]);
      setCurrentEmail("");
      setOpen(false);
    },
    onError: (error: unknown) => {
      const errorMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
          ? error.response.data.message
          : "Failed to create invites";

      toast.error(errorMessage);
    },
  });

  const syncEmailsToForm = (nextEmails: string[]) => {
    setEmails(nextEmails);
    setValue("emails", nextEmails, { shouldValidate: true });
  };

  const addEmail = (email: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    if (!isValidEmail) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (
      emails.some((item) => item.toLowerCase() === trimmedEmail.toLowerCase())
    ) {
      toast.warning("Email already added");
      return;
    }

    syncEmailsToForm([...emails, trimmedEmail]);
    setCurrentEmail("");
    setTimeout(() => emailInputRef.current?.focus(), 0);
  };

  const removeEmail = (emailToRemove: string) => {
    syncEmailsToForm(emails.filter((email) => email !== emailToRemove));
    setTimeout(() => emailInputRef.current?.focus(), 0);
  };

  const onEmailKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      addEmail(currentEmail);
    }
  };

  const onSubmit = (data: InviteType) => {
    if (currentEmail.trim()) {
      addEmail(currentEmail);
      return;
    }

    if (emails.length === 0) {
      toast.error("Please add at least one email");
      return;
    }

    createInviteMutation.mutate({ ...data, emails });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
          reset();
          setEmails([]);
          setCurrentEmail("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="group">
          <IconPlus className="h-5 w-5 stroke-[1.5] group-hover:rotate-90" />
          Create Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Invite</DialogTitle>
          <DialogDescription>
            Send invitations to join your organization
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Field>
            <Label>Email(s)</Label>
            <Input
              ref={emailInputRef}
              value={currentEmail}
              onChange={(event) => {
                setCurrentEmail(event.target.value);
              }}
              onKeyDown={onEmailKeyDown}
              onBlur={() => {
                if (currentEmail.trim()) {
                  addEmail(currentEmail);
                }
              }}
              placeholder="Enter email and press Enter/Tab"
            />

            {emails.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 border border-dashed rounded-none">
                {emails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-none text-sm"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Press Enter or Tab to add email
            </p>
            <FieldError>{errors.emails?.message}</FieldError>
          </Field>

          <Field>
            <Label>Project (optional)</Label>
            <Select onValueChange={(value) => setValue("projectId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projectsData?.map((project: any) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.projectId?.message}</FieldError>
          </Field>

          <div className="flex gap-6 items-center">
            <Field>
              <Label>Role</Label>
              <Select
                defaultValue="DEVELOPER"
                onValueChange={(value) =>
                  setValue("role", value as InviteType["role"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="PARTNER">Partner</SelectItem>
                  <SelectItem value="PROJECT_MANAGER">
                    Project Manager
                  </SelectItem>
                  <SelectItem value="DEVELOPER">Developer</SelectItem>
                  <SelectItem value="CLIENT">Client</SelectItem>
                </SelectContent>
              </Select>
              <FieldError>{errors.role?.message}</FieldError>
            </Field>
          </div>

          <Field>
            <Label>Expiry</Label>
            <Select
              defaultValue="1D"
              onValueChange={(value) =>
                setValue("expiry", value as InviteType["expiry"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15MIN">15 Minutes</SelectItem>
                <SelectItem value="1H">1 Hour</SelectItem>
                <SelectItem value="1D">1 Day</SelectItem>
                <SelectItem value="7D">7 Days</SelectItem>
              </SelectContent>
            </Select>
            <FieldError>{errors.expiry?.message}</FieldError>
          </Field>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                setEmails([]);
                setCurrentEmail("");
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createInviteMutation.isPending}>
              {createInviteMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
