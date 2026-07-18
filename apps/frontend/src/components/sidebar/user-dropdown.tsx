"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeTogglerButton } from "@/components/theme-toggle";
import { LogoutDialog } from "./logout-dialog";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import UserAvatar from "../user-avatar";
import { ROLE } from "@/types/types";
import { Badge } from "../ui/badge";
import { roleVariant } from "@/lib/constants";

interface UserDropdownProps {
  email?: string;
  name?: string;
  image?: string | null;
  role?: ROLE;
  onHeader?: boolean;
}

export function UserDropdown({
  email,
  name,
  image,
  role,
  onHeader,
}: UserDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-2 h-auto py-2 hover:bg-sidebar-accent cursor-pointer w-fit">
          <UserAvatar src={image!} alt={name!} />
          <div
            className={cn(
              "flex flex-col items-start min-w-0",
              onHeader ? "hidden" : "",
            )}
          >
            <p className="text-sm font-medium truncate">{email}</p>
            <div className="flex items-center gap-0.5">
              <p className="text-xs text-muted-foreground truncate">{name}</p>
            </div>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="font-montreal-regular space-y-2"
      >
        <Link to="/profile" className="w-full block">
          <DropdownMenuLabel className="flex gap-2 items-center">
            <UserAvatar src={image!} alt={name!} />
            <div>
              <p className="text-sm font-medium truncate">{email}</p>
              <p className="text-xs text-muted-foreground truncate">{name}</p>
            </div>
          </DropdownMenuLabel>
        </Link>
        <div className="px-2">
          <ThemeTogglerButton className="text-sm text-foreground/70 hover:text-foreground w-full cursor-pointer" />
        </div>
        <div className="px-2 w-full">
          <LogoutDialog />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
