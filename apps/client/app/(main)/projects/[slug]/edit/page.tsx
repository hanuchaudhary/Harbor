import { EditProjectPage } from "@/screens/projects/EditProject";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  return {
    title: `Edit ${slug.charAt(0).toUpperCase() + slug.slice(1)}`,
    description: `Edit project details, team members, and settings for ${slug}.`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <EditProjectPage projectSlug={slug} />;
}
