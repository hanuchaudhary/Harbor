import { Metadata } from "next";

import { OnboardingPage } from "@/screens/onboarding/Onboarding";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Set up your Harbor organization.",
};

export default function page() {
  return <OnboardingPage />;
}
