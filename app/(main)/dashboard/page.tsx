import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard ",
  description:
    "Overview of your projects, tasks, and team activity in Harbor.",
};

export default function page() {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center text-2xl font-semibold text-red-700">
      khumming Suuun.
    </div>
  );
}
