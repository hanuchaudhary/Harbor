"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth.client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function LogoutDialog() {
  const router = useRouter();
  const { signOut } = authClient;
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    await signOut().then(() => {
      setOpen(false);
      router.push("/signin");
    });
  };

  return (
    <>
      <button
        className="text-sm text-muted-foreground hover:text-primary cursor-pointer w-full text-left"
        onClick={() => setOpen(true)}
      >
        Logout
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Logout"
        description="Are you sure you want to logout? You will be redirected to the signin page."
        confirmText={isLoading ? "Logging out..." : "Logout"}
        onConfirm={handleLogout}
        variant="destructive"
      />
    </>
  );
}
