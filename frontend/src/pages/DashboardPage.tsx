import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Gauge,
  Layers3,
  ListTodo,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  UsersRound
} from "lucide-react";
import type { ApiProject, ApiTask, DashboardResponse, TaskPriority, TaskStatus } from "@launchpad/shared";
import { createProject, createTask, fetchDashboard, updateTask } from "../api/client";
import { Sidebar, type WorkspaceView } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";
import { StatCard } from "../components/StatCard";
import { ProjectCard } from "../components/ProjectCard";
import { TaskBoard } from "../components/TaskBoard";
import { Modal } from "../components/Modal";
import { ProjectForm, TaskForm } from "../components/Forms";
import { useAuth } from "../context/AuthContext";
import { OperationsView } from "./OperationsView";

const viewCopy: Record<WorkspaceView, { eyebrow: string; title: string; description: string }> = {
  dashboard: {
    eyebrow: "Today",
    title: "Delivery command center",
    description: "Live project health, team load, and work moving through the pipeline."
  },
  projects: {
    eyebrow: "Portfolio",
    title: "Projects workspace",
    description: "Track budgets, owners, due dates, project status, and the task board in one place."
  },
  operations: {
    eyebrow: "Operations",
    title: "Client delivery operations",
    description: "Manage clients, roadmap milestones, risk register, time entries, and project notes."
  },
  reports: {
    eyebrow: "Insights",
    title: "Reports and delivery health",
    description: "Pipeline value, project mix, priorities, workload pressure, and shipping progress."
  },
  team: {
    eyebrow: "People",
    title: "Team workload",
    description: "See who owns what, how many tasks are open, and where work is concentrated."
  },
  settings: {
    eyebrow: "Workspace",
    title: "Settings",
    description: "Demo configuration, API status, account details, and workspace defaults."
  }
};

const priorityOrder: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<WorkspaceView>("dashboard");
  const [modal, setModal] = useState<"project" | "task" | null>(null);
  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setModal(null);
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setModal(null);
    }
  });

  const moveTaskMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => updateTask(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  });

  const chartData = useMemo(() => {
    const data = dashboardQuery.data;
    if (!data) return [];
    return [
      { label: "Discovery", value: data.projects.filter((project) => project.status === "DISCOVERY").length },
      { label: "Active", value: data.projects.filter((project) => project.status === "ACTIVE").length },
      { label: "Review", value: data.metrics.reviewTasks },
      { label: "Shipped", value: data.metrics.shippedProjects }
    ];
  }, [dashboardQuery.data]);

  if (!user) return null;

  const copy = viewCopy[activeView];

  return (
    <main className="app-shell">
      <Sidebar user={user} activeView={activeView} onViewChange={setActiveView} onSignOut={signOut} />
      <section className="workspace">
        <Topbar onAddProject={() => setModal("project")} onAddTask={() => setModal("task")} />

        {dashboardQuery.isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
          </div>
        ) : dashboardQuery.isError || !dashboardQuery.data ? (
          <div className="empty-state">
            <AlertTriangle size={24} />
            <strong>Dashboard could not load</strong>
            <span>Check that the API is running and the database is seeded.</span>
          </div>
        ) : (
          <div className="dashboard">
            <section className="dashboard-header">
              <div>
                <span className="eyebrow">{copy.eyebrow}</span>
                <h1>{copy.title}</h1>
                <p>{copy.description}</p>
              </div>
              <div className="health-meter">
                <Gauge size={20} />
                <span>{dashboardQuery.data.metrics.averageProgress}% avg progress</span>
              </div>
            </section>

            <WorkspaceContent
              view={activeView}
              data={dashboardQuery.data}
              chartData={chartData}
              isUpdating={moveTaskMutation.isPending}
              onAddProject={() => setModal("project")}
              onAddTask={() => setModal("task")}
              onMoveTask={(taskId, status) => moveTaskMutation.mutate({ id: taskId, status })}
            />
          </div>
        )}
      </section>

      {modal === "project" ? (
        <Modal title="Create project" onClose={() => setModal(null)}>
          <ProjectForm onSubmit={(input) => createProjectMutation.mutateAsync(input)} isSaving={createProjectMutation.isPending} />
        </Modal>
      ) : null}

      {modal === "task" && dashboardQuery.data ? (
        <Modal title="Create task" onClose={() => setModal(null)}>
          <TaskForm
            projects={dashboardQuery.data.projects}
            team={dashboardQuery.data.team}
            onSubmit={(input) => createTaskMutation.mutateAsync(input)}
            isSaving={createTaskMutation.isPending}
          />
        </Modal>
      ) : null}
    </main>
  );
}

function WorkspaceContent({
  view,
  data,
  chartData,
  isUpdating,
  onAddProject,
  onAddTask,
  onMoveTask
}: {
  view: WorkspaceView;
  data: DashboardResponse;
  chartData: Array<{ label: string; value: number }>;
  isUpdating: boolean;
  onAddProject: () => void;
  onAddTask: () => void;
  onMoveTask: (taskId: string, status: TaskStatus) => void;
}) {
  if (view === "projects") {
    return <ProjectsView data={data} isUpdating={isUpdating} onAddProject={onAddProject} onAddTask={onAddTask} onMoveTask={onMoveTask} />;
  }

  if (view === "operations") {
    return <OperationsView dashboard={data} />;
  }

  if (view === "reports") {
    return <ReportsView data={data} chartData={chartData} />;
  }

  if (view === "team") {
    return <TeamView data={data} />;
  }

  if (view === "settings") {
    return <SettingsView data={data} />;
  }

  return <DashboardHome data={data} chartData={chartData} isUpdating={isUpdating} onAddProject={onAddProject} onAddTask={onAddTask} onMoveTask={onMoveTask} />;
}

function DashboardHome({
  data,
  chartData,
  isUpdating,
  onAddProject,
  onAddTask,
  onMoveTask
}: {
  data: DashboardResponse;
  chartData: Array<{ label: string; value: number }>;
  isUpdating: boolean;
  onAddProject: () => void;
  onAddTask: () => void;
  onMoveTask: (taskId: string, status: TaskStatus) => void;
}) {
  return (
    <>
      <StatsGrid data={data} />
      <section className="content-grid">
        <div className="main-column">
          <div className="section-heading">
            <h2>Projects</h2>
            <button className="secondary-button" onClick={onAddProject}>
              New project
            </button>
          </div>
          <div className="project-grid">
            {data.projects.map((project) => (
              <ProjectCard project={project} key={project.id} />
            ))}
          </div>

          <div className="section-heading">
            <h2>Task board</h2>
            <button className="secondary-button" onClick={onAddTask}>
              New task
            </button>
          </div>
          <TaskBoard tasks={data.tasks} isUpdating={isUpdating} onMoveTask={onMoveTask} />
        </div>

        <aside className="side-column">
          <ProjectMixPanel chartData={chartData} />
          <TeamLoadPanel data={data} />
          <ActivityPanel data={data} />
        </aside>
      </section>
    </>
  );
}

function ProjectsView({
  data,
  isUpdating,
  onAddProject,
  onAddTask,
  onMoveTask
}: {
  data: DashboardResponse;
  isUpdating: boolean;
  onAddProject: () => void;
  onAddTask: () => void;
  onMoveTask: (taskId: string, status: TaskStatus) => void;
}) {
  const orderedProjects = [...data.projects].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="view-stack">
      <div className="section-heading">
        <h2>Portfolio overview</h2>
        <button className="primary-button" onClick={onAddProject}>
          New project
        </button>
      </div>
      <div className="project-grid wide">
        {orderedProjects.map((project) => (
          <ProjectCard project={project} key={project.id} />
        ))}
      </div>

      <section className="panel">
        <div className="section-heading compact">
          <h2>Project delivery table</h2>
          <button className="secondary-button" onClick={onAddTask}>
            New task
          </button>
        </div>
        <div className="data-table">
          <div className="data-row table-head">
            <span>Project</span>
            <span>Owner</span>
            <span>Status</span>
            <span>Budget</span>
            <span>Due</span>
            <span>Progress</span>
          </div>
          {orderedProjects.map((project) => (
            <div className="data-row" key={project.id}>
              <strong>{project.name}</strong>
              <span>{project.owner.name}</span>
              <StatusPill status={project.status} />
              <span>${project.budget.toLocaleString()}</span>
              <span>{formatDate(project.dueDate)}</span>
              <span>{project.progress}%</span>
            </div>
          ))}
        </div>
      </section>

      <div className="section-heading">
        <h2>Task board</h2>
      </div>
      <TaskBoard tasks={data.tasks} isUpdating={isUpdating} onMoveTask={onMoveTask} />
    </div>
  );
}

function ReportsView({ data, chartData }: { data: DashboardResponse; chartData: Array<{ label: string; value: number }> }) {
  const priorityData = priorityOrder.map((priority) => ({
    label: priority.toLowerCase(),
    value: data.tasks.filter((task) => task.priority === priority).length
  }));
  const totalBudget = data.projects.reduce((sum, project) => sum + project.budget, 0);
  const shippedValue = data.projects.filter((project) => project.status === "SHIPPED").reduce((sum, project) => sum + project.budget, 0);

  return (
    <div className="view-stack">
      <StatsGrid data={data} />
      <section className="report-grid">
        <div className="panel report-panel">
          <div className="section-heading compact">
            <h2>Revenue pipeline</h2>
            <CircleDollarSign size={18} />
          </div>
          <strong className="report-number">${data.metrics.revenuePipeline.toLocaleString()}</strong>
          <span className="muted-line">Total account value: ${totalBudget.toLocaleString()}</span>
          <span className="muted-line">Already shipped: ${shippedValue.toLocaleString()}</span>
        </div>

        <div className="panel report-panel">
          <div className="section-heading compact">
            <h2>Delivery progress</h2>
            <BarChart3 size={18} />
          </div>
          <strong className="report-number">{data.metrics.averageProgress}%</strong>
          <span className="muted-line">Average completion across all projects</span>
          <div className="progress-track large">
            <span style={{ width: `${data.metrics.averageProgress}%` }} />
          </div>
        </div>
      </section>

      <section className="content-grid balanced">
        <ProjectMixPanel chartData={chartData} />
        <section className="panel">
          <div className="section-heading compact">
            <h2>Priority pressure</h2>
            <AlertTriangle size={18} />
          </div>
          <div className="mini-bars">
            {priorityData.map((item) => (
              <MiniBar key={item.label} label={item.label} value={item.value} max={Math.max(...priorityData.map((entry) => entry.value), 1)} />
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}

function TeamView({ data }: { data: DashboardResponse }) {
  return (
    <div className="view-stack">
      <section className="team-grid">
        {data.team.map((member) => {
          const assignedTasks = data.tasks.filter((task) => task.assignee?.id === member.id);
          const plannedHours = assignedTasks.reduce((sum, task) => sum + task.estimateHours, 0);

          return (
            <article className="member-card" key={member.id}>
              <div className="member-card-top">
                <img src={member.avatarUrl ?? ""} alt="" />
                <div>
                  <h2>{member.name}</h2>
                  <span>{member.role.toLowerCase()}</span>
                </div>
              </div>
              <div className="member-metrics">
                <Metric label="Open" value={member.openTasks} />
                <Metric label="Done" value={member.doneTasks} />
                <Metric label="Hours" value={plannedHours} />
              </div>
              <div className="member-task-list">
                {assignedTasks.slice(0, 3).map((task) => (
                  <span key={task.id}>{task.title}</span>
                ))}
                {assignedTasks.length === 0 ? <span>No active assignments</span> : null}
              </div>
            </article>
          );
        })}
      </section>

      <section className="panel">
        <div className="section-heading compact">
          <h2>Workload matrix</h2>
          <UsersRound size={18} />
        </div>
        <div className="data-table">
          <div className="data-row table-head">
            <span>Member</span>
            <span>Role</span>
            <span>Open tasks</span>
            <span>Done tasks</span>
            <span>Assigned hours</span>
            <span>Focus</span>
          </div>
          {data.team.map((member) => {
            const assignedTasks = data.tasks.filter((task) => task.assignee?.id === member.id);
            const plannedHours = assignedTasks.reduce((sum, task) => sum + task.estimateHours, 0);
            return (
              <div className="data-row" key={member.id}>
                <strong>{member.name}</strong>
                <span>{member.role.toLowerCase()}</span>
                <span>{member.openTasks}</span>
                <span>{member.doneTasks}</span>
                <span>{plannedHours}h</span>
                <span>{assignedTasks[0]?.project.name ?? "Available"}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SettingsView({ data }: { data: DashboardResponse }) {
  return (
    <div className="settings-grid">
      <section className="panel settings-panel">
        <div className="section-heading compact">
          <h2>Workspace</h2>
          <SlidersHorizontal size={18} />
        </div>
        <SettingRow label="Workspace name" value="LaunchPad Studio OS" />
        <SettingRow label="API base URL" value={import.meta.env.VITE_API_URL ?? "/api"} />
        <SettingRow label="Database" value="SQLite via Prisma" />
        <SettingRow label="Projects seeded" value={String(data.projects.length)} />
      </section>

      <section className="panel settings-panel">
        <div className="section-heading compact">
          <h2>Security</h2>
          <ShieldCheck size={18} />
        </div>
        <SettingRow label="Authentication" value="JWT bearer tokens" />
        <SettingRow label="Roles" value="Owner, manager, member" />
        <SettingRow label="Protected routes" value="Dashboard, projects, tasks, team" />
        <SettingRow label="Demo account" value="admin@launchpad.dev" />
      </section>

      <section className="panel settings-panel wide-panel">
        <div className="section-heading compact">
          <h2>Operational defaults</h2>
          <Clock3 size={18} />
        </div>
        <div className="settings-options">
          <label>
            <input type="checkbox" defaultChecked />
            Weekly delivery review
          </label>
          <label>
            <input type="checkbox" defaultChecked />
            Urgent task alerts
          </label>
          <label>
            <input type="checkbox" />
            Auto-archive shipped projects
          </label>
        </div>
      </section>
    </div>
  );
}

function StatsGrid({ data }: { data: DashboardResponse }) {
  return (
    <section className="stats-grid">
      <StatCard label="Active projects" value={String(data.metrics.activeProjects)} trend="+2 this month" icon={Layers3} tone="blue" />
      <StatCard label="Open tasks" value={String(data.metrics.openTasks)} trend={`${data.metrics.reviewTasks} in review`} icon={ListTodo} tone="amber" />
      <StatCard label="Urgent risks" value={String(data.metrics.urgentTasks)} trend="Needs attention" icon={AlertTriangle} tone="rose" />
      <StatCard label="Pipeline" value={`$${data.metrics.revenuePipeline.toLocaleString()}`} trend="Unshipped work" icon={TrendingUp} tone="green" />
    </section>
  );
}

function ProjectMixPanel({ chartData }: { chartData: Array<{ label: string; value: number }> }) {
  const max = Math.max(...chartData.map((item) => item.value), 1);

  return (
    <section className="panel">
      <div className="section-heading compact">
        <h2>Project mix</h2>
        <Activity size={18} />
      </div>
      <div className="mini-bars">
        {chartData.map((item) => (
          <MiniBar key={item.label} label={item.label} value={item.value} max={max} />
        ))}
      </div>
    </section>
  );
}

function TeamLoadPanel({ data }: { data: DashboardResponse }) {
  return (
    <section className="panel">
      <div className="section-heading compact">
        <h2>Team load</h2>
        <CheckCircle2 size={18} />
      </div>
      <div className="team-list">
        {data.team.map((member) => (
          <div className="team-row" key={member.id}>
            <img src={member.avatarUrl ?? ""} alt="" />
            <div>
              <strong>{member.name}</strong>
              <span>{member.openTasks} open tasks</span>
            </div>
            <small>{member.doneTasks} done</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityPanel({ data }: { data: DashboardResponse }) {
  return (
    <section className="panel">
      <div className="section-heading compact">
        <h2>Activity</h2>
      </div>
      <div className="activity-list">
        {data.activity.map((item) => (
          <article key={item.id}>
            <img src={item.user.avatarUrl ?? ""} alt="" />
            <div>
              <strong>{item.message}</strong>
              <span>{item.user.name}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MiniBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="mini-bar">
      <span>{label}</span>
      <div>
        <i style={{ width: `${Math.max((value / max) * 100, value > 0 ? 16 : 4)}%` }} />
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function StatusPill({ status }: { status: ApiProject["status"] }) {
  const labels = {
    DISCOVERY: "Discovery",
    ACTIVE: "Active",
    PAUSED: "Paused",
    SHIPPED: "Shipped"
  };

  return <span className={`status-pill ${status.toLowerCase()}`}>{labels[status]}</span>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
