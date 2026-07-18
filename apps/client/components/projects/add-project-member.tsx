"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MemberQueries, ProjectQueries } from "@/lib/query/query.func";
import { ROLE } from "@/types/types";
import { useAuth } from "@/hooks/useAuth";

interface AddProjectMemberProps {
  projectSlug: string;
  existingMemberIds: string[];
  existingClientIds: string[];
}

export function AddProjectMember({
  projectSlug,
  existingMemberIds,
  existingClientIds,
}: AddProjectMemberProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [memberType, setMemberType] = useState<"member" | "client">("member");
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey:
      memberType === "client"
        ? MemberQueries.keys.clients()
        : MemberQueries.keys.team(),
    queryFn:
      memberType === "client"
        ? MemberQueries.fetchClients
        : MemberQueries.fetchTeam,
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({
      userIds,
      type,
    }: {
      userIds: string[];
      type: "member" | "client";
    }) => {
      return await ProjectQueries.addMember(projectSlug, userIds, type);
    },
    onSuccess: (data) => {
      toast.success(
        data.message ||
          `${data.addedCount} ${memberType === "member" ? "member(s)" : "client(s)"} added successfully`,
      );
      queryClient.invalidateQueries({
        queryKey: ProjectQueries.keys.detail(projectSlug),
      });
      setOpen(false);
      setSelectedUserIds([]);
      setMemberType("member");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to add members");
    },
  });

  const availableUsers = usersData?.filter((user) => {
    if (memberType === "member") {
      return !existingMemberIds.includes(user.id);
    } else {
      return !existingClientIds.includes(user.id);
    }
  });

  const handleAddMembers = async () => {
    if (selectedUserIds.length === 0) {
      toast.error("Please select at least one user");
      return;
    }

    addMemberMutation.mutate({ userIds: selectedUserIds, type: memberType });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Project Member</DialogTitle>
          <DialogDescription>
            Add a team member or client to this project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Member Type</Label>
            <Select
              value={memberType}
              onValueChange={(value: "member" | "client") => {
                setMemberType(value);
                setSelectedUserIds([]);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Team Member</SelectItem>
                {role === "ADMIN" && (
                  <SelectItem value="client">Client</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Select Users</Label>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : availableUsers && availableUsers.length > 0 ? (
              <MultiSelect
                options={availableUsers.map((user) => ({
                  value: user.id,
                  label: user.name,
                  subtitle: user.email,
                  role: user.role as ROLE,
                  image: user.image,
                }))}
                value={selectedUserIds}
                onChange={setSelectedUserIds}
                placeholder="Select users..."
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No available users to add as{" "}
                {memberType === "member" ? "team members" : "clients"}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={addMemberMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddMembers}
            disabled={
              selectedUserIds.length === 0 || addMemberMutation.isPending
            }
          >
            {addMemberMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add{" "}
                {selectedUserIds.length > 0 ? `${selectedUserIds.length} ` : ""}
                {memberType === "member" ? "Member(s)" : "Client(s)"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RemoveMemberButtonProps {
  projectSlug: string;
  userId: string;
  userName: string;
  type: "member" | "client";
}

export function RemoveMemberButton({
  projectSlug,
  userId,
  userName,
  type,
}: RemoveMemberButtonProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const removeMemberMutation = useMutation({
    mutationFn: async () => {
      return await ProjectQueries.removeMember(projectSlug, userId, type);
    },
    onSuccess: () => {
      toast.success(
        `${type === "member" ? "Member" : "Client"} removed successfully`,
      );
      queryClient.invalidateQueries({
        queryKey: ProjectQueries.keys.detail(projectSlug),
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to remove member");
    },
  });

  const handleRemove = () => {
    removeMemberMutation.mutate();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        disabled={removeMemberMutation.isPending}
        className="h-7 w-7"
        onClick={() => setOpen(true)}
      >
        {removeMemberMutation.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <X className="h-3 w-3" />
        )}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Remove ${type === "member" ? "Member" : "Client"}`}
        description={`Are you sure you want to remove ${userName} from this project? This action cannot be undone.`}
        confirmText={removeMemberMutation.isPending ? "Removing..." : "Remove"}
        onConfirm={handleRemove}
        variant="destructive"
      />
    </>
  );
}
