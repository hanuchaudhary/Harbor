import { TaskFormPage } from "@/components/tracker/task-form-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Task ",
  description: "Create a new task and assign it to team members.",
};

export default function NewTaskPage() {
  return <TaskFormPage />;
}
