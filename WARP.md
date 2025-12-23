# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Setup
- Install dependencies:
  - `npm install`
- Ensure a `.env` file exists in the project root with at least:
  - `PORT` (optional, defaults to `3000`)
  - `NODE_ENV`
  - `LOG_LEVEL`
  - `DATABASE_URL` (PostgreSQL connection string used by Drizzle/Neon)
  - `JWT_SECRET` (JWT signing key used by `src/utils/jwt.js`)

### Running the API
- Start the server in watch mode (development):
  - `npm run dev`
  - Entrypoint: `src/index.js` → `src/server.js` → `src/app.js`.
- Run once without watch (e.g. in production or simple local run):
  - `node src/index.js`

### Linting and Formatting
- Lint the codebase:
  - `npm run lint`
- Lint and auto-fix issues:
  - `npm run lint:fix`
- Format all files with Prettier:
  - `npm run format`
- Check formatting without writing changes:
  - `npm run format:check`

### Database (Drizzle + Neon)
- Generate Drizzle migrations from models (`src/models/*.js`):
  - `npm run db:generate`
- Run pending migrations against the database configured in `DATABASE_URL`:
  - `npm run db:migrate`
- Open Drizzle Studio UI (introspects the same database):
  - `npm run db:studio`

### Tests
- There is currently **no test runner or `npm test` script configured** in `package.json`.
- To run a single test in the future, first add a test framework (e.g. Vitest/Jest) and wire it into `package.json` scripts; until then there are no test commands available.

---

## High-level Architecture

### Runtime Overview
- This is a Node.js/Express HTTP API, using ES modules (`"type": "module"` in `package.json`).
- Persistence is via PostgreSQL using Drizzle ORM over a Neon serverless connection.
- Request handling follows a layered structure:
  - **Routes** → **Controllers** → **Services** → **Database models/utilities**, with Zod-based validation and shared helpers.

### Entry Points & HTTP Surface
- **Process entrypoint**: `src/index.js`
  - Loads environment variables via `dotenv/config` and imports `src/server.js`.
- **HTTP server**: `src/server.js`
  - Reads `PORT` from the environment and calls `app.listen`.
- **Express app**: `src/app.js`
  - Core middleware stack:
    - `helmet` for security headers.
    - `cors` for cross-origin requests.
    - `cookie-parser` for signed/HTTP-only cookies.
    - `express.json` / `express.urlencoded` for body parsing.
    - `morgan` HTTP logging, wired to the shared `logger`.
  - Key routes:
    - `GET /` – simple health/welcome endpoint.
    - `POST /health` – returns uptime and timestamp JSON.
    - `GET /api` – basic API status check.
    - `app.use('/api/auth', authRoutes)` – authentication-related endpoints.

### Module Layout & Import Aliases
- `package.json` defines Node `imports` aliases used throughout the codebase:
  - `#config/*` → `./src/config/*`
  - `#controllers/*` → `./src/controllers/*`
  - `#middleware/*` → `./src/middleware/*`
  - `#models/*` → `./src/models/*`
  - `#routes/*` → `./src/routes/*`
  - `#services/*` → `./src/services/*`
  - `#utils/*` → `./src/utils/*`
  - `#validations/*` → `./src/validations/*`
- Prefer these aliases for internal imports instead of relative paths to keep modules relocatable.

### Authentication Flow (Signup Path)
- **Route**: `src/routes/auth.routes.js`
  - Defines `POST /api/auth/signup` mapped to the `signup` controller.
- **Controller**: `src/controllers/auth.controller.js`
  - Imports the shared `logger`, `createUser` service, Zod `signUpSchema`, JWT helper, and cookie helper via aliases.
  - Validates `req.body` with `signUpSchema.safeParse`.
    - On validation failure: logs a warning and returns HTTP 400 with formatted error messages.
  - On success:
    1. Extracts `name`, `email`, `password`, `role` from the parsed data.
    2. Calls `createUser` in the auth service to persist the user.
    3. Signs a JWT containing `id`, `email`, and `role` via `jwttoken.sign`.
    4. Sets the JWT as an HTTP-only cookie using `cookies.set`.
    5. Logs a success message and returns HTTP 201 with a sanitized user payload.
- **Service**: `src/services/auth.service.js`
  - `hashPassword(password)` wraps `bcrypt.hash` with error logging.
  - `createUser({ name, email, password, role })` is responsible for:
    - Checking for an existing user with the same email using Drizzle (`db.select().from(users).where(eq(users.email, email))`).
    - Hashing the password and inserting a new row into the `users` table.
    - Returning selected user fields (id, name, email, role, created_at) and logging success.
  - Any thrown errors are logged via the shared `logger`.
- **Validation**: `src/validations/auth.validation.js`
  - Uses Zod to define and enforce the shape of signup/signin payloads (`signUpSchema`, `signInSchema`).
- **JWT & Cookies**:
  - `src/utils/jwt.js` provides `jwttoken.sign`/`jwttoken.verify` helpers using `jsonwebtoken` and `JWT_SECRET`.
  - `src/utils/cookies.js` centralizes secure cookie configuration (HTTP-only, `sameSite: 'strict'`, production `secure` flag, short max age).

### Database Layer
- **Configuration**: `src/config/database.js`
  - Creates a Neon client from `process.env.DATABASE_URL` and wraps it with Drizzle ORM.
  - Exposes both the raw `sql` client and the Drizzle `db` instance for query building.
- **Schema Definition**: `src/models/user.model.js`
  - Defines the `users` table with Drizzle `pgTable`:
    - `id` (serial primary key)
    - `name`, `email`, `password`, `role`
    - `created_at`, `updated_at` timestamps with `defaultNow()`
- **Migrations Config**: `drizzle.config.js`
  - Points Drizzle Kit at `./src/models/*.js` for schema, outputs migrations to `./drizzle`, and wires the PostgreSQL connection via `DATABASE_URL`.

### Logging & Observability
- **Logger**: `src/config/logger.js`
  - Central Winston logger configured with:
    - `level` from `LOG_LEVEL` or `info` by default.
    - JSON output with timestamps and stack traces.
    - File transports:
      - `logs/error.log` for `error` and above.
      - `logs/combined.log` for general logs.
  - In non-production (`NODE_ENV !== 'production'`), also logs to the console with colors and a simple format.
- **HTTP access logs**:
  - `morgan` in `src/app.js` writes combined-format HTTP logs into the shared `logger`, so HTTP traffic appears in Winston outputs alongside application logs.

### Environment & Configuration Notes
- `.env` in the project root is loaded implicitly by modules using `dotenv/config` (e.g. `src/index.js`, `src/config/database.js`).
- When making changes that depend on environment configuration (database URL, JWT secret, logging level, etc.), prefer reading from `process.env` in a single place (e.g. config modules) and importing those values through existing helpers rather than scattering `process.env` throughout the codebase.
