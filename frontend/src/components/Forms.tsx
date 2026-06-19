import { useState } from "react";
import { projectCreateSchema, taskCreateSchema, type ApiProject, type ApiUser, type ProjectCreateInput, type TaskCreateInput } from "@launchpad/shared";

type ProjectFormProps = {
  onSubmit: (input: ProjectCreateInput) => Promise<unknown>;
  isSaving: boolean;
};

type TaskFormProps = {
  projects: ApiProject[];
  team: ApiUser[];
  onSubmit: (input: TaskCreateInput) => Promise<unknown>;
  isSaving: boolean;
};

export function ProjectForm({ onSubmit, isSaving }: ProjectFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    client: "",
    description: "",
    budget: "25000",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: "DISCOVERY"
  });

  return (
    <form
      className="stack-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);

        const parsed = projectCreateSchema.safeParse({
          name: form.name.trim(),
          client: form.client.trim(),
          description: form.description.trim(),
          status: form.status as ProjectCreateInput["status"],
          budget: Number(form.budget),
          dueDate: new Date(form.dueDate).toISOString()
        });

        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Check project fields and try again.");
          return;
        }

        try {
          await onSubmit(parsed.data);
        } catch (requestError) {
          setError(toFormError(requestError));
        }
      }}
    >
      <label>
        Project name
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      </label>
      <label>
        Client
        <input value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} required />
      </label>
      <label>
        Description
        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required rows={4} />
      </label>
      <div className="form-grid">
        <label>
          Budget
          <input type="number" value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })} min="1" required />
        </label>
        <label>
          Due date
          <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required />
        </label>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="primary-button full" disabled={isSaving}>
        Create project
      </button>
    </form>
  );
}

export function TaskForm({ projects, team, onSubmit, isSaving }: TaskFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    projectId: projects[0]?.id ?? "",
    assigneeId: team[0]?.id ?? "",
    priority: "MEDIUM",
    estimateHours: "8"
  });

  return (
    <form
      className="stack-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);

        const parsed = taskCreateSchema.safeParse({
          title: form.title.trim(),
          description: form.description.trim(),
          projectId: form.projectId,
          assigneeId: form.assigneeId || undefined,
          priority: form.priority as TaskCreateInput["priority"],
          estimateHours: Number(form.estimateHours),
          status: "TODO"
        });

        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Check task fields and try again.");
          return;
        }

        try {
          await onSubmit(parsed.data);
        } catch (requestError) {
          setError(toFormError(requestError));
        }
      }}
    >
      <label>
        Title
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
      </label>
      <label>
        Description
        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required rows={4} />
      </label>
      <div className="form-grid">
        <label>
          Project
          <select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })} required>
            {projects.map((project) => (
              <option value={project.id} key={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Assignee
          <select value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}>
            {team.map((user) => (
              <option value={user.id} key={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label>
          Priority
          <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </label>
        <label>
          Estimate
          <input type="number" value={form.estimateHours} onChange={(event) => setForm({ ...form, estimateHours: event.target.value })} min="1" max="80" />
        </label>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="primary-button full" disabled={isSaving}>
        Create task
      </button>
    </form>
  );
}

function toFormError(error: unknown) {
  if (isObject(error) && "response" in error && isObject(error.response)) {
    const data = error.response.data;

    if (isObject(data)) {
      if (typeof data.message === "string") return data.message;

      if (Array.isArray(data.issues)) {
        const firstIssue = data.issues.find((issue): issue is { message: string } => isObject(issue) && typeof issue.message === "string");
        if (firstIssue) return firstIssue.message;
      }
    }
  }

  if (error instanceof Error) return error.message;
  return "The request could not be completed. Please try again.";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
