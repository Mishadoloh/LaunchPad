import { z } from "zod";

export const roleSchema = z.enum(["OWNER", "MANAGER", "MEMBER"]);
export const projectStatusSchema = z.enum(["DISCOVERY", "ACTIVE", "PAUSED", "SHIPPED"]);
export const taskStatusSchema = z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]);
export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const clientHealthSchema = z.enum(["GREEN", "YELLOW", "RED"]);
export const milestoneStatusSchema = z.enum(["PLANNED", "IN_PROGRESS", "BLOCKED", "DONE"]);
export const riskStatusSchema = z.enum(["OPEN", "WATCHING", "MITIGATED", "CLOSED"]);
export const riskImpactSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(80)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(80)
});

export const projectCreateSchema = z.object({
  name: z.string().min(2).max(120),
  client: z.string().min(2).max(120),
  description: z.string().min(10).max(800),
  status: projectStatusSchema.default("DISCOVERY"),
  budget: z.number().positive().max(1000000),
  dueDate: z.string().datetime()
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const taskCreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).default(""),
  status: taskStatusSchema.default("TODO"),
  priority: taskPrioritySchema.default("MEDIUM"),
  estimateHours: z.number().int().min(1).max(80),
  projectId: z.string().cuid(),
  assigneeId: z.string().cuid().optional()
});

export const taskUpdateSchema = taskCreateSchema.partial();

export const commentCreateSchema = z.object({
  body: z.string().min(1).max(800)
});

export const clientCreateSchema = z.object({
  name: z.string().min(2).max(120),
  industry: z.string().min(2).max(80),
  contactName: z.string().min(2).max(120),
  contactEmail: z.string().email(),
  health: clientHealthSchema.default("GREEN"),
  notes: z.string().min(4).max(1000)
});

export const milestoneCreateSchema = z.object({
  title: z.string().min(2).max(140),
  description: z.string().min(8).max(800),
  status: milestoneStatusSchema.default("PLANNED"),
  dueDate: z.string().datetime(),
  projectId: z.string().cuid()
});

export const milestoneUpdateSchema = milestoneCreateSchema.partial();

export const riskCreateSchema = z.object({
  title: z.string().min(2).max(140),
  summary: z.string().min(8).max(900),
  status: riskStatusSchema.default("OPEN"),
  impact: riskImpactSchema.default("MEDIUM"),
  probability: z.number().int().min(0).max(100),
  mitigation: z.string().min(8).max(900),
  projectId: z.string().cuid(),
  ownerId: z.string().cuid()
});

export const riskUpdateSchema = riskCreateSchema.partial();

export const timeEntryCreateSchema = z.object({
  taskId: z.string().cuid(),
  userId: z.string().cuid().optional(),
  date: z.string().datetime(),
  minutes: z.number().int().min(15).max(1440),
  note: z.string().min(2).max(500),
  billable: z.boolean().default(true)
});

export const noteCreateSchema = z.object({
  title: z.string().min(2).max(140),
  body: z.string().min(4).max(2000),
  pinned: z.boolean().default(false),
  projectId: z.string().cuid()
});

export type Role = z.infer<typeof roleSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type ClientHealth = z.infer<typeof clientHealthSchema>;
export type MilestoneStatus = z.infer<typeof milestoneStatusSchema>;
export type RiskStatus = z.infer<typeof riskStatusSchema>;
export type RiskImpact = z.infer<typeof riskImpactSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type MilestoneCreateInput = z.infer<typeof milestoneCreateSchema>;
export type RiskCreateInput = z.infer<typeof riskCreateSchema>;
export type TimeEntryCreateInput = z.infer<typeof timeEntryCreateSchema>;
export type NoteCreateInput = z.infer<typeof noteCreateSchema>;

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
};

export type ApiProject = {
  id: string;
  name: string;
  client: string;
  description: string;
  status: ProjectStatus;
  budget: number;
  dueDate: string;
  createdAt: string;
  progress: number;
  owner: ApiUser;
  taskCount: number;
  doneTaskCount: number;
};

export type ApiTask = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  estimateHours: number;
  createdAt: string;
  updatedAt: string;
  project: Pick<ApiProject, "id" | "name" | "client">;
  assignee: ApiUser | null;
  commentCount: number;
};

export type ApiClient = {
  id: string;
  name: string;
  industry: string;
  contactName: string;
  contactEmail: string;
  health: ClientHealth;
  notes: string;
  createdAt: string;
  projectCount: number;
  openTaskCount: number;
  pipelineValue: number;
};

export type ApiMilestone = {
  id: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  dueDate: string;
  createdAt: string;
  project: Pick<ApiProject, "id" | "name" | "client">;
};

export type ApiRisk = {
  id: string;
  title: string;
  summary: string;
  status: RiskStatus;
  impact: RiskImpact;
  probability: number;
  mitigation: string;
  createdAt: string;
  project: Pick<ApiProject, "id" | "name" | "client">;
  owner: ApiUser;
  score: number;
};

export type ApiTimeEntry = {
  id: string;
  date: string;
  minutes: number;
  note: string;
  billable: boolean;
  task: Pick<ApiTask, "id" | "title" | "priority"> & {
    project: Pick<ApiProject, "id" | "name" | "client">;
  };
  user: ApiUser;
};

export type ApiProjectNote = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  project: Pick<ApiProject, "id" | "name" | "client">;
  author: ApiUser;
};

export type DashboardResponse = {
  metrics: {
    activeProjects: number;
    shippedProjects: number;
    openTasks: number;
    reviewTasks: number;
    urgentTasks: number;
    revenuePipeline: number;
    averageProgress: number;
  };
  projects: ApiProject[];
  tasks: ApiTask[];
  team: Array<ApiUser & { openTasks: number; doneTasks: number }>;
  activity: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
    user: ApiUser;
  }>;
};

export type OperationsResponse = {
  clients: ApiClient[];
  milestones: ApiMilestone[];
  risks: ApiRisk[];
  timeEntries: ApiTimeEntry[];
  notes: ApiProjectNote[];
  analytics: {
    totalTrackedHours: number;
    billableHours: number;
    nonBillableHours: number;
    openRisks: number;
    criticalRisks: number;
    blockedMilestones: number;
    upcomingMilestones: number;
    clientHealth: Record<ClientHealth, number>;
  };
};
