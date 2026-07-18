import { http } from "./http";
import type { WorkflowStatusConfig } from "@/lib/workflow";
import type { OrgWorkflowResponse } from "@/lib/workflow";

export type OrgSettings = {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    onboardingCompletedAt: string | null;
    preferences: {
      defaultTrackerView?: string;
      weekStartsOn?: string;
      workflowStatuses?: WorkflowStatusConfig[];
      [key: string]: unknown;
    };
  };
  counts: {
    members: number;
    projects: number;
    pendingInvites: number;
  };
};

export class OrganizationsApi {
  async bootstrapAdmin() {
    const { data } = await http.patch("/api/organizations/bootstrap-admin");
    return data;
  }

  async completeOnboarding(payload?: Record<string, unknown>) {
    const { data } = await http.post(
      "/api/organizations/complete-onboarding",
      payload ?? {},
    );
    return data;
  }

  async onboardingStatus() {
    const { data } = await http.get("/api/organizations/onboarding-status");
    return data;
  }

  async invitation(id: string) {
    const { data } = await http.get(`/api/organizations/invitations/${id}`);
    return data;
  }

  async getSettings(): Promise<OrgSettings> {
    const { data } = await http.get("/api/organizations/settings");
    return data;
  }

  async updateSettings(payload: {
    name?: string;
    slug?: string;
    logo?: string | null;
    preferences?: {
      defaultTrackerView?: string;
      weekStartsOn?: string;
      workflowStatuses?: WorkflowStatusConfig[];
    };
  }) {
    const { data } = await http.patch("/api/organizations/settings", payload);
    return data;
  }

  async getWorkflow(): Promise<OrgWorkflowResponse> {
    const { data } = await http.get("/api/organizations/workflow");
    return data;
  }
}

export const organizationsApi = new OrganizationsApi();
