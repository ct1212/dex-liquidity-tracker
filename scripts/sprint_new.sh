#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/sprint_new.sh v1 \"goal text\""
  exit 1
fi

SPRINT="$1"
GOAL="${2:-}"

ROOT="$(git rev-parse --show-toplevel)"
DIR="$ROOT/sprints/$SPRINT"

mkdir -p "$DIR"

if [[ -z "$GOAL" ]]; then
  GOAL="Describe the goal here in plain English."
fi

cat > "$DIR/00-goal.md" <<EOG
Goal

$GOAL

Constraints

Keep scope small.
Prefer local installs only.
No global installs.
No sudo.

Done when

List concrete acceptance criteria here.
EOG

touch "$DIR/03-status.md"

echo "Created sprint $SPRINT"
echo "Next: review sprints/$SPRINT/00-goal.md"
