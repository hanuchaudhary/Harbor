import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface OnboardingOrgDraft {
  name: string;
  slug: string;
  organizationId: string | null;
}

export interface OnboardingInviteDraft {
  email: string;
  role: "ADMIN" | "PARTNER" | "PROJECT_MANAGER" | "DEVELOPER" | "CLIENT";
}

export interface OnboardingProjectDraft {
  name: string;
  slug: string;
  description: string;
  status: "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
}

interface OnboardingState {
  currentStep: 1 | 2 | 3;
  isSlugEdited: boolean;
  isProjectSlugEdited: boolean;
  org: OnboardingOrgDraft;
  invites: OnboardingInviteDraft[];
  project: OnboardingProjectDraft;
  setCurrentStep: (step: 1 | 2 | 3) => void;
  nextStep: () => void;
  previousStep: () => void;
  setIsSlugEdited: (value: boolean) => void;
  setIsProjectSlugEdited: (value: boolean) => void;
  setOrg: (values: Partial<OnboardingOrgDraft>) => void;
  setInvites: (invites: OnboardingInviteDraft[]) => void;
  addInvite: () => void;
  removeInvite: (index: number) => void;
  setInvite: (index: number, values: Partial<OnboardingInviteDraft>) => void;
  setProject: (values: Partial<OnboardingProjectDraft>) => void;
  reset: () => void;
}

const initialOrg: OnboardingOrgDraft = {
  name: "",
  slug: "",
  organizationId: null,
};

const initialProject: OnboardingProjectDraft = {
  name: "",
  slug: "",
  description: "",
  status: "ACTIVE",
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      isSlugEdited: false,
      isProjectSlugEdited: false,
      org: initialOrg,
      invites: [{ email: "", role: "DEVELOPER" }],
      project: initialProject,
      setCurrentStep: (step) => set({ currentStep: step }),
      nextStep: () => {
        const { currentStep } = get();
        if (currentStep < 3) {
          set({ currentStep: (currentStep + 1) as 1 | 2 | 3 });
        }
      },
      previousStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: (currentStep - 1) as 1 | 2 | 3 });
        }
      },
      setIsSlugEdited: (value) => set({ isSlugEdited: value }),
      setIsProjectSlugEdited: (value) => set({ isProjectSlugEdited: value }),
      setOrg: (values) =>
        set((state) => ({ org: { ...state.org, ...values } })),
      setInvites: (invites) => set({ invites }),
      addInvite: () =>
        set((state) => ({
          invites: [...state.invites, { email: "", role: "DEVELOPER" }],
        })),
      removeInvite: (index) =>
        set((state) => ({
          invites: state.invites.filter((_, i) => i !== index),
        })),
      setInvite: (index, values) =>
        set((state) => ({
          invites: state.invites.map((invite, i) =>
            i === index ? { ...invite, ...values } : invite,
          ),
        })),
      setProject: (values) =>
        set((state) => ({ project: { ...state.project, ...values } })),
      reset: () =>
        set({
          currentStep: 1,
          isSlugEdited: false,
          isProjectSlugEdited: false,
          org: initialOrg,
          invites: [{ email: "", role: "DEVELOPER" }],
          project: initialProject,
        }),
    }),
    {
      name: "harbor-onboarding",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
