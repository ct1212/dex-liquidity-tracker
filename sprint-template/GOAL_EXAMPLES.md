# Goal File Examples

Use these as inspiration when writing your `00-goal.md` files. The more specific your goal, the better the generated PRD and tasks will be.

---

## Example 1: Simple API

```markdown
# Goal

Build a REST API for a todo list app with CRUD operations and SQLite persistence.

# Stack

- Node.js / TypeScript (ESM)
- Vitest for testing
- ESLint + Prettier for linting/formatting
- Express for HTTP server
- better-sqlite3 for database

# Constraints

- Keep scope small.
- Prefer local installs only.
- No global installs.
- No sudo.
- No ORM — use raw SQL with better-sqlite3.

# Done when

- API serves on localhost:3000.
- POST /todos creates a todo (title, completed).
- GET /todos returns all todos.
- GET /todos/:id returns one todo.
- PATCH /todos/:id updates a todo.
- DELETE /todos/:id deletes a todo.
- Data persists in a local SQLite file.
- Tests cover all CRUD operations.
- Lint passes.
```

---

## Example 2: CLI Tool

```markdown
# Goal

Build a CLI tool that converts CSV files to JSON, with options for filtering columns and rows.

# Stack

- Node.js / TypeScript (ESM)
- Vitest for testing
- ESLint + Prettier for linting/formatting
- Commander.js for CLI argument parsing

# Constraints

- Keep scope small.
- Prefer local installs only.
- No global installs.
- No sudo.
- Support stdin piping (cat file.csv | csvtool).

# Done when

- `npx csvtool input.csv` outputs JSON to stdout.
- `--columns name,age` flag filters to specific columns.
- `--where "age>30"` flag filters rows.
- `--pretty` flag outputs formatted JSON.
- Works with stdin piping.
- Handles malformed CSV gracefully with error messages.
- Tests cover normal and edge cases.
```

---

## Example 3: React Dashboard

```markdown
# Goal

Build a project dashboard that displays GitHub repository stats (stars, forks, issues, PRs) using the GitHub API.

# Stack

- Node.js / TypeScript (ESM)
- Vitest for testing
- ESLint + Prettier for linting/formatting
- React + Vite for the frontend
- Recharts for charts
- Express for API proxy (avoids CORS)

# Constraints

- Keep scope small.
- Prefer local installs only.
- No global installs.
- No sudo.
- GitHub API token configured via GITHUB_TOKEN env var.
- Include mock data fallback when no token is set.

# Done when

- Dashboard loads on localhost:5173.
- User can enter a GitHub org/repo name.
- Dashboard shows: stars over time, fork count, open issues, recent PRs.
- At least one chart (stars over time).
- Demo mode works without a GitHub token.
- Banner shows when running in demo mode.
- Tests pass for data fetching and transformation logic.
```

---

## Example 4: Python Project

```markdown
# Goal

Build a web scraper that extracts product prices from e-commerce sites and saves results to CSV.

# Stack

- Python 3.11+
- pytest for testing
- ruff for linting/formatting
- httpx for HTTP requests
- beautifulsoup4 for HTML parsing

# Constraints

- Keep scope small.
- Use venv for virtual environment.
- No global installs.
- No sudo.
- Respect robots.txt.
- Rate limit requests (1 per second).

# Done when

- `python scraper.py --url <url> --selector <css>` extracts prices.
- Results saved to output.csv with columns: product, price, url, timestamp.
- Handles pagination if --pages flag is set.
- Graceful error handling for network failures and missing elements.
- Tests use mocked HTTP responses (no real network calls in tests).
- Lint passes with ruff.
```

---

## Tips for Writing Good Goals

1. **Be specific about the output** — What should the user see/experience when it's done?
2. **List acceptance criteria** — Each one becomes a testable outcome.
3. **Specify the stack** — Don't leave tool choices ambiguous.
4. **Set constraints** — What should it NOT do? This prevents scope creep.
5. **Keep it focused** — One sprint = one feature area. Split large projects into multiple sprints.
