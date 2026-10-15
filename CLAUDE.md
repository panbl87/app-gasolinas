# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Express + TypeScript REST API for crowdsourced fuel prices in Ecuador (Quito), backed by Supabase (Postgres). Code, comments, API fields and error messages are in Spanish; keep new code consistent with that.

## Repositories

The project is split into two folders, each its own git repo (deliberately not a monorepo — they deploy separately):

| Part | Local folder | GitHub | Dev URL |
|---|---|---|---|
| Backend (this repo) | `C:\Python Notebooks\app-gasolinas-backend` | `panbl87/app-gasolinas` | http://localhost:3000 |
| Frontend (React + Vite) | `C:\Python Notebooks\app-gasolinas-frontend` | `panbl87/app-gasolinas-frontend` | http://localhost:5173 (admin panel at `/admin`) |

- Claude Code is usually opened in the backend folder but may read and edit the frontend folder too; use absolute paths there.
- The frontend calls this API at `http://localhost:3000/api` (or the LAN IP for phone testing). Changes to API routes or response shapes usually need matching frontend changes.
- Commit and push in each folder separately — a change touching both means two commits in two repos.

`PROGRESS.md` is the running handoff log (what was done, pending tasks, decisions). Read it at the start of a session and update it when finishing significant work.

## Commands

```bash
npm run dev     # nodemon + ts-node on src/server.ts, port 3000 (binds 0.0.0.0)
npm run build   # tsc -> dist/
npm start       # node dist/server.js
npx tsc --noEmit  # type-check only
```

There are no tests: `npm test` points to jest, but jest is not installed and no test files exist. Verify changes by running the server and hitting endpoints with curl (`GET /health`, then `/api/...`).

Required env (`.env`, see `.env.example`): `SUPABASE_URL`, `SUPABASE_ANON_KEY` (process exits at import time without them), `SUPABASE_SERVICE_KEY`, `ADMIN_TOKEN` (admin routes return 503 without it), `CORS_ORIGIN`. `GOOGLE_MAPS_API_KEY` is used by geocoding but missing from `.env.example`.

## Architecture

- `src/server.ts` — mounts routers under `/api/{gasolineras,precios,usuarios,geocoding,admin}`, then `notFoundHandler` and `errorHandler` last. CORS allows any origin when `NODE_ENV=development`, otherwise the `CORS_ORIGIN` list. `vercel.json` routes all paths to `src/server.ts`.
- `src/routes/*` → `src/services/*` → Supabase. Route handlers are wrapped in `asyncHandler` and signal errors by throwing `AppError(status, message, CODE)` (`src/middleware/errorHandler.ts`). Responses are `{ success: true, data, ... }` or `{ success: false, error: CODE, message }`.
- Two Supabase clients in `src/config/supabase.ts`: `supabaseClient` (anon key, subject to RLS) is used by all services; `supabaseAdmin` (service key, bypasses RLS) is used directly by `src/routes/admin.ts`, which has no service layer.
- Admin auth: `requireAdmin` in `admin.ts` compares `X-Admin-Token` or `Authorization: Bearer` against `ADMIN_TOKEN` with `timingSafeEqual`.

### Data model (key non-obvious points)

- **`precios` holds both user reports and validated prices**, distinguished by `es_verificado`. "Pending" reports = `es_verificado = false`. Admin "rechazar" **deletes** the row and writes the reason to `auditoria`. "Validated today/this week" stats use `updated_at` in Ecuador time (UTC-5, week starts Monday).
- Admin-created prices use `reportado_por = 00000000-0000-0000-0000-000000000000`.
- Fuel types: `'Extra' | 'Super' | 'Diesel' | 'Ecopaís'` (note the accent).
- **Per-fuel price ranges are duplicated in 4 places** and must be changed together: `src/routes/precios.ts`, `src/routes/admin.ts`, and in the frontend `ReportarPrecioModal.jsx` and `AdminPanel.jsx`.
- `database.sql` is out of date vs. the live DB (missing `precios.fuente`, `precios.cantidad_reportes`, `gasolineras.estado`). Schema changes are applied manually in the Supabase SQL Editor; append them to `database.sql` afterwards.
- `/api/gasolineras/cercanas` loads all stations and filters in JS with a flat-earth approximation (~111 km/degree); `/cercanas` and `/crear-pendiente` must stay registered before `/:id`.
- City price averages come from the Postgres function `promedios_precios_ciudad` (via `rpc`).

## Other files

- `formulario-recoleccion-precios.html`, `HTML Forms/` — standalone HTML price-collection forms, not part of the API.
- `data/` — source spreadsheet of Quito stations and reference price photos.
