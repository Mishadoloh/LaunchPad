import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Copy,
  Database,
  Download,
  Gauge,
  Layers3,
  ListTodo,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  UserRound,
  UsersRound
} from "lucide-react";
import type { ApiProject, ApiTask, ApiUser, DashboardResponse, TaskPriority, TaskStatus } from "@launchpad/shared";
import { createProject, createTask, fetchDashboard, fetchHealth, updateTask } from "../api/client";
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
const settingsStorageKey = "launchpad_workspace_settings";

type WorkspaceSettings = {
  workspaceName: string;
  apiBaseUrl: string;
  timezone: string;
  reviewDay: string;
  sprintCadence: string;
  defaultPriority: TaskPriority;
  defaultEstimateHours: number;
  sessionTimeoutMinutes: number;
  weeklyDeliveryReview: boolean;
  urgentTaskAlerts: boolean;
  dailyDigest: boolean;
  autoArchiveShipped: boolean;
  requireReviewForUrgent: boolean;
};

const defaultWorkspaceSettings: WorkspaceSettings = {
  workspaceName: "LaunchPad Studio OS",
  apiBaseUrl: import.meta.env.VITE_API_URL ?? "/api",
  timezone: "Europe/Kyiv",
  reviewDay: "Friday",
  sprintCadence: "Weekly",
  defaultPriority: "MEDIUM",
  defaultEstimateHours: 8,
  sessionTimeoutMinutes: 120,
  weeklyDeliveryReview: true,
  urgentTaskAlerts: true,
  dailyDigest: false,
  autoArchiveShipped: false,
  requireReviewForUrgent: true
};

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
              user={user}
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
  user,
  chartData,
  isUpdating,
  onAddProject,
  onAddTask,
  onMoveTask
}: {
  view: WorkspaceView;
  data: DashboardResponse;
  user: ApiUser;
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
    return <SettingsView data={data} user={user} />;
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

function SettingsView({ data, user }: { data: DashboardResponse; user: ApiUser }) {
  const [settings, setSettings] = useState<WorkspaceSettings>(() => loadWorkspaceSettings());
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const healthQuery = useQuery({ queryKey: ["api-health"], queryFn: fetchHealth, retry: false, staleTime: 30_000 });
  const isDirty = JSON.stringify(settings) !== JSON.stringify(loadWorkspaceSettings());
  const healthStatus = healthQuery.isError ? "offline" : String(healthQuery.data?.status ?? "checking");
  const latency = typeof healthQuery.data?.latencyMs === "number" ? `${healthQuery.data.latencyMs}ms` : healthQuery.data?.mode === "demo" ? "demo" : "pending";
  const openTasks = data.tasks.filter((task) => task.status !== "DONE").length;
  const urgentTasks = data.tasks.filter((task) => task.priority === "URGENT" && task.status !== "DONE").length;
  const readiness = [
    { label: "API reachable", ok: healthStatus !== "offline" },
    { label: "Projects seeded", ok: data.projects.length > 0 },
    { label: "Team assigned", ok: data.team.length > 0 },
    { label: "Review queue clear", ok: data.metrics.reviewTasks < 4 }
  ];

  const updateSetting = <K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const saveSettings = () => {
    localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
    setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  };

  const resetSettings = () => {
    localStorage.removeItem(settingsStorageKey);
    setSettings(defaultWorkspaceSettings);
    setSavedAt(null);
  };

  const copyApiUrl = () => {
    void navigator.clipboard?.writeText(settings.apiBaseUrl);
  };

  const downloadSettings = () => {
    const file = new Blob([JSON.stringify({ settings, user: user.email, exportedAt: new Date().toISOString() }, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "launchpad-settings.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="settings-grid">
      <section className="panel settings-panel">
        <div className="section-heading compact">
          <h2>Workspace</h2>
          <SlidersHorizontal size={18} />
        </div>
        <div className="settings-form-grid">
          <label className="settings-field">
            <span>Workspace name</span>
            <input value={settings.workspaceName} onChange={(event) => updateSetting("workspaceName", event.target.value)} />
          </label>
          <label className="settings-field">
            <span>API base URL</span>
            <input value={settings.apiBaseUrl} onChange={(event) => updateSetting("apiBaseUrl", event.target.value)} />
          </label>
          <label className="settings-field">
            <span>Timezone</span>
            <select value={settings.timezone} onChange={(event) => updateSetting("timezone", event.target.value)}>
              <option>Europe/Kyiv</option>
              <option>Europe/Warsaw</option>
              <option>Europe/London</option>
              <option>America/New_York</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Review day</span>
            <select value={settings.reviewDay} onChange={(event) => updateSetting("reviewDay", event.target.value)}>
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
                <option key={day}>{day}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="settings-actions">
          <button className="primary-button" onClick={saveSettings} disabled={!isDirty}>
            <Save size={17} />
            <span>Save</span>
          </button>
          <button className="secondary-button" onClick={resetSettings}>
            <RotateCcw size={17} />
            <span>Reset</span>
          </button>
          <span className="settings-save-state">{savedAt ? `Saved ${savedAt}` : isDirty ? "Unsaved changes" : "Up to date"}</span>
        </div>
      </section>

      <section className="panel settings-panel">
        <div className="section-heading compact">
          <h2>API status</h2>
          <Database size={18} />
        </div>
        <div className={`api-status-card ${healthStatus === "offline" ? "offline" : "online"}`}>
          <strong>{healthStatus === "offline" ? "Offline" : "Online"}</strong>
          <span>{settings.apiBaseUrl}</span>
          <small>Latency: {latency}</small>
        </div>
        <div className="settings-actions">
          <button className="secondary-button" onClick={() => healthQuery.refetch()} disabled={healthQuery.isFetching}>
            <RefreshCw size={17} />
            <span>{healthQuery.isFetching ? "Checking" : "Check now"}</span>
          </button>
          <button className="secondary-button" onClick={copyApiUrl}>
            <Copy size={17} />
            <span>Copy URL</span>
          </button>
        </div>
        <SettingRow label="Database" value="SQLite via Prisma" />
        <SettingRow label="Projects seeded" value={String(data.projects.length)} />
      </section>

      <section className="panel settings-panel wide-panel">
        <div className="section-heading compact">
          <h2>Operational defaults</h2>
          <Clock3 size={18} />
        </div>
        <div className="settings-form-grid compact-settings">
          <label className="settings-field">
            <span>Sprint cadence</span>
            <select value={settings.sprintCadence} onChange={(event) => updateSetting("sprintCadence", event.target.value)}>
              <option>Weekly</option>
              <option>Biweekly</option>
              <option>Monthly</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Default priority</span>
            <select value={settings.defaultPriority} onChange={(event) => updateSetting("defaultPriority", event.target.value as TaskPriority)}>
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </label>
          <label className="settings-field">
            <span>Default estimate</span>
            <input
              type="number"
              min={1}
              max={80}
              value={settings.defaultEstimateHours}
              onChange={(event) => updateSetting("defaultEstimateHours", Number(event.target.value))}
            />
          </label>
          <label className="settings-field">
            <span>Session timeout</span>
            <input
              type="number"
              min={15}
              max={480}
              value={settings.sessionTimeoutMinutes}
              onChange={(event) => updateSetting("sessionTimeoutMinutes", Number(event.target.value))}
            />
          </label>
        </div>
        <div className="settings-options">
          <label>
            <input type="checkbox" checked={settings.weeklyDeliveryReview} onChange={(event) => updateSetting("weeklyDeliveryReview", event.target.checked)} />
            Weekly delivery review
          </label>
          <label>
            <input type="checkbox" checked={settings.urgentTaskAlerts} onChange={(event) => updateSetting("urgentTaskAlerts", event.target.checked)} />
            Urgent task alerts
          </label>
          <label>
            <input type="checkbox" checked={settings.dailyDigest} onChange={(event) => updateSetting("dailyDigest", event.target.checked)} />
            Daily digest
          </label>
          <label>
            <input type="checkbox" checked={settings.autoArchiveShipped} onChange={(event) => updateSetting("autoArchiveShipped", event.target.checked)} />
            Auto-archive shipped projects
          </label>
          <label>
            <input type="checkbox" checked={settings.requireReviewForUrgent} onChange={(event) => updateSetting("requireReviewForUrgent", event.target.checked)} />
            Review urgent work
          </label>
        </div>
      </section>

      <section className="panel settings-panel">
        <div className="section-heading compact">
          <h2>Account</h2>
          <UserRound size={18} />
        </div>
        <SettingRow label="Signed in as" value={user.name} />
        <SettingRow label="Email" value={user.email} />
        <SettingRow label="Role" value={user.role.toLowerCase()} />
        <SettingRow label="Auth" value="JWT bearer token" />
        <button className="secondary-button full" onClick={downloadSettings}>
          <Download size={17} />
          <span>Export settings</span>
        </button>
      </section>

      <section className="panel settings-panel">
        <div className="section-heading compact">
          <h2>Readiness</h2>
          <ShieldCheck size={18} />
        </div>
        <div className="readiness-list">
          {readiness.map((item) => (
            <div className={item.ok ? "ready" : "blocked"} key={item.label}>
              <CheckCircle2 size={18} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <div className="settings-summary-grid">
          <Metric label="Open" value={openTasks} />
          <Metric label="Urgent" value={urgentTasks} />
          <Metric label="Review" value={data.metrics.reviewTasks} />
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

function loadWorkspaceSettings(): WorkspaceSettings {
  const raw = localStorage.getItem(settingsStorageKey);
  if (!raw) return defaultWorkspaceSettings;

  try {
    return { ...defaultWorkspaceSettings, ...JSON.parse(raw) };
  } catch {
    return defaultWorkspaceSettings;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
