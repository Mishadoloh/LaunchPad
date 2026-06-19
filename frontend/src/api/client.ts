import axios from "axios";
import type {
  ApiProject,
  ApiTask,
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
import {
  demoCreateClient,
  demoCreateMilestone,
  demoCreateNote,
  demoCreateProject,
  demoCreateRisk,
  demoCreateTask,
  demoCreateTimeEntry,
  demoFetchDashboard,
  demoFetchMe,
  demoFetchOperations,
  demoLogin,
  demoUpdateTask
} from "./demoData";

const API_URL = import.meta.env.VITE_API_URL ?? "/api";
const TOKEN_KEY = "launchpad_token";
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

type HealthResponse = Record<string, unknown> & {
  status: string;
  latencyMs: number;
  mode?: string;
  checkedAt?: string;
};

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};

export const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function login(input: LoginInput) {
  if (DEMO_MODE) return demoLogin(input);
  const { data } = await api.post<{ user: ApiUser; token: string }>("/auth/login", input);
  return data;
}

export async function fetchMe() {
  if (DEMO_MODE) return demoFetchMe();
  const { data } = await api.get<{ user: ApiUser }>("/auth/me");
  return data.user;
}

export async function fetchDashboard() {
  if (DEMO_MODE) return demoFetchDashboard();
  const { data } = await api.get<DashboardResponse>("/dashboard");
  return data;
}

export async function fetchHealth() {
  if (DEMO_MODE) {
    return {
      status: "ok",
      latencyMs: 0,
      mode: "demo",
      checkedAt: new Date().toISOString()
    } satisfies HealthResponse;
  }

  const started = performance.now();
  const { data } = await api.get<Record<string, unknown>>("/health");
  return {
    ...data,
    status: String(data.status ?? "ok"),
    latencyMs: Math.round(performance.now() - started)
  } satisfies HealthResponse;
}

export async function fetchOperations() {
  if (DEMO_MODE) return demoFetchOperations();
  const { data } = await api.get<OperationsResponse>("/operations");
  return data;
}

export async function createProject(input: ProjectCreateInput) {
  if (DEMO_MODE) return demoCreateProject(input);
  const { data } = await api.post<{ project: ApiProject }>("/projects", input);
  return data.project;
}

export async function createTask(input: TaskCreateInput) {
  if (DEMO_MODE) return demoCreateTask(input);
  const { data } = await api.post<{ task: ApiTask }>("/tasks", input);
  return data.task;
}

export async function updateTask(id: string, input: Partial<TaskCreateInput>) {
  if (DEMO_MODE) return demoUpdateTask(id, input);
  const { data } = await api.patch<{ task: ApiTask }>(`/tasks/${id}`, input);
  return data.task;
}

export async function createClient(input: ClientCreateInput) {
  if (DEMO_MODE) return demoCreateClient(input);
  const { data } = await api.post("/operations/clients", input);
  return data.client;
}

export async function createMilestone(input: MilestoneCreateInput) {
  if (DEMO_MODE) return demoCreateMilestone(input);
  const { data } = await api.post("/operations/milestones", input);
  return data.milestone;
}

export async function createRisk(input: RiskCreateInput) {
  if (DEMO_MODE) return demoCreateRisk(input);
  const { data } = await api.post("/operations/risks", input);
  return data.risk;
}

export async function createTimeEntry(input: TimeEntryCreateInput) {
  if (DEMO_MODE) return demoCreateTimeEntry(input);
  const { data } = await api.post("/operations/time-entries", input);
  return data.entry;
}

export async function createNote(input: NoteCreateInput) {
  if (DEMO_MODE) return demoCreateNote(input);
  const { data } = await api.post("/operations/notes", input);
  return data.note;
}
