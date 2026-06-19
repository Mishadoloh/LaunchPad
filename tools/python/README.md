# LaunchPad Ops Tools

This folder contains dependency-free Python utilities for day-to-day project operations.

## Commands

```bash
python -m launchpad_ops.cli health
python -m launchpad_ops.cli login admin@launchpad.dev launchpad123
python -m launchpad_ops.cli export --token "$LAUNCHPAD_TOKEN"
python -m launchpad_ops.cli summary --token "$LAUNCHPAD_TOKEN"
```

The tools read local environment files when they exist and can also be configured with:

```text
LAUNCHPAD_API_URL
LAUNCHPAD_WEB_URL
LAUNCHPAD_TOKEN
LAUNCHPAD_EXPORT_DIR
LAUNCHPAD_TIMEOUT_SECONDS
```
