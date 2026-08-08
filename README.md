# Orbit — Life OS

Геймифицированная личная система управления жизнью. Один пользователь, два измерения
прогресса: GPP (прогресс целей) и XP (уровень).

## Стек

- **Backend** — Go, chi + pgx + JWT, миграции golang-migrate, доменные события,
  дневной расчёт (штрафы за пропуски привычек и неактивность).
- **Frontend** — React + Vite + TypeScript + Tailwind + shadcn/ui + recharts,
  русский интерфейс, светлая/тёмная тема.
- **DB** — PostgreSQL 16.

Архитектурные решения: `docs/architecture.md` + `docs/adr/`.

## Запуск через Docker

```bash
docker compose up --build -d
```

- Web UI: http://localhost:8081
- API: http://localhost:8080 (swagger: http://localhost:8080/swagger)
- Postgres: localhost:5432 (orbit / orbit / orbit)

Первый запуск: `docker compose up` применит миграции автоматически. Затем открой
http://localhost:8081 и введи любое имя — аккаунт создастся автоматически при первом
входе (вход по тому же имени).

Конфигурация игры — через env в `docker-compose.yml` (`GAME_TIMEZONE`,
`GAME_DAILY_HABIT_CAP`, `GAME_MISSED_TWICE_PENALTY_XP`, `GAME_INACTIVITY_PENALTY_XP`).

## Локальная разработка

```bash
make run        # backend :8080 (нужна БД, см. docker-compose для параметров)
cd web && npm install && npm run dev   # frontend :5173, прокси /api -> :8080
```

## Makefile

`make migrate-up` / `make migrate-down` — миграции; `make swagger` — регенерация
спеки; `make test` / `make lint` — проверки.
