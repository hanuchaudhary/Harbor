import { ProjectDetailView } from "@/screens/projects/ProjectDetail";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  return {
    title: `${slug.charAt(0).toUpperCase() + slug.slice(1)} Project`,
    description: `View project details, tasks, milestones, and team members for ${slug}.`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div>
      <ProjectDetailView projectSlug={slug} />
    </div>
  );
}
