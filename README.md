# Life RPG

Life RPG is a gamified productivity application that turns real-life tasks into
RPG-style quests. The application currently supports authentication, quest
progression, character attributes, gold, leveling, UTC calendar-day streaks,
shop purchases, user inventory, achievements, notifications, daily activity,
and the Phase 15-18 backend systems for goals, habits, planning, reminders,
challenges, and privacy-first friends. Phase 19-23 adds preferences, bounded
AI coaching/planning context, weekly summaries, and preference-aware automation.

## Technology Stack

- **Frontend:** React, Vite, JavaScript, and CSS
- **Backend:** Node.js, Express.js, dotenv, cors, bcrypt, jsonwebtoken, Helmet,
  and express-rate-limit
- **Database:** PostgreSQL (connected to the backend in Phase 3)
- **Testing:** Vitest, Supertest, and React Testing Library

## Project Structure

```text
life-rpg/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── .env.example
│   ├── .env.production.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── db.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── ai.js
│   │   │   ├── analytics.js
│   │   │   ├── character.js
│   │   │   ├── health.js
│   │   │   ├── inventory.js
│   │   │   ├── shop.js
│   │   │   ├── streak.js
│   │   │   ├── recommendations.js
│   │   │   ├── tasks.js
│   │   │   ├── goals.js
│   │   │   ├── habits.js
│   │   │   ├── planner.js
│   │   │   ├── reminders.js
│   │   │   ├── challenges.js
│   │   │   └── friends.js
│   │   ├── services/
│   │   │   ├── aiService.js
│   │   │   ├── analyticsService.js
│   │   │   ├── goalPlanningService.js
│   │   │   ├── questSuggestionService.js
│   │   │   └── recommendationService.js
│   │   ├── utils/
│   │   │   ├── character.js
│   │   │   ├── jwt.js
│   │   │   ├── rpg.js
│   │   │   ├── rewards.js
│   │   │   └── streak.js
│   │   └── server.js
│   ├── tests/
│   │   ├── helpers/
│   │   ├── auth.test.js
│   │   ├── ai.test.js
│   │   ├── analytics.test.js
│   │   ├── ai.unit.test.js
│   │   ├── analytics.unit.test.js
│   │   ├── tasks.test.js
│   │   ├── character.test.js
│   │   ├── shop.test.js
│   │   ├── inventory.test.js
│   │   ├── achievements.test.js
│   │   ├── notifications.test.js
│   │   ├── activity.test.js
│   │   ├── streak.test.js
│   │   └── rpg.test.js
│   ├── .env.example
│   ├── .env.test.example
│   ├── Dockerfile
│   ├── package.json
│   └── vitest.config.js
│   └── database/
│       ├── migrations/
│       │   ├── 002_achievements.sql
│       │   ├── 003_notifications.sql
│       │   ├── 004_daily_activity.sql
│       │   ├── 005_analytics_indexes.sql
│       │   ├── 006_goals_habits_planning_social.sql
│       │   ├── 007_phase15_18_hardening.sql
│       │   └── 008_preferences.sql
│       └── seeds/
│           ├── achievements.sql
│           └── shop_items.sql
├── database/
│   └── schema.sql
├── docs/
│   └── ARCHITECTURE.md
├── DEPLOYMENT.md
├── PRODUCTION_CHECKLIST.md
├── .gitignore
└── README.md
```

## Installation

Prerequisites:

- Node.js 18.11 or newer
- npm

Install each application independently:

```bash
cd client
cp .env.example .env
npm install
```

```bash
cd server
cp .env.example .env
npm install
```

Edit `server/.env` and set `DATABASE_URL` to your PostgreSQL connection string.
The database schema is defined in `database/schema.sql`. Additive SQL
migrations under `server/database/migrations` extend it without changing the
baseline schema.

For a new database, run the existing schema first, then each migration and
seed in order:

```bash
psql -d life_rpg -f database/schema.sql
psql -d life_rpg -f server/database/migrations/002_achievements.sql
psql -d life_rpg -f server/database/migrations/003_notifications.sql
psql -d life_rpg -f server/database/migrations/004_daily_activity.sql
psql -d life_rpg -f server/database/migrations/005_analytics_indexes.sql
psql -d life_rpg -f server/database/migrations/006_goals_habits_planning_social.sql
psql -d life_rpg -f server/database/migrations/007_phase15_18_hardening.sql
psql -d life_rpg -f server/database/migrations/008_preferences.sql
psql -d life_rpg -f server/database/migrations/009_phase25_password_reset.sql
psql -d life_rpg -f server/database/seeds/achievements.sql
psql -d life_rpg -f server/database/seeds/shop_items.sql
```

The migrations and seeds are idempotent and can safely be run again. The
repository intentionally does not add a migration library; these plain SQL
files are executed by `psql` or a deployment migration step.

For backend integration tests, create a separate PostgreSQL database and load
the same schema and migrations into it. From `server/`, use the test template:

```bash
cp .env.test.example .env.test
DATABASE_URL_TEST=postgresql://localhost:5432/life_rpg_test npm test
```

Never point `DATABASE_URL_TEST` at a development or production database.

## Run the Frontend

From the `client/` directory:

```bash
npm run dev
```

Open the Vite development URL shown in the terminal, normally
`http://localhost:5173`.

## Run the Backend

From the `server/` directory:

```bash
npm run dev
```

The API listens on `http://localhost:5010` by default. Port 5000 is commonly
reserved by AirPlay on macOS, so the project uses 5010 to avoid local startup
conflicts. To run without file watching, use:

```bash
npm start
```

The backend starts even if PostgreSQL is temporarily unavailable. The health
endpoint reports the database as disconnected until the database is available.

## Phase 15-18 backend API

All routes below require a bearer token. IDs and ownership are validated
server-side.

- **Goals:** `GET/POST /api/goals`, `GET/PUT/DELETE /api/goals/:id`, plus
  milestone CRUD under `/api/goals/:goalId/milestones`.
- **Habits:** `GET/POST /api/habits`, `GET/PUT/DELETE /api/habits/:id`, and
  `POST /api/habits/:id/complete`. Completion awards rewards, updates
  attributes and streaks, and advances challenges.
- **Planner:** `GET /api/planner/today` and `GET /api/planner/week`, combining
  scheduled quests, habits, goal milestones, and current challenges.
- **Reminders:** `GET/POST /api/reminders`, `PATCH /api/reminders/:id`, and
  `POST /api/reminders/refresh` for manual or generated reminders.
- **Challenges:** `GET /api/challenges`, `/daily`, and `/weekly`. Progress is
  advanced by quest and habit completion; direct completion is rejected.
- **Friends and privacy:** `GET/PUT /api/friends/privacy`,
  `GET /api/friends/requests`, `POST /api/friends/request`,
  `POST /api/friends/:id/accept|decline|cancel`, and
  `GET/DELETE /api/friends`. Friend profiles expose only fields enabled by
  their owner.

## Frontend Application

The authenticated React application uses `react-router-dom` for client-side
navigation and stores the JWT in `localStorage` under `life_rpg_token`. The
centralized API service automatically adds the bearer token, converts common
network/API failures into readable messages, and clears the session when the
backend returns HTTP 401.

Public routes:

- `/login`
- `/signup`

Protected routes:

- `/dashboard`
- `/tasks`
- `/character`
- `/shop`
- `/inventory`
- `/achievements`
- `/ai-planner`
- `/analytics`

The dashboard reads progression, streak, attributes, gold, and quest data from
the backend. Quest forms send only editable fields; reward values and
completion outcomes remain server-authoritative. Completing a quest updates the
quest list immediately and displays the backend reward, level, attribute, and
streak result. Shop ownership is derived from the authenticated inventory, and
successful purchases update the displayed gold balance without a full-page
reload.

## Phase 19-23 backend features

`GET /api/preferences` and `PATCH /api/preferences` expose authenticated,
owner-scoped AI, reminder, and timezone settings. Migration `008_preferences.sql`
creates the preferences table. Smart reminder refresh honors
`reminders_enabled`; older installations remain compatible until the migration
is applied.

The centralized AI context builder sends only bounded progression data:
character level/attributes, task summary, recent quest titles, and aggregate
analytics. It excludes emails, credentials, IDs, and authentication metadata.
AI output is schema-validated, with deterministic fallbacks and explanations.

## AI Features

The AI provider is optional and is called only by the Express backend. Set
`AI_PROVIDER`, `AI_API_KEY`, and `AI_MODEL` in `server/.env` to enable an
OpenAI-compatible chat-completions provider. `AI_API_URL` can override the
default provider endpoint for compatible services. API keys are never sent to
the browser.

When the provider is not configured, unavailable, rate-limited, times out, or
returns invalid content, the AI endpoints return clearly labeled rule-based
results instead. Quest suggestions are validated against the application's
category, difficulty, and length limits, and goal plans never create quests
automatically. Users must review and confirm every quest in the existing quest
form.

Additional authenticated endpoints are `GET /api/ai/coach`,
`GET /api/ai/priorities`, `POST /api/ai/weekly-plan` (optional `goal`),
`GET /api/ai/weekly-summary`, and the analytics-compatible
`GET /api/analytics/weekly-summary`.

## Analytics

The analytics service uses parameterized PostgreSQL queries over completed
quests and UTC daily activity. It provides weekly totals and comparisons,
7/30/90-day overview analytics, category and difficulty distributions,
productive-day analysis, activity consistency, progress trends, and
attribute-balance insights. Missing previous-period data returns
`insufficient_data` rather than fabricated percentages.

The AI Planner and Analytics pages include loading, error, empty, fallback, and
responsive states. Analytics charts use the single frontend chart dependency,
Recharts, and are lazy-loaded with the analytics route.

## Health Check

With the backend running, request:

```bash
curl http://localhost:5010/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "Life RPG API and database are running",
  "database": "connected"
}
```

## Automated Testing

The backend uses Vitest and Supertest. Unit tests cover UTC streak edge cases
and cumulative XP progression. Integration tests cover authentication, quest
CRUD and rollback behavior, character data, shop purchases, inventory
ownership, achievements, notifications, and daily activity.

The frontend uses Vitest with jsdom, React Testing Library, and
`@testing-library/user-event`. Tests cover login and signup behavior,
dashboard loading/error/summary states, quest completion and validation, and
shop purchase/insufficient-gold states.

Run backend unit tests:

```bash
cd server
npm run test:unit
```

Run frontend tests:

```bash
cd client
npm test
```

Integration tests require a separate PostgreSQL database. Never point
`DATABASE_URL_TEST` at a development or production database:

```bash
createdb life_rpg_test
psql "$DATABASE_URL_TEST" -f database/schema.sql
psql "$DATABASE_URL_TEST" -f server/database/migrations/002_achievements.sql
psql "$DATABASE_URL_TEST" -f server/database/migrations/003_notifications.sql
psql "$DATABASE_URL_TEST" -f server/database/migrations/004_daily_activity.sql
psql "$DATABASE_URL_TEST" -f server/database/migrations/005_analytics_indexes.sql
psql "$DATABASE_URL_TEST" -f server/database/migrations/006_goals_habits_planning_social.sql
psql "$DATABASE_URL_TEST" -f server/database/migrations/007_phase15_18_hardening.sql
psql "$DATABASE_URL_TEST" -f server/database/migrations/008_preferences.sql
psql "$DATABASE_URL_TEST" -f server/database/migrations/009_phase25_password_reset.sql
psql "$DATABASE_URL_TEST" -f server/database/seeds/achievements.sql
psql "$DATABASE_URL_TEST" -f server/database/seeds/shop_items.sql
cd server
DATABASE_URL_TEST=postgresql://USERNAME:PASSWORD@localhost:5432/life_rpg_test npm run test:integration
```

Copy [server/.env.test.example](./server/.env.test.example) to
`server/.env.test` for a reusable local configuration. The integration
describes are skipped when `DATABASE_URL_TEST` is not configured, so
`npm test` remains safe on a machine without PostgreSQL. Test users are
deleted after each integration test.

Run all backend tests:

```bash
cd server
npm test
```

## AI and Analytics API

All routes below require a bearer token:

- `POST /api/ai/suggest-quests`
- `POST /api/ai/plan-goal` with `{ "goal": "Learn Python" }`
- `GET /api/recommendations`
- `GET /api/analytics/weekly`
- `GET /api/analytics/overview?days=7|30|90`
- `GET /api/analytics/insights`

The two POST AI endpoints use a separate per-user rate limiter configured by
`AI_RATE_LIMIT_MAX` and `AI_RATE_LIMIT_WINDOW_MS`. Recommendations remain
useful without AI through the rule engine.

## Production Preparation

Production configuration is documented in
[DEPLOYMENT.md](./DEPLOYMENT.md), with a release gate in
[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md). The backend includes
structured production logging, a database-aware health endpoint, explicit
CORS methods and headers, bounded JSON request bodies, and graceful
SIGTERM/SIGINT shutdown. The optional [server/Dockerfile](./server/Dockerfile)
installs production dependencies only.

## Current Scope

The current implementation contains the project foundation, a responsive
authenticated React frontend, a PostgreSQL connection pool, a database-aware
health endpoint, backend authentication, and authenticated task/quest CRUD
operations. Task completion applies XP, gold, character attributes, and level
progression transactionally, including one streak-day update per UTC calendar
day. Shop and inventory transactions are available through the backend and the
frontend. Completing a quest also updates the user's UTC daily activity,
evaluates achievement requirements, and creates achievement, level-up, and
streak-milestone notifications in the same transaction. Successful shop
purchases create purchase notifications in their existing transaction. The
backend also exposes read-only character profile, progression, and
attribute-summary APIs.

## Achievements, Notifications, and Activity

Achievements are defined in the `achievements` catalog and unlocked once per
user through the `user_achievements` unique constraint. The quest completion
transaction evaluates the final quest count, cumulative earned gold, level,
streak, and attributes. Newly inserted unlocks are returned in the completion
response and generate notification records atomically. Gold achievements use
the greater of the user's current balance and cumulative gold earned from
completed quests, so spending gold does not erase earned progress.

Notifications are private to the authenticated user. The notification API
returns the newest records, provides an all-notification unread count, and
supports marking one or all notifications as read. The React navbar displays
an unread badge and a lightweight notification panel.

Daily activity is stored by UTC calendar date. Each successful quest completion
upserts the day's quest count, XP earned, and gold earned. The dashboard uses
`GET /api/activity?days=7` for today's progress and recent activity summaries.

## Security and Production Configuration

The backend uses Helmet security headers, an allowlisted CORS origin from
`CLIENT_URL` (never `*` while authentication is enabled), a 10 KB JSON body
limit, parameterized PostgreSQL queries, centralized safe error responses, and
authentication rate limiting covering signup, login, and AI generation.
AI responses are schema-validated and bounded before they reach the client.
Context windows and recent-quest payloads are capped, and provider calls are
rate-limited and time-bounded. Enabling a provider sends bounded gameplay
context to that provider; review its retention and regional processing policy.
Passwords remain bcrypt-hashed, JWTs use `JWT_SECRET`, and protected resources
are scoped to the authenticated JWT user ID.

Password recovery uses six-digit OTPs that are HMAC-hashed at rest, expire in
10 minutes, allow at most five verification attempts, and are protected by a
60-second resend cooldown plus IP rate limits. A verified OTP creates a
single-use, expiring reset authorization token. Completing a reset updates the
password transactionally and increments the user's JWT token version, which
invalidates existing sessions. Unknown email addresses receive a generic
response. A known account receives success only after the configured email
provider accepts the message; delivery failures invalidate the OTP and return
a retryable error. The API never logs or exposes OTPs. Applying the migration
invalidates JWTs minted by older versions, so users need to log in again once
after the rollout.

The backend pins patched transitive `qs` and `tar` versions through npm
overrides; `npm audit --omit=dev` reports no production dependency
vulnerabilities. A full audit still reports development-tool advisories in the
Vite/Vitest toolchain that require a future major upgrade, so
`npm audit fix --force` is intentionally not part of the release process.

Copy `server/.env.example` to `server/.env` and configure:

```text
PORT=5010
DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/life_rpg
JWT_SECRET=replace_with_a_long_secure_random_secret
RESET_OTP_HASH_SECRET=replace_with_a_long_secure_random_secret
CLIENT_URL=http://localhost:5173
NODE_ENV=development
RESEND_API_KEY=
EMAIL_FROM=Life RPG <onboarding@resend.dev>
AI_PROVIDER=optional
AI_API_KEY=
AI_MODEL=
AI_API_URL=
AI_TIMEOUT_MS=10000
AI_RATE_LIMIT_MAX=10
AI_RATE_LIMIT_WINDOW_MS=3600000
```

Copy `client/.env.example` to `client/.env` and set `VITE_API_URL` to the API
base URL. Never commit either `.env` file or production credentials.

After configuring Resend, verify the email provider configuration with:

```bash
cd server
npm run email:verify
```

Set `RESEND_API_KEY` and `EMAIL_FROM` in `server/.env`. Use a sender domain
verified in Resend for production. The API key is never exposed to the
frontend or logged by the backend.

## Current API Routes

- `GET /api/health`
- `GET /health` (platform health-check alias; `/api/health` remains supported)
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/resend-reset-otp`
- `POST /api/auth/verify-reset-otp`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `GET /api/character`
- `GET /api/character/attributes`
- `GET /api/character/stats`
- `GET /api/shop/items`
- `POST /api/shop/purchase/:itemId`
- `GET /api/inventory`
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `POST /api/tasks/:id/complete`
- `GET /api/streak`
- `GET /api/achievements`
- `GET /api/achievements/unlocked`
- `GET /api/notifications?limit=20`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `GET /api/activity?days=30`
- `POST /api/ai/suggest-quests`
- `POST /api/ai/plan-goal`
- `GET /api/ai/coach`
- `GET /api/ai/priorities`
- `POST /api/ai/weekly-plan`
- `GET /api/ai/weekly-summary`
- `GET /api/preferences`
- `PATCH /api/preferences`
- `GET /api/recommendations`
- `GET /api/analytics/weekly`
- `GET /api/analytics/weekly-summary`
- `GET /api/analytics/overview?days=7|30|90`
- `GET /api/analytics/insights`

Task routes require an `Authorization: Bearer <token>` header. Task reward
values are calculated on the backend from difficulty. Completing a quest
transactionally applies its stored XP and gold rewards, increases the mapped
character attribute, recalculates the user level, and updates the UTC calendar
day streak. `GET /api/streak` exposes the authenticated user's streak status.

## Streak Rules

Streak dates use UTC calendar days. The first completed quest starts a streak
at 1. Additional quests on the same UTC day do not increase it; a completion
on the next UTC day increments it; and a completion after one or more missed
days resets it to 1. `longest_streak` is never reduced.

## Character API

All character endpoints require an `Authorization: Bearer <token>` header and
use the authenticated user's ID from the JWT. They never accept a user ID from
the request.

- `GET /api/character` returns safe user data, resources, streak data,
  cumulative XP progression, all attributes, strongest attributes, and a
  deterministic attribute ranking.
- `GET /api/character/attributes` returns the four attributes, their total,
  strongest attributes, and ranking.
- `GET /api/character/stats` returns level, XP progression, gold, and streak
  statistics.

The four attributes are ordered as `intellect`, `strength`, `discipline`,
`creativity` for tie handling. `total_attributes` is their sum.
`strongest_attributes` includes every attribute tied for the highest value.
`attribute_ranking` sorts by value descending and uses that fixed order for
ties. Character attributes are read-only through these endpoints and can only
increase through quest completion.

XP progression reuses the Phase 6 cumulative formula. For level `N`, the next
level requires `100 × N²` XP, and the endpoint reports the XP required for that
level transition, current XP within the level, XP remaining, and percentage
progress.

Example:

```bash
curl http://localhost:5010/api/character \
  -H "Authorization: Bearer <token>"
```

PostgreSQL verification queries:

```sql
SELECT id, name, level, total_xp, gold, current_streak, longest_streak
FROM users;

SELECT user_id, intellect, strength, discipline, creativity
FROM character_attributes;

SELECT
  u.id,
  u.name,
  u.email,
  u.level,
  u.total_xp,
  u.gold,
  u.current_streak,
  u.longest_streak,
  u.last_activity_date,
  ca.intellect,
  ca.strength,
  ca.discipline,
  ca.creativity
FROM users AS u
JOIN character_attributes AS ca ON ca.user_id = u.id;
```

## Shop and Inventory API

Shop and inventory routes require authentication and use the user ID from the
JWT. The shop item list includes the authenticated user's current gold:

```bash
curl http://localhost:5010/api/shop/items \
  -H "Authorization: Bearer <token>"
```

Purchase an item with in-game gold:

```bash
curl -X POST http://localhost:5010/api/shop/purchase/1 \
  -H "Authorization: Bearer <token>"
```

The purchase response includes the purchased item, remaining gold, and the
database-generated purchase timestamp. The purchase uses one PostgreSQL
transaction: it locks the user row, reads the database item price, checks
ownership and available gold, deducts gold, inserts the inventory record, and
commits. Any failure rolls back every change. The
`UNIQUE(user_id, item_id)` constraint and explicit conflict handling prevent
duplicate ownership.

```bash
curl http://localhost:5010/api/inventory \
  -H "Authorization: Bearer <token>"
```

Inventory is read-only through the API. Users cannot provide `user_id`,
`item_id`, `price`, or `purchased_at` to create or modify inventory records.

PostgreSQL verification queries:

```sql
SELECT id, name, gold
FROM users;

SELECT id, name, price, item_type
FROM shop_items;

SELECT
  ui.id,
  ui.user_id,
  ui.item_id,
  si.name,
  si.price,
  ui.purchased_at
FROM user_inventory ui
JOIN shop_items si ON si.id = ui.item_id
WHERE ui.user_id = YOUR_USER_ID;
```

## RPG Progression

The backend uses cumulative lifetime XP. Advancing from level `N` to level
`N + 1` requires `100 × N²` XP. Therefore, level 2 begins at 100 total XP and
level 3 begins at 500 total XP (100 + 400). Completing a quest can advance a
user through multiple levels in one transaction.
