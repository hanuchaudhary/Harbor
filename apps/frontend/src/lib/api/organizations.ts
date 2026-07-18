import { http } from "./http";

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
}

export const organizationsApi = new OrganizationsApi();
