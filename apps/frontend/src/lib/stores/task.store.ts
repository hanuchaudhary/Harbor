import { create } from "zustand";

import { Task, TASK_STATUS } from "@/types/types";

interface TaskState {
  tasks: Task[];

  setTasks: (tasks: Task[]) => void;

  appendTasks: (tasks: Task[]) => void;

  addTask: (task: Task) => void;

  removeTask: (taskId: string) => void;

  updateTask: (taskId: string, updates: Partial<Task>) => void;

  moveTask: (
    taskId: string,
    newStatus: TASK_STATUS,
    newIndex: number,
  ) => { id: string; order: number; status?: string }[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],

  setTasks: (tasks) => set({ tasks }),

  appendTasks: (newTasks) =>
    set((s) => {
      const existingIds = new Set(s.tasks.map((t) => t.id));
      const unique = newTasks.filter((t) => !existingIds.has(t.id));
      return { tasks: [...s.tasks, ...unique] };
    }),

  addTask: (task) =>
    set((s) => ({
      tasks: [...s.tasks, task].sort((a, b) => {
        if (a.status !== b.status) return a.status.localeCompare(b.status);
        return a.order - b.order;
      }),
    })),

  removeTask: (taskId) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) })),

  updateTask: (taskId, updates) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
    })),

  moveTask: (taskId, newStatus, newIndex) => {
    const { tasks } = get();

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return [];

    const withoutTask = tasks.filter((t) => t.id !== taskId);
    const oldStatus = task.status;

    const sourceColTasks = withoutTask
      .filter((t) => t.status === oldStatus)
      .sort((a, b) => a.order - b.order)
      .map((t, i) => ({ ...t, order: i }));

    const destColBase = withoutTask
      .filter((t) => t.status === newStatus)
      .sort((a, b) => a.order - b.order);

    destColBase.splice(newIndex, 0, { ...task, status: newStatus });
    const destColTasks = destColBase.map((t, i) => ({ ...t, order: i }));

    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        const found = destColTasks.find((d) => d.id === taskId);
        return found ?? t;
      }
      if (t.status === oldStatus && oldStatus !== newStatus) {
        const found = sourceColTasks.find((s) => s.id === t.id);
        return found ?? t;
      }
      if (t.status === newStatus) {
        const found = destColTasks.find((d) => d.id === t.id);
        return found ?? t;
      }
      return t;
    });

    set({ tasks: updatedTasks });

    const payload: { id: string; order: number; status?: string }[] = [];

    if (oldStatus !== newStatus) {
      payload.push({ id: taskId, order: newIndex, status: newStatus });
      sourceColTasks.forEach((t) => payload.push({ id: t.id, order: t.order }));
    }
    destColTasks.forEach((t) => {
      if (t.id !== taskId || oldStatus === newStatus) {
        if (!payload.find((p) => p.id === t.id)) {
          payload.push({ id: t.id, order: t.order });
        } else {
          const entry = payload.find((p) => p.id === t.id)!;
          entry.order = t.order;
        }
      }
    });

    return payload;
  },
}));
