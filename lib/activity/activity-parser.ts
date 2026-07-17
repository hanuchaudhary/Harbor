import { formatDate } from "@/lib/utils";

const formatDateSafe = (date: Date | string | null) => {
  if (!date) return null;
  if (typeof date === "string") return formatDate(date);
  return formatDate(date.toISOString());
};

export const ActivityParser = {
  project: {
    created: (name: string) => `Created project '${name}'`,

    deleted: (name: string) => `Deleted project '${name}'`,

    updated: (changes: {
      name?: { from: string; to: string };
      slug?: { from: string; to: string };
      description?: { from: string | null; to: string | null };
      status?: { from: string; to: string };
      budget?: { from: number | null; to: number | null };
      currency?: { from: string | null; to: string | null };
      startDate?: { from: Date | null; to: Date | null };
      estimatedEndAt?: { from: Date | null; to: Date | null };
      completedAt?: { from: Date | null; to: Date | null };
    }) => {
      const updates: string[] = [];

      if (changes.name) {
        updates.push(
          `name from '${changes.name.from}' to '${changes.name.to}'`,
        );
      }
      if (changes.slug) {
        updates.push(
          `slug from '${changes.slug.from}' to '${changes.slug.to}'`,
        );
      }
      if (changes.description !== undefined) {
        const from = changes.description.from || "empty";
        const to = changes.description.to || "empty";
        updates.push(`description from '${from}' to '${to}'`);
      }
      if (changes.status) {
        updates.push(
          `status from '${changes.status.from}' to '${changes.status.to}'`,
        );
      }
      if (changes.budget !== undefined) {
        const from =
          changes.budget.from !== null ? changes.budget.from : "none";
        const to = changes.budget.to !== null ? changes.budget.to : "none";
        updates.push(`budget from '${from}' to '${to}'`);
      }
      if (changes.currency !== undefined) {
        const from = changes.currency.from || "none";
        const to = changes.currency.to || "none";
        updates.push(`currency from '${from}' to '${to}'`);
      }
      if (changes.startDate !== undefined) {
        const from = changes.startDate.from
          ? formatDateSafe(changes.startDate.from)
          : "none";
        const to = changes.startDate.to
          ? formatDateSafe(changes.startDate.to)
          : "none";
        updates.push(`start date from '${from}' to '${to}'`);
      }
      if (changes.estimatedEndAt !== undefined) {
        const from = changes.estimatedEndAt.from
          ? formatDateSafe(changes.estimatedEndAt.from)
          : "none";
        const to = changes.estimatedEndAt.to
          ? formatDateSafe(changes.estimatedEndAt.to)
          : "none";
        updates.push(`estimated end date from '${from}' to '${to}'`);
      }
      if (changes.completedAt !== undefined) {
        const from = changes.completedAt.from
          ? formatDateSafe(changes.completedAt.from)
          : "none";
        const to = changes.completedAt.to
          ? formatDateSafe(changes.completedAt.to)
          : "none";
        updates.push(`completion date from '${from}' to '${to}'`);
      }

      return `Updated project ${updates.join(", ")}`;
    },

    docsUpdated: (action: "added" | "removed" | "updated", count: number) =>
      `${action === "added" ? "Added" : action === "removed" ? "Removed" : "Updated"} ${count} document${count !== 1 ? "s" : ""}`,

    assetsUpdated: (action: "added" | "removed" | "updated", count: number) =>
      `${action === "added" ? "Added" : action === "removed" ? "Removed" : "Updated"} ${count} asset${count !== 1 ? "s" : ""}`,
  },

  task: {
    created: (title: string, projectName: string) =>
      `Created task '${title}' in project '${projectName}'`,

    deleted: (title: string) => `Deleted task '${title}'`,

    updated: (
      title: string,
      changes: {
        title?: { from: string; to: string };
        description?: { from: string | null; to: string | null };
        status?: { from: string; to: string };
        priority?: { from: string; to: string };
        startDate?: { from: Date | null; to: Date | null };
        endDate?: { from: Date | null; to: Date | null };
        progressPct?: { from: number; to: number };
        milestoneId?: { from: string | null; to: string | null };
      },
    ) => {
      const updates: string[] = [];

      if (changes.title) {
        updates.push(
          `title from '${changes.title.from}' to '${changes.title.to}'`,
        );
      }
      if (changes.description !== undefined) {
        const from = changes.description.from || "empty";
        const to = changes.description.to || "empty";
        updates.push(`description from '${from}' to '${to}'`);
      }
      if (changes.status) {
        updates.push(
          `status from '${changes.status.from}' to '${changes.status.to}'`,
        );
      }
      if (changes.priority) {
        updates.push(
          `priority from '${changes.priority.from}' to '${changes.priority.to}'`,
        );
      }
      if (changes.startDate !== undefined) {
        const from = changes.startDate.from
          ? formatDateSafe(changes.startDate.from)
          : "none";
        const to = changes.startDate.to
          ? formatDateSafe(changes.startDate.to)
          : "none";
        updates.push(`start date from '${from}' to '${to}'`);
      }
      if (changes.endDate !== undefined) {
        const from = changes.endDate.from
          ? formatDateSafe(changes.endDate.from)
          : "none";
        const to = changes.endDate.to
          ? formatDateSafe(changes.endDate.to)
          : "none";
        updates.push(`end date from '${from}' to '${to}'`);
      }
      if (changes.progressPct) {
        updates.push(
          `progress from ${changes.progressPct.from}% to ${changes.progressPct.to}%`,
        );
      }
      if (changes.milestoneId !== undefined) {
        const from = changes.milestoneId.from || "none";
        const to = changes.milestoneId.to || "none";
        updates.push(`milestone from '${from}' to '${to}'`);
      }

      return `Updated task '${title}' ${updates.join(", ")}`;
    },

    assigneesUpdated: (title: string, added: string[], removed: string[]) => {
      const parts: string[] = [];
      if (added.length > 0) {
        parts.push(`assigned to ${added.join(", ")}`);
      }
      if (removed.length > 0) {
        parts.push(`unassigned from ${removed.join(", ")}`);
      }
      return `Task '${title}' ${parts.join(" and ")}`;
    },

    tagsUpdated: (title: string, added: string[], removed: string[]) => {
      const parts: string[] = [];
      if (added.length > 0) {
        parts.push(`added tags: ${added.join(", ")}`);
      }
      if (removed.length > 0) {
        parts.push(`removed tags: ${removed.join(", ")}`);
      }
      return `Task '${title}' ${parts.join(" and ")}`;
    },

    dependencyAdded: (taskTitle: string, dependsOnTitle: string) =>
      `Task '${taskTitle}' now depends on '${dependsOnTitle}'`,

    dependencyRemoved: (taskTitle: string, dependsOnTitle: string) =>
      `Removed dependency: '${taskTitle}' no longer depends on '${dependsOnTitle}'`,
  },

  milestone: {
    created: (title: string, projectName: string) =>
      `Created milestone '${title}' in project '${projectName}'`,

    deleted: (title: string) => `Deleted milestone '${title}'`,

    updated: (
      title: string,
      changes: {
        title?: { from: string; to: string };
        description?: { from: string | null; to: string | null };
        status?: { from: string; to: string };
        startDate?: { from: Date | null; to: Date | null };
        endDate?: { from: Date | null; to: Date | null };
      },
    ) => {
      const updates: string[] = [];

      if (changes.title) {
        updates.push(
          `title from '${changes.title.from}' to '${changes.title.to}'`,
        );
      }
      if (changes.description !== undefined) {
        const from = changes.description.from || "empty";
        const to = changes.description.to || "empty";
        updates.push(`description from '${from}' to '${to}'`);
      }
      if (changes.status) {
        updates.push(
          `status from '${changes.status.from}' to '${changes.status.to}'`,
        );
      }
      if (changes.startDate !== undefined) {
        const from = changes.startDate.from
          ? formatDateSafe(changes.startDate.from)
          : "none";
        const to = changes.startDate.to
          ? formatDateSafe(changes.startDate.to)
          : "none";
        updates.push(`start date from '${from}' to '${to}'`);
      }
      if (changes.endDate !== undefined) {
        const from = changes.endDate.from
          ? formatDateSafe(changes.endDate.from)
          : "none";
        const to = changes.endDate.to
          ? formatDateSafe(changes.endDate.to)
          : "none";
        updates.push(`end date from '${from}' to '${to}'`);
      }

      return `Updated milestone '${title}' ${updates.join(", ")}`;
    },
  },

  comment: {
    added: (taskTitle: string) => `Added comment on task '${taskTitle}'`,

    updated: (taskTitle: string) => `Updated comment on task '${taskTitle}'`,

    deleted: (taskTitle: string) => `Deleted comment from task '${taskTitle}'`,
  },

  attachment: {
    added: (fileName: string, taskTitle: string) =>
      `Added attachment '${fileName}' to task '${taskTitle}'`,

    deleted: (fileName: string, taskTitle: string) =>
      `Deleted attachment '${fileName}' from task '${taskTitle}'`,
  },

  subtask: {
    added: (subtaskTitle: string, taskTitle: string) =>
      `Added subtask '${subtaskTitle}' to task '${taskTitle}'`,

    updated: (
      subtaskTitle: string,
      changes: {
        title?: { from: string; to: string };
        isDone?: { from: boolean; to: boolean };
        deadline?: { from: Date | null; to: Date | null };
      },
    ) => {
      const updates: string[] = [];

      if (changes.title) {
        updates.push(
          `title from '${changes.title.from}' to '${changes.title.to}'`,
        );
      }
      if (changes.isDone) {
        updates.push(
          `status from '${changes.isDone.from ? "done" : "pending"}' to '${changes.isDone.to ? "done" : "pending"}'`,
        );
      }
      if (changes.deadline !== undefined) {
        const from = changes.deadline.from
          ? formatDateSafe(changes.deadline.from)
          : "none";
        const to = changes.deadline.to
          ? formatDateSafe(changes.deadline.to)
          : "none";
        updates.push(`deadline from '${from}' to '${to}'`);
      }

      return `Updated subtask '${subtaskTitle}' ${updates.join(", ")}`;
    },

    deleted: (subtaskTitle: string, taskTitle: string) =>
      `Deleted subtask '${subtaskTitle}' from task '${taskTitle}'`,
  },

  timeLog: {
    started: (taskTitle: string, type: string) =>
      `Started ${type.toLowerCase()} timer on task '${taskTitle}'`,

    stopped: (taskTitle: string, duration: number) => {
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      return `Stopped timer on task '${taskTitle}' (${timeStr})`;
    },

    added: (taskTitle: string, duration: number, type: string) => {
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      return `Added ${type.toLowerCase()} time log (${timeStr}) to task '${taskTitle}'`;
    },

    updated: (
      taskTitle: string,
      changes: {
        duration?: { from: number; to: number };
        note?: { from: string | null; to: string | null };
        type?: { from: string; to: string };
      },
    ) => {
      const updates: string[] = [];

      if (changes.duration) {
        const fromHours = Math.floor(changes.duration.from / 3600);
        const fromMinutes = Math.floor((changes.duration.from % 3600) / 60);
        const fromStr =
          fromHours > 0 ? `${fromHours}h ${fromMinutes}m` : `${fromMinutes}m`;

        const toHours = Math.floor(changes.duration.to / 3600);
        const toMinutes = Math.floor((changes.duration.to % 3600) / 60);
        const toStr =
          toHours > 0 ? `${toHours}h ${toMinutes}m` : `${toMinutes}m`;

        updates.push(`duration from ${fromStr} to ${toStr}`);
      }
      if (changes.note !== undefined) {
        const from = changes.note.from || "empty";
        const to = changes.note.to || "empty";
        updates.push(`note from '${from}' to '${to}'`);
      }
      if (changes.type) {
        updates.push(
          `type from '${changes.type.from}' to '${changes.type.to}'`,
        );
      }

      return `Updated time log on task '${taskTitle}' ${updates.join(", ")}`;
    },

    deleted: (taskTitle: string, duration: number) => {
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      return `Deleted time log (${timeStr}) from task '${taskTitle}'`;
    },
  },

  member: {
    invited: (email: string, role: string) =>
      `Invited '${email}' as ${role.toLowerCase()}`,

    removed: (name: string) => `Removed member '${name}'`,

    roleUpdated: (name: string, from: string, to: string) =>
      `Updated '${name}' role from ${from.toLowerCase()} to ${to.toLowerCase()}`,
  },

  profile: {
    updated: (changes: {
      name?: { from: string; to: string };
      email?: { from: string; to: string };
      image?: { from: string | null; to: string | null };
    }) => {
      const updates: string[] = [];

      if (changes.name) {
        updates.push(
          `name from '${changes.name.from}' to '${changes.name.to}'`,
        );
      }
      if (changes.email) {
        updates.push(
          `email from '${changes.email.from}' to '${changes.email.to}'`,
        );
      }
      if (changes.image !== undefined) {
        updates.push(
          `profile image ${changes.image.to ? "updated" : "removed"}`,
        );
      }

      return `Updated profile ${updates.join(", ")}`;
    },
  },
};
