#!/usr/bin/env bash
set -euo pipefail

# Defaults
MODEL="sonnet"
MAX_BUDGET="5.00"
LOOP=false
DRY_RUN=false

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
    --loop)
      LOOP=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
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
  echo "Usage: scripts/sprint_dev.sh <sprint> [--loop] [--dry-run] [--model sonnet] [--max-budget-usd 5.00]"
  exit 1
fi

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
  echo "Install it: https://docs.anthropic.com/en/docs/claude-code"
  exit 1
fi

cd "$ROOT"

run_one_task() {
  # Require clean working tree (skip for dry-run)
  if [[ "$DRY_RUN" != true && -n "$(git status --porcelain)" ]]; then
    echo "Working tree is not clean. Commit or stash changes first."
    return 1
  fi

  # Find first unchecked task line
  local NEXT_TASK_LINE
  NEXT_TASK_LINE="$(grep -nE '^\s*[-*]\s*\[\s\]\s+' "$TASKS_FILE" | head -n 1 || true)"
  if [[ -z "$NEXT_TASK_LINE" ]]; then
    echo "No unchecked tasks found in $TASKS_FILE"
    return 2
  fi

  local LINE_NO="${NEXT_TASK_LINE%%:*}"
  local TASK_TEXT
  TASK_TEXT="$(echo "$NEXT_TASK_LINE" | sed -E 's/^[0-9]+:\s*[-*]\s*\[\s\]\s+//')"

  echo "=== Task: $TASK_TEXT ==="

  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] Would execute task on line $LINE_NO: $TASK_TEXT"
    return 2  # signal stop (no more work to do in dry-run)
  fi

  # Build context: task list + package.json
  local TASKS_CONTENT
  TASKS_CONTENT="$(cat "$TASKS_FILE")"
  local PKG_CONTENT=""
  if [[ -f "$ROOT/package.json" ]]; then
    PKG_CONTENT="$(cat "$ROOT/package.json")"
  fi

  local PROMPT
  PROMPT="$(cat <<ENDPROMPT
You are working inside a git repository at $ROOT.

## Your task

Implement exactly this task:
$TASK_TEXT

## Full task list (for context)

$TASKS_CONTENT

## package.json

$PKG_CONTENT

## Rules

- Implement only the single task above.
- Make the smallest correct change.
- Add tests if reasonable for the task.
- Update docs only if the task requires it.
- Run \`npm test\` and \`npm run lint\` when done to verify your changes pass.
- Do NOT commit. The calling script handles commits.

Project defaults:
- Node.js and TypeScript (ESM modules)
- Vitest for tests
- ESLint + Prettier for linting
- No global installs, no sudo
ENDPROMPT
)"

  # Let Claude directly edit files using its built-in tools
  echo "Running Claude (model: $MODEL, budget: \$$MAX_BUDGET)..."
  printf "%s" "$PROMPT" | claude -p \
    --model "$MODEL" \
    --dangerously-skip-permissions \
    --max-budget-usd "$MAX_BUDGET" \
    --allowedTools "Read" "Write" "Edit" "Glob" "Grep" "Bash(npm:*)" "Bash(npx:*)" || {
      echo "ERROR: Claude exited with non-zero status."
      git checkout .
      return 1
    }

  # Check if any files were actually changed
  local CHANGED_FILES
  CHANGED_FILES="$(git diff --name-only)"
  local UNTRACKED_FILES
  UNTRACKED_FILES="$(git ls-files --others --exclude-standard)"

  if [[ -z "$CHANGED_FILES" && -z "$UNTRACKED_FILES" ]]; then
    echo "WARNING: No files were changed. Skipping commit."
    return 1
  fi

  # Install deps if node_modules missing
  if [[ -f "package.json" && ! -d "node_modules" ]]; then
    npm install
  fi

  # Run lint — fail and revert on error
  if [[ -f "package.json" ]] && npm run 2>/dev/null | grep -qE '^\s*lint'; then
    echo "Running lint..."
    if ! npm run lint; then
      echo "ERROR: Lint failed. Reverting changes."
      git checkout .
      if [[ -n "$UNTRACKED_FILES" ]]; then
        echo "$UNTRACKED_FILES" | xargs rm -f
      fi
      {
        echo
        echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")]"
        echo "FAILED task (lint): $TASK_TEXT"
      } >> "$STATUS_FILE"
      return 1
    fi
  fi

  # Run tests — fail and revert on error
  if [[ -f "package.json" ]] && npm run 2>/dev/null | grep -qE '^\s*test'; then
    echo "Running tests..."
    if ! npm test; then
      echo "ERROR: Tests failed. Reverting changes."
      git checkout .
      if [[ -n "$UNTRACKED_FILES" ]]; then
        echo "$UNTRACKED_FILES" | xargs rm -f
      fi
      {
        echo
        echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")]"
        echo "FAILED task (tests): $TASK_TEXT"
      } >> "$STATUS_FILE"
      return 1
    fi
  fi

  # Mark the task as done in tasks file
  local TMP_FILE
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
    echo "Next: run ./scripts/sprint_dev.sh $SPRINT again for the next task"
  } >> "$STATUS_FILE"

  # Stage only changed and new files (not git add -A)
  if [[ -n "$CHANGED_FILES" ]]; then
    echo "$CHANGED_FILES" | xargs git add
  fi
  if [[ -n "$UNTRACKED_FILES" ]]; then
    echo "$UNTRACKED_FILES" | xargs git add
  fi
  # Always stage the tasks file and status file (they were updated above)
  git add "$TASKS_FILE" "$STATUS_FILE"

  git commit -m "sprint $SPRINT task: $TASK_TEXT"
  echo "OK: committed task"
  return 0
}

# Main execution
if [[ "$LOOP" == true ]]; then
  echo "Loop mode: processing all remaining tasks for sprint $SPRINT"
  while true; do
    rc=0
    run_one_task || rc=$?
    if [[ $rc -eq 2 ]]; then
      # No more tasks (or dry-run)
      break
    elif [[ $rc -ne 0 ]]; then
      echo "Task failed. Stopping loop."
      exit 1
    fi
    echo ""
    echo "--- Moving to next task ---"
    echo ""
  done
  echo "All tasks processed."
else
  rc=0
  run_one_task || rc=$?
  if [[ $rc -eq 2 ]]; then
    exit 0  # no tasks found is not an error
  elif [[ $rc -ne 0 ]]; then
    exit 1
  fi
fi
