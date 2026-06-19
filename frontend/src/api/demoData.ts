import type {
  ApiClient,
  ApiMilestone,
  ApiProject,
  ApiProjectNote,
  ApiRisk,
  ApiTask,
  ApiTimeEntry,
  ApiUser,
  ClientCreateInput,
  DashboardResponse,
  LoginInput,
  MilestoneCreateInput,
  NoteCreateInput,
  OperationsResponse,
  ProjectCreateInput,
  RiskCreateInput,
  TaskCreateInput,
  TimeEntryCreateInput
} from "@launchpad/shared";

const now = new Date();
const iso = (days = 0) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

export const demoUser: ApiUser = {
  id: "user_owner",
  name: "Marta Kovalenko",
  email: "admin@launchpad.dev",
  role: "OWNER",
  avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop&crop=faces"
};

const team: Array<ApiUser & { openTasks: number; doneTasks: number }> = [
  { ...demoUser, openTasks: 2, doneTasks: 1 },
  {
    id: "user_manager",
    name: "Danylo Shevchenko",
    email: "manager@launchpad.dev",
    role: "MANAGER",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=faces",
    openTasks: 3,
    doneTasks: 1
  },
  {
    id: "user_designer",
    name: "Iryna Bondar",
    email: "design@launchpad.dev",
    role: "MEMBER",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=faces",
    openTasks: 2,
    doneTasks: 0
  },
  {
    id: "user_engineer",
    name: "Oleh Melnyk",
    email: "dev@launchpad.dev",
    role: "MEMBER",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&h=160&fit=crop&crop=faces",
    openTasks: 3,
    doneTasks: 0
  }
];

const projects: ApiProject[] = [
  {
    id: "project_pulse",
    name: "Pulse CRM",
    client: "Northwind Labs",
    description: "CRM workspace for account timelines, lead scoring, and follow-up automation.",
    status: "ACTIVE",
    budget: 42000,
    dueDate: iso(38),
    createdAt: iso(-20),
    progress: 33,
    owner: demoUser,
    taskCount: 3,
    doneTaskCount: 1
  },
  {
    id: "project_atlas",
    name: "Atlas Inventory",
    client: "Cargo House",
    description: "Inventory visibility platform with supplier risk tracking and import workflows.",
    status: "DISCOVERY",
    budget: 58000,
    dueDate: iso(72),
    createdAt: iso(-12),
    progress: 0,
    owner: team[1],
    taskCount: 2,
    doneTaskCount: 0
  },
  {
    id: "project_bloom",
    name: "Bloom Commerce",
    client: "Green Market",
    description: "Headless commerce refresh with analytics, subscription flows, and campaign tools.",
    status: "ACTIVE",
    budget: 76000,
    dueDate: iso(21),
    createdAt: iso(-32),
    progress: 0,
    owner: demoUser,
    taskCount: 3,
    doneTaskCount: 0
  },
  {
    id: "project_beacon",
    name: "Beacon Portal",
    client: "Nova Education",
    description: "Student onboarding portal with advisor notes, recommendations, and document checks.",
    status: "SHIPPED",
    budget: 36000,
    dueDate: iso(-12),
    createdAt: iso(-90),
    progress: 100,
    owner: team[1],
    taskCount: 1,
    doneTaskCount: 1
  }
];

const initialTasks: ApiTask[] = [
  task("task_pipeline", "Map sales pipeline states", "Define sales states and automation triggers.", "DONE", "HIGH", 8, projects[0], team[1], 1),
  task("task_account_api", "Build account overview API", "Expose account health, active deals, and next action suggestions.", "IN_PROGRESS", "URGENT", 16, projects[0], team[3], 1),
  task("task_timeline", "Design activity timeline", "Create states for calls, notes, email sync, and system events.", "REVIEW", "HIGH", 10, projects[0], team[2], 1),
  task("task_supplier", "Supplier risk matrix", "Score suppliers by delay, quality issues, and dependency.", "TODO", "MEDIUM", 12, projects[1], team[1], 0),
  task("task_import", "Inventory import wizard", "Build CSV validation, column matching, preview, and summary.", "BACKLOG", "HIGH", 20, projects[1], team[3], 0),
  task("task_checkout", "Checkout analytics model", "Track funnel loss by source, campaign, device, and payment method.", "IN_PROGRESS", "URGENT", 18, projects[2], team[3], 0),
  task("task_subscription", "Subscription landing page", "Create reusable subscription plan blocks and promotion rules.", "TODO", "MEDIUM", 14, projects[2], team[2], 0),
  task("task_calendar", "Campaign calendar", "Add launch windows, owners, and budget labels.", "REVIEW", "LOW", 9, projects[2], team[1], 0),
  task("task_handoff", "Advisor notes handoff", "Polish export and hand off support documentation.", "DONE", "MEDIUM", 6, projects[3], demoUser, 0)
];

const clients: ApiClient[] = [
  client("client_northwind", "Northwind Labs", "B2B SaaS", "Olivia Parker", "olivia@northwind.example", "GREEN", 1, 2, 42000),
  client("client_cargo", "Cargo House", "Logistics", "Martin Keller", "martin@cargohouse.example", "YELLOW", 1, 2, 58000),
  client("client_green", "Green Market", "Commerce", "Sofia Ramirez", "sofia@greenmarket.example", "GREEN", 1, 3, 76000),
  client("client_nova", "Nova Education", "Education", "Andriy Marchenko", "andriy@novaedu.example", "GREEN", 1, 0, 0)
];

const milestones: ApiMilestone[] = [
  milestone("mile_crm", "CRM beta walkthrough", "Run the first end-to-end walkthrough with customer success.", "IN_PROGRESS", 9, projects[0]),
  milestone("mile_inventory", "Inventory discovery sign-off", "Lock the warehouse workflow map and import constraints.", "PLANNED", 18, projects[1]),
  milestone("mile_analytics", "Commerce analytics freeze", "Freeze checkout analytics events before campaign QA.", "BLOCKED", 5, projects[2]),
  milestone("mile_support", "Support handoff", "Transfer release playbooks and known issues.", "DONE", -5, projects[3])
];

const risks: ApiRisk[] = [
  risk("risk_migration", "CRM data migration scope", "Legacy customer notes have inconsistent date formats.", "WATCHING", "HIGH", 55, "Run a dry import on the top accounts.", projects[0], team[3]),
  risk("risk_alignment", "Warehouse stakeholder drift", "Operations and procurement disagree on reporting scope.", "OPEN", "MEDIUM", 62, "Run a decision workshop.", projects[1], team[1]),
  risk("risk_events", "Checkout event naming", "Analytics and campaign teams use different event names.", "OPEN", "CRITICAL", 48, "Approve a single event dictionary.", projects[2], demoUser)
];

const timeEntries: ApiTimeEntry[] = [
  time("time_api", -4, 180, "Built customer health query and response mapper.", true, initialTasks[1], team[3]),
  time("time_timeline", -3, 120, "Reviewed CRM timeline states with design.", true, initialTasks[2], team[2]),
  time("time_checkout", -2, 210, "Implemented checkout analytics model spike.", true, initialTasks[5], team[3])
];

const notes: ApiProjectNote[] = [
  note("note_crm", "Pulse CRM walkthrough angle", "Lead with the account timeline, then show next action suggestions.", true, projects[0], demoUser),
  note("note_inventory", "Inventory workshop constraints", "Keep discovery focused on supplier risk and import quality.", true, projects[1], team[1]),
  note("note_qa", "Commerce QA watchlist", "Analytics, subscription rules, and promotion stacking need a joined QA pass.", false, projects[2], team[2])
];

let dashboardState = buildDashboard(initialTasks);
let operationsState = buildOperations();

export async function demoLogin(input: LoginInput) {
  if (input.email !== "admin@launchpad.dev" || input.password !== "launchpad123") {
    throw new Error("Invalid email or password.");
  }

  return { user: demoUser, token: "launchpad-demo-token" };
}

export async function demoFetchMe() {
  return demoUser;
}

export async function demoFetchDashboard() {
  return dashboardState;
}

export async function demoFetchOperations() {
  return operationsState;
}

export async function demoCreateProject(input: ProjectCreateInput) {
  const project: ApiProject = {
    id: id("project"),
    name: input.name,
    client: input.client,
    description: input.description,
    status: input.status ?? "DISCOVERY",
    budget: input.budget,
    dueDate: input.dueDate,
    createdAt: new Date().toISOString(),
    progress: 0,
    owner: demoUser,
    taskCount: 0,
    doneTaskCount: 0
  };

  dashboardState = { ...dashboardState, projects: [project, ...dashboardState.projects] };
  return project;
}

export async function demoCreateTask(input: TaskCreateInput) {
  const project = dashboardState.projects.find((item) => item.id === input.projectId) ?? dashboardState.projects[0];
  const assignee = team.find((item) => item.id === input.assigneeId) ?? null;
  const created = task(id("task"), input.title, input.description, input.status ?? "TODO", input.priority ?? "MEDIUM", input.estimateHours, project, assignee, 0);
  dashboardState = buildDashboard([created, ...dashboardState.tasks]);
  return created;
}

export async function demoUpdateTask(taskId: string, input: Partial<TaskCreateInput>) {
  const tasks = dashboardState.tasks.map((item) => (item.id === taskId ? { ...item, ...input, updatedAt: new Date().toISOString() } : item));
  dashboardState = buildDashboard(tasks);
  return tasks.find((item) => item.id === taskId) ?? tasks[0];
}

export async function demoCreateClient(input: ClientCreateInput) {
  const created = client(id("client"), input.name, input.industry, input.contactName, input.contactEmail, input.health ?? "GREEN", 0, 0, 0, input.notes);
  operationsState = { ...operationsState, clients: [created, ...operationsState.clients] };
  return created;
}

export async function demoCreateMilestone(input: MilestoneCreateInput) {
  const project = dashboardState.projects.find((item) => item.id === input.projectId) ?? dashboardState.projects[0];
  const created = milestone(id("mile"), input.title, input.description, input.status ?? "PLANNED", 0, project, input.dueDate);
  operationsState = buildOperations({ milestones: [created, ...operationsState.milestones] });
  return created;
}

export async function demoCreateRisk(input: RiskCreateInput) {
  const project = dashboardState.projects.find((item) => item.id === input.projectId) ?? dashboardState.projects[0];
  const owner = team.find((item) => item.id === input.ownerId) ?? demoUser;
  const created = risk(id("risk"), input.title, input.summary, input.status ?? "OPEN", input.impact ?? "MEDIUM", input.probability, input.mitigation, project, owner);
  operationsState = buildOperations({ risks: [created, ...operationsState.risks] });
  return created;
}

export async function demoCreateTimeEntry(input: TimeEntryCreateInput) {
  const taskItem = dashboardState.tasks.find((item) => item.id === input.taskId) ?? dashboardState.tasks[0];
  const user = team.find((item) => item.id === input.userId) ?? demoUser;
  const created = time(id("time"), 0, input.minutes, input.note, input.billable ?? true, taskItem, user, input.date);
  operationsState = buildOperations({ timeEntries: [created, ...operationsState.timeEntries] });
  return created;
}

export async function demoCreateNote(input: NoteCreateInput) {
  const project = dashboardState.projects.find((item) => item.id === input.projectId) ?? dashboardState.projects[0];
  const created = note(id("note"), input.title, input.body, input.pinned ?? false, project, demoUser);
  operationsState = buildOperations({ notes: [created, ...operationsState.notes] });
  return created;
}

function buildDashboard(tasks: ApiTask[]): DashboardResponse {
  const openTasks = tasks.filter((item) => item.status !== "DONE").length;
  const projectsWithProgress = projects.map((project) => {
    const projectTasks = tasks.filter((item) => item.project.id === project.id);
    const doneTaskCount = projectTasks.filter((item) => item.status === "DONE").length;
    return {
      ...project,
      taskCount: projectTasks.length,
      doneTaskCount,
      progress: projectTasks.length === 0 ? 0 : Math.round((doneTaskCount / projectTasks.length) * 100)
    };
  });

  return {
    metrics: {
      activeProjects: projectsWithProgress.filter((project) => project.status === "ACTIVE").length,
      shippedProjects: projectsWithProgress.filter((project) => project.status === "SHIPPED").length,
      openTasks,
      reviewTasks: tasks.filter((item) => item.status === "REVIEW").length,
      urgentTasks: tasks.filter((item) => item.priority === "URGENT").length,
      revenuePipeline: projectsWithProgress.filter((project) => project.status !== "SHIPPED").reduce((sum, project) => sum + project.budget, 0),
      averageProgress: Math.round(projectsWithProgress.reduce((sum, project) => sum + project.progress, 0) / projectsWithProgress.length)
    },
    projects: projectsWithProgress,
    tasks,
    team,
    activity: [
      { id: "activity_1", type: "PROJECT_CREATED", message: "Created Pulse CRM workspace", createdAt: iso(-7), user: demoUser },
      { id: "activity_2", type: "TASK_UPDATED", message: "Raised Checkout analytics model to urgent priority", createdAt: iso(-2), user: team[3] },
      { id: "activity_3", type: "PROJECT_SHIPPED", message: "Shipped Beacon Portal to production", createdAt: iso(-1), user: team[1] }
    ]
  };
}

function buildOperations(overrides: Partial<OperationsResponse> = {}): OperationsResponse {
  const merged = {
    clients,
    milestones,
    risks,
    timeEntries,
    notes,
    ...overrides
  };
  const totalMinutes = merged.timeEntries.reduce((sum, entry) => sum + entry.minutes, 0);
  const billableMinutes = merged.timeEntries.filter((entry) => entry.billable).reduce((sum, entry) => sum + entry.minutes, 0);

  return {
    ...merged,
    analytics: {
      totalTrackedHours: roundHours(totalMinutes),
      billableHours: roundHours(billableMinutes),
      nonBillableHours: roundHours(totalMinutes - billableMinutes),
      openRisks: merged.risks.filter((item) => item.status === "OPEN" || item.status === "WATCHING").length,
      criticalRisks: merged.risks.filter((item) => item.impact === "CRITICAL").length,
      blockedMilestones: merged.milestones.filter((item) => item.status === "BLOCKED").length,
      upcomingMilestones: merged.milestones.filter((item) => new Date(item.dueDate).getTime() > Date.now()).length,
      clientHealth: {
        GREEN: merged.clients.filter((item) => item.health === "GREEN").length,
        YELLOW: merged.clients.filter((item) => item.health === "YELLOW").length,
        RED: merged.clients.filter((item) => item.health === "RED").length
      }
    }
  };
}

function task(idValue: string, title: string, description: string, status: ApiTask["status"], priority: ApiTask["priority"], estimateHours: number, project: ApiProject, assignee: ApiUser | null, commentCount: number): ApiTask {
  return {
    id: idValue,
    title,
    description,
    status,
    priority,
    estimateHours,
    createdAt: iso(-3),
    updatedAt: iso(-1),
    project: { id: project.id, name: project.name, client: project.client },
    assignee,
    commentCount
  };
}

function client(idValue: string, name: string, industry: string, contactName: string, contactEmail: string, health: ApiClient["health"], projectCount: number, openTaskCount: number, pipelineValue: number, notesValue = "Active delivery account."): ApiClient {
  return { id: idValue, name, industry, contactName, contactEmail, health, notes: notesValue, createdAt: iso(-30), projectCount, openTaskCount, pipelineValue };
}

function milestone(idValue: string, title: string, description: string, status: ApiMilestone["status"], dueInDays: number, project: ApiProject, explicitDate?: string): ApiMilestone {
  return { id: idValue, title, description, status, dueDate: explicitDate ?? iso(dueInDays), createdAt: iso(-5), project: { id: project.id, name: project.name, client: project.client } };
}

function risk(idValue: string, title: string, summary: string, status: ApiRisk["status"], impact: ApiRisk["impact"], probability: number, mitigation: string, project: ApiProject, owner: ApiUser): ApiRisk {
  const weights = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  return { id: idValue, title, summary, status, impact, probability, mitigation, createdAt: iso(-4), project: { id: project.id, name: project.name, client: project.client }, owner, score: weights[impact] * probability };
}

function time(idValue: string, days: number, minutes: number, noteValue: string, billable: boolean, taskItem: ApiTask, user: ApiUser, explicitDate?: string): ApiTimeEntry {
  return { id: idValue, date: explicitDate ?? iso(days), minutes, note: noteValue, billable, task: { id: taskItem.id, title: taskItem.title, priority: taskItem.priority, project: taskItem.project }, user };
}

function note(idValue: string, title: string, body: string, pinned: boolean, project: ApiProject, author: ApiUser): ApiProjectNote {
  return { id: idValue, title, body, pinned, createdAt: iso(-2), project: { id: project.id, name: project.name, client: project.client }, author };
}

function roundHours(minutes: number) {
  return Math.round((minutes / 60) * 10) / 10;
}
