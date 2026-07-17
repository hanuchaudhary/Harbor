import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

const statement = {
  ...defaultStatements,
} as const;

export const ac = createAccessControl(statement);

export const ADMIN = ac.newRole({
  ...ownerAc.statements,
  ...adminAc.statements,
});

export const PROJECT_MANAGER = ac.newRole({
  ...adminAc.statements,
});

export const DEVELOPER = ac.newRole({
  ...memberAc.statements,
});

export const CLIENT = ac.newRole({
  ...memberAc.statements,
});

export const PARTNER = ac.newRole({
  ...memberAc.statements,
});

export const orgRoles = {
  ADMIN,
  PROJECT_MANAGER,
  DEVELOPER,
  CLIENT,
  PARTNER,
} as const;
