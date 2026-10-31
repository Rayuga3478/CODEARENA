

```markdown
# CODEARENA

CODEARENA is a full-stack competitive programming platform with a Windows 95-inspired interface. It includes a problem library, an in-browser code editor, submissions, contests, discussions, user profiles, and rankings.

## Features

- Browse programming problems by difficulty and topic
- Write and run code in an editor powered by Monaco
- Submit solutions and view their judging results
- Participate in contests
- Discuss problems with other users
- View profiles, submission history, and rankings
- Use dark or light themes
- Authenticate with access tokens and refresh cookies
- Run submissions through a Redis-backed judging worker

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **API:** Fastify, TypeScript
- **Database:** PostgreSQL with Prisma
- **Queue:** Redis
- **Monorepo:** pnpm workspaces
- **Code editor:** Monaco Editor

C++17 and Python 3 are currently enabled for submissions. Java 17 and Node.js are listed in the language configuration but are not yet enabled.

## Project structure

```text
apps/
  api/          Fastify API
  judge-worker/ Submission and code execution worker
  web/          React frontend
packages/
  shared/       Shared types and language configuration
prisma/         Database schema, migrations, and seed data
scripts/        Development and smoke-test scripts
```

## Prerequisites

- Node.js 24 or later
- pnpm 9 or later
- PostgreSQL 16
- Redis 7
- A C++17 compiler and Python 3 for the enabled judge languages

Docker Compose is provided for PostgreSQL and Redis. The judge worker also needs the required language runtimes and compiler available in its execution environment.

## Getting started

### 1. Start PostgreSQL and Redis

From the project root:

```bash
docker compose up -d postgres redis
```

Alternatively, use local PostgreSQL and Redis installations.

### 2. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Update `.env` with your local settings. At minimum, set a PostgreSQL `DATABASE_URL` and a `JWT_SECRET` of at least 32 characters.

### 3. Install dependencies

```bash
pnpm install
```

### 4. Prepare the database

Generate the Prisma client, apply migrations, and seed sample data:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 5. Start the application

```bash
pnpm dev
```

The Vite development server runs at [http://localhost:5173](http://localhost:5173), and the API runs at [http://localhost:3000](http://localhost:3000). The frontend proxies `/api` requests to the API.

The API health endpoint is available at:

```text
http://localhost:3000/api/health
```

## Useful commands

```bash
pnpm dev:web       # Start the frontend
pnpm dev:api       # Start the API
pnpm dev:judge     # Start the judge worker
pnpm build         # Build the app packages
pnpm typecheck     # Run TypeScript checks
pnpm db:studio     # Open Prisma Studio
```

## Configuration

See `.env.example` for the available settings, including:

- PostgreSQL and Redis connection URLs
- JWT secret and token expiration
- API port and frontend URL
- Email provider and optional SMTP settings
- Judge time, memory, and output limits

The default email provider writes messages to the API console, which is useful for local development.

## Development notes

- The web app runs on port `5173`; the API defaults to port `3000`.
- The seed script creates sample problems, tags, and an administrator account for local development. Do not use seeded credentials in a public or production environment.
- Code execution is security-sensitive. Review and configure the judge isolation, resource limits, and execution environment before deploying the platform publicly.

## License

No license has been specified yet. All rights are reserved unless a license is added to this repository.
```
