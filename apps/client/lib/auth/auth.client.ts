import { inferAdditionalFields, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { ac, orgRoles } from "./permissions";

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [
    inferAdditionalFields({
      user: {
        role: {
          type: "string",
        },
        isDesigner: {
          type: "boolean",
        },
      },
    }),
    organizationClient({
      ac,
      roles: orgRoles,
    }),
  ],
});
