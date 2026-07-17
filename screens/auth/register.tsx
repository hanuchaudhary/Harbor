"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import axios from "axios";

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

const registerSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  unlockKey: z.string().min(1, { message: "Registration key is required" }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterPage = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      unlockKey: "",
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);

    form.clearErrors("unlockKey");

    try {
      await authClient.signUp.email(
        {
          name: data.email.split("@")[0],
          email: data.email,
          password: data.password,
          role: "ADMIN",
          isDesigner: false,
        },
        {
          onError: (error) => {
            console.error("Sign Up Error:", error);
            toast.error(error.error.message || "Failed to create account");
          },
          onSuccess: () => {
            toast.success("Account created successfully");
            router.push("/signin");
          },
          onRequest: async () => {
            const response = await axios.post("/api/admin/validate", {
              key: data.unlockKey,
            });

            if (!response.data.valid) {
              form.setError("unlockKey", {
                type: "manual",
                message: "Invalid registration key",
              });

              toast.error("Invalid registration key");
              throw new Error("Invalid registration key");
            }

            toast.loading("Creating account...", { id: "register-toast" });
          },
        },
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unlockKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Registration Key</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </Form>
  );
};
