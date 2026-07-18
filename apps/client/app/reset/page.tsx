import { SpinLoader } from "@/components/spin-loader";
import ResetPassword from "@/screens/auth/reset";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Reset Password ",
  description: "Set a new password for your Harbor account.",
};
import { Suspense } from "react";

export default function page() {
  return (
    <div className="bg-background flex h-screen items-center justify-center max-w-3xl mx-auto">
      <Suspense fallback={<SpinLoader />}>
        <ResetPassword />
      </Suspense>
    </div>
  );
}
