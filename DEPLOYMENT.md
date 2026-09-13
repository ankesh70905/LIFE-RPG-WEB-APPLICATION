# Life RPG Deployment Guide

This guide prepares Life RPG for a platform-independent production
deployment. It does not deploy the application automatically and does not
require Docker for local development.

## Database setup

Create a PostgreSQL database with a managed provider such as Supabase, Neon,
or Railway. Keep the connection string in the provider's secret environment
configuration, not in the repository.

Run the baseline schema, migrations, and repeat-safe seeds from the repository
root:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f server/database/migrations/002_achievements.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f server/database/migrations/003_notifications.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f server/database/migrations/004_daily_activity.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f server/database/migrations/005_analytics_indexes.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f server/database/migrations/006_goals_habits_planning_social.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f server/database/migrations/007_phase15_18_hardening.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f server/database/migrations/008_preferences.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f server/database/migrations/009_phase25_password_reset.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f server/database/seeds/achievements.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f server/database/seeds/shop_items.sql
```

For hosted databases that require TLS, use the provider's connection string
with its SSL mode parameter (for example, `sslmode=require`).

Phase 15-18 adds goals and milestones, scheduled quests and habits, smart
reminders, automatic daily/weekly challenges, and privacy-first friendships.
Migration 006 creates the feature tables and task columns; migration 007 adds
race-safe pending friend-request uniqueness and supporting lookup indexes.
Run both migrations after 005 on existing installations. These SQL migrations
are repeat-safe, but this repository does not include a migration runner or
schema-version table.

Migration 008 creates owner-scoped AI, reminder, and timezone preferences.
Apply it after migration 007. Reminder automation honors `reminders_enabled`;
before 008 is applied, it remains enabled for backward compatibility.

Migration 009 adds password-reset OTP storage and JWT token versioning. Set
`RESET_OTP_HASH_SECRET` and the email variables before enabling recovery in
production. A known account receives success only after the email provider
accepts delivery; failures invalidate the OTP and return a retryable error.

To validate a deployment against an isolated database:

```bash
cd server
cp .env.test.example .env.test
DATABASE_URL_TEST=postgresql://localhost:5432/life_rpg_test npm test
```

## Backend deployment

The backend can be deployed to Render, Railway, Fly.io, or another Node.js
host.

1. Set the service root to `server/`, or configure the platform commands to
   run from that directory.
2. Install dependencies with `npm ci`.
3. Set these environment variables in the platform secret manager:

   ```text
   PORT=5010
   DATABASE_URL=<managed PostgreSQL connection string>
   JWT_SECRET=<long random secret>
   RESET_OTP_HASH_SECRET=<different long random secret>
   JWT_EXPIRES_IN=7d
   CLIENT_URL=https://<deployed-frontend-domain>
   NODE_ENV=production
   RESEND_API_KEY=<Resend API key>
   EMAIL_FROM=Life RPG <verified sender address>
   AI_PROVIDER=optional
   AI_API_KEY=
   AI_MODEL=
   AI_API_URL=
   AI_TIMEOUT_MS=10000
   AI_RATE_LIMIT_MAX=10
   AI_RATE_LIMIT_WINDOW_MS=3600000
   ```

After setting the Resend secrets, run `npm run email:verify` from `server/`.

4. Use `npm start` as the start command.
5. Configure the platform health check as `GET /health` (the existing
   `GET /api/health` endpoint remains supported as a compatibility path).

AI is optional. Leave `AI_PROVIDER=optional` and `AI_API_KEY` empty to use
validated rule-based fallbacks. If a provider is enabled, store the API key in
the platform secret manager and never expose it through frontend variables.
AI requests use bounded, non-sensitive context and validated responses, but
enabling a provider still transfers gameplay data to that provider. Review
retention, residency, and contractual requirements before production use.

The included [server/Dockerfile](./server/Dockerfile) is an optional
container deployment strategy. It installs production dependencies only,
does not copy environment files, and expects all runtime configuration from
environment variables.

## Frontend deployment

The frontend can be deployed to Vercel, Netlify, or another static hosting
provider.

1. Set the project root to `client/`.
2. Set `VITE_API_URL` to the deployed backend API base URL, such as
   `https://api.example.com/api`.
3. Build with:

   ```bash
   npm ci
   npm run build
   ```

4. Publish the generated `client/dist/` directory.

Use [client/.env.production.example](./client/.env.production.example) as the
production variable template. Do not use a localhost API URL in a production
build.

## CORS configuration

Set the backend `CLIENT_URL` to the exact deployed frontend origin, including
the scheme and port when applicable. The backend rejects browser origins that
are not in this allowlist. Authorization and JSON headers are explicitly
allowed for API requests and preflight requests.

## Backups

For development, create a logical PostgreSQL backup with:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=life-rpg-development.dump
```

For production, enable the managed provider's automated backups and point-in-
time recovery where available. Test restoration into a separate database
before relying on a backup for recovery.

## Post-deployment verification

Run the health check first:

```bash
curl --fail --show-error https://api.example.com/health
```

Then verify the complete user flow in a non-production smoke-test account:

- Signup and login
- Session restoration and logout
- Dashboard loading and empty states
- Quest creation and completion
- XP, level, gold, attributes, and streak updates
- Character profile
- Shop purchase and inventory
- Achievement unlock
- Notification listing and read actions
- Daily activity
- Goal and milestone CRUD
- Habit completion and streak/reward updates
- Today and weekly planner views
- Reminder refresh and enable/disable actions
- Preference retrieval and updates, including reminder gating
- AI coach, priorities, weekly-plan fallback, and weekly-summary endpoints
- Daily and weekly challenge progress and rewards
- Friend requests, privacy settings, and friend removal

Use [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) before enabling real
users.

## Performance, security, and operational notes

Run migrations in order with `ON_ERROR_STOP=1` and back up before schema
changes. Keep database, JWT, and AI credentials in the platform secret
manager. The API uses parameterized queries, owner-scoped JWT authorization,
Helmet, exact-origin CORS, a 10 KB JSON limit, and separate AI rate limiting.
Health checks validate PostgreSQL connectivity; shutdown drains the HTTP server
and pool.

Analytics and AI context windows are bounded and recent quest payloads capped.
Monitor pool saturation, aggregate query latency, provider timeouts, rate-limit
responses, and reminder refresh volume. There is no background reminder worker
or automatic migration runner; schedule refresh calls and operational
monitoring externally.
