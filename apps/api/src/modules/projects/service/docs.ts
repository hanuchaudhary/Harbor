import { auth } from "../../../lib/auth";
import { prisma } from "@repo/db";
import { logActivity } from "../../../lib/actions/activity";


export async function POST(request: Request, params: Record<string, string>) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = params;
    const body = await request.json();
    const { title, content } = body;

    if (!title || typeof title !== "string") {
      return Response.json({ message: "Title is required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.findFirst({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!project) {
      return Response.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    const doc = await prisma.$transaction(async (tx) => {
      const created = await tx.doc.create({
        data: {
          projectId: project.id,
          title,
          content: content || null,
        },
      });

      await logActivity(tx, {
        userId: session.user.id,
        action: "DOC_CREATED",
        projectId: project.id,
        metadata: {
          description: `Created document '${created.title}' in project '${project.name}'`,
          entity: { type: "document", id: created.id, name: created.title },
          context: { projectId: project.id, projectName: project.name, projectSlug: slug },
        },
      });

      return created;
    });

    return Response.json({ doc }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, params: Record<string, string>) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = params;
    const body = await request.json();
    const { docId, title, content } = body;

    if (!docId) {
      return Response.json({ message: "Doc ID is required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.findFirst({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!project) {
      return Response.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    const existingDoc = await prisma.doc.findFirst({
      where: { id: docId, projectId: project.id },
    });

    if (!existingDoc) {
      return Response.json(
        { message: "Document not found" },
        { status: 404 },
      );
    }

    const doc = await prisma.$transaction(async (tx) => {
      const updated = await tx.doc.update({
        where: { id: docId },
        data: {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
        },
      });

      await logActivity(tx, {
        userId: session.user.id,
        action: "DOC_UPDATED",
        projectId: project.id,
        metadata: {
          description: `Updated document '${updated.title}' in project '${project.name}'`,
          entity: { type: "document", id: updated.id, name: updated.title },
          context: { projectId: project.id, projectName: project.name, projectSlug: slug },
          changes:
            title !== undefined && title !== existingDoc.title
              ? [{ field: "title", from: existingDoc.title, to: title }]
              : undefined,
        },
      });

      return updated;
    });

    return Response.json({ doc });
  } catch (error) {
    console.error(error);
    return Response.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, params: Record<string, string>) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = params;
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get("docId");

    if (!docId) {
      return Response.json({ message: "Doc ID is required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.findFirst({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!project) {
      return Response.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    const existingDoc = await prisma.doc.findFirst({
      where: { id: docId, projectId: project.id },
    });
    if (!existingDoc) {
      return Response.json({ message: "Document not found" }, { status: 404 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.doc.delete({ where: { id: docId } });
      await logActivity(tx, {
        userId: session.user.id,
        action: "DOC_DELETED",
        projectId: project.id,
        metadata: {
          description: `Deleted document '${existingDoc.title}' from project '${project.name}'`,
          entity: { type: "document", id: docId, name: existingDoc.title },
          context: { projectId: project.id, projectName: project.name, projectSlug: slug },
        },
      });
    });

    return Response.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error(error);
    return Response.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
