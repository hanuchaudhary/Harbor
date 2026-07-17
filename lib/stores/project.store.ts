import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { BRAND } from "@/types/types";

export interface ProjectRepoDraft {
  id?: string;
  name: string;
  url: string;
}

export interface ProjectDocDraft {
  id?: string;
  title: string;
  content: string;
}

export interface ProjectAssetDraft {
  id?: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: string;
  tags: string;
}

export interface ProjectDetailsDraft {
  name: string;
  slug: string;
  progressPct: number;
  description: string;
  brand: BRAND;
  status: "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
  currency: "USD" | "EUR" | "INR" | "AED";
  budget: string;
  startDate: string;
  estimatedEndAt: string;
}

export interface ProjectMilestoneDraft {
  id?: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
}

interface ProjectState {
  currentStep: 1 | 2 | 3 | 4;
  skippedSteps: number[];
  isSlugEdited: boolean;
  details: ProjectDetailsDraft;
  repos: ProjectRepoDraft[];
  docs: ProjectDocDraft[];
  milestones: ProjectMilestoneDraft[];
  assets: ProjectAssetDraft[];
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipCurrentStep: () => void;
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

const initialDetails: ProjectDetailsDraft = {
  name: "",
  slug: "",
  progressPct: 0,
  description: "",
  brand: BRAND.OCEANLAB,
  status: "ACTIVE",
  currency: "USD",
  budget: "",
  startDate: "",
  estimatedEndAt: "",
};

const initialRepo: ProjectRepoDraft = {
  name: "",
  url: "",
};

const initialDoc: ProjectDocDraft = {
  title: "",
  content: "",
};

const initialMilestone: ProjectMilestoneDraft = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  status: "NOT_STARTED",
};

const initialAsset: ProjectAssetDraft = {
  name: "",
  fileUrl: "",
  fileType: "",
  fileSize: "",
  tags: "",
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      skippedSteps: [],
      isSlugEdited: false,
      details: initialDetails,
      repos: [],
      docs: [],
      milestones: [],
      assets: [],
      setCurrentStep: (step) => set({ currentStep: step }),
      nextStep: () => {
        const { currentStep } = get();
        if (currentStep < 4) {
          set({ currentStep: (currentStep + 1) as 1 | 2 | 3 | 4 });
        }
      },
      previousStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: (currentStep - 1) as 1 | 2 | 3 | 4 });
        }
      },
      skipCurrentStep: () => {
        const { currentStep, skippedSteps } = get();
        if (currentStep >= 2 && currentStep <= 4) {
          set({
            skippedSteps: skippedSteps.includes(currentStep)
              ? skippedSteps
              : [...skippedSteps, currentStep],
          });
        }
        if (currentStep < 4) {
          set({ currentStep: (currentStep + 1) as 1 | 2 | 3 | 4 });
        }
      },
      setIsSlugEdited: (value) => set({ isSlugEdited: value }),
      setDetails: (values) => {
        set((state) => ({
          details: {
            ...state.details,
            ...values,
          },
        }));
      },
      setRepos: (repos) => {
        set({ repos });
      },
      setRepo: (index, values) => {
        set((state) => ({
          repos: state.repos.map((repo, repoIndex) =>
            repoIndex === index ? { ...repo, ...values } : repo,
          ),
        }));
      },
      addRepo: () => {
        set((state) => ({ repos: [...state.repos, { ...initialRepo }] }));
      },
      removeRepo: (index) => {
        set((state) => ({
          repos: state.repos.filter((_, repoIndex) => repoIndex !== index),
        }));
      },
      setDoc: (index, values) => {
        set((state) => ({
          docs: state.docs.map((doc, docIndex) =>
            docIndex === index ? { ...doc, ...values } : doc,
          ),
        }));
      },
      addDoc: () => {
        set((state) => ({ docs: [...state.docs, { ...initialDoc }] }));
      },
      removeDoc: (index) => {
        set((state) => ({
          docs: state.docs.filter((_, docIndex) => docIndex !== index),
        }));
      },
      setMilestone: (index, values) => {
        set((state) => ({
          milestones: state.milestones.map((m, i) =>
            i === index ? { ...m, ...values } : m,
          ),
        }));
      },
      addMilestone: () => {
        set((state) => ({
          milestones: [...state.milestones, { ...initialMilestone }],
        }));
      },
      removeMilestone: (index) => {
        set((state) => ({
          milestones: state.milestones.filter((_, i) => i !== index),
        }));
      },
      setAsset: (index, values) => {
        set((state) => ({
          assets: state.assets.map((asset, assetIndex) =>
            assetIndex === index ? { ...asset, ...values } : asset,
          ),
        }));
      },
      addAsset: () => {
        set((state) => ({ assets: [...state.assets, { ...initialAsset }] }));
      },
      removeAsset: (index) => {
        set((state) => ({
          assets: state.assets.filter((_, assetIndex) => assetIndex !== index),
        }));
      },
      reset: () => {
        set({
          currentStep: 1,
          skippedSteps: [],
          isSlugEdited: false,
          details: initialDetails,
          repos: [],
          docs: [],
          milestones: [],
          assets: [],
        });
      },
    }),
    {
      name: "project-wizard-store",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
