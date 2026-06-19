"""Analytics helpers for exported LaunchPad workspace data."""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable


DATE_FORMATS = (
    "%Y-%m-%dT%H:%M:%S.%fZ",
    "%Y-%m-%dT%H:%M:%SZ",
    "%Y-%m-%d",
)


@dataclass(frozen=True)
class Metric:
    label: str
    value: float | int | str
    unit: str = ""


@dataclass(frozen=True)
class WorkloadRow:
    owner: str
    total: int
    open_tasks: int
    completed_tasks: int
    overdue_tasks: int
    focus_score: int


@dataclass(frozen=True)
class ProjectRow:
    name: str
    client: str
    status: str
    health: str
    progress: int
    open_tasks: int
    overdue_tasks: int
    risk_count: int


def build_summary(data: dict[str, Any]) -> dict[str, Any]:
    """Build a compact report payload from exported API data."""

    projects = _list(data.get("projects"))
    tasks = _list(data.get("tasks"))
    operations = _mapping(data.get("operations"))
    risks = _list(operations.get("risks"))
    time_entries = _list(operations.get("timeEntries") or operations.get("time_entries"))

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "metrics": [metric.__dict__ for metric in workspace_metrics(projects, tasks, risks, time_entries)],
        "projects": [row.__dict__ for row in project_rows(projects, tasks, risks)],
        "workload": [row.__dict__ for row in workload_rows(tasks)],
        "riskBreakdown": dict(Counter(_string(risk.get("status"), "Unknown") for risk in risks)),
        "taskBreakdown": dict(Counter(_string(task.get("status"), "Unknown") for task in tasks)),
    }


def workspace_metrics(
    projects: list[dict[str, Any]],
    tasks: list[dict[str, Any]],
    risks: list[dict[str, Any]],
    time_entries: list[dict[str, Any]],
) -> list[Metric]:
    open_tasks = [task for task in tasks if _string(task.get("status")).lower() != "done"]
    completed_tasks = [task for task in tasks if _string(task.get("status")).lower() == "done"]
    overdue_tasks = [task for task in open_tasks if is_overdue(task.get("dueDate") or task.get("due_date"))]
    active_risks = [risk for risk in risks if _string(risk.get("status")).lower() not in {"closed", "resolved"}]
    logged_hours = sum(_number(entry.get("hours")) for entry in time_entries)
    average_progress = average(_number(project.get("progress")) for project in projects)

    return [
        Metric("Projects", len(projects)),
        Metric("Open tasks", len(open_tasks)),
        Metric("Completed tasks", len(completed_tasks)),
        Metric("Overdue tasks", len(overdue_tasks)),
        Metric("Active risks", len(active_risks)),
        Metric("Logged hours", round(logged_hours, 2), "h"),
        Metric("Average progress", round(average_progress), "%"),
    ]


def project_rows(
    projects: list[dict[str, Any]],
    tasks: list[dict[str, Any]],
    risks: list[dict[str, Any]],
) -> list[ProjectRow]:
    tasks_by_project = group_by(tasks, "projectId", "project_id")
    risks_by_project = group_by(risks, "projectId", "project_id")
    rows: list[ProjectRow] = []

    for project in projects:
        project_id = _string(project.get("id"))
        related_tasks = tasks_by_project.get(project_id, [])
        related_risks = risks_by_project.get(project_id, [])
        open_tasks = [task for task in related_tasks if _string(task.get("status")).lower() != "done"]
        overdue_tasks = [
            task for task in open_tasks if is_overdue(task.get("dueDate") or task.get("due_date"))
        ]
        rows.append(
            ProjectRow(
                name=_string(project.get("name"), "Untitled project"),
                client=_client_name(project),
                status=_string(project.get("status"), "Unknown"),
                health=_string(project.get("health"), "Unknown"),
                progress=int(_number(project.get("progress"))),
                open_tasks=len(open_tasks),
                overdue_tasks=len(overdue_tasks),
                risk_count=len(related_risks),
            )
        )

    return sorted(rows, key=lambda row: (row.overdue_tasks, row.open_tasks), reverse=True)


def workload_rows(tasks: list[dict[str, Any]]) -> list[WorkloadRow]:
    tasks_by_owner: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for task in tasks:
        owner = _owner_name(task)
        tasks_by_owner[owner].append(task)

    rows: list[WorkloadRow] = []
    for owner, items in tasks_by_owner.items():
        completed = [task for task in items if _string(task.get("status")).lower() == "done"]
        open_items = [task for task in items if task not in completed]
        overdue = [task for task in open_items if is_overdue(task.get("dueDate") or task.get("due_date"))]
        focus_score = max(0, 100 - (len(open_items) * 7) - (len(overdue) * 15))
        rows.append(
            WorkloadRow(
                owner=owner,
                total=len(items),
                open_tasks=len(open_items),
                completed_tasks=len(completed),
                overdue_tasks=len(overdue),
                focus_score=focus_score,
            )
        )

    return sorted(rows, key=lambda row: (row.overdue_tasks, row.open_tasks), reverse=True)


def group_by(items: Iterable[dict[str, Any]], *keys: str) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in items:
        value = None
        for key in keys:
            if item.get(key) is not None:
                value = item.get(key)
                break
        grouped[_string(value)].append(item)
    return grouped


def average(values: Iterable[float]) -> float:
    collected = list(values)
    if not collected:
        return 0.0
    return sum(collected) / len(collected)


def is_overdue(value: Any) -> bool:
    parsed = parse_date(value)
    if parsed is None:
        return False
    return parsed.date() < datetime.now(timezone.utc).date()


def parse_date(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    raw = str(value).strip()
    for date_format in DATE_FORMATS:
        try:
            parsed = datetime.strptime(raw, date_format)
            return parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def _owner_name(task: dict[str, Any]) -> str:
    assignee = task.get("assignee")
    if isinstance(assignee, dict):
        return _string(assignee.get("name") or assignee.get("email"), "Unassigned")
    return _string(task.get("assigneeName") or task.get("owner") or task.get("assignee_id"), "Unassigned")


def _client_name(project: dict[str, Any]) -> str:
    client = project.get("client")
    if isinstance(client, dict):
        return _string(client.get("name"), "No client")
    return _string(project.get("clientName") or project.get("client_name"), "No client")


def _list(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    return []


def _mapping(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _number(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value))
    except (TypeError, ValueError):
        return 0.0


def _string(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text or fallback
