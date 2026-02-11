#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/sprint_new.sh <name> \"goal description\""
  echo ""
  echo "Examples:"
  echo "  scripts/sprint_new.sh v1 \"Build a REST API for user management\""
  echo "  scripts/sprint_new.sh auth \"Add OAuth2 login with Google and GitHub\""
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
# Goal

$GOAL

# Stack

- Node.js / TypeScript (ESM)
- Vitest for testing
- ESLint + Prettier for linting/formatting

# Constraints

- Keep scope small.
- Prefer local installs only.
- No global installs.
- No sudo.

# Done when

- List concrete acceptance criteria here.
EOG

# Create placeholder files so the directory structure is complete
if [[ ! -f "$DIR/01-prd.md" ]]; then
  cat > "$DIR/01-prd.md" <<EOF
# PRD — Sprint $SPRINT

_Run \`./scripts/sprint_prd.sh $SPRINT\` to generate._
EOF
fi

if [[ ! -f "$DIR/02-tasks.md" ]]; then
  cat > "$DIR/02-tasks.md" <<EOF
# Tasks — Sprint $SPRINT

_Run \`./scripts/sprint_prd.sh $SPRINT\` to generate._
EOF
fi

touch "$DIR/03-status.md"

echo "Created sprint $SPRINT at sprints/$SPRINT/"
echo ""
echo "Next steps:"
echo "  1. Edit sprints/$SPRINT/00-goal.md (refine goal, stack, constraints, acceptance criteria)"
echo "  2. Run ./scripts/sprint_prd.sh $SPRINT"
