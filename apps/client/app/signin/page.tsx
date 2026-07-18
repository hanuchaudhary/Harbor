import { SigninPage } from "@/screens/auth/signin";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In ",
  description: "Sign in to your Harbor account.",
};

export default function LoginPage() {
  return <SigninPage />;
}
