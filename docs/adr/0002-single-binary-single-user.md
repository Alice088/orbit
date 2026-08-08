# ADR-0002: Single binary, single user

Status: Accepted

## Decision

The system ships as one binary and one process. It serves exactly one user
(the owner). All tables carry user_id NOT NULL and FK. Roles are not used;
JWT auth is kept for remote (non-localhost) access.

## Rationale

A personal tool for one person gains nothing from microservices, multi-tenancy
or roles. user_id columns cost one migration now and make a future multi-user
migration cheap.

## Consequences

- No network boundaries between engines; module boundaries are Go packages.
- Engine packages never import repository or handler packages.
- Single owner account; registration flow is not implemented.
