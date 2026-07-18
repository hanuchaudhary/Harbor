import {
  inferAdditionalFields,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { BACKEND_URL } from "@/lib/constants";
import { ac, orgRoles } from "@/lib/auth/permissions";

type AuthAdditionalFields = {
  user: {
    additionalFields: {
      role: {
        type: "string";
        required: false;
      };
      githubUsername: {
        type: "string";
        required: false;
        input: false;
      };
      isDesigner: {
        type: "boolean";
        required: false;
      };
    };
  };
  session: {
    additionalFields: {
      role: {
        type: "string";
        required: false;
      };
    };
  };
};

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  plugins: [
    // Pass fields as a generic (BetterAuthOptions shape). Passing them as a
    // runtime argument alone leaves `$InferServerPlugin.schema.*.fields` as {}.
    inferAdditionalFields<AuthAdditionalFields>(),
    organizationClient({
      ac,
      roles: orgRoles,
    }),
  ],
});

export const {
  useSession,
  signIn,
  signOut,
  signUp,
  updateUser,
  requestPasswordReset,
  verifyEmail,
  resetPassword,
} = authClient;
