"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

import { AVATARS } from "@/lib/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import ConnectGithub from "@/components/connect-github";

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  createdAt: string;
}

const roleLabel: Record<string, string> = {
  ADMIN: "Admin",
  PARTNER: "Partner",
  PROJECT_MANAGER: "Project Manager",
  DEVELOPER: "Developer",
  CLIENT: "Client",
};

async function fetchProfile(): Promise<ProfileUser> {
  const { data } = await axios.get("/api/profile");
  return data.user;
}

async function updateProfile(
  payload: Partial<Pick<ProfileUser, "name" | "image">>,
): Promise<ProfileUser> {
  const { data } = await axios.patch("/api/profile", payload);
  return data.user;
}

export function ProfilePage() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile"], updated);
      toast.success("Profile updated");
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formImage, setFormImage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFormName(profile.name);
      setFormImage(profile.image);
    }
  }, [profile]);

  const hasChanges =
    profile &&
    (formName.trim() !== profile.name || formImage !== profile.image);

  const handleSave = () => {
    if (!profile) return;

    const changes: Partial<Pick<ProfileUser, "name" | "image">> = {};
    if (formName.trim() && formName.trim() !== profile.name)
      changes.name = formName.trim();
    if (formImage !== profile.image) changes.image = formImage ?? undefined;

    if (Object.keys(changes).length === 0) {
      toast.info("No changes to save");
      return;
    }

    mutation.mutate(changes);
  };

  const selectAvatar = (url: string) => {
    setFormImage(url);
    setAvatarOpen(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1>Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account details
          </p>
        </div>
      </div>

      <div className="space-y-6 max-w-4xl px-6 ml-auto mt-6">
        <div className="col-span-6 space-y-6 flex gap-8 items-start">
          <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
            <DialogTrigger asChild>
              <button
                className="relative shrink-0 rounded-full focus:outline-none group"
                title="Change avatar"
              >
                <Avatar className="h-30 w-30">
                  <AvatarImage src={formImage ?? undefined} />
                  <AvatarFallback className="text-xl">
                    {(formName || profile?.email || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  Change
                </span>
              </button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-xl border-dashed">
              <DialogHeader>
                <DialogTitle>Select Avatar</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-1">
                <div>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-montreal-mono">
                    Upload custom
                  </p>
                  <FileUpload
                    folder="avatars"
                    accept="image/*"
                    maxSizeMB={5}
                    value={null}
                    onChange={(file) => {
                      if (file) {
                        selectAvatar(file.fileUrl);
                      }
                    }}
                  />
                </div>

                <Separator />

                <div>
                  <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-montreal-mono">
                    Presets
                  </p>
                  <div className="grid grid-cols-4 gap-4">
                    {AVATARS.map((avatar) => (
                      <button
                        key={avatar.url}
                        onClick={() => selectAvatar(avatar.url)}
                        className="flex flex-col items-center gap-1.5 hover:opacity-75 transition-opacity"
                      >
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={avatar.url} />
                          <AvatarFallback>{avatar.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {avatar.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <div className="flex-1 space-y-6">
            <div className="flex items-start gap-6">
              <div className="flex-1 space-y-4">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="border-dashed"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    value={profile?.email ?? ""}
                    disabled
                    className="border-dashed"
                  />
                </div>

                <div className="space-y-1">
                  <Label>GitHub</Label>
                  <ConnectGithub />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Role</Label>
                <div className="flex items-center h-9 px-3 border border-dashed border-input bg-muted/40">
                  <Badge variant="outline" className="text-xs font-normal">
                    {roleLabel[profile?.role ?? ""] ?? profile?.role}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Member since</Label>
                <div className="flex items-center h-9 px-3 border border-dashed border-input bg-muted/40 text-sm text-muted-foreground">
                  {profile?.createdAt ? formatDate(profile.createdAt) : "—"}
                </div>
              </div>
            </div>
            {hasChanges && (
              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
