#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/sprint_prd.sh v1"
  exit 1
fi

SPRINT="$1"
ROOT="$(git rev-parse --show-toplevel)"
DIR="$ROOT/sprints/$SPRINT"

GOAL_FILE="$DIR/00-goal.md"
PRD_FILE="$DIR/01-prd.md"
TASKS_FILE="$DIR/02-tasks.md"
STATUS_FILE="$DIR/03-status.md"

if [[ ! -f "$GOAL_FILE" ]]; then
  echo "Missing $GOAL_FILE"
  exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "Error: 'claude' command not found on PATH."
  exit 1
fi

PROMPT=$(
cat <<'PROMPT'
Read the file sprints/<SPRINT>/00-goal.md.

Return output in EXACTLY this structure, with the markers on their own lines:

---PRD---
<markdown for the PRD>
---TASKS---
<markdown for the tasks checklist>

Rules:
- Do not add any other text before ---PRD--- or after the tasks.
- PRD must include: Overview, Scope, Out of scope, Assumptions, Constraints, Architecture, Adapter interfaces, Acceptance criteria, Risks, Open questions.
- Tasks must be an unchecked checklist. Each task is 5–20 minutes. Include tests early. Include a final docs and walkthrough task.
PROMPT
)

PROMPT="${PROMPT//<SPRINT>/$SPRINT}"

RAW="$(claude -p "$PROMPT")"

PRD_CONTENT="$(printf "%s\n" "$RAW" | awk '
  $0=="---PRD---" {capture=1; next}
  $0=="---TASKS---" {capture=0}
  capture {print}
')"

TASKS_CONTENT="$(printf "%s\n" "$RAW" | awk '
  $0=="---TASKS---" {capture=1; next}
  capture {print}
')"

if [[ -z "${PRD_CONTENT//[[:space:]]/}" ]]; then
  echo "ERROR: PRD content was empty. Claude did not follow the required format."
  exit 1
fi

if [[ -z "${TASKS_CONTENT//[[:space:]]/}" ]]; then
  echo "ERROR: Tasks content was empty. Claude did not follow the required format."
  exit 1
fi

printf "%s\n" "$PRD_CONTENT" > "$PRD_FILE"
printf "%s\n" "$TASKS_CONTENT" > "$TASKS_FILE"

{
  echo
  echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")]"
  echo "Generated PRD (01-prd.md) and tasks (02-tasks.md) for sprint $SPRINT."
  echo "Next: run ./scripts/sprint_dev.sh $SPRINT"
} >> "$STATUS_FILE"

echo "OK: wrote $PRD_FILE"
echo "OK: wrote $TASKS_FILE"
echo "OK: updated $STATUS_FILE"
