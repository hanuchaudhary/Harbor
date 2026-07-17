import { ProjectActivity } from "@/components/projects/project-activity";

interface ActivityTabProps {
  projectSlug: string;
}

export function ActivityTab({ projectSlug }: ActivityTabProps) {
  return <ProjectActivity projectSlug={projectSlug} />;
}
