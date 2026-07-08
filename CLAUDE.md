# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Full-stack **helpdesk / ticket-management app** — *"Gestione dei ticket di assistenza tecnica"*. Requesters (*utenti richiedenti*) open support tickets; support technicians (*tecnici di supporto*) take them in charge, resolve or reject them, and consult aggregate statistics. It is built on a reusable management-app template that ships the universal infrastructure (JWT auth, user management, reusable hooks/components); the ticket domain (categories + tickets) is added on top following the recipe in [`ADDING_A_RESOURCE.md`](ADDING_A_RESOURCE.md) and the copy-ready recipes in [`PATTERNS.md`](PATTERNS.md).

Monorepo with two independently-installed packages: `client/` (React SPA) and `server/` (Express REST API backed by Supabase/PostgreSQL). There is no root `package.json` — install and run each side separately. User-facing strings and code comments are in Italian; database table and column names are in English with the `hd_` prefix.

Deployment (Railway for the server, Vercel for the client) is documented step-by-step in [`DEPLOY.md`](DEPLOY.md).

## Mandatory working rules

**Database changes:**
- Before doing ANYTHING that touches the database (schema changes, new tables/columns, altering constraints, or even reasoning about the data model), first read the files in `server/database/` (`schema.md` and `schema.sql`).
- Every time you make a change to the database, record it in `server/database/CHANGELOG.md`, tagged with the sequential change number (`#001`, `#002`, …). Keep `schema.md` and `schema.sql` in sync as well — they are maintained by hand.

**New resources:**
- To add a new resource (table + endpoints + page), follow the step-by-step recipe in [`ADDING_A_RESOURCE.md`](ADDING_A_RESOURCE.md). The live reference implementation of the full CRUD pattern is the **Users** resource (`server/controllers/users.controller.js` + `client/src/pages/Users.jsx`) — copy it when building the **Tickets** and **Categories** resources.
- For the domain patterns this app relies on — FK joins in lists (ticket → category, requester, technician), query-string filters (status/category/priority/month/requester), ownership checks (a requester sees only their own tickets), status transitions (`open → in_progress → resolved`, `open|in_progress → rejected`), statistics/aggregations — use the copy-ready recipes in [`PATTERNS.md`](PATTERNS.md).

**Endpoints:**
- Whenever you need to consult the API to debug an issue or to add/modify routes, always read [`server/ENDPOINTS.md`](server/ENDPOINTS.md) first — it is the reference for every backend route.
- If you add, remove, or modify an endpoint, you MUST update `server/ENDPOINTS.md` **and** the Postman collection (`server/postman_collection.json`) to reflect the change in the same edit.

## Commands

Run these from inside `client/` or `server/` respectively.

**Client** (`client/`):
- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run lint` — ESLint (flat config in `eslint.config.js`)
- `npm run preview` — serve the built bundle

**Server** (`server/`):
- `npm run dev` — nodemon (auto-reload) on `server.js`
- `npm start` — plain `node server.js`
- `npm run seed` — seeds test users, one technician + one requester (idempotent; credentials listed in `server/ENDPOINTS.md`). Domain seed data (categories + sample tickets with different statuses, for filters/statistics) gets added to `server/database/seed.js` as those resources are built.

There is no test suite in either package.

## Environment

Both sides require `.env` files (copy from the committed `.env.example`); the app throws on startup if key vars are missing.

- `server/.env`: `PORT`, `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET` (required — `config/jwt.js` fails fast if absent), `FRONTEND_URL` (CORS origin), `NODE_ENV`. Optional: `JWT_EXPIRES_IN` (default `7d`), `SALT_ROUNDS` (default `10`).
- `client/.env`: `VITE_API_URL` — base URL of the backend, consumed by `src/api/client.js`.

## Backend architecture

Layered, CommonJS. Request flows: **route/controller → model → Supabase**.

- `server.js` — app entry. Mounts routers under `/auth` and `/users`; plus `/health`, a 404 handler, and a global error handler. The domain routers (tickets, categories, statistics) get mounted here as they are built.
- `controllers/*.controller.js` — these ARE the Express routers (each exports `express.Router()`), not thin controllers. They own routing, input validation, business rules, and HTTP responses. Business logic lives here, not in models.
- `models/*.model.js` — pure Supabase data access. Every function queries a table (name in a `TABLE_NAME` constant at the top) and throws a sentinel `Error("DATABASE_*_ERROR")` on failure. No validation or HTTP concerns.
- `config/db_connection.js` — single shared Supabase client (exported as `supabase`), imported by all models.
- `config/jwt.js` — centralizes JWT secret/expiry/salt config.
- `middleware/auth.js` — exported as `protect`. Verifies `Authorization: Bearer <token>`, attaches decoded payload (`{ sub, email, isAdmin, first_name, last_name }`) to `req.user`. Applied per-route, not globally.
- `middleware/isAdmin.js` — role guard, used after `protect` (checks `req.user.isAdmin`, else 403). In this app `isAdmin` means **support technician**, so this guard protects the technician-only routes (take-in-charge, resolve, reject, statistics).
- `utils/validate*.js` — standalone validators reused across controllers (`validateEmail`, `validatePassword`, `validateName`). Also includes ready-to-use Italian business validators (`validateCodiceFiscale`, `validatePartitaIva`, `validatePhoneNumber`) even where not yet wired to a route.

**Conventions to follow when adding endpoints:**
- Every response is JSON shaped `{ ok: true, ... }` or `{ ok: false, error }`. `error` is usually a string but can be an **array** (e.g. `validatePassword` returns a list of failures) — the client joins arrays with `; `.
- Protected routes: pass `protect` as route middleware. Technician-only routes additionally use `isAdmin` (`middleware/isAdmin.js`).
- Validate in the controller, then delegate persistence to the model.
- Error strings are Italian and returned to the user.

**Data model** (see `server/database/schema.sql` + `schema.md`, kept in sync manually — they are reconstructed from app code, NOT exported from Supabase; changes are logged in `server/database/CHANGELOG.md`). All tables use the `hd_` prefix and English identifiers:
- `hd_users` (uuid id, email unique, bcrypt password, `isAdmin` bool, first_name, last_name, created_at). `isAdmin = true` → **Tecnico di supporto**, `false` → **Utente richiedente**.
- `hd_categories` (uuid id, description unique, created_at) — ticket categories, read-only for the app (`GET /api/categorie`), seeded with realistic values.
- `hd_tickets` (uuid id, title, description, category_id FK, priority, status, requester_id FK, assigned_technician_id FK, taken_in_charge_at, resolved_at, worked_hours, resolution_note, rejection_reason, created_at = **opening date**). Statuses `open|in_progress|resolved|rejected`; priorities `low|medium|high|urgent`; key CHECK/date constraints documented in `schema.md`.
- ⚠️ **Migration note:** template code still uses `TABLE_NAME = "T_Users"` (`server/models/user.model.js`, `server/database/seed.js`); align it to `"hd_users"` when building this project's models/seed.

## Auth model

Stateless JWT. Login/register return a token; the client stores it in `localStorage` and sends it via an Axios request interceptor. `logout` is client-side only (removes the token). Public `/auth/register` requires `first_name`, `last_name` (validated with `validateName`: non-empty, min 2 chars after trim), `email`, `password`, `repeatPassword`, and accepts an optional `isAdmin` boolean (default `false`). Here **`isAdmin` is the role**: `true` = Tecnico di supporto, `false` = Utente richiedente — registration lets the user pick the role, which the track explicitly allows for the simulation ("*è ammesso che la registrazione consenta di scegliere il ruolo*"). There is no restriction on self-registering as a technician: acceptable for the exam simulation (and it lets a grader test every role), but call it out in the consegna. Technicians can also be created/promoted through the technician-guarded `/users` endpoints.

## Frontend architecture

React 19 + Vite + React Router 7 + Tailwind CSS v4 + shadcn/ui (Radix) components. JavaScript (JSX), not TypeScript.

- `src/api/client.js` — the single configured Axios instance. Request interceptor injects the bearer token; response interceptor **normalizes all errors** to `{ status, message }` (joins array errors, handles network-down). Always call the API through this instance.
- `src/context/AuthContext.jsx` — `AuthProvider` + `useAuth()`. On mount, validates the stored token via `/auth/me` and exposes `{ user, loading, login, register, logout }`. `user` is `undefined` while loading, then `null` or a user object.
- `src/components/PrivateRoute.jsx` — route guard; renders `<Outlet/>` when authenticated, redirects to `/login` otherwise. In `App.jsx`, protected pages nest inside `PrivateRoute` → `AppLayout`. Public routes: `/` (HomePage, GSAP-animated hero), `/login` (Login), `/register`.
- `src/services/*Service.js` — one module per resource wrapping `api` calls; unwrap the response (e.g. return `res.data.users`) and re-throw errors as plain `Error(message)`.
- `src/hooks/useFetch.js` — for GETs; auto-runs on mount/deps change, returns `{ data, isLoading, error, refetch }`.
- `src/hooks/useMutation.js` — for POST/PUT/DELETE; manual `mutate(...)`, returns `{ mutate, isLoading, error, reset }`, supports `{ onSuccess, onError }`. (Note: `@tanstack/react-query` is also installed and wraps the app, but pages currently use these custom hooks.)
- `src/utils/toast.js` — `showSuccess` / `showError` wrappers over react-toastify (`<ToastContainer/>` mounted in `App.jsx`).
- `src/utils/validators/` — client-side validators mirroring the server's; re-exported via `validators/index.js`.
- `src/constants/columnLabels.js` — Italian column-header label maps for the tables.
- `src/constants/app.js` — app name/logo branding, `ROLE_LABELS` (display names for the isAdmin true/false roles, used by Register/Users/Dashboard), and `HOME` (all copy for the public hero: title/subtitle/CTAs/demo stats & ledger rows). Customize here (plus `<title>` in `index.html`) when starting a new project from the template — the landing uses the shared shadcn tokens, plus the `--font-display`/`--font-data` fonts in `index.css`.
- `src/components/ui/` — shadcn/ui primitives (configured via `components.json`); other reusable components (`DataTable`, `FilterBar`, `Modal`, `Loader`, `Side`, `PrivateRoute`) live in `src/components/`. `FilterBar` is the config-driven filter strip meant to pair with `useFetch` deps (usage in `PATTERNS.md`).

**Page pattern** (see `src/pages/Users.jsx` as the reference): a page composes `useFetch` for the list + `useMutation` for create/update/delete, an inline `*Form` subcomponent driven by local `formState`, a `Modal` for create/edit and another for view-details, client-side validation inside the mutation fn (throw to surface `saveError`), and `refetch()` in `onSuccess`.

**Imports:** the `@/` alias maps to `client/src/` (configured in both `vite.config.js` and `jsconfig.json`). Both `@/...` and relative imports are used in the codebase.
