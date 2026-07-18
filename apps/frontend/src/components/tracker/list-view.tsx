"use client";

import { Link } from "react-router";
import { IconPencil, IconTrash } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Task } from "@/types/types";
import { priorityLabel, priorityVariant } from "./constants";
import { useOrgWorkflow } from "@/hooks/use-org-workflow";
import {
  statusColorFromWorkflow,
  statusLabelFromWorkflow,
  workflowColorToBadge,
} from "@/lib/workflow";

interface ListViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  readOnly?: boolean;
}

export function ListView({ tasks, onEdit, onDelete, readOnly }: ListViewProps) {
  const { statuses } = useOrgWorkflow();

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed bg-muted/30">
        <p className="text-muted-foreground text-lg">No tasks found</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Try changing filters or create a new task
        </p>
      </div>
    );
  }

  return (
    <div className="border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Due Date</TableHead>
            {!readOnly && <TableHead className="w-20" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} className="group/row">
              <TableCell className="font-medium max-w-xs">
                {readOnly ? (
                  <span className="line-clamp-1">{task.title}</span>
                ) : (
                  <Link
                    to={`/tracker/${task.id}`}
                    className="line-clamp-1 hover:underline"
                  >
                    {task.title}
                  </Link>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {task.project.name}
              </TableCell>
              <TableCell>
                <Badge
                  variant={workflowColorToBadge(
                    statusColorFromWorkflow(task.status, statuses),
                  )}
                >
                  {statusLabelFromWorkflow(task.status, statuses)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={priorityVariant[task.priority]}>
                  {priorityLabel[task.priority]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(task.endDate) ?? "—"}
              </TableCell>
              {!readOnly && (
                <TableCell>
                  <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(task)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                    >
                      <IconPencil className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => onDelete(task)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                    >
                      <IconTrash className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
