"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserQueries } from "@/lib/query/query.func";
import { formatDate } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Role } from "@repo/db/enums";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UserAvatar from "../user-avatar";
import { roleVariant } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  image: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    projectMembers: number;
  };
};

const roles: Role[] = [
  "ADMIN",
  "PARTNER",
  "PROJECT_MANAGER",
  "DEVELOPER",
  "CLIENT",
];

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
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
  ) {
    return error.response.data.message;
  }

  return fallback;
};

export function UsersTable() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    userId: string | null;
    userEmail: string;
  }>({ open: false, userId: null, userEmail: "" });
  const queryClient = useQueryClient();
  const router = useRouter();
  const { role: userRole } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: UserQueries.keys.list(page, search, role),
    queryFn: () => UserQueries.fetchList(page, search, role),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: { role?: Role; isActive?: boolean };
    }) => UserQueries.updateUser(userId, payload),
    onSuccess: (response) => {
      toast.success(response?.message || "User updated successfully");
      queryClient.invalidateQueries({ queryKey: UserQueries.keys.all() });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to update user"));
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => UserQueries.deleteUser(userId),
    onSuccess: (response) => {
      toast.success(response?.message || "User deleted successfully");
      queryClient.invalidateQueries({ queryKey: UserQueries.keys.all() });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to delete user"));
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Search by name or email..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Select
            value={role || undefined}
            onValueChange={(value) => {
              setRole(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="PARTNER">Partner</SelectItem>
              <SelectItem value="PROJECT_MANAGER">Project Manager</SelectItem>
              <SelectItem value="DEVELOPER">Developer</SelectItem>
              <SelectItem value="CLIENT">Client</SelectItem>
            </SelectContent>
          </Select>
          {role && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRole("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              data?.users.map((user: UserRow) => (
                <TableRow
                  key={user.id}
                  className="h-12 cursor-pointer group hover:bg-muted/50"
                >
                  <TableCell
                    onClick={() =>
                      userRole === "ADMIN" &&
                      router.push(`/admin/users/${user.id}`)
                    }
                  >
                    <UserAvatar
                      alt={user.name}
                      src={user.image || ""}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell
                    onClick={() =>
                      userRole === "ADMIN" &&
                      router.push(`/admin/users/${user.id}`)
                    }
                    className="font-medium group-hover:underline"
                  >
                    {user.name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleVariant[user.role]}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{user._count.projectMembers}</TableCell>
                  <TableCell>
                    {formatDate(new Date(user.createdAt), "short")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Manage user</DropdownMenuLabel>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            Change role
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {roles.map((nextRole) => (
                              <DropdownMenuItem
                                key={nextRole}
                                disabled={
                                  user.role === nextRole ||
                                  updateUserMutation.isPending
                                }
                                onSelect={() => {
                                  updateUserMutation.mutate({
                                    userId: user.id,
                                    payload: { role: nextRole },
                                  });
                                }}
                              >
                                {nextRole}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem
                          disabled={updateUserMutation.isPending}
                          onSelect={() => {
                            updateUserMutation.mutate({
                              userId: user.id,
                              payload: { isActive: !user.isActive },
                            });
                          }}
                        >
                          {user.isActive ? "Deactivate user" : "Activate user"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          disabled={deleteUserMutation.isPending}
                          onSelect={() => {
                            setDeleteConfirm({
                              open: true,
                              userId: user.id,
                              userEmail: user.email,
                            });
                          }}
                        >
                          Delete user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 10 + 1} to{" "}
            {Math.min(page * 10, data.pagination.total)} of{" "}
            {data.pagination.total} users
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page >= data.pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          !open &&
          setDeleteConfirm({ open: false, userId: null, userEmail: "" })
        }
        title="Delete User"
        description={`Are you sure you want to delete ${deleteConfirm.userEmail}? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => {
          if (deleteConfirm.userId) {
            deleteUserMutation.mutate(deleteConfirm.userId);
          }
          setDeleteConfirm({ open: false, userId: null, userEmail: "" });
        }}
        variant="destructive"
      />
    </div>
  );
}
