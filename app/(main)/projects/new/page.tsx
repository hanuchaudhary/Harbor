import { CreateProjectPage } from "@/screens/projects/CreateProject";
import { SpinLoader } from "@/components/spin-loader";
import { Suspense } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Project ",
  description:
    "Create a new project and configure its details, team, and repositories.",
};

export default async function NewProjectPage() {
  return (
    <Suspense fallback={<SpinLoader />}>
      <CreateProjectPage />;
    </Suspense>
  );
}
