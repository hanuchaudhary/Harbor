import { TaskDetail } from "@/components/tracker/task-detail/task-detail";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ taskId: string }>;
}): Promise<Metadata> {
  const { taskId } = await params;

  return {
    title: `Task Details`,
    description: `View and manage task details, comments, and activity.`,
  };
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  return <TaskDetail taskId={taskId} />;
}
