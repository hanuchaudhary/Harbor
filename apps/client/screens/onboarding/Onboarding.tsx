"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";

import { StepInvites } from "@/components/onboarding/step-invites";
import { StepOrg } from "@/components/onboarding/step-org";
import { StepProject } from "@/components/onboarding/step-project";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth.client";
import { useOnboardingStore } from "@/lib/stores/onboarding.store";
import {
  onboardingInviteSchema,
  onboardingProjectSchema,
  orgDetailsSchema,
} from "@/validations/validation";

const steps = ["Organization", "Invite team", "First project"] as const;

export function OnboardingPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const {
    currentStep,
    org,
    invites,
    project,
    nextStep,
    previousStep,
    setOrg,
    reset,
  } = useOnboardingStore();

  const finishOnboarding = async () => {
    await axios.post("/api/organizations/complete-onboarding");
    reset();
    toast.success("You're all set");
    router.push("/projects");
  };

  const handleOrgContinue = async () => {
    setErrors({});
    const parsed = orgDetailsSchema.safeParse({
      name: org.name,
      slug: org.slug,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "name");
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      if (org.organizationId) {
        nextStep();
        return;
      }

      const { data, error } = await authClient.organization.create({
        name: parsed.data.name,
        slug: parsed.data.slug,
      });

      if (error || !data) {
        toast.error(error?.message || "Failed to create organization");
        return;
      }

      await authClient.organization.setActive({
        organizationId: data.id,
      });

      // Promote creator user role for legacy checks during foundation
      await axios.patch("/api/organizations/bootstrap-admin").catch(() => null);

      setOrg({ organizationId: data.id });
      nextStep();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create organization");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvitesContinue = async (skip: boolean) => {
    setErrors({});

    if (!skip) {
      const filled = invites.filter((i) => i.email.trim().length > 0);
      const parsed = onboardingInviteSchema.safeParse({ invites: filled });
      if (!parsed.success) {
        setErrors({
          invites: parsed.error.issues[0]?.message || "Invalid invites",
        });
        return;
      }

      setIsLoading(true);
      try {
        for (const invite of parsed.data.invites) {
          const { error } = await authClient.organization.inviteMember({
            email: invite.email,
            role: invite.role as "ADMIN",
          });
          if (error) {
            toast.error(error.message || `Failed to invite ${invite.email}`);
            return;
          }
        }
        if (parsed.data.invites.length > 0) {
          toast.success("Invites sent");
        }
        nextStep();
      } catch (err) {
        console.error(err);
        toast.error("Failed to send invites");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    nextStep();
  };

  const handleProjectContinue = async (skip: boolean) => {
    setErrors({});

    if (!skip) {
      const parsed = onboardingProjectSchema.safeParse(project);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "name");
          fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);
        return;
      }

      setIsLoading(true);
      try {
        await axios.post("/api/projects", {
          name: parsed.data.name,
          slug: parsed.data.slug,
          description: parsed.data.description || undefined,
          status: parsed.data.status || "ACTIVE",
        });
        await finishOnboarding();
      } catch (err) {
        console.error(err);
        const message =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : "Failed to create project";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      await finishOnboarding();
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl space-y-8">
        <div>
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Image
              src="/logo.svg"
              alt="Harbor"
              width={22}
              height={16}
              unoptimized
            />
            <span>Harbor</span>
          </div>
          <h1 className="font-montreal-semibold text-2xl tracking-tight">
            Set up your organization
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Step {currentStep} of {steps.length} — {steps[currentStep - 1]}
          </p>
        </div>

        <div className="flex gap-2">
          {steps.map((label, index) => {
            const stepNum = index + 1;
            const active = stepNum === currentStep;
            const done = stepNum < currentStep;
            return (
              <div key={label} className="flex-1">
                <div
                  className={`h-1 w-full ${
                    active || done ? "bg-foreground" : "bg-muted"
                  }`}
                />
                <p
                  className={`mt-2 text-xs ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </p>
              </div>
            );
          })}
        </div>

        <div>
          {currentStep === 1 && <StepOrg errors={errors} />}
          {currentStep === 2 && <StepInvites errors={errors} />}
          {currentStep === 3 && <StepProject errors={errors} />}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={currentStep === 1 || isLoading}
            onClick={previousStep}
          >
            Back
          </Button>

          <div className="flex flex-wrap gap-2">
            {currentStep === 2 && (
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => handleInvitesContinue(true)}
              >
                Skip
              </Button>
            )}
            {currentStep === 3 && (
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => handleProjectContinue(true)}
              >
                Skip
              </Button>
            )}
            <Button
              type="button"
              disabled={isLoading}
              onClick={() => {
                if (currentStep === 1) void handleOrgContinue();
                else if (currentStep === 2) void handleInvitesContinue(false);
                else void handleProjectContinue(false);
              }}
            >
              {isLoading
                ? "Working..."
                : currentStep === 3
                  ? "Finish"
                  : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
