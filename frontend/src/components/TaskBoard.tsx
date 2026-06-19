import { ArrowRight, MessageCircle, Timer } from "lucide-react";
import type { ApiTask, TaskStatus } from "@launchpad/shared";

type TaskBoardProps = {
  tasks: ApiTask[];
  onMoveTask: (taskId: string, status: TaskStatus) => void;
  isUpdating: boolean;
};

const columns: Array<{ id: TaskStatus; label: string }> = [
  { id: "BACKLOG", label: "Backlog" },
  { id: "TODO", label: "To do" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "REVIEW", label: "Review" },
  { id: "DONE", label: "Done" }
];

const nextStatus: Record<TaskStatus, TaskStatus | null> = {
  BACKLOG: "TODO",
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "REVIEW",
  REVIEW: "DONE",
  DONE: null
};

export function TaskBoard({ tasks, onMoveTask, isUpdating }: TaskBoardProps) {
  return (
    <section className="board">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.id);

        return (
          <div className="board-column" key={column.id}>
            <header>
              <span>{column.label}</span>
              <strong>{columnTasks.length}</strong>
            </header>
            <div className="task-stack">
              {columnTasks.map((task) => (
                <article className={`task-card priority-${task.priority.toLowerCase()}`} key={task.id}>
                  <div className="task-card-top">
                    <span>{task.priority.toLowerCase()}</span>
                    {nextStatus[task.status] ? (
                      <button
                        className="icon-button tiny"
                        title="Move forward"
                        disabled={isUpdating}
                        onClick={() => onMoveTask(task.id, nextStatus[task.status]!)}
                      >
                        <ArrowRight size={15} />
                      </button>
                    ) : null}
                  </div>
                  <h4>{task.title}</h4>
                  <p>{task.description}</p>
                  <footer>
                    <span>
                      <Timer size={14} />
                      {task.estimateHours}h
                    </span>
                    <span>
                      <MessageCircle size={14} />
                      {task.commentCount}
                    </span>
                    {task.assignee ? <img src={task.assignee.avatarUrl ?? ""} alt="" /> : null}
                  </footer>
                </article>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
