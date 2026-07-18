import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Office",
  description: "View team members and their active status in the office.",
};

export default function OfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
