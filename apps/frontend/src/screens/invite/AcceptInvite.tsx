"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { http } from "@/lib/api/http";
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
import { authClient } from "@/lib/auth.client";

const acceptInviteSchema = z
  .object({
    name: z.string().optional(),
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
      navigate("/signin");
      return;
    }

    if (invitationId) {
      http
        .get(`/api/organizations/invitations/${invitationId}`)
        .then((res) => {
          setOrgInvite({
            email: res.data.email,
            organizationName: res.data.organizationName,
          });
        })
        .catch(() => {
          toast.error("Invitation not found or expired");
          navigate("/signin");
        });
    }
  }, [token, invitationId, navigate]);

  const onSubmit = async (data: AcceptInviteFormValues) => {
    setIsLoading(true);
    try {
      if (token) {
        await http.post("/api/invite/accept", {
          token,
          password: data.password,
        });
        toast.success("Account activated successfully! Please sign in.");
        navigate("/signin");
        return;
      }

      if (invitationId && orgInvite) {
        const name = data.name?.trim();
        if (!name) {
          form.setError("name", { message: "Name is required" });
          toast.error("Name is required");
          return;
        }

        const { error: signUpError } = await authClient.signUp.email({
          email: orgInvite.email,
          password: data.password,
          name,
          role: "DEVELOPER",
          isDesigner: false,
        });

        if (signUpError) {
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
        navigate("/projects");
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to accept invite",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!token && !invitationId) {
    return null;
  }

  if (invitationId && !orgInvite) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading invitation...</p>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-screen items-center justify-center max-w-3xl mx-auto">
      <div className="w-full md:flex px-6">
        <div className="w-full md:pb-0 pb-6">
          <div className="flex items-center gap-2 text-lg font-semibold mb-2">
            <img src="/logo.svg" alt="Harbor" width={22} height={16} />
            <span>Harbor</span>
          </div>
          <h1>Accept invite</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Already have an account?{" "}
            <Link
              to="/signin"
              className="text-foreground font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
        <div className="w-full">
          <div className="w-full max-w-xl space-y-6">
            {orgInvite ? (
              <p className="text-sm text-muted-foreground">
                Join{" "}
                <span className="text-foreground font-medium">
                  {orgInvite.organizationName}
                </span>{" "}
                as {orgInvite.email}
              </p>
            ) : null}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit, (errors) => {
                  const first = Object.values(errors)[0]?.message;
                  if (first) toast.error(String(first));
                })}
                className="space-y-6"
              >
                {invitationId ? (
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Name
                        </FormLabel>
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
                        Confirm password{" "}
                        <span className="text-red-400">*</span>
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
                <Button
                  type="submit"
                  className="h-12 w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Activating..." : "Accept invite"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
