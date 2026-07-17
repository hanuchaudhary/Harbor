import { Suspense } from "react";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SpinLoader } from "@/components/spin-loader";
import AcceptInvite from "@/screens/invite/AcceptInvite";

export const metadata: Metadata = {
  title: "Accept Invite",
  description: "Join your organization on Harbor.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function page() {
  return (
    <div className="bg-background flex h-screen items-center justify-center max-w-3xl mx-auto">
      <div className="w-full md:flex px-6">
        <div className="w-full md:pb-0 pb-6">
          <div className="flex items-center gap-2 text-lg font-semibold mb-2">
            <Image
              src="/logo.svg"
              alt="Harbor"
              width={22}
              height={16}
              className="h-6 w-auto rounded-sm ring-1 ring-inset dark:ring-white/20 ring-black/20"
              unoptimized
            />
            <span>Harbor</span>
          </div>
          <h1>Accept invite</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="text-foreground font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
        <div className="w-full">
          <Suspense fallback={<SpinLoader />}>
            <AcceptInvite />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
