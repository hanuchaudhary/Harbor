"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth/auth.client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { IconCheckFilled, IconCircleCheckFilled } from "@tabler/icons-react";
import Image from "next/image";

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [isLoading, setLoading] = React.useState(false);
  const [passwordReset, setPasswordReset] = React.useState(false);
  const [tokenError, setTokenError] = React.useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || null;
  const error = searchParams?.get("error") || null;

  useEffect(() => {
    if (error === "INVALID_TOKEN") {
      setTokenError(true);
      toast.error("Invalid or expired reset link");
    }
  }, [error]);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      toast.error("Reset token is missing");
      return;
    }

    setLoading(true);
    try {
      const { data: response, error } = await authClient.resetPassword({
        newPassword: data.newPassword,
        token,
      });

      if (error) {
        toast.error(error.message || "Failed to reset password");
      } else {
        setPasswordReset(true);
        toast.success("Password reset successfully!");
        setTimeout(() => {
          router.push("/signin");
        }, 3000);
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (tokenError) {
    return (
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-destructive">
              Invalid Reset Link
            </h1>
            <p className="text-sm text-muted-foreground">
              This password reset link is invalid or has expired.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => router.push("/forgot-password")}
              className="w-full"
            >
              Request a new reset link
            </Button>

            <div className="text-center text-sm">
              <Link
                href="/signin"
                className="text-muted-foreground hover:text-foreground"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-6">
        {!passwordReset ? (
          <div className="md:flex w-full px-6">
            <div className="w-full md:pb-0 pb-6">
              <div className="flex items-center gap-2 text-lg font-semibold mb-2">
                <Image
                  src="/logo.svg"
                  alt="Harbor"
                  width={22}
                  height={16}
                  className=""
                  unoptimized
                />
                <span>Harbor</span>
              </div>
              <h1>Reset password</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Back to{" "}
                <Link
                  href="/signin"
                  className="text-foreground font-medium hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6 w-full"
              >
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
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
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !token}
                  >
                    {isLoading ? "Resetting..." : "Reset password"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        ) : (
          <div className="space-y-6 max-w-sm mx-auto">
            <div className="space-y-4 text-center">
              <IconCircleCheckFilled className="w-12 h-12 text-emerald-500 mx-auto" />
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">
                  Password reset successful!
                </h1>
                <p className="text-sm text-muted-foreground">
                  You will be redirected to the sign in page in a few seconds.
                </p>
              </div>
            </div>

            <Button onClick={() => router.push("/signin")} className="w-full">
              Go to sign in
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
