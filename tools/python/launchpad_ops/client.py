"""Small HTTP client used by LaunchPad operational scripts."""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any

from .config import AppConfig


class ApiError(RuntimeError):
    """Raised when the API returns an unsuccessful response."""

    def __init__(self, status: int, message: str, payload: Any | None = None) -> None:
        super().__init__(f"API request failed with status {status}: {message}")
        self.status = status
        self.payload = payload


@dataclass(frozen=True)
class ApiResponse:
    status: int
    payload: Any
    headers: dict[str, str]


class LaunchPadClient:
    """Minimal dependency-free client for the LaunchPad API."""

    def __init__(self, config: AppConfig) -> None:
        self.config = config

    def get(self, path: str, query: dict[str, str] | None = None) -> ApiResponse:
        return self._request("GET", path, query=query)

    def post(self, path: str, body: dict[str, Any]) -> ApiResponse:
        return self._request("POST", path, body=body)

    def patch(self, path: str, body: dict[str, Any]) -> ApiResponse:
        return self._request("PATCH", path, body=body)

    def login(self, email: str, password: str) -> str:
        response = self.post("/auth/login", {"email": email, "password": password})
        token = response.payload.get("token") if isinstance(response.payload, dict) else None
        if not token:
            raise ApiError(response.status, "login response did not include a token", response.payload)
        return str(token)

    def health(self) -> dict[str, Any]:
        response = self.get("/health")
        if isinstance(response.payload, dict):
            return response.payload
        return {"status": "unknown", "payload": response.payload}

    def dashboard(self) -> dict[str, Any]:
        response = self.get("/dashboard")
        return _as_mapping(response.payload)

    def projects(self) -> list[dict[str, Any]]:
        response = self.get("/projects")
        return _as_list(response.payload)

    def tasks(self) -> list[dict[str, Any]]:
        response = self.get("/tasks")
        return _as_list(response.payload)

    def team(self) -> list[dict[str, Any]]:
        response = self.get("/team")
        return _as_list(response.payload)

    def operations(self) -> dict[str, Any]:
        response = self.get("/operations")
        return _as_mapping(response.payload)

    def _request(
        self,
        method: str,
        path: str,
        *,
        body: dict[str, Any] | None = None,
        query: dict[str, str] | None = None,
    ) -> ApiResponse:
        url = self._url(path, query)
        payload = json.dumps(body).encode("utf-8") if body is not None else None
        request = urllib.request.Request(
            url=url,
            data=payload,
            headers=self.config.headers,
            method=method,
        )

        try:
            with urllib.request.urlopen(request, timeout=self.config.timeout_seconds) as response:
                raw = response.read().decode("utf-8")
                parsed = json.loads(raw) if raw else None
                return ApiResponse(
                    status=response.status,
                    payload=parsed,
                    headers=dict(response.headers.items()),
                )
        except urllib.error.HTTPError as exc:
            raw_error = exc.read().decode("utf-8", errors="replace")
            parsed_error: Any
            try:
                parsed_error = json.loads(raw_error) if raw_error else None
            except json.JSONDecodeError:
                parsed_error = raw_error
            message = _extract_message(parsed_error) or exc.reason
            raise ApiError(exc.code, str(message), parsed_error) from exc
        except urllib.error.URLError as exc:
            raise ApiError(0, str(exc.reason)) from exc

    def _url(self, path: str, query: dict[str, str] | None = None) -> str:
        clean_path = path if path.startswith("/") else f"/{path}"
        url = f"{self.config.api_url}{clean_path}"
        if not query:
            return url
        return f"{url}?{urllib.parse.urlencode(query)}"


def _as_list(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        for key in ("data", "items", "tasks", "projects", "team"):
            value = payload.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
    return []


def _as_mapping(payload: Any) -> dict[str, Any]:
    return payload if isinstance(payload, dict) else {}


def _extract_message(payload: Any) -> str | None:
    if isinstance(payload, dict):
        for key in ("message", "error", "detail"):
            value = payload.get(key)
            if value:
                return str(value)
    if isinstance(payload, str) and payload.strip():
        return payload
    return None
