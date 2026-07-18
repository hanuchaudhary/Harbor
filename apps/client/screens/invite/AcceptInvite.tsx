"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useRouter, useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "sonner";
import { z } from "zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth.client";

const acceptInviteSchema = z
  .object({
    name: z.string().min(1, { message: "Name is required" }).optional(),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" })
      .max(100, { message: "Password must be at most 100 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type AcceptInviteFormValues = z.infer<typeof acceptInviteSchema>;

export default function AcceptInvite() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const invitationId = searchParams?.get("invitationId");
  const [isLoading, setIsLoading] = useState(false);
  const [orgInvite, setOrgInvite] = useState<{
    email: string;
    organizationName: string;
  } | null>(null);

  const form = useForm<AcceptInviteFormValues>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!token && !invitationId) {
      toast.error("Invalid invite link");
      router.push("/signin");
      return;
    }

    if (invitationId) {
      axios
        .get(`/api/organizations/invitations/${invitationId}`)
        .then((res) => {
          setOrgInvite({
            email: res.data.email,
            organizationName: res.data.organizationName,
          });
        })
        .catch(() => {
          toast.error("Invitation not found or expired");
          router.push("/signin");
        });
    }
  }, [token, invitationId, router]);

  const onSubmit = async (data: AcceptInviteFormValues) => {
    setIsLoading(true);
    try {
      if (token) {
        await axios.post("/api/invite/accept", {
          token,
          password: data.password,
        });
        toast.success("Account activated successfully! Please sign in.");
        router.push("/signin");
        return;
      }

      if (invitationId && orgInvite) {
        const { error: signUpError } = await authClient.signUp.email({
          email: orgInvite.email,
          password: data.password,
          name: data.name || orgInvite.email.split("@")[0],
          role: "DEVELOPER",
          isDesigner: false,
        });

        if (signUpError) {
          // Account may already exist — try sign in
          const { error: signInError } = await authClient.signIn.email({
            email: orgInvite.email,
            password: data.password,
          });
          if (signInError) {
            toast.error(
              signUpError.message ||
                signInError.message ||
                "Failed to authenticate",
            );
            return;
          }
        }

        const { error: acceptError } =
          await authClient.organization.acceptInvitation({
            invitationId,
          });

        if (acceptError) {
          toast.error(acceptError.message || "Failed to accept invitation");
          return;
        }

        toast.success("Joined organization successfully");
        router.push("/projects");
      }
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Failed to accept invite";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token && !invitationId) {
    return null;
  }

  if (invitationId && !orgInvite) {
    return (
      <p className="text-sm text-muted-foreground">Loading invitation...</p>
    );
  }

  return (
    <div className="w-full max-w-xl space-y-6">
      {orgInvite ? (
        <p className="text-sm text-muted-foreground">
          Join <span className="text-foreground font-medium">{orgInvite.organizationName}</span>{" "}
          as {orgInvite.email}
        </p>
      ) : null}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {invitationId ? (
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Name</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Your name"
                      className="border-muted"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  Password <span className="text-red-400">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="border-muted"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  Confirm password <span className="text-red-400">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="border-muted"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="h-12 w-full" disabled={isLoading}>
            {isLoading ? "Activating..." : "Accept invite"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
