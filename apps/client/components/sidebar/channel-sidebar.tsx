"use client";

import {
  ComponentType,
  KeyboardEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  IconHash,
  IconUsers,
  IconLock,
  IconSpeakerphone,
  IconGhost,
} from "@tabler/icons-react";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "../ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ConfirmDialog } from "../ui/confirm-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/useAuth";
import { ChannelFormDialog } from "@/components/chat/channel-form-dialog";
import {
  Channel,
  CreateChannelPayload,
  UpdateChannelPayload,
} from "@/lib/query/query.func";

const channelIcons: Record<string, ComponentType<{ className?: string }>> = {
  ALL: IconHash,
  PROJECT_MANAGERS: IconUsers,
  PROJECT_DEV_PM: IconGhost,
  PROJECT_CLIENT_PM: IconUsers,
  PROJECT_CLIENT_ADMIN: IconLock,
  ANNOUNCEMENT: IconSpeakerphone,
};

export default function ChannelSidebar({
  pathname,
}: {
  pathname: string;
  isLoading?: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);
  const cancelRenameRef = useRef(false);
  const {
    channels,
    createChannel,
    updateChannel,
    deleteChannel,
    createChannelMutation,
    updateChannelMutation,
    deleteChannelMutation,
  } = useChat();
  const { user, role } = useAuth();

  const { globalChannels, projectGroups } = useMemo(() => {
    const global = channels.filter((ch) => !ch.projectId);
    const projectChannels = channels.filter((ch) => ch.projectId);

    const groups = projectChannels.reduce(
      (acc, channel) => {
        const projectId = channel.projectId!;
        if (!acc[projectId]) {
          acc[projectId] = {
            projectId,
            projectName: channel.project?.name || "Unknown Project",
            channels: [],
          };
        }
        acc[projectId].channels.push(channel);
        return acc;
      },
      {} as Record<
        string,
        { projectId: string; projectName: string; channels: typeof channels }
      >,
    );

    return {
      globalChannels: global,
      projectGroups: Object.values(groups),
    };
  }, [channels]);

  const isAdminOrPM =
    user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER";

  const startRenaming = (channel: Channel) => {
    cancelRenameRef.current = false;
    setEditingChannelId(channel.id);
    setEditingName(channel.name);
  };

  const saveChannelName = async (channel: Channel) => {
    const name = editingName.trim();
    if (!name || name === channel.name) {
      setEditingChannelId(null);
      setEditingName("");
      return;
    }

    await updateChannel(channel.id, {
      name,
    } satisfies UpdateChannelPayload);
    setEditingChannelId(null);
    setEditingName("");
  };

  const handleRenameKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    channel: Channel,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelRenameRef.current = true;
      setEditingName(channel.name);
      setEditingChannelId(null);
    }
  };

  const renderChannel = (channel: (typeof channels)[0], isSubItem = false) => {
    const Icon = channelIcons[channel.type] || IconHash;
    const isActive = pathname === `/channels/${channel.id}`;
    const isEditing = editingChannelId === channel.id;

    const content = (
      <>
        <Icon className="h-5 w-5 stroke-1" />
        {isEditing ? (
          <input
            value={editingName}
            onChange={(event) => setEditingName(event.target.value)}
            onBlur={() => {
              if (cancelRenameRef.current) {
                cancelRenameRef.current = false;
                return;
              }
              void saveChannelName(channel);
            }}
            onKeyDown={(event) => handleRenameKeyDown(event, channel)}
            onClick={(event) => event.stopPropagation()}
            className="h-6 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:outline-none"
            aria-label={`Rename ${channel.name}`}
            maxLength={100}
            disabled={updateChannelMutation.isPending}
            autoFocus
          />
        ) : (
          <span className="flex-1 truncate">{channel.name}</span>
        )}
        {channel.unreadCount! > 0 && (
          <Badge
            variant="default"
            className="ml-auto h-5 px-1.5 text-xs group-hover/channel:hidden"
          >
            {channel.unreadCount! > 99 ? "99+" : channel.unreadCount}
          </Badge>
        )}
      </>
    );

    const actions = role === "ADMIN" && !isEditing && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {isSubItem ? (
            <button
              type="button"
              className="absolute right-1 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center text-muted-foreground opacity-0 outline-none transition-opacity hover:bg-accent hover:text-foreground focus:opacity-100 group-hover/channel:opacity-100 data-[state=open]:opacity-100"
              aria-label={`Manage ${channel.name}`}
            >
              <MoreHorizontal className="size-4" />
            </button>
          ) : (
            <SidebarMenuAction
              showOnHover
              aria-label={`Manage ${channel.name}`}
            >
              <MoreHorizontal />
            </SidebarMenuAction>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="min-w-40">
          <DropdownMenuItem onSelect={() => startRenaming(channel)}>
            <Pencil />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteTarget(channel)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    if (isSubItem) {
      return (
        <SidebarMenuSubItem
          key={channel.id}
          className="group/channel relative"
        >
          <SidebarMenuSubButton
            asChild
            className="py-4 pr-8"
            isActive={isActive}
          >
            {isEditing ? (
              <div>{content}</div>
            ) : (
              <Link href={`/channels/${channel.id}`}>{content}</Link>
            )}
          </SidebarMenuSubButton>
          {actions}
        </SidebarMenuSubItem>
      );
    }

    return (
      <SidebarMenuItem key={channel.id} className="group/channel">
        <SidebarMenuButton
          asChild
          className="py-4 pr-8"
          isActive={isActive}
        >
          {isEditing ? (
            <div>{content}</div>
          ) : (
            <Link href={`/channels/${channel.id}`}>
              {content}
            </Link>
          )}
        </SidebarMenuButton>
        {actions}
      </SidebarMenuItem>
    );
  };

  return (
    <div>
      <SidebarGroup>
        <div className="mb-1.5 flex items-center justify-between pr-2">
          <SidebarGroupLabel>Channels</SidebarGroupLabel>
          {role === "ADMIN" && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Create channel"
              title="Create channel"
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
        <SidebarGroupContent>
          <SidebarMenu>
            {channels.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                No channels available
              </div>
            ) : (
              <>
                {role !== "CLIENT" &&
                  globalChannels.map((channel) => renderChannel(channel))}

                {isAdminOrPM
                  ? projectGroups.map((group) => {
                      const hasActiveChannel = group.channels.some(
                        (ch) => pathname === `/channels/${ch.id}`,
                      );
                      return (
                        <Collapsible
                          key={group.projectId}
                          className="group/collapsible"
                          defaultOpen={hasActiveChannel}
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton>
                                <span className="flex items-center gap-2">
                                  <IconHash className="h-5 w-5 stroke-1" />
                                  {group.projectName}
                                </span>
                                <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
                                <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub className="pl-4">
                                {group.channels.map((channel) =>
                                  renderChannel(channel, true),
                                )}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      );
                    })
                  : projectGroups.flatMap((group) =>
                      group.channels.map((channel) => renderChannel(channel)),
                    )}
              </>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      {createOpen && (
        <ChannelFormDialog
          open
          onOpenChange={setCreateOpen}
          mode="create"
          isPending={createChannelMutation.isPending}
          onSubmit={async (payload) => {
            const channel = await createChannel(
              payload as CreateChannelPayload,
            );
            router.push(`/channels/${channel.id}`);
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete channel"
        description={`Delete #${deleteTarget?.name ?? "channel"}? It will disappear from the workspace, but its message history will be preserved.`}
        confirmText={
          deleteChannelMutation.isPending ? "Deleting..." : "Delete channel"
        }
        onConfirm={async () => {
          if (!deleteTarget) return;
          const isCurrentChannel =
            pathname === `/channels/${deleteTarget.id}`;
          await deleteChannel(deleteTarget.id);
          setDeleteTarget(null);
          if (isCurrentChannel) router.push("/dashboard");
        }}
        variant="destructive"
      />
    </div>
  );
}
