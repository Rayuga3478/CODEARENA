# Architecture & Design Decisions

This document records key architectural and design decisions made during development.

## 1. Package Manager: pnpm

**Decision:** Use pnpm workspaces instead of npm workspaces.
**Reason:** Faster installs, strict dependency resolution (prevents phantom dependencies), disk-efficient symlink-based node_modules, and excellent monorepo support.

## 2. ORM: Prisma 7

**Decision:** Use Prisma 7 (stable) instead of Prisma 8 (RC).
**Reason:** Prisma 8 is in Release Candidate as of September 2026 with GA expected October 2026. Prisma 7 is production-stable with 18 months of continued support. The migration path to Prisma 8 exists when needed.

## 3. Submission Status: Polling over WebSockets

**Decision:** Use HTTP polling for submission status updates instead of WebSockets.
**Reason:** Simpler architecture, fewer failure modes, easier to debug. Polling every 1-2 seconds provides near-real-time UX for submission results (which typically complete in 2-10 seconds). WebSockets can be added later if needed.

## 4. Framework: Fastify over Express

**Decision:** Use Fastify v5 as the HTTP framework.
**Reason:** Built-in schema validation, native TypeScript support, structured logging via Pino, faster request handling, and plugin-based architecture that aligns well with modular backend design.

## 5. Judge Isolation: Docker per Submission

**Decision:** Each submission executes inside an ephemeral Docker container.
**Reason:** True process isolation, independent resource limits, no cross-submission contamination, automatic cleanup. Containers are created per job and destroyed after execution.

## 6. Output Checker: Token-Based

**Decision:** Default output comparison uses token-based matching.
**Reason:** Gracefully handles trailing whitespace, trailing newlines, and inconsistent spacing that would incorrectly fail exact-match comparisons. Extensible to EXACT and SPECIAL checkers later.

## 7. Authentication: JWT + HTTP-only Refresh Cookie

**Decision:** Short-lived JWT access tokens (15 min) with HTTP-only cookie refresh tokens (7 days).
**Reason:** Stateless access tokens for API performance, secure refresh mechanism that prevents XSS-based token theft. Refresh tokens are hashed before storage.

## 8. Rating System: ELO-Inspired

**Decision:** Use a simplified ELO-based rating algorithm.
**Reason:** Well-understood, deterministic, easy to verify correctness. The rating service is abstracted so the algorithm can be swapped (e.g., to Glicko-2 or Codeforces-style) without changing the rest of the system.

## 9. Initial Language: C++17 Only

**Decision:** Launch judge with C++17 support only; add Python 3, Java 17, and Node.js incrementally.
**Reason:** C++ is the most complex compilation target. Getting it right first (with proper resource limits, sanitized output, and timeout handling) establishes the judge architecture. Other languages are simpler additions.

## 10. Theme: Dark Mode Default

**Decision:** Default to dark mode with light mode available.
**Reason:** Developer-focused platform; dark mode is the expected default. Theme persisted in localStorage with system-preference fallback.

## 11. Email: Pluggable Provider

**Decision:** Implement email via an abstracted EmailService interface with a console-based dev provider.
**Reason:** Registration verification and password reset require email, but local development should not depend on SMTP configuration. The DevEmailService logs emails to console. Production swaps in a real SMTP provider.

## 12. ID Strategy: UUIDs

**Decision:** Use UUID v4 for all primary keys.
**Reason:** Globally unique, no information leakage about record counts, safe for distributed systems, built-in Prisma support via `@default(uuid())`.

## 13. Prisma 7 Breaking Changes

**Decision:** Use `prisma.config.ts` at project root with `defineConfig()` + `env()` helper for database URL. Use `@prisma/adapter-pg` driver adapter with `pg.Pool` for PrismaClient instantiation. Generator provider changed from `prisma-client-js` to `prisma-client` with explicit output directory.
**Reason:** Prisma 7 removed the `url` field from `datasource` blocks in schema.prisma. The `prisma-client-js` generator was renamed to `prisma-client`. Driver adapters are now mandatory for all PrismaClient connections.

## 14. Development Services: Native Windows

**Decision:** Use native Windows installations of PostgreSQL and Redis for local development instead of Docker containers when Docker/WSL2/virtualization is unavailable.
**Reason:** Docker Desktop on Windows requires WSL2 which requires hardware virtualization (enabled in BIOS). When this is unavailable, native installations of PostgreSQL (via winget) and Redis (via winget) provide the same functionality for application development. Docker containers remain the required approach for judge sandbox isolation.
