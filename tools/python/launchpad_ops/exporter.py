"""Export LaunchPad API data to JSON and CSV files."""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from .analytics import build_summary
from .client import LaunchPadClient
from .config import AppConfig


@dataclass(frozen=True)
class ExportResult:
    export_dir: Path
    files: list[Path]


class WorkspaceExporter:
    """Collects API data and writes review-friendly export files."""

    def __init__(self, client: LaunchPadClient, config: AppConfig) -> None:
        self.client = client
        self.config = config

    def run(self) -> ExportResult:
        self.config.export_dir.mkdir(parents=True, exist_ok=True)
        data = self.collect()
        summary = build_summary(data)

        files = [
            self.write_json("workspace.json", data),
            self.write_json("summary.json", summary),
            self.write_csv("projects.csv", flatten_projects(data.get("projects", []))),
            self.write_csv("tasks.csv", flatten_tasks(data.get("tasks", []))),
            self.write_csv("workload.csv", summary.get("workload", [])),
            self.write_csv("project-health.csv", summary.get("projects", [])),
        ]
        return ExportResult(export_dir=self.config.export_dir, files=files)

    def collect(self) -> dict[str, Any]:
        operations = self.client.operations()
        return {
            "dashboard": self.client.dashboard(),
            "projects": self.client.projects(),
            "tasks": self.client.tasks(),
            "team": self.client.team(),
            "operations": operations,
        }

    def write_json(self, name: str, payload: Any) -> Path:
        path = self.config.export_dir / name
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )
        return path

    def write_csv(self, name: str, rows: Iterable[dict[str, Any]]) -> Path:
        path = self.config.export_dir / name
        collected = list(rows)
        headers = ordered_headers(collected)
        with path.open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=headers, extrasaction="ignore")
            writer.writeheader()
            for row in collected:
                writer.writerow(row)
        return path


def flatten_projects(projects: Any) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for project in _items(projects):
        client = project.get("client")
        rows.append(
            {
                "id": project.get("id"),
                "name": project.get("name"),
                "client": client.get("name") if isinstance(client, dict) else project.get("clientName"),
                "status": project.get("status"),
                "health": project.get("health"),
                "progress": project.get("progress"),
                "budget": project.get("budget"),
                "startsAt": project.get("startsAt") or project.get("starts_at"),
                "endsAt": project.get("endsAt") or project.get("ends_at"),
            }
        )
    return rows


def flatten_tasks(tasks: Any) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for task in _items(tasks):
        project = task.get("project")
        assignee = task.get("assignee")
        rows.append(
            {
                "id": task.get("id"),
                "title": task.get("title"),
                "status": task.get("status"),
                "priority": task.get("priority"),
                "project": project.get("name") if isinstance(project, dict) else task.get("projectName"),
                "assignee": assignee.get("name") if isinstance(assignee, dict) else task.get("assigneeName"),
                "dueDate": task.get("dueDate") or task.get("due_date"),
                "estimateHours": task.get("estimateHours") or task.get("estimate_hours"),
                "createdAt": task.get("createdAt") or task.get("created_at"),
            }
        )
    return rows


def ordered_headers(rows: list[dict[str, Any]]) -> list[str]:
    if not rows:
        return ["empty"]
    priority = [
        "id",
        "name",
        "title",
        "client",
        "project",
        "assignee",
        "status",
        "priority",
        "health",
        "progress",
        "open_tasks",
        "overdue_tasks",
        "focus_score",
    ]
    seen: set[str] = set()
    headers: list[str] = []
    for key in priority:
        if any(key in row for row in rows):
            headers.append(key)
            seen.add(key)
    for row in rows:
        for key in row:
            if key not in seen:
                headers.append(key)
                seen.add(key)
    return headers


def _items(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    return []
