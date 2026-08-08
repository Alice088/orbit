# Orbit

A gamified personal life OS. Single-user, two progress dimensions: **GPP** (goal progress point) and **XP** (level). Track goals, habits, and tasks; earn points; watch your kitty rank grow from Beginner Kitty to Orbit Legend.

## Quick Start

```bash
docker compose up --build -d
```

- Web UI: http://localhost:8081
- API: http://localhost:8080 (swagger: http://localhost:8080/swagger)
- Postgres: localhost:5432 (orbit / orbit / orbit)

Migrations run automatically on first boot. Open the UI, type any name — the account is created on first login (login by the same name).

## How It Works

The system turns your life into a game:

- **Goals** — strategic directions. Each has a GPP budget; completing activities and tasks earns GPP toward the goal.
- **Tasks & Habits** — the daily grind. Habits have a daily cap and recurring check-ins.
- **XP & Levels** — experience for everything you do. 12 kitty ranks from Beginner Kitty to Orbit Legend.
- **Activity** — a feed of everything that happens, feeding the analytics and dashboard.
- A daily routine recalculates state: missed habits and inactivity cost XP penalties.

## Tech Stack

- **Backend** — Go, chi + pgx + JWT, golang-migrate, domain events, daily background job.
- **Frontend** — React + Vite + TypeScript + Tailwind + shadcn/ui + recharts. Russian UI, light/dark theme.
- **DB** — PostgreSQL 16.

Architecture decisions: `docs/architecture.md` + `docs/adr/`.

## Configuration

Game rules are set via env in `docker-compose.yml`: `GAME_TIMEZONE`, `GAME_DAILY_HABIT_CAP`, `GAME_MISSED_TWICE_PENALTY_XP`, `GAME_INACTIVITY_PENALTY_XP`.

## Local Development

```bash
make run        # backend on :8080 (needs a DB, see docker-compose for params)
cd web && npm install && npm run dev   # frontend on :5173, proxies /api -> :8080
```

`make migrate-up` / `make migrate-down` — migrations; `make swagger` — regenerate the spec; `make test` / `make lint` — checks.
