"""Deployment and local environment checks for LaunchPad."""

from __future__ import annotations

import socket
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Iterable

from .config import AppConfig


@dataclass(frozen=True)
class CheckResult:
    name: str
    ok: bool
    detail: str
    elapsed_ms: int = 0


def run_checks(config: AppConfig) -> list[CheckResult]:
    checks = [
        check_http("API health", f"{config.api_url}/health", config.timeout_seconds),
        check_http("Frontend", config.web_url, config.timeout_seconds),
        check_tcp("API port", _host(config.api_url), _port(config.api_url, 4200), config.timeout_seconds),
        check_tcp("Frontend port", _host(config.web_url), _port(config.web_url, 5174), config.timeout_seconds),
    ]
    return checks


def check_http(name: str, url: str, timeout_seconds: float) -> CheckResult:
    started = time.perf_counter()
    try:
        request = urllib.request.Request(url=url, headers={"User-Agent": "LaunchPadOps/1.0"})
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            elapsed = int((time.perf_counter() - started) * 1000)
            ok = 200 <= response.status < 400
            return CheckResult(name, ok, f"HTTP {response.status}", elapsed)
    except urllib.error.HTTPError as exc:
        elapsed = int((time.perf_counter() - started) * 1000)
        return CheckResult(name, False, f"HTTP {exc.code}", elapsed)
    except urllib.error.URLError as exc:
        elapsed = int((time.perf_counter() - started) * 1000)
        return CheckResult(name, False, str(exc.reason), elapsed)


def check_tcp(name: str, host: str, port: int, timeout_seconds: float) -> CheckResult:
    started = time.perf_counter()
    try:
        with socket.create_connection((host, port), timeout=timeout_seconds):
            elapsed = int((time.perf_counter() - started) * 1000)
            return CheckResult(name, True, f"{host}:{port} is reachable", elapsed)
    except OSError as exc:
        elapsed = int((time.perf_counter() - started) * 1000)
        return CheckResult(name, False, str(exc), elapsed)


def format_results(results: Iterable[CheckResult]) -> str:
    lines = []
    for result in results:
        status = "PASS" if result.ok else "FAIL"
        lines.append(f"{status:4} {result.name:16} {result.elapsed_ms:5}ms  {result.detail}")
    return "\n".join(lines)


def _host(url: str) -> str:
    without_scheme = url.split("://", 1)[-1]
    host_port = without_scheme.split("/", 1)[0]
    return host_port.split(":", 1)[0] or "localhost"


def _port(url: str, fallback: int) -> int:
    without_scheme = url.split("://", 1)[-1]
    host_port = without_scheme.split("/", 1)[0]
    if ":" not in host_port:
        return 443 if url.startswith("https://") else fallback
    try:
        return int(host_port.rsplit(":", 1)[1])
    except ValueError:
        return fallback
