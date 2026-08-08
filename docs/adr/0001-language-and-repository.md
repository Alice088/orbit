# ADR-0001: Language and repository

Status: Accepted

## Decision

The project is written in Go, reusing the existing scaffold at
/home/fworld/orbit (chi, pgx, JWT, swagger, Makefile, docker-compose,
golang-migrate). The module is renamed from go-template to orbit.

## Rationale

The scaffold already provides HTTP server, Postgres pool, auth, migrations and
CI wiring. The only missing part is the domain. Go is the language of the
existing ecosystem (all background projects are Go).

## Consequences

- Zero infrastructure setup; domain work starts immediately.
- All future UI work (v2) talks to the same binary via REST.
