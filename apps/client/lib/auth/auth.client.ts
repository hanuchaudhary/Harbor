import { inferAdditionalFields, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { ac, orgRoles } from "./permissions";

type AuthAdditionalFields = {
  user: {
    additionalFields: {
      role: {
        type: "string";
      };
      githubUsername: {
        type: "string";
      };
      isDesigner: {
        type: "boolean";
      };
    };
  };
  session: {
    additionalFields: {
      role: {
        type: "string";
      };
    };
  };
};

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [
    inferAdditionalFields<AuthAdditionalFields>(),
    organizationClient({
      ac,
      roles: orgRoles,
    }),
  ],
});
