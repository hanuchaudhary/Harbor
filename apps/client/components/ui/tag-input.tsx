"use client";

import * as React from "react";
import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HexColorPicker } from "react-colorful";

import { cn } from "@/lib/utils";
import { Tag } from "@/types/types";
import { TagQueries } from "@/lib/query/query.func";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_COLOR = "#6366f1";

function TagFormDialog({
  open,
  title,
  name,
  color,
  isPending,
  submitLabel,
  onNameChange,
  onColorChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  name: string;
  color: string;
  isPending: boolean;
  submitLabel: string;
  onNameChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [hexInput, setHexInput] = React.useState(color);

  React.useEffect(() => {
    setHexInput(color);
  }, [color, open]);

  const handlePicker = (c: string) => {
    onColorChange(c);
    setHexInput(c);
  };

  const handleHex = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setHexInput(raw);
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) onColorChange(raw);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1 flex gap-6">
          <div className="w-full flex flex-col justify-between">
            <div className="space-y-1.5">
              <Label htmlFor="tag-dialog-name">Name</Label>
              <Input
                id="tag-dialog-name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Tag name"
                autoFocus
                className="w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) onSubmit();
                }}
              />
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={!name.trim() || isPending} onClick={onSubmit}>
                {isPending ? "Saving…" : submitLabel}
              </Button>
            </div>
          </div>
          <div className="space-y-2 w-full">
            <Label>Color</Label>
            <HexColorPicker
              color={color}
              onChange={handlePicker}
              style={{ width: "100%" }}
            />
            <div className="flex items-center gap-2 pt-0.5">
              <span
                className="inline-flex shrink-0 items-center px-3 py-1 text-xs text-white uppercase font-semibold font-montreal-mono"
                style={{ backgroundColor: color }}
              >
                {name || "Preview"}
              </span>
              <Input
                value={hexInput}
                onChange={handleHex}
                className="h-6 font-mono text-xs"
                placeholder="#000000"
                maxLength={7}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TagInputProps {
  tags: Tag[];
  value: string[];
  onChange: (value: string[]) => void;
  onTagCreated?: (tag: Tag) => void;
  disabled?: boolean;
}

export function TagInput({
  tags,
  value,
  onChange,
  onTagCreated,
  disabled = false,
}: TagInputProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [dialog, setDialog] = React.useState<{
    mode: "create" | "edit";
    tag?: Tag;
    name: string;
    color: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const selectedSet = React.useMemo(() => new Set(value), [value]);

  const filtered = React.useMemo(
    () =>
      tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())),
    [tags, search],
  );

  const exactMatch = tags.some(
    (t) => t.name.toLowerCase() === search.toLowerCase().trim(),
  );
  const canCreate = search.trim().length > 0 && !exactMatch;

  const createMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      TagQueries.create(name, color),
    onSuccess: (tag) => {
      queryClient.invalidateQueries({ queryKey: TagQueries.keys.all() });
      onChange([...value, tag.id]);
      onTagCreated?.(tag);
      setSearch("");
      setDialog(null);
      toast.success(`Tag "${tag.name}" created`);
    },
    onError: () => toast.error("Failed to create tag"),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      name,
      color,
    }: {
      id: string;
      name: string;
      color: string;
    }) => TagQueries.update(id, name, color),
    onSuccess: (tag) => {
      queryClient.invalidateQueries({ queryKey: TagQueries.keys.all() });
      setDialog(null);
      toast.success(`Tag "${tag.name}" updated`);
    },
    onError: () => toast.error("Failed to update tag"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => TagQueries.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: TagQueries.keys.all() });
      onChange(value.filter((v) => v !== id));
      toast.success("Tag deleted");
    },
    onError: () => toast.error("Failed to delete tag"),
  });

  const toggle = (tagId: string) => {
    if (selectedSet.has(tagId)) {
      onChange(value.filter((v) => v !== tagId));
    } else {
      onChange([...value, tagId]);
    }
  };

  const remove = (e: React.MouseEvent, tagId: string) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== tagId));
  };

  const selectedTags = tags.filter((t) => selectedSet.has(t.id));

  const isPending =
    dialog?.mode === "create"
      ? createMutation.isPending
      : updateMutation.isPending;

  const handleSubmit = () => {
    if (!dialog || !dialog.name.trim()) return;
    if (dialog.mode === "create") {
      createMutation.mutate({ name: dialog.name.trim(), color: dialog.color });
    } else if (dialog.tag) {
      updateMutation.mutate({
        id: dialog.tag.id,
        name: dialog.name.trim(),
        color: dialog.color,
      });
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex min-h-11 w-full items-center gap-1.5 border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <div className="flex flex-1 flex-wrap gap-1">
              {selectedTags.length === 0 ? (
                <span className="text-muted-foreground">Add tags…</span>
              ) : (
                selectedTags.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs text-white uppercase font-semibold font-montreal-mono"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.name}
                    <XIcon
                      className="size-3 cursor-pointer opacity-80 hover:opacity-100"
                      onClick={(e) => remove(e, t.id)}
                    />
                  </span>
                ))
              )}
            </div>
            <PlusIcon className="ml-auto size-4 shrink-0 text-muted-foreground" />
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
              placeholder="Search or create tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCreate) {
                  e.preventDefault();
                  setDialog({
                    mode: "create",
                    name: search.trim(),
                    color: DEFAULT_COLOR,
                  });
                }
              }}
            />
            {search && (
              <XIcon
                className="size-4 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
              />
            )}
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {canCreate && (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent focus:outline-none"
                onClick={() =>
                  setDialog({
                    mode: "create",
                    name: search.trim(),
                    color: DEFAULT_COLOR,
                  })
                }
              >
                <PlusIcon className="size-3 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Create</span>
                <span className="font-medium">
                  &ldquo;{search.trim()}&rdquo;
                </span>
              </button>
            )}
            {filtered.length === 0 && !canCreate ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No tags found
              </div>
            ) : (
              filtered.map((t) => {
                const selected = selectedSet.has(t.id);
                return (
                  <div key={t.id} className="group flex items-center">
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent focus:outline-none"
                      onClick={() => toggle(t.id)}
                    >
                      <span
                        className="size-3 rounded-full shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="flex-1 text-left">{t.name}</span>
                      <CheckIcon
                        className={cn(
                          "size-4 shrink-0 text-primary transition-opacity",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </button>
                    <button
                      type="button"
                      className="px-1.5 py-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDialog({
                          mode: "edit",
                          tag: t,
                          name: t.name,
                          color: t.color,
                        });
                      }}
                    >
                      <PencilIcon className="size-3" />
                    </button>
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      className="px-1.5 py-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(t.id);
                      }}
                    >
                      <Trash2Icon className="size-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {dialog && (
        <TagFormDialog
          open
          title={dialog.mode === "create" ? "Create Tag" : "Edit Tag"}
          name={dialog.name}
          color={dialog.color}
          isPending={isPending}
          submitLabel={dialog.mode === "create" ? "Create tag" : "Save changes"}
          onNameChange={(v) => setDialog((d) => d && { ...d, name: v })}
          onColorChange={(v) => setDialog((d) => d && { ...d, color: v })}
          onClose={() => setDialog(null)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
