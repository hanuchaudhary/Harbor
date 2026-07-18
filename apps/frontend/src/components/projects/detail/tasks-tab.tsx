import { KanbanView } from "@/components/tracker/kanban-view";

interface TasksTabProps {
  isEditable: boolean;
  tasks: any[];
}

export function TasksTab({ isEditable, tasks }: TasksTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        {isEditable && (
          <span className="text-xs text-muted-foreground">View only</span>
        )}
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks yet</p>
      ) : (
        <KanbanView
          tasks={tasks}
          readOnly={isEditable}
          onEdit={() => {}}
          onDelete={() => {}}
          onCreate={() => {}}
        />
      )}
    </div>
  );
}
