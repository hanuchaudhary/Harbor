import { SpinLoader } from "@/components/spin-loader";
import { TrackerView } from "@/components/tracker/tracker-view";
import { Suspense } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Task Tracker ",
  description:
    "Track and manage tasks across all projects with Kanban, List, and Timeline views.",
};

export default function page() {
  return (
    <Suspense fallback={<SpinLoader />}>
      <TrackerView />
    </Suspense>
  );
}
