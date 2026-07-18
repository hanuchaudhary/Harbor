import { SpinLoader } from "@/components/spin-loader";
import { ProjectsOverview } from "@/screens/projects/Projects";
import { Suspense } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects ",
  description:
    "Manage and view all your projects.",
};

export default function ProjectsPage() {
  return (
    <Suspense fallback={<SpinLoader />}>
      <ProjectsOverview />
    </Suspense>
  );
}
