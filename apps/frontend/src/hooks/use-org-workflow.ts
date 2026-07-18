import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { organizationsApi } from "@/lib/api";
import {
  DEFAULT_WORKFLOW_STATUSES,
  type OrgWorkflowResponse,
  type WorkflowStatusConfig,
} from "@/lib/workflow";
import { TASK_STATUS } from "@/types/types";
import { useAuth } from "@/hooks/useAuth";

export function useOrgWorkflow() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["org-workflow"],
    queryFn: () => organizationsApi.getWorkflow(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const statuses: WorkflowStatusConfig[] = useMemo(() => {
    if (query.data?.statuses?.length) return query.data.statuses;
    return DEFAULT_WORKFLOW_STATUSES;
  }, [query.data?.statuses]);

  const enabledColumns: WorkflowStatusConfig[] = useMemo(() => {
    const base = (query.data?.enabled?.length
      ? query.data.enabled
      : statuses.filter((s) => s.enabled)
    ).slice();

    if (user?.isDesigner) {
      return base.filter(
        (s) =>
          s.id !== TASK_STATUS.DEVELOPMENT &&
          s.id !== TASK_STATUS.CLIENT_REVIEW,
      );
    }
    return base;
  }, [query.data?.enabled, statuses, user?.isDesigner]);

  const preferences = query.data?.preferences ?? {
    defaultTrackerView: "kanban",
    weekStartsOn: "monday",
  };

  return {
    ...query,
    statuses,
    enabledColumns,
    preferences,
    workflow: (query.data ?? {
      statuses: DEFAULT_WORKFLOW_STATUSES,
      enabled: DEFAULT_WORKFLOW_STATUSES.filter((s) => s.enabled),
      preferences,
    }) as OrgWorkflowResponse,
  };
}
