import { create } from "zustand";

import {
  ProjectDetailsDraft,
  ProjectRepoDraft,
  ProjectDocDraft,
  ProjectAssetDraft,
  ProjectMilestoneDraft,
} from "./project.store";
import { formatDate } from "@/lib/utils";

export type {
  ProjectDetailsDraft,
  ProjectRepoDraft,
  ProjectDocDraft,
  ProjectAssetDraft,
  ProjectMilestoneDraft,
};

interface EditProjectState {
  initialized: boolean;
  isSlugEdited: boolean;
  details: ProjectDetailsDraft;
  repos: ProjectRepoDraft[];
  docs: ProjectDocDraft[];
  milestones: ProjectMilestoneDraft[];
  assets: ProjectAssetDraft[];
  originalDetails: ProjectDetailsDraft;
  originalRepos: ProjectRepoDraft[];
  originalDocs: ProjectDocDraft[];
  originalMilestones: ProjectMilestoneDraft[];
  originalAssets: ProjectAssetDraft[];
  initialize: (data: {
    name: string;
    slug: string;
    description: string | null;
    status: string;
    currency: string;
    progressPct: number;
    budget: string | null;
    startDate: string | null;
    estimatedEndAt: string | null;
    repos: Array<{ id?: string; name: string; url: string }>;
    docs: Array<{ id?: string; title: string; content: string | null }>;
    milestones: Array<{
      id?: string;
      title: string;
      description: string | null;
      status: string;
      startDate: string | null;
      endDate: string | null;
    }>;
    assets: Array<{
      id?: string;
      name: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
      tags: string[];
    }>;
  }) => void;
  setIsSlugEdited: (value: boolean) => void;
  setDetails: (values: Partial<ProjectDetailsDraft>) => void;
  setRepos: (repos: ProjectRepoDraft[]) => void;
  setRepo: (index: number, values: Partial<ProjectRepoDraft>) => void;
  addRepo: () => void;
  removeRepo: (index: number) => void;
  setDoc: (index: number, values: Partial<ProjectDocDraft>) => void;
  addDoc: () => void;
  removeDoc: (index: number) => void;
  setMilestone: (index: number, values: Partial<ProjectMilestoneDraft>) => void;
  addMilestone: () => void;
  removeMilestone: (index: number) => void;
  setAsset: (index: number, values: Partial<ProjectAssetDraft>) => void;
  addAsset: () => void;
  removeAsset: (index: number) => void;
  reset: () => void;
}

const defaultDetails: ProjectDetailsDraft = {
  name: "",
  slug: "",
  progressPct: 0,
  description: "",
  status: "ACTIVE",
  currency: "USD",
  budget: "",
  startDate: "",
  estimatedEndAt: "",
};

export const useEditProjectStore = create<EditProjectState>()((set) => ({
  initialized: false,
  isSlugEdited: false,
  details: { ...defaultDetails },
  repos: [],
  docs: [],
  milestones: [],
  assets: [],
  originalDetails: { ...defaultDetails },
  originalRepos: [],
  originalDocs: [],
  originalMilestones: [],
  originalAssets: [],

  initialize: (data) => {
    const details = {
      name: data.name,
      slug: data.slug,
      description: data.description ?? "",
      status: data.status as ProjectDetailsDraft["status"],
      currency: data.currency as ProjectDetailsDraft["currency"],
      budget: data.budget ?? "",
      startDate: formatDate(data.startDate, "input") || "",
      estimatedEndAt: formatDate(data.estimatedEndAt, "input") || "",
      progressPct: data.progressPct ?? 0,
    };

    const repos = data.repos.map((r) => ({
      id: r.id,
      name: r.name,
      url: r.url,
    }));

    const docs = data.docs.map((d) => ({
      id: d.id,
      title: d.title,
      content: d.content ?? "",
    }));

    const milestones = data.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description ?? "",
      status: m.status as ProjectMilestoneDraft["status"],
      startDate: formatDate(m.startDate, "input") || "",
      endDate: formatDate(m.endDate, "input") || "",
    }));

    const assets = data.assets.map((a) => ({
      id: a.id,
      name: a.name,
      fileUrl: a.fileUrl,
      fileType: a.fileType,
      fileSize: String(a.fileSize),
      tags: a.tags.join(", "),
    }));

    set({
      initialized: true,
      isSlugEdited: false,
      details,
      repos,
      docs,
      milestones,
      assets,
      originalDetails: { ...details },
      originalRepos: JSON.parse(JSON.stringify(repos)),
      originalDocs: JSON.parse(JSON.stringify(docs)),
      originalMilestones: JSON.parse(JSON.stringify(milestones)),
      originalAssets: JSON.parse(JSON.stringify(assets)),
    });
  },

  setIsSlugEdited: (value) => set({ isSlugEdited: value }),

  setDetails: (values) =>
    set((state) => ({ details: { ...state.details, ...values } })),

  setRepos: (repos) => set({ repos }),

  setRepo: (index, values) =>
    set((state) => ({
      repos: state.repos.map((r, i) => (i === index ? { ...r, ...values } : r)),
    })),
  addRepo: () =>
    set((state) => ({
      repos: [...state.repos, { name: "", url: "" }],
    })),
  removeRepo: (index) =>
    set((state) => ({
      repos: state.repos.filter((_, i) => i !== index),
    })),

  setDoc: (index, values) =>
    set((state) => ({
      docs: state.docs.map((d, i) => (i === index ? { ...d, ...values } : d)),
    })),
  addDoc: () =>
    set((state) => ({
      docs: [...state.docs, { title: "", content: "" }],
    })),
  removeDoc: (index) =>
    set((state) => ({
      docs: state.docs.filter((_, i) => i !== index),
    })),

  setMilestone: (index, values) =>
    set((state) => ({
      milestones: state.milestones.map((m, i) =>
        i === index ? { ...m, ...values } : m,
      ),
    })),
  addMilestone: () =>
    set((state) => ({
      milestones: [
        ...state.milestones,
        {
          title: "",
          description: "",
          startDate: "",
          endDate: "",
          status: "NOT_STARTED" as const,
        },
      ],
    })),
  removeMilestone: (index) =>
    set((state) => ({
      milestones: state.milestones.filter((_, i) => i !== index),
    })),

  setAsset: (index, values) =>
    set((state) => ({
      assets: state.assets.map((a, i) =>
        i === index ? { ...a, ...values } : a,
      ),
    })),
  addAsset: () =>
    set((state) => ({
      assets: [
        ...state.assets,
        { name: "", fileUrl: "", fileType: "", fileSize: "", tags: "" },
      ],
    })),
  removeAsset: (index) =>
    set((state) => ({
      assets: state.assets.filter((_, i) => i !== index),
    })),

  reset: () =>
    set({
      initialized: false,
      isSlugEdited: false,
      details: { ...defaultDetails },
      repos: [],
      docs: [],
      milestones: [],
      assets: [],
      originalDetails: { ...defaultDetails },
      originalRepos: [],
      originalDocs: [],
      originalMilestones: [],
      originalAssets: [],
    }),
}));
