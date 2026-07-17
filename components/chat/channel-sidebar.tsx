"use client";

import { useMemo } from "react";
import { Hash, Users, Bell, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useChat } from "@/hooks/use-chat";
import { Channel } from "@/lib/query/query.func";
import Link from "next/link";

const channelIcons: Record<string, any> = {
  ALL: Hash,
  PROJECT_MANAGERS: Users,
  PROJECT_DEV_PM: Users,
  PROJECT_CLIENT_PM: Users,
  PROJECT_CLIENT_ADMIN: Lock,
  ANNOUNCEMENT: Bell,
};

const channelLabels: Record<string, string> = {
  ALL: "All",
  PROJECT_MANAGERS: "Project Managers",
  PROJECT_DEV_PM: "Team",
  PROJECT_CLIENT_PM: "Client",
  PROJECT_CLIENT_ADMIN: "Private",
  ANNOUNCEMENT: "Announcements",
};

interface ChannelSidebarProps {
  projectId?: string;
  currentPath?: string;
}

export function ChannelSidebar({
  projectId,
  currentPath,
}: ChannelSidebarProps) {
  const { channels, isLoadingChannels } = useChat();

  const groupChannelsByType = (channels: Channel[]) => {
    const grouped: Record<string, Channel[]> = {
      general: [],
      project: [],
      announcement: [],
    };

    channels.forEach((channel) => {
      if (channel.type === "ALL") {
        grouped.general.push(channel);
      } else if (channel.type === "ANNOUNCEMENT") {
        grouped.announcement.push(channel);
      } else {
        grouped.project.push(channel);
      }
    });

    return grouped;
  };

  const groupedChannels = useMemo(
    () => groupChannelsByType(channels),
    [channels],
  );

  if (isLoadingChannels && channels.length === 0) {
    return (
      <div className="w-64 border-r bg-muted/10 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Channels</h2>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-muted/10 flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Channels</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-4">
          {groupedChannels.general.length > 0 && (
            <div>
              <h3 className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase">
                General
              </h3>
              <div className="space-y-1">
                {groupedChannels.general.map((channel) => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    isActive={currentPath === `/channels/${channel.id}`}
                  />
                ))}
              </div>
            </div>
          )}

          {groupedChannels.project.length > 0 && (
            <div>
              <h3 className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase">
                Project Channels
              </h3>
              <div className="space-y-1">
                {groupedChannels.project.map((channel) => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    isActive={currentPath === `/channels/${channel.id}`}
                  />
                ))}
              </div>
            </div>
          )}

          {groupedChannels.announcement.length > 0 && (
            <div>
              <h3 className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase">
                Announcements
              </h3>
              <div className="space-y-1">
                {groupedChannels.announcement.map((channel) => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    isActive={currentPath === `/channels/${channel.id}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ChannelItemProps {
  channel: Channel;
  isActive: boolean;
}

function ChannelItem({ channel, isActive }: ChannelItemProps) {
  const Icon = channelIcons[channel.type] || Hash;
  const label = channelLabels[channel.type] || channel.name;

  return (
    <Link href={`/channels/${channel.id}`}>
      <button
        className={cn(
          "w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          isActive && "bg-accent text-accent-foreground font-medium",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">
          {channel.name || label}
        </span>
        {channel.unreadCount && channel.unreadCount > 0 && (
          <Badge variant="default" className="h-5 px-1.5 text-xs">
            {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
          </Badge>
        )}
      </button>
    </Link>
  );
}
