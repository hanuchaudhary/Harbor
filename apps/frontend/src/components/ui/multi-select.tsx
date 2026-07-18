"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ROLE } from "@/types/types";
import { roleVariant } from "@/lib/constants";

export interface MultiSelectOption {
  value: string;
  label: string;
  image?: string | null;
  role?: ROLE;
  subtitle?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxDisplay?: number;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  disabled = false,
  className,
  maxDisplay = 3,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedSet = React.useMemo(() => new Set(value), [value]);

  const filtered = React.useMemo(
    () =>
      options.filter(
        (o) =>
          o.label.toLowerCase().includes(search.toLowerCase()) ||
          o.subtitle?.toLowerCase().includes(search.toLowerCase()),
      ),
    [options, search],
  );

  const toggle = (val: string) => {
    if (selectedSet.has(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const remove = (e: React.MouseEvent, val: string) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== val));
  };

  const selectedOptions = options.filter((o) => selectedSet.has(o.value));
  const displayed = selectedOptions.slice(0, maxDisplay);
  const overflow = selectedOptions.length - maxDisplay;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex min-h-11 w-full items-center gap-1.5 border border-input bg-transparent px-3 py-1.5 text-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <div className="flex flex-1 flex-wrap gap-1">
            {selectedOptions.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                {displayed.map((o) => (
                  <span
                    key={o.value}
                    className="inline-flex items-center gap-1 bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    {o.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={o.image}
                        alt={o.label}
                        className="size-4 rounded-full object-cover"
                      />
                    ) : (
                      <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary/20 text-[9px] font-semibold text-primary">
                        {initials(o.label)}
                      </span>
                    )}
                    {o.label}
                    <XIcon
                      className="size-3 cursor-pointer opacity-60 hover:opacity-100"
                      onClick={(e) => remove(e, o.value)}
                    />
                  </span>
                ))}
                {overflow > 0 && (
                  <span className="inline-flex items-center bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    +{overflow} more
                  </span>
                )}
              </>
            )}
          </div>
          <ChevronDownIcon className="ml-auto size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
        sideOffset={4}
      >
        <div className="flex items-center border-b px-3">
          <input
            className="flex h-9 w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <XIcon
              className="size-4 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            />
          )}
        </div>
        <div className="max-h-56 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No results
            </div>
          ) : (
            filtered.map((o) => {
              const selected = selectedSet.has(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                  onClick={() => toggle(o.value)}
                >
                  {o.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={o.image}
                      alt={o.label}
                      className="size-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
                      {initials(o.label)}
                    </span>
                  )}
                  <span className="flex-1 text-left">
                    <div className="flex gap-1">
                    <span className="block leading-tight">{o.label}</span>
                      {o.role ? (
                        <Badge variant={roleVariant[o.role as ROLE]} size="xs">
                          {o.role}
                        </Badge>
                      ) : null}
                    </div>
                    {o.subtitle && (
                      <span className="block text-xs text-muted-foreground">
                        {o.subtitle}
                      </span>
                    )}
                  </span>
                  <CheckIcon
                    className={cn(
                      "size-4 shrink-0 text-primary transition-opacity",
                      selected ? "opacity-100" : "opacity-0",
                    )}
                  />
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
