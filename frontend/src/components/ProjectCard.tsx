import { CalendarDays, CircleDollarSign } from "lucide-react";
import type { ApiProject } from "@launchpad/shared";

const statusLabels = {
  DISCOVERY: "Discovery",
  ACTIVE: "Active",
  PAUSED: "Paused",
  SHIPPED: "Shipped"
};

export function ProjectCard({ project }: { project: ApiProject }) {
  const dueDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(project.dueDate));

  return (
    <article className="project-card">
      <div className="project-card-header">
        <div>
          <span className={`status-pill ${project.status.toLowerCase()}`}>{statusLabels[project.status]}</span>
          <h3>{project.name}</h3>
          <p>{project.client}</p>
        </div>
        <img src={project.owner.avatarUrl ?? ""} alt="" />
      </div>

      <p className="project-description">{project.description}</p>

      <div className="progress-row">
        <span>Progress</span>
        <strong>{project.progress}%</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${project.progress}%` }} />
      </div>

      <footer className="project-meta">
        <span>
          <CalendarDays size={16} />
          {dueDate}
        </span>
        <span>
          <CircleDollarSign size={16} />
          ${project.budget.toLocaleString()}
        </span>
      </footer>
    </article>
  );
}
