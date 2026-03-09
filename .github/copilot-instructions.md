## Purpose
Help AI coding agents be productive in the financial-calculator repo by documenting the project's architecture, common patterns, and actionable examples.

## High-level architecture
- Single-page frontend (HTML/CSS/vanilla JS + Chart.js) served as static files by an Express backend.
- Backend (Node.js + Express) exposes simple REST endpoints under `/api/*` for auth and calculation history and uses Supabase as the primary data/auth service.
- Key files: `index.html`, `script.js` (frontend logic), `style.css`, `server.js` (backend), `package.json`, `database_setup.sql`.

Why this structure: the app is a static frontend with a thin API layer that delegates auth and persistence to Supabase (keeps backend logic minimal and RLS-friendly).

## Key workflows & commands
- Install: `npm install` (see `package.json`).
- Run: `npm start` which runs `node server.js` and serves the app on `http://localhost:3000` (or `PORT` env).
- Environment: create `.env` from `.env.example` with `SUPABASE_URL` and `SUPABASE_KEY` (backend reads `process.env`).

## Project-specific conventions and patterns
- Auth tokens: frontend stores the Supabase JWT in `localStorage` under `auth_token`. Frontend requests include `Authorization: Bearer <token>` when calling history endpoints.
- Server-side token verification: server calls `supabase.auth.getUser(token)` to validate tokens and obtains `user.id` before DB ops.
- User-scoped DB client: when writing or reading `calculations` the server creates a supabase client with global Authorization header so RLS and `auth.uid()` work:

  const userSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });

- History shape: POST `/api/history` expects JSON { calc_type, input_data, result_data } and stores to `calculations` table with `user_id`.
- Frontend helpers to reuse: `saveCalculation(type, e)` and `loadHistory()` in `script.js` demonstrate how the client saves/loads history.

## API examples agents should follow (concrete)
- Save calculation (frontend):

  fetch('/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ calc_type: 'SIP', input_data: { amount, rate, time }, result_data: { total } })
  })

- Verify token pattern (server):

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

## Important implementation notes / gotchas
- Server uses CommonJS (`"type": "commonjs"` in `package.json`). Keep require() style when editing `server.js`.
- Express version used is v5.x; be mindful of middleware differences from v4 in any advanced edits.
- Static files are served with `app.use(express.static(path.join(__dirname)))` and a fallback `app.get('/*path', ...)` sends `index.html` — keep SPA routing intact.
- When adding DB queries for the current user, create the user-scoped client (see above) so Row-Level Security (RLS) behaves as expected.
- Charts and UI styling are centralized in `script.js` (chartOptions, updateChart usages). Preserve the shared `chartOptions` structure to keep UX consistent.

## Files to inspect for context
- `server.js` — server API patterns, auth checks, Supabase client usage, endpoints: `/api/signup`, `/api/login`, `/api/verify`, `/api/history` (POST/GET/DELETE).
- `script.js` — all frontend logic: calculators (SIP, EMI, CI, Budget, Tax), chart setup, `saveCalculation`, `loadHistory`, and how `localStorage.auth_token` is used.
- `database_setup.sql` — DB schema and columns (useful when modifying insert/select queries).
- `package.json` — scripts and dependency versions (Supabase SDK v2.x, Express v5.x).

## What to avoid changing silently
- Don't change the auth token key in `localStorage` without updating all client+server checks (`auth_token`).
- Don't remove the fallback route that serves `index.html` (it's required for client-side navigation).

## Small examples of recommended edits
- To add a new calculation type: add UI + chart handling in `script.js`, follow the input/result object shape when calling `/api/history`.
- To add a protected endpoint: copy the token verification block from existing endpoints, then use `userSupabase` for DB operations.

## When asking for human review
- If you change Supabase RLS or schema, mention `database_setup.sql` diffs and include the new column names and types.
- If you change token storage/key, update both server and `script.js` and note where the token is read/written.

If anything above is unclear or you want more examples (e.g., a new endpoint template or a concrete DB schema snippet), tell me which area to expand.
