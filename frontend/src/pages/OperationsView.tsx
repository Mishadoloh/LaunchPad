import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpenText,
  Building2,
  CalendarCheck2,
  Clock3,
  FileText,
  Flame,
  Plus,
  ReceiptText,
  Search,
  ShieldAlert,
  TimerReset
} from "lucide-react";
import type {
  ApiProject,
  ApiTask,
  ApiUser,
  ClientCreateInput,
  ClientHealth,
  DashboardResponse,
  MilestoneCreateInput,
  NoteCreateInput,
  OperationsResponse,
  RiskCreateInput,
  TimeEntryCreateInput
} from "@launchpad/shared";
import { createClient, createMilestone, createNote, createRisk, createTimeEntry, fetchOperations } from "../api/client";
import { Modal } from "../components/Modal";

type OperationsTab = "clients" | "roadmap" | "risks" | "time" | "notes";
type OperationsModal = "client" | "milestone" | "risk" | "time" | "note" | null;

const tabs: Array<{ id: OperationsTab; label: string }> = [
  { id: "clients", label: "Clients" },
  { id: "roadmap", label: "Roadmap" },
  { id: "risks", label: "Risks" },
  { id: "time", label: "Time" },
  { id: "notes", label: "Notes" }
];

const healthLabels: Record<ClientHealth, string> = {
  GREEN: "Healthy",
  YELLOW: "Watch",
  RED: "At risk"
};

export function OperationsView({ dashboard }: { dashboard: DashboardResponse }) {
  const [activeTab, setActiveTab] = useState<OperationsTab>("clients");
  const [modal, setModal] = useState<OperationsModal>(null);
  const [query, setQuery] = useState("");
  const queryClient = useQueryClient();
  const operationsQuery = useQuery({ queryKey: ["operations"], queryFn: fetchOperations });

  const createClientMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => closeAndRefresh(setModal, queryClient)
  });
  const createMilestoneMutation = useMutation({
    mutationFn: createMilestone,
    onSuccess: () => closeAndRefresh(setModal, queryClient)
  });
  const createRiskMutation = useMutation({
    mutationFn: createRisk,
    onSuccess: () => closeAndRefresh(setModal, queryClient)
  });
  const createTimeMutation = useMutation({
    mutationFn: createTimeEntry,
    onSuccess: () => closeAndRefresh(setModal, queryClient)
  });
  const createNoteMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => closeAndRefresh(setModal, queryClient)
  });

  const data = operationsQuery.data;
  const filtered = useMemo(() => (data ? filterOperations(data, query) : null), [data, query]);

  if (operationsQuery.isLoading) {
    return (
      <div className="loading-state embedded">
        <div className="spinner" />
      </div>
    );
  }

  if (operationsQuery.isError || !data || !filtered) {
    return (
      <div className="empty-state">
        <AlertTriangle size={24} />
        <strong>Operations could not load</strong>
        <span>Check the API server and run the database seed if this is a fresh workspace.</span>
      </div>
    );
  }

  return (
    <div className="operations-view">
      <section className="operations-toolbar">
        <div className="segmented-tabs">
          {tabs.map((tab) => (
            <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
        <label className="search-box compact-search">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search operations" />
        </label>
      </section>

      <section className="ops-stats-grid">
        <OperationsStat label="Tracked" value={`${data.analytics.totalTrackedHours}h`} icon={Clock3} detail={`${data.analytics.billableHours}h billable`} />
        <OperationsStat label="Open risks" value={String(data.analytics.openRisks)} icon={ShieldAlert} detail={`${data.analytics.criticalRisks} critical`} />
        <OperationsStat label="Upcoming" value={String(data.analytics.upcomingMilestones)} icon={CalendarCheck2} detail={`${data.analytics.blockedMilestones} blocked`} />
        <OperationsStat label="Clients" value={String(data.clients.length)} icon={Building2} detail={`${data.analytics.clientHealth.YELLOW} watched`} />
      </section>

      {activeTab === "clients" ? <ClientsPanel data={filtered} onCreate={() => setModal("client")} /> : null}
      {activeTab === "roadmap" ? <RoadmapPanel data={filtered} onCreate={() => setModal("milestone")} /> : null}
      {activeTab === "risks" ? <RisksPanel data={filtered} onCreate={() => setModal("risk")} /> : null}
      {activeTab === "time" ? <TimePanel data={filtered} onCreate={() => setModal("time")} /> : null}
      {activeTab === "notes" ? <NotesPanel data={filtered} onCreate={() => setModal("note")} /> : null}

      {modal === "client" ? (
        <Modal title="Create client" onClose={() => setModal(null)}>
          <ClientForm isSaving={createClientMutation.isPending} onSubmit={(input) => createClientMutation.mutateAsync(input)} />
        </Modal>
      ) : null}

      {modal === "milestone" ? (
        <Modal title="Create milestone" onClose={() => setModal(null)}>
          <MilestoneForm projects={dashboard.projects} isSaving={createMilestoneMutation.isPending} onSubmit={(input) => createMilestoneMutation.mutateAsync(input)} />
        </Modal>
      ) : null}

      {modal === "risk" ? (
        <Modal title="Log risk" onClose={() => setModal(null)}>
          <RiskForm projects={dashboard.projects} team={dashboard.team} isSaving={createRiskMutation.isPending} onSubmit={(input) => createRiskMutation.mutateAsync(input)} />
        </Modal>
      ) : null}

      {modal === "time" ? (
        <Modal title="Log time" onClose={() => setModal(null)}>
          <TimeForm tasks={dashboard.tasks} team={dashboard.team} isSaving={createTimeMutation.isPending} onSubmit={(input) => createTimeMutation.mutateAsync(input)} />
        </Modal>
      ) : null}

      {modal === "note" ? (
        <Modal title="Add project note" onClose={() => setModal(null)}>
          <NoteForm projects={dashboard.projects} isSaving={createNoteMutation.isPending} onSubmit={(input) => createNoteMutation.mutateAsync(input)} />
        </Modal>
      ) : null}
    </div>
  );
}

function OperationsStat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Clock3 }) {
  return (
    <article className="ops-stat">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <Icon size={20} />
    </article>
  );
}

function ClientsPanel({ data, onCreate }: { data: OperationsResponse; onCreate: () => void }) {
  return (
    <section className="ops-panel">
      <PanelTitle icon={Building2} title="Client command center" action="Client" onCreate={onCreate} />
      <div className="client-grid">
        {data.clients.map((client) => (
          <article className={`client-card health-${client.health.toLowerCase()}`} key={client.id}>
            <header>
              <div>
                <span>{client.industry}</span>
                <h2>{client.name}</h2>
              </div>
              <strong>{healthLabels[client.health]}</strong>
            </header>
            <p>{client.notes}</p>
            <div className="client-contact">
              <span>{client.contactName}</span>
              <a href={`mailto:${client.contactEmail}`}>{client.contactEmail}</a>
            </div>
            <footer>
              <Metric label="Projects" value={client.projectCount} />
              <Metric label="Open tasks" value={client.openTaskCount} />
              <Metric label="Pipeline" value={`$${client.pipelineValue.toLocaleString()}`} />
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function RoadmapPanel({ data, onCreate }: { data: OperationsResponse; onCreate: () => void }) {
  return (
    <section className="ops-panel">
      <PanelTitle icon={CalendarCheck2} title="Roadmap milestones" action="Milestone" onCreate={onCreate} />
      <div className="timeline-list">
        {data.milestones.map((milestone) => (
          <article className={`timeline-item status-${milestone.status.toLowerCase().replace("_", "-")}`} key={milestone.id}>
            <time>{formatShortDate(milestone.dueDate)}</time>
            <div>
              <span>{milestone.project.name}</span>
              <h2>{milestone.title}</h2>
              <p>{milestone.description}</p>
            </div>
            <strong>{milestone.status.toLowerCase().replace("_", " ")}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function RisksPanel({ data, onCreate }: { data: OperationsResponse; onCreate: () => void }) {
  return (
    <section className="ops-panel">
      <PanelTitle icon={ShieldAlert} title="Risk register" action="Risk" onCreate={onCreate} />
      <div className="risk-grid">
        {data.risks.map((risk) => (
          <article className={`risk-card impact-${risk.impact.toLowerCase()}`} key={risk.id}>
            <header>
              <div>
                <span>{risk.project.name}</span>
                <h2>{risk.title}</h2>
              </div>
              <div className="risk-score">
                <Flame size={16} />
                {risk.score}
              </div>
            </header>
            <p>{risk.summary}</p>
            <div className="risk-meta">
              <span>{risk.impact.toLowerCase()}</span>
              <span>{risk.probability}% probability</span>
              <span>{risk.status.toLowerCase()}</span>
            </div>
            <div className="mitigation">
              <strong>Mitigation</strong>
              <span>{risk.mitigation}</span>
            </div>
            <footer>
              <img src={risk.owner.avatarUrl ?? ""} alt="" />
              <span>{risk.owner.name}</span>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function TimePanel({ data, onCreate }: { data: OperationsResponse; onCreate: () => void }) {
  const grouped = groupTimeByUser(data);

  return (
    <section className="ops-panel">
      <PanelTitle icon={TimerReset} title="Time tracking" action="Time" onCreate={onCreate} />
      <div className="time-layout">
        <div className="time-ledger">
          {data.timeEntries.map((entry) => (
            <article className="time-entry" key={entry.id}>
              <div>
                <span>{formatShortDate(entry.date)}</span>
                <h2>{entry.task.title}</h2>
                <p>{entry.note}</p>
              </div>
              <strong>{Math.round((entry.minutes / 60) * 10) / 10}h</strong>
              <small>{entry.billable ? "Billable" : "Internal"}</small>
            </article>
          ))}
        </div>
        <aside className="time-summary">
          {grouped.map((item) => (
            <div className="time-person" key={item.user.id}>
              <img src={item.user.avatarUrl ?? ""} alt="" />
              <div>
                <strong>{item.user.name}</strong>
                <span>{item.hours}h logged</span>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
}

function NotesPanel({ data, onCreate }: { data: OperationsResponse; onCreate: () => void }) {
  return (
    <section className="ops-panel">
      <PanelTitle icon={BookOpenText} title="Project notes" action="Note" onCreate={onCreate} />
      <div className="notes-grid">
        {data.notes.map((note) => (
          <article className={note.pinned ? "note-card pinned" : "note-card"} key={note.id}>
            <header>
              <span>{note.project.name}</span>
              {note.pinned ? <strong>Pinned</strong> : null}
            </header>
            <h2>{note.title}</h2>
            <p>{note.body}</p>
            <footer>
              <img src={note.author.avatarUrl ?? ""} alt="" />
              <span>{note.author.name}</span>
              <small>{formatShortDate(note.createdAt)}</small>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

function PanelTitle({ title, action, icon: Icon, onCreate }: { title: string; action: string; icon: typeof FileText; onCreate: () => void }) {
  return (
    <div className="section-heading">
      <h2>
        <Icon size={19} />
        {title}
      </h2>
      <button className="primary-button" onClick={onCreate}>
        <Plus size={17} />
        <span>{action}</span>
      </button>
    </div>
  );
}

function ClientForm({ isSaving, onSubmit }: { isSaving: boolean; onSubmit: (input: ClientCreateInput) => Promise<unknown> }) {
  const [form, setForm] = useState({
    name: "",
    industry: "",
    contactName: "",
    contactEmail: "",
    health: "GREEN",
    notes: ""
  });

  return (
    <form className="stack-form" onSubmit={(event) => submitForm(event, () => onSubmit({ ...form, health: form.health as ClientCreateInput["health"] }))}>
      <label>
        Client name
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      </label>
      <div className="form-grid">
        <label>
          Industry
          <input value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} required />
        </label>
        <label>
          Health
          <select value={form.health} onChange={(event) => setForm({ ...form, health: event.target.value })}>
            <option value="GREEN">Healthy</option>
            <option value="YELLOW">Watch</option>
            <option value="RED">At risk</option>
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label>
          Contact name
          <input value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} required />
        </label>
        <label>
          Contact email
          <input type="email" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} required />
        </label>
      </div>
      <label>
        Notes
        <textarea rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} required />
      </label>
      <button className="primary-button full" disabled={isSaving}>
        Create client
      </button>
    </form>
  );
}

function MilestoneForm({ projects, isSaving, onSubmit }: { projects: ApiProject[]; isSaving: boolean; onSubmit: (input: MilestoneCreateInput) => Promise<unknown> }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "PLANNED",
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    projectId: projects[0]?.id ?? ""
  });

  return (
    <form
      className="stack-form"
      onSubmit={(event) =>
        submitForm(event, () =>
          onSubmit({
            ...form,
            status: form.status as MilestoneCreateInput["status"],
            dueDate: new Date(form.dueDate).toISOString()
          })
        )
      }
    >
      <label>
        Title
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
      </label>
      <label>
        Project
        <select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}>
          {projects.map((project) => (
            <option value={project.id} key={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          Status
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="PLANNED">Planned</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DONE">Done</option>
          </select>
        </label>
        <label>
          Due date
          <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required />
        </label>
      </div>
      <label>
        Description
        <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
      </label>
      <button className="primary-button full" disabled={isSaving}>
        Create milestone
      </button>
    </form>
  );
}

function RiskForm({ projects, team, isSaving, onSubmit }: { projects: ApiProject[]; team: DashboardResponse["team"]; isSaving: boolean; onSubmit: (input: RiskCreateInput) => Promise<unknown> }) {
  const [form, setForm] = useState({
    title: "",
    summary: "",
    status: "OPEN",
    impact: "MEDIUM",
    probability: "40",
    mitigation: "",
    projectId: projects[0]?.id ?? "",
    ownerId: team[0]?.id ?? ""
  });

  return (
    <form
      className="stack-form"
      onSubmit={(event) =>
        submitForm(event, () =>
          onSubmit({
            ...form,
            status: form.status as RiskCreateInput["status"],
            impact: form.impact as RiskCreateInput["impact"],
            probability: Number(form.probability)
          })
        )
      }
    >
      <label>
        Title
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
      </label>
      <div className="form-grid">
        <label>
          Project
          <select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}>
            {projects.map((project) => (
              <option value={project.id} key={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Owner
          <select value={form.ownerId} onChange={(event) => setForm({ ...form, ownerId: event.target.value })}>
            {team.map((member) => (
              <option value={member.id} key={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label>
          Impact
          <select value={form.impact} onChange={(event) => setForm({ ...form, impact: event.target.value })}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </label>
        <label>
          Probability
          <input type="number" min="0" max="100" value={form.probability} onChange={(event) => setForm({ ...form, probability: event.target.value })} />
        </label>
      </div>
      <label>
        Summary
        <textarea rows={3} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} required />
      </label>
      <label>
        Mitigation
        <textarea rows={3} value={form.mitigation} onChange={(event) => setForm({ ...form, mitigation: event.target.value })} required />
      </label>
      <button className="primary-button full" disabled={isSaving}>
        Log risk
      </button>
    </form>
  );
}

function TimeForm({ tasks, team, isSaving, onSubmit }: { tasks: ApiTask[]; team: DashboardResponse["team"]; isSaving: boolean; onSubmit: (input: TimeEntryCreateInput) => Promise<unknown> }) {
  const [form, setForm] = useState({
    taskId: tasks[0]?.id ?? "",
    userId: team[0]?.id ?? "",
    date: new Date().toISOString().slice(0, 10),
    minutes: "60",
    note: "",
    billable: true
  });

  return (
    <form
      className="stack-form"
      onSubmit={(event) =>
        submitForm(event, () =>
          onSubmit({
            ...form,
            date: new Date(form.date).toISOString(),
            minutes: Number(form.minutes)
          })
        )
      }
    >
      <label>
        Task
        <select value={form.taskId} onChange={(event) => setForm({ ...form, taskId: event.target.value })}>
          {tasks.map((task) => (
            <option value={task.id} key={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          Person
          <select value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })}>
            {team.map((member) => (
              <option value={member.id} key={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Minutes
          <input type="number" min="15" max="1440" value={form.minutes} onChange={(event) => setForm({ ...form, minutes: event.target.value })} />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={form.billable} onChange={(event) => setForm({ ...form, billable: event.target.checked })} />
          Billable
        </label>
      </div>
      <label>
        Note
        <textarea rows={3} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} required />
      </label>
      <button className="primary-button full" disabled={isSaving}>
        Log time
      </button>
    </form>
  );
}

function NoteForm({ projects, isSaving, onSubmit }: { projects: ApiProject[]; isSaving: boolean; onSubmit: (input: NoteCreateInput) => Promise<unknown> }) {
  const [form, setForm] = useState({
    projectId: projects[0]?.id ?? "",
    title: "",
    body: "",
    pinned: false
  });

  return (
    <form className="stack-form" onSubmit={(event) => submitForm(event, () => onSubmit(form))}>
      <label>
        Project
        <select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}>
          {projects.map((project) => (
            <option value={project.id} key={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Title
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
      </label>
      <label>
        Body
        <textarea rows={5} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required />
      </label>
      <label className="checkbox-label">
        <input type="checkbox" checked={form.pinned} onChange={(event) => setForm({ ...form, pinned: event.target.checked })} />
        Pin note
      </label>
      <button className="primary-button full" disabled={isSaving}>
        Add note
      </button>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function filterOperations(data: OperationsResponse, query: string): OperationsResponse {
  const needle = query.trim().toLowerCase();
  if (!needle) return data;

  return {
    ...data,
    clients: data.clients.filter((client) => includes(client.name, needle) || includes(client.industry, needle) || includes(client.contactName, needle)),
    milestones: data.milestones.filter((milestone) => includes(milestone.title, needle) || includes(milestone.project.name, needle)),
    risks: data.risks.filter((risk) => includes(risk.title, needle) || includes(risk.project.name, needle) || includes(risk.owner.name, needle)),
    timeEntries: data.timeEntries.filter((entry) => includes(entry.task.title, needle) || includes(entry.user.name, needle) || includes(entry.note, needle)),
    notes: data.notes.filter((note) => includes(note.title, needle) || includes(note.body, needle) || includes(note.project.name, needle))
  };
}

function groupTimeByUser(data: OperationsResponse) {
  const map = new Map<string, { user: ApiUser; minutes: number }>();

  for (const entry of data.timeEntries) {
    const existing = map.get(entry.user.id) ?? { user: entry.user, minutes: 0 };
    existing.minutes += entry.minutes;
    map.set(entry.user.id, existing);
  }

  return [...map.values()]
    .map((item) => ({ user: item.user, hours: Math.round((item.minutes / 60) * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours);
}

function closeAndRefresh(setModal: (modal: OperationsModal) => void, queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["operations"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  setModal(null);
}

function includes(value: string, needle: string) {
  return value.toLowerCase().includes(needle);
}

function submitForm(event: FormEvent<HTMLFormElement>, action: () => Promise<unknown>) {
  event.preventDefault();
  return action();
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}
