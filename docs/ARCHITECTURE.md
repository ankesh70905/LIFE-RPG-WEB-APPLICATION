# Life RPG Architecture

## Planned Application Flow

```text
React Frontend
       ↓
Express Backend
       ↓
PostgreSQL Database
```

### React Frontend

The `client/` application is a Vite-powered React frontend. `App.jsx` defines
public authentication routes and protected application routes. `AuthContext`
owns session restoration, login, signup, logout, and the local JWT lifecycle.
The reusable application layout contains the responsive sidebar and navbar,
while pages compose shared loading, error, empty-state, card, form, progress,
and reward components.

All backend calls go through the fetch-based service modules in
`client/src/services/`. The shared API wrapper reads `VITE_API_URL`, adds the
bearer token from `localStorage`, safely parses responses, and handles HTTP 401
responses by clearing the session through the auth context. Pages refresh their
own server data after mutations rather than maintaining a second business-rule
implementation in the browser. Rewards, level calculations, gold deductions,
attribute increments, streaks, achievement unlocks, daily activity, and shop
ownership remain backend-authoritative.

The dashboard combines character, quest, activity, and achievement data with
parallel requests. The navbar owns a lightweight notification bell and panel.
Achievements have a dedicated page, while toast feedback communicates
successful mutations, errors, level-ups, and newly unlocked milestones.

### Express Backend

The `server/` application provides the HTTP API. It is responsible for request
handling, validation, and application logic. It now maintains a reusable
PostgreSQL connection pool and exposes a database-aware `GET /api/health`
endpoint. Authentication routes use bcrypt for password hashing, JWTs for
session tokens, parameterized queries, and transaction-backed signup.
Authenticated task routes use the JWT identity to scope all quest CRUD queries
to the current user. Reward values are calculated server-side from difficulty;
quest completion locks the task and applies task, user, and character changes
in a single PostgreSQL transaction. Level calculations are kept in the RPG
utility module rather than route handlers. The same transaction updates the
user's UTC calendar-day streak, while the streak utility keeps date logic
reusable and testable. Read-only character routes use the JWT identity to
return the user's safe profile, progression data, streaks, and database-backed
attributes. Attribute totals, strongest-attribute ties, and deterministic
ranking are calculated in the character utility; attributes cannot be edited
through the Character API. Authenticated shop routes read item prices from
PostgreSQL and process gold purchases in a transaction that locks the user row,
deducts gold, and creates the inventory record atomically. Inventory reads are
scoped to the JWT user ID.

Achievement evaluation is isolated in `utils/achievements.js` and receives the
active PostgreSQL transaction client. A successful quest completion updates the
quest, user progression, character attributes, daily activity, achievement
unlocks, and related notifications before committing. This prevents a partial
quest reward from being visible without its daily activity or achievement
side-effects. Purchase notifications use the existing shop transaction.

The notification and activity routes use authenticated identity scoping and
validate IDs and query bounds server-side. Helmet, an allowlisted CORS origin,
bounded JSON bodies, centralized safe errors, and login/signup rate limiting
provide baseline production hardening without changing the existing API
contracts.

Phase 15-18 extends the authenticated backend with the following owner-scoped
modules:

- Goals and ordered milestones, with progress derived from milestone state.
- Habits with daily, weekly, or custom weekday schedules. Completion is
  transaction-backed and updates rewards, attributes, streaks, and challenges.
- Planner endpoints that combine scheduled/due quests, due habits, milestones,
  and active challenges for the current day or UTC week.
- Reminders with manual creation, enable/disable state, and a refresh service
  for generated quest, habit, goal, and challenge reminders.
- Daily and weekly challenges whose progress is advanced by quest and habit
  completion. Challenge rewards are awarded once and direct client completion
  is not permitted.
- Privacy-first friend requests and friendships. Profile fields are returned
  only when the profile owner has enabled the corresponding privacy setting;
  request actions are restricted to the requester or recipient.

The server exports the Express app for Supertest integration coverage and only
starts listening when run as the application entry point. `startServer`
registers SIGTERM and SIGINT handlers that stop accepting requests, close the
HTTP server, and drain the PostgreSQL pool. Production logs use structured
JSON, while development logs remain readable in the terminal.

### PostgreSQL Database

The `database/` directory will contain the PostgreSQL schema and related
database resources. The Phase 2 schema defines the application tables, and the
backend connects to PostgreSQL through the `DATABASE_URL` environment variable.
The `last_activity_date` field stores the last completion's UTC calendar date,
and streak updates occur within the task-completion transaction.

### AI and Recommendation Services

AI functionality is isolated behind backend services rather than embedded in
route handlers:

```text
Authenticated Route
       ↓
Input/output validation
       ↓
AI service (optional provider)
       ↓
Rule-based fallback
       ↓
Safe JSON response
```

`aiService.js` reads provider settings only from the server environment and
supports OpenAI-compatible chat-completions endpoints. Empty or unsupported
configuration, provider failures, timeouts, and invalid model output all
return to the rule-based suggestion or goal-planning services. The frontend
never receives an API key and every generated quest must be reviewed through
the existing quest form before it is created. AI POST routes are authenticated
and use a configurable per-user limiter separate from the existing auth
limiter.

The recommendation service prioritizes data-backed rules about streaks,
attribute balance, category balance, consistency, and progress. If an AI
provider is explicitly configured, it can add validated recommendations; the
rule results remain available if that enhancement fails.

Phase 19-23 adds `aiContextService.js`, the single boundary for AI context. It
caps analytics and recent-quest data and omits emails, IDs, credentials, and
authentication metadata. Coach, priorities, and weekly-plan routes validate
responses; weekly-plan returns a deterministic fallback with an explanation.
Provider calls remain optional, timeout-bounded, and AI-rate-limited.

### Analytics Services

`analyticsService.js` centralizes the period queries used by weekly analytics,
overview analytics, recommendations, and insights. It performs bounded,
parameterized aggregate queries for completed quests and uses the UTC daily
activity table for a complete day series. The service returns category and
difficulty distributions, productive-day and active-day values, comparison
trends, and attribute balance without exposing credentials or authentication
data. Partial indexes on `(user_id, completed_at)` and `(user_id, category)`
support the completed-quest analytics filters.

The frontend keeps AI planning and analytics in lazy-loaded routes. Recharts
is used for the two responsive time-series visualizations, while summary and
distribution components retain accessible text values for users who do not use
the chart presentation.

## Phase Boundaries

The React dashboard now covers authentication, dashboard summaries, quests,
character progression, shop browsing/purchases, inventory display,
achievements, notifications, daily activity, and toast feedback. Payment
integrations, equipment effects, trading, marketplace features, and future
gameplay systems remain outside the current scope. Keeping these concerns
separated makes each layer independently runnable and leaves clear integration
points for future work.

## Database Migration Strategy

`database/schema.sql` remains the original baseline schema. Later changes are
additive and deliberately do not duplicate that file:

1. `002_achievements.sql` creates the achievement catalog and unlock relation.
2. `003_notifications.sql` creates private user notifications.
3. `004_daily_activity.sql` creates UTC daily activity summaries.
4. `005_analytics_indexes.sql` adds only the completed-quest indexes used by
   period analytics.
5. `006_goals_habits_planning_social.sql` adds goals, milestones, planner
   fields on tasks, habits and completions, reminders, challenges, friend
   requests, friendships, privacy settings, and related indexes/triggers.
6. `007_phase15_18_hardening.sql` adds race-safe uniqueness for pending
   friend pairs and supporting owner/status lookup indexes.
7. `008_preferences.sql` adds owner-scoped AI, reminder, and timezone
   preferences with update timestamps.

The SQL seed files in `server/database/seeds/` are repeat-safe. Deployments
should execute the baseline schema once, then migrations in filename order,
then the achievement and shop seeds. A future deployment can add a migration
tracking table or tool without changing the route architecture.

## Testing and Deployment

Backend unit and API integration tests live in `server/tests/`. Integration
tests use `DATABASE_URL_TEST` and are skipped unless a separate test database
is explicitly configured. Frontend behavior tests live under
`client/src/test/` and run in jsdom with React Testing Library. No test
command points at the development database by default.

The full backend suite can be run with:

```bash
cd server
DATABASE_URL_TEST=postgresql://localhost:5432/life_rpg_test npm test
```

The current limitations are intentional: migrations are plain repeat-safe SQL
files rather than managed by a migration framework; reminders are created or
refreshed through API calls and do not provide a background delivery worker;
challenge definitions are server-defined rather than user-authored; and
friend discovery uses email requests rather than a public directory. AI
providers remain optional and rule-based fallbacks are used when unavailable.
There is no automatic migration runner, provider-specific retention control,
or durable weekly-plan history table. Preference gating controls smart reminder
generation but does not cancel reminders already created or schedule delivery.
AI context is limited to gameplay progression and cannot answer arbitrary
personal-data questions.

Supported analytics/context windows are bounded and PostgreSQL pool/provider
latency should be monitored. Deployments still need external supervision,
backup/restore testing, and a scheduled reminder refresh mechanism.

The frontend is built as a static Vite application and the backend is a
stateless Node.js service. `VITE_API_URL` configures the frontend API origin;
`DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, and `NODE_ENV` configure the
backend. [DEPLOYMENT.md](../DEPLOYMENT.md) documents platform-independent
hosting options, PostgreSQL backups, migration commands, smoke tests, and the
optional backend Docker image.
