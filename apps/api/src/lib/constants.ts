import { TaskStatus as TaskStatusEnum } from "@repo/db/enums";

export const STATUS_HIERARCHY: Record<TaskStatusEnum, number> = {
  [TaskStatusEnum.DISCUSSION]: 0,
  [TaskStatusEnum.IN_PLANNING]: 1,
  [TaskStatusEnum.TODO]: 2,
  [TaskStatusEnum.DESIGN]: 3,
  [TaskStatusEnum.DEVELOPMENT]: 4,
  [TaskStatusEnum.REVIEW]: 5,
  [TaskStatusEnum.CLIENT_REVIEW]: 6,
  [TaskStatusEnum.ON_HOLD]: 2,
  [TaskStatusEnum.COMPLETED]: 7,
};

export const getStatusLevel = (status: TaskStatusEnum): number =>
  STATUS_HIERARCHY[status] ?? 0;
