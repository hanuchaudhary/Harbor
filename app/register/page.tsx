import { RegisterPage } from "@/screens/auth/register";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Register ",
  description: "Create a new admin account for Harbor.",
};

export default function page() {
  return (
    <div className="bg-background flex h-screen items-center justify-center max-w-3xl mx-auto">
      <div className="w-full md:flex px-6">
        <div className="w-full">
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
          <h1>Create your account</h1>
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
          <RegisterPage />
        </div>
      </div>
    </div>
  );
}
