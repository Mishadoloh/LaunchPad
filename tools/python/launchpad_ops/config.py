"""Configuration helpers for local LaunchPad operations."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


DEFAULT_API_URL = "http://localhost:4200/api"
DEFAULT_WEB_URL = "http://localhost:5174"
DEFAULT_EXPORT_DIR = "exports"


@dataclass(frozen=True)
class AppConfig:
    """Runtime configuration shared by the command line tools."""

    api_url: str
    web_url: str
    export_dir: Path
    token: str | None = None
    timeout_seconds: float = 15.0

    @property
    def headers(self) -> dict[str, str]:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "LaunchPadOps/1.0",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers


def _clean_url(value: str) -> str:
    return value.strip().rstrip("/")


def _read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, raw_value = stripped.split("=", 1)
        values[key.strip()] = raw_value.strip().strip('"').strip("'")
    return values


def _first_value(keys: Iterable[str], env: dict[str, str], fallback: str) -> str:
    for key in keys:
        value = os.getenv(key) or env.get(key)
        if value:
            return value
    return fallback


def load_config(root: Path | None = None) -> AppConfig:
    """Load configuration from environment variables and local env files."""

    workspace = root or Path.cwd()
    backend_env = _read_env_file(workspace / "backend" / ".env")
    frontend_env = _read_env_file(workspace / "frontend" / ".env.local")
    merged_env = {**backend_env, **frontend_env}

    api_url = _clean_url(
        _first_value(
            ["LAUNCHPAD_API_URL", "VITE_API_URL", "API_URL"],
            merged_env,
            DEFAULT_API_URL,
        )
    )
    web_url = _clean_url(
        _first_value(
            ["LAUNCHPAD_WEB_URL", "WEB_ORIGIN", "VITE_WEB_URL"],
            merged_env,
            DEFAULT_WEB_URL,
        )
    )
    export_dir = Path(
        _first_value(
            ["LAUNCHPAD_EXPORT_DIR", "EXPORT_DIR"],
            merged_env,
            DEFAULT_EXPORT_DIR,
        )
    )
    if not export_dir.is_absolute():
        export_dir = workspace / export_dir

    timeout_raw = os.getenv("LAUNCHPAD_TIMEOUT_SECONDS") or merged_env.get(
        "LAUNCHPAD_TIMEOUT_SECONDS",
        "15",
    )
    try:
        timeout_seconds = max(1.0, float(timeout_raw))
    except ValueError:
        timeout_seconds = 15.0

    return AppConfig(
        api_url=api_url,
        web_url=web_url,
        export_dir=export_dir,
        token=os.getenv("LAUNCHPAD_TOKEN") or merged_env.get("LAUNCHPAD_TOKEN"),
        timeout_seconds=timeout_seconds,
    )
