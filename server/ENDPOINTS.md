# API Endpoints

## AUTH

POST /auth/register
POST /auth/login
GET /auth/me
POST /auth/logout

## USERS

GET /users
GET /users/:id
POST /users
PUT /users/:id
DELETE /users/:id

## TICKET

GET /ticket?status=&categoryId=&priority=&month=YYYY-MM&dateFrom=&dateTo=&requesterId=&page=1&limit=20&sort=created_at&order=desc
GET /ticket/:id
POST /ticket
PUT /ticket/:id
DELETE /ticket/:id
PATCH /ticket/:id/take-in-charge
PUT /ticket/:id/risolvi
PUT /ticket/:id/rifiuta

> **`GET /ticket` — elenco paginato con filtri** (standard `FILTERS_BE.md`).
> Tutti i parametri sono opzionali:
> - `status` — `open` | `in_progress` | `resolved` | `rejected`
> - `categoryId` — uuid categoria
> - `priority` — `low` | `medium` | `high` | `urgent`
> - `month` — `YYYY-MM` (filtra sulla **data di apertura**; ha la precedenza sul periodo)
> - `dateFrom` / `dateTo` — periodo sulla data di apertura (ISO; ignorati se `month` è valido)
> - `requesterId` — uuid richiedente, **onorato solo per i tecnici**. Un utente richiedente
>   vede esclusivamente i propri ticket (il filtro è forzato a sé stesso).
> - `page` (default 1), `limit` (default 20, max 100), `sort`
>   (`created_at` | `priority` | `status` | `taken_in_charge_at` | `resolved_at`), `order` (`asc` | `desc`).
>
> Risposta: `{ data, pagination: { total, page, limit, totalPages } }` — `total` rispetta i filtri.

## CATEGORIES

GET /api/categorie

## STATS

GET /api/statistiche/ticket?mese=2026-05&categoriaId=1&tecnicoId=3

## UTILITY

GET /health
