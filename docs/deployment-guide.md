# Life RPG Deployment Guide

## Recommended deployment architecture

- Frontend: Vercel, Netlify, or another static hosting provider
- Backend: Render, Railway, Fly.io, or another Node.js hosting provider
- Database: managed PostgreSQL (Supabase, Neon, Railway, or equivalent)
- Email: Resend transactional email provider
- AI: optional OpenAI-compatible provider; keep it disabled unless the deployment requires AI features

This project already uses a React frontend, an Express backend, and a PostgreSQL database. The existing stack should remain unchanged unless a strong operational reason requires a migration.

## Project configuration

### Frontend

Project root: `client/`
Production build command:

```bash
cd client
npm ci
npm run build
```

Production output directory:

```bash
client/dist
```

Required frontend environment variable:

```bash
VITE_API_URL=https://api.example.com/api
```

Do not use `localhost` in a production frontend build. Keep the API URL in the hosting platform's environment settings.

### Backend

Project root: `server/`
Start command:

```bash
cd server
npm ci
npm start
```

Required runtime variables:

```bash
PORT=5010
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/life_rpg
JWT_SECRET=replace_with_a_long_secure_random_secret
JWT_EXPIRES_IN=7d
RESET_OTP_HASH_SECRET=replace_with_a_long_secure_random_secret
CLIENT_URL=https://app.example.com
RESEND_API_KEY=replace_with_resend_api_key
EMAIL_FROM=Life RPG <no-reply@example.com>
AI_PROVIDER=optional
AI_API_KEY=
AI_MODEL=
AI_API_URL=
AI_TIMEOUT_MS=10000
AI_RATE_LIMIT_MAX=10
AI_RATE_LIMIT_WINDOW_MS=3600000
```

The backend uses the existing `process.env.PORT` pattern and should not hardcode a local port in production.

## Database configuration

Use a managed PostgreSQL database.

### Required schema setup

From the repository root:

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

Keep all secrets in the hosting platform secret manager. Use TLS/SSL when the provider requires it.

## CORS configuration

The backend validates the browser origin against `CLIENT_URL`.

Recommended setup:

```bash
CLIENT_URL=https://app.example.com
```

This prevents unauthorized cross-origin requests while allowing the production frontend to call the backend.

## Email and password reset configuration

The production password reset flow depends on a working Resend configuration.

Required fields:

```bash
RESEND_API_KEY=
EMAIL_FROM=
RESET_OTP_HASH_SECRET=
```

Verify the sender domain in Resend before using a production sender address.
Never commit the API key or put it in frontend environment variables.

The OTP must never be returned to the frontend. The backend should generate, hash, and validate OTPs server-side.

## Production testing checklist

Run smoke tests after deployment:

1. Sign up
2. Log in
3. Log out
4. Access protected routes
5. Reset password via email OTP
6. Log in again with the changed password
7. Load dashboard and statistics
8. Create and complete a quest
9. Earn XP, gold, and level-up updates
10. Complete a habit and verify streak updates
11. Check goals, challenges, analytics, and notifications
12. Confirm CORS allows the deployed frontend
13. Confirm the application works on mobile and desktop layouts

## Common deployment problems

### Port conflict

If a local environment hits port binding issues, avoid reserved ports such as 5000 and 5173 and use a safe alternative like 5010 for local development.

### CORS errors

Confirm that the production frontend domain exactly matches `CLIENT_URL`.

### Email delivery failures

Verify the Resend API key, verified sender address, recipient restrictions, and
provider delivery logs.

### Database connectivity

Ensure the deployed backend can reach the production PostgreSQL instance and that all migrations are applied in the correct order.

### Missing environment variables

Use the platform secret manager, not a committed `.env` file.

## Manual deployment steps

1. Prepare a managed PostgreSQL database.
2. Apply the schema and migrations.
3. Set backend environment variables in the hosting platform.
4. Deploy the backend service using the `server/` folder as the app root.
5. Set the frontend environment to the deployed backend URL.
6. Deploy the frontend service using the `client/` folder as the app root.
7. Verify the live health route and login flow.
8. Verify password reset with an email test account.
9. Perform the final smoke test before release.

## GitHub readiness status

The repository should only contain example files and source code. Real secrets must remain out of version control. Keep `.env` files ignored and do not commit private keys, passwords, or API tokens.
