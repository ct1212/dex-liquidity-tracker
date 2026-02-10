#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/sprint_dev.sh v1"
  exit 1
fi

SPRINT="$1"
ROOT="$(git rev-parse --show-toplevel)"
DIR="$ROOT/sprints/$SPRINT"
TASKS_FILE="$DIR/02-tasks.md"
STATUS_FILE="$DIR/03-status.md"

if [[ ! -f "$TASKS_FILE" ]]; then
  echo "Missing $TASKS_FILE. Run ./scripts/sprint_prd.sh $SPRINT first."
  exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "Error: 'claude' command not found on PATH."
  exit 1
fi

cd "$ROOT"

# Require clean working tree
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash changes first."
  exit 1
fi

# Find first unchecked task line
NEXT_TASK_LINE="$(grep -nE '^\s*[-*]\s*\[\s\]\s+' "$TASKS_FILE" | head -n 1 || true)"
if [[ -z "$NEXT_TASK_LINE" ]]; then
  echo "No unchecked tasks found in $TASKS_FILE"
  exit 0
fi

LINE_NO="${NEXT_TASK_LINE%%:*}"
TASK_TEXT="$(echo "$NEXT_TASK_LINE" | sed -E 's/^[0-9]+:\s*[-*]\s*\[\s\]\s+//')"

echo "Next task: $TASK_TEXT"

PROMPT=$(
cat <<'PROMPT'
You are working inside a git repository.

Goal:
Implement exactly the next unchecked task from sprints/<SPRINT>/02-tasks.md.

Project defaults for this repo:
Node and TypeScript
ESM modules
Vitest for tests
No global installs
No sudo

Rules:
Implement only one task.
Make the smallest correct change.
Add tests if reasonable for the task.
Update docs only if the task requires it.

Output a unified diff patch only, in this exact format:

---PATCH---
<unified diff here>
---ENDPATCH---

No extra commentary.
PROMPT
)

PROMPT="${PROMPT//<SPRINT>/$SPRINT}"

RAW="$(claude -p "$PROMPT")"

PATCH="$(printf "%s\n" "$RAW" | awk '
  $0=="---PATCH---" {capture=1; next}
  $0=="---ENDPATCH---" {capture=0}
  capture {print}
')"

if [[ -z "${PATCH//[[:space:]]/}" ]]; then
  echo "ERROR: Patch was empty or missing markers."
  exit 1
fi

# Apply patch
printf "%s\n" "$PATCH" | git apply

# Mark the task as done in tasks file
# Replace the first unchecked box on that specific line number
# This is safer than a global replace
TMP_FILE="$(mktemp)"
awk -v line="$LINE_NO" '
  NR==line {sub(/\[\s\]/,"[x]"); print; next}
  {print}
' "$TASKS_FILE" > "$TMP_FILE"
mv "$TMP_FILE" "$TASKS_FILE"

# Update status
{
  echo
  echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")]"
  echo "Completed task: $TASK_TEXT"
  echo "Next: run ./scripts/sprint_dev.sh <SPRINT> again for the next task"
} >> "$STATUS_FILE"

# Try to run checks if present
if [[ -f "package.json" ]]; then
  # Install deps if node_modules missing
  if [[ ! -d "node_modules" ]]; then
    npm install
  fi

  # Run lint if defined
  if npm run | grep -qE '^\s*lint'; then
    npm run lint || true
  fi

  # Run tests if defined
  if npm run | grep -qE '^\s*test'; then
    npm test || true
  fi
fi

git add -A
git commit -m "sprint $SPRINT task: $TASK_TEXT"

echo "OK: committed task"

