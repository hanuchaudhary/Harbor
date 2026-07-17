"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InviteQueries } from "@/lib/query/query.func";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate } from "@/lib/utils";
import {
  CircleDashed,
  Copy,
  CopyCheck,
  Mail,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@/generated/prisma/enums";

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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconMailFilled,
} from "@tabler/icons-react";
import { roleVariant } from "@/lib/constants";

type InviteRow = {
  id: string;
  email: string;
  role: Role;
  token: string;
  expiry: string;
  used: boolean;
  createdAt: string;
  project?: {
    id: string;
    name: string;
  } | null;
};

export function InvitesTable() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 400);
  const [role, setRole] = useState("");
  const [used, setUsed] = useState("");
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: InviteQueries.keys.list(page, search, role, used),
    queryFn: () => InviteQueries.fetchList(page, search, role, used),
  });

  const copyInviteLink = (token: string, inviteId: string) => {
    const link = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied to clipboard!");
    setCopiedInviteId(inviteId);
    setTimeout(() => {
      setCopiedInviteId(null);
    }, 2000);
  };

  const getStatus = (invite: InviteRow) => {
    if (invite.used) {
      return {
        label: "Used",
        icon: <IconCircleCheckFilled className="h-4 w-4 text-emerald-400" />,
        tooltip: "Invite has been used",
      };
    }

    if (new Date(invite.expiry) < new Date()) {
      return {
        label: "Expired",
        icon: <IconCircleXFilled className="h-4 w-4 text-red-400" />,
        tooltip: "Invite has expired",
      };
    }

    return {
      label: "Active",
      icon: <CircleDashed className="h-4 w-4 text-blue-400" />,
      tooltip: `Expires on ${new Date(invite.expiry).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}`,
    };
  };

  const totalPages = data?.pagination?.totalPages ?? 1;
  const totalItems = data?.pagination?.total ?? 0;

  const pageItems = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Search by email..."
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
        <div className="flex items-center gap-2">
          <Select
            value={used || undefined}
            onValueChange={(value) => {
              setUsed(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">Pending</SelectItem>
              <SelectItem value="true">Used</SelectItem>
            </SelectContent>
          </Select>
          {used && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setUsed("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {!isLoading && (data?.invites.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border bg-muted/20">
          <IconMailFilled className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground font-montreal-mono uppercase">
            No invites found.
          </p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-16rem)] mb-10">
          <Table>
            <TableHeader className="">
              <TableRow className="">
                <TableHead></TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : data?.invites.map((invite: InviteRow) => {
                    const status = getStatus(invite);
                    const isActive =
                      !invite.used && new Date(invite.expiry) > new Date();

                    return (
                      <TableRow key={invite.id} className="font-mono">
                        <TableCell>
                          <Mail className="h-4 w-4 mr-2 inline-block text-red-400" />
                        </TableCell>
                        <TableCell className="font-medium">
                          {invite.email}
                        </TableCell>
                        <TableCell>{invite.project?.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={roleVariant[invite.role]}>
                            {invite.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="flex items-center gap-2">
                                {status.icon}
                                <span className="text-sm">{status.label}</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{status.tooltip}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {formatDate(new Date(invite.createdAt), "short")}
                        </TableCell>
                        <TableCell>
                          {new Date(invite.expiry) < new Date() ? (
                            <span className="text-destructive">Expired</span>
                          ) : (
                            formatDate(new Date(invite.expiry), "dateTime")
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isActive ? (
                            <button
                              className="inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground h-8 w-8"
                              onClick={() =>
                                copyInviteLink(invite.token, invite.id)
                              }
                            >
                              {copiedInviteId === invite.id ? (
                                <CopyCheck className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            "--"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </div>
      )}

      {data && totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({totalItems} total invites)
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-none border-dashed"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              {pageItems.map((p, i) => (
                <div key={p} className="flex items-center">
                  {i > 0 && pageItems[i - 1] !== p - 1 && (
                    <span className="px-2 text-muted-foreground">...</span>
                  )}
                  <Button
                    variant={page === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(p)}
                    className="w-8 h-8 p-0 rounded-none border-dashed"
                  >
                    {p}
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="rounded-none border-dashed"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
