# Life RPG Production Checklist

## Environment

- [ ] Production `DATABASE_URL` configured in the host secret manager
- [ ] Strong random `JWT_SECRET` configured
- [ ] `JWT_EXPIRES_IN` reviewed
- [ ] `CLIENT_URL` set to the exact frontend origin
- [ ] `NODE_ENV=production`
- [ ] Frontend `VITE_API_URL` points to the deployed API

## Database

- [ ] Baseline schema applied
- [ ] Migrations applied in filename order
- [ ] Achievement and shop seeds applied
- [ ] Database backups enabled
- [ ] Restore procedure tested against a separate database

## Security

- [ ] HTTPS enabled for frontend, backend, and database connections where supported
- [ ] Helmet enabled
- [ ] CORS allowlist contains only the deployed frontend origin
- [ ] Authentication rate limiting enabled
- [ ] Request body limits enabled
- [ ] Parameterized queries reviewed
- [ ] Secrets and `.env` files are not committed

## Backend

- [ ] `npm ci` completes without using development dependencies in production
- [ ] `npm start` is the configured start command
- [ ] `/api/health` returns a successful connected response
- [ ] Unexpected errors return safe JSON responses
- [ ] Structured startup, database, and error logs are available
- [ ] SIGTERM/SIGINT graceful shutdown is supported by the host

## Frontend

- [ ] `npm run build` succeeds
- [ ] Production API URL is configured
- [ ] Authentication routes render
- [ ] No browser console errors in a production smoke test
- [ ] Responsive layouts checked at desktop, tablet, and mobile widths

## Functionality

- [ ] Signup works
- [ ] Login works
- [ ] Protected routes redirect correctly
- [ ] Quest create, edit, delete, and completion work
- [ ] XP and level progression work
- [ ] Gold and streaks work
- [ ] Character data is correct
- [ ] Shop and inventory work
- [ ] Achievements unlock once
- [ ] Notifications are private and readable
- [ ] Daily activity aggregates correctly

## Monitoring

- [ ] Platform health monitoring targets `GET /api/health`
- [ ] Alerts are configured for health-check failures
- [ ] Error logs are retained and access-controlled
- [ ] Database connection failures are observable without logging credentials
