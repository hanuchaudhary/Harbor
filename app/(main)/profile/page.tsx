import { ProfilePage } from "@/screens/profile/Profile";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile ",
  description: "Manage your profile settings and preferences.",
};

export default function Page() {
  return <ProfilePage />;
}
