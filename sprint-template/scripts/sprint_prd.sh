#!/usr/bin/env bash
set -euo pipefail

# Defaults
MODEL="sonnet"
MAX_BUDGET="2.00"

# Parse arguments
SPRINT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --model)
      MODEL="$2"
      shift 2
      ;;
    --max-budget-usd)
      MAX_BUDGET="$2"
      shift 2
      ;;
    -*)
      echo "Unknown flag: $1"
      exit 1
      ;;
    *)
      SPRINT="$1"
      shift
      ;;
  esac
done

if [[ -z "$SPRINT" ]]; then
  echo "Usage: scripts/sprint_prd.sh <sprint> [--model sonnet] [--max-budget-usd 2.00]"
  exit 1
fi

ROOT="$(git rev-parse --show-toplevel)"
DIR="$ROOT/sprints/$SPRINT"

GOAL_FILE="$DIR/00-goal.md"
PRD_FILE="$DIR/01-prd.md"
TASKS_FILE="$DIR/02-tasks.md"
STATUS_FILE="$DIR/03-status.md"

if [[ ! -f "$GOAL_FILE" ]]; then
  echo "Missing $GOAL_FILE — run ./scripts/sprint_new.sh $SPRINT first."
  exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "Error: 'claude' command not found on PATH."
  echo "Install it: https://docs.anthropic.com/en/docs/claude-code"
  exit 1
fi

GOAL_CONTENT="$(cat "$GOAL_FILE")"

PROMPT="$(cat <<PROMPT
Here is the goal file for sprint $SPRINT:

---GOAL---
$GOAL_CONTENT
---ENDGOAL---

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
)"

echo "Generating PRD and tasks for sprint $SPRINT (model: $MODEL, budget: \$$MAX_BUDGET)..."

RAW="$(claude -p \
  --model "$MODEL" \
  --max-turns 2 \
  --dangerously-skip-permissions \
  --max-budget-usd "$MAX_BUDGET" \
  "$PROMPT")"

# Robust marker parsing: trim leading/trailing whitespace before matching
PRD_CONTENT="$(printf "%s\n" "$RAW" | awk '
  { trimmed = $0; gsub(/^[[:space:]]+|[[:space:]]+$/, "", trimmed) }
  trimmed == "---PRD---" { capture=1; next }
  trimmed == "---TASKS---" { capture=0 }
  capture { print }
')"

TASKS_CONTENT="$(printf "%s\n" "$RAW" | awk '
  { trimmed = $0; gsub(/^[[:space:]]+|[[:space:]]+$/, "", trimmed) }
  trimmed == "---TASKS---" { capture=1; next }
  capture { print }
')"

if [[ -z "${PRD_CONTENT//[[:space:]]/}" ]]; then
  echo "ERROR: PRD content was empty. Claude did not follow the required format."
  echo "--- Raw output (first 20 lines) ---"
  printf "%s\n" "$RAW" | head -20
  exit 1
fi

if [[ -z "${TASKS_CONTENT//[[:space:]]/}" ]]; then
  echo "ERROR: Tasks content was empty. Claude did not follow the required format."
  echo "--- Raw output (first 20 lines) ---"
  printf "%s\n" "$RAW" | head -20
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
