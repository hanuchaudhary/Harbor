"use client";

import { ComponentType, useMemo, useState } from "react";
import {
  IconHash,
  IconUsers,
  IconLock,
  IconSpeakerphone,
  IconGhost,
} from "@tabler/icons-react";
import { Plus, Minus, SquarePlus } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/useAuth";
import { ChannelFormDialog } from "@/components/chat/channel-form-dialog";
import { CreateChannelPayload } from "@/lib/query/query.func";

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
  const { channels, createChannel, createChannelMutation } = useChat();
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

  const renderChannel = (channel: (typeof channels)[0], isSubItem = false) => {
    const Icon = channelIcons[channel.type] || IconHash;
    const isActive = pathname === `/channels/${channel.id}`;

    const content = (
      <>
        <Icon className="h-5 w-5 stroke-1" />
        <span className="flex-1 truncate">{channel.name}</span>
        {channel.unreadCount! > 0 && (
          <Badge variant="default" className="h-5 px-1.5 text-xs ml-auto">
            {channel.unreadCount! > 99 ? "99+" : channel.unreadCount}
          </Badge>
        )}
      </>
    );

    if (isSubItem) {
      return (
        <Link key={channel.id} href={`/channels/${channel.id}`}>
          <SidebarMenuSubItem>
            <SidebarMenuSubButton className="py-4" isActive={isActive}>
              {content}
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        </Link>
      );
    }

    return (
      <Link key={channel.id} href={`/channels/${channel.id}`}>
        <SidebarMenuItem>
          <SidebarMenuButton className="py-4" isActive={isActive}>
            {content}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </Link>
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
    </div>
  );
}
