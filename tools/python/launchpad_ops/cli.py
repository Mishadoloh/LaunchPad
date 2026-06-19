"""Command line interface for LaunchPad operational tooling."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Sequence

from .analytics import build_summary
from .client import ApiError, LaunchPadClient
from .config import AppConfig, load_config
from .exporter import WorkspaceExporter
from .health import format_results, run_checks


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    config = load_config(Path(args.root).resolve() if args.root else None)

    if args.api_url:
        config = _replace(config, api_url=args.api_url.rstrip("/"))
    if args.web_url:
        config = _replace(config, web_url=args.web_url.rstrip("/"))
    if args.export_dir:
        config = _replace(config, export_dir=Path(args.export_dir).resolve())
    if args.token:
        config = _replace(config, token=args.token)

    try:
        if args.command == "health":
            return command_health(config)
        if args.command == "export":
            return command_export(config)
        if args.command == "summary":
            return command_summary(config)
        if args.command == "login":
            return command_login(config, args.email, args.password)
    except ApiError as exc:
        print(str(exc), file=sys.stderr)
        if exc.payload is not None:
            print(json.dumps(exc.payload, indent=2, ensure_ascii=False), file=sys.stderr)
        return 1

    parser.print_help()
    return 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="launchpad-ops",
        description="Operational tools for LaunchPad exports, reports, and deployment checks.",
    )
    parser.add_argument("--root", help="Workspace root. Defaults to the current directory.")
    parser.add_argument("--api-url", help="Override the API base URL.")
    parser.add_argument("--web-url", help="Override the frontend URL.")
    parser.add_argument("--export-dir", help="Directory for generated export files.")
    parser.add_argument("--token", help="Bearer token for protected API routes.")

    subparsers = parser.add_subparsers(dest="command")
    subparsers.add_parser("health", help="Check local API and frontend availability.")
    subparsers.add_parser("export", help="Export workspace data to JSON and CSV.")
    subparsers.add_parser("summary", help="Print a dashboard summary as JSON.")

    login_parser = subparsers.add_parser("login", help="Request a JWT token from the API.")
    login_parser.add_argument("email")
    login_parser.add_argument("password")
    return parser


def command_health(config: AppConfig) -> int:
    results = run_checks(config)
    print(format_results(results))
    return 0 if all(result.ok for result in results) else 1


def command_export(config: AppConfig) -> int:
    exporter = WorkspaceExporter(LaunchPadClient(config), config)
    result = exporter.run()
    print(f"Exported {len(result.files)} files to {result.export_dir}")
    for file in result.files:
        print(f"- {file}")
    return 0


def command_summary(config: AppConfig) -> int:
    client = LaunchPadClient(config)
    data = {
        "dashboard": client.dashboard(),
        "projects": client.projects(),
        "tasks": client.tasks(),
        "team": client.team(),
        "operations": client.operations(),
    }
    print(json.dumps(build_summary(data), indent=2, ensure_ascii=False))
    return 0


def command_login(config: AppConfig, email: str, password: str) -> int:
    token = LaunchPadClient(config).login(email, password)
    print(token)
    return 0


def _replace(config: AppConfig, **changes: object) -> AppConfig:
    data = {
        "api_url": config.api_url,
        "web_url": config.web_url,
        "export_dir": config.export_dir,
        "token": config.token,
        "timeout_seconds": config.timeout_seconds,
    }
    data.update(changes)
    return AppConfig(**data)


if __name__ == "__main__":
    raise SystemExit(main())
