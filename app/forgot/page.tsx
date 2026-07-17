import ForgotPassword from "@/screens/auth/forgot";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Forgot Password ",
  description: "Reset your Harbor account password.",
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
              className=""
              unoptimized
            />
            <span>Harbor</span>
          </div>
          <h1>Forgot password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Remembered your password?{" "}
            <Link
              href="/signin"
              className="text-foreground font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
        <div className="w-full">
          <ForgotPassword />
        </div>
      </div>
    </div>
  );
}
