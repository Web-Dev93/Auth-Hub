# AuthHub

A centralized authentication and user profiling hub. One server handles logins for multiple websites via Google OAuth. Admin panel shows all users, their profiles, and activity. Each website gets an embeddable login widget (iframe or JS snippet).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/authhub run dev` — run the frontend (port 20713)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Required Environment Variables

- `DATABASE_URL` — Postgres connection string (auto-provisioned)
- `SESSION_SECRET` — secret for express-session (set in Replit Secrets)
- `GOOGLE_CLIENT_ID` — from Google Cloud Console OAuth credentials
- `GOOGLE_CLIENT_SECRET` — from Google Cloud Console OAuth credentials
- `GOOGLE_CALLBACK_URL` — optional override (defaults to `https://$REPLIT_DEV_DOMAIN/api/auth/google/callback`)
- `ADMIN_EMAIL` — optional: your Google email, always gets admin role on login

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind + shadcn/ui (wouter for routing)
- API: Express 5
- Auth: Passport.js + passport-google-oauth20 + express-session + connect-pg-simple
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB schema: users, accounts, apps, activity_logs, sessions
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/passport.ts` — Google OAuth configuration
- `artifacts/api-server/src/lib/geo.ts` — IP geolocation (ip-api.com)
- `artifacts/authhub/src/` — React frontend (admin panel + login page)

## Architecture decisions

- **First user = admin**: The first Google account to register automatically gets `role: "admin"`. Set `ADMIN_EMAIL` to always guarantee a specific email gets admin access regardless of registration order.
- **Single auth hub**: All logins go through this server. Other sites embed the widget via iframe or JS snippet, identified by `clientId`.
- **Session storage in PostgreSQL**: `connect-pg-simple` stores sessions in the `session` table. No Redis needed.
- **IP geolocation**: Uses ip-api.com free API at login time (2s timeout, silently skips on failure).
- **No passwords**: All authentication is via Google OAuth. More providers (Facebook, Apple, etc.) can be added by registering passport strategies.

## User preferences

- Polish language for user-facing UI and communication
- Admin email should be set via ADMIN_EMAIL env var for guaranteed admin access
- First user to register becomes admin automatically

## Gotchas

- After any OpenAPI spec change, run codegen before restarting the API server.
- Google OAuth requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to be set. Without them, the `/api/auth/google` route returns 401.
- The Google Cloud Console OAuth app must have `http(s)://<domain>/api/auth/google/callback` as an authorized redirect URI.
- `pnpm --filter @workspace/db run push-force` if schema push fails with column conflicts.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
