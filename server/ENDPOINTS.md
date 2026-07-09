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

GET /ticket
GET /ticket/:id
POST /ticket
PUT /ticket/:id
DELETE /ticket/:id
PUT /ticket/:id/prendi-in-carico
PUT /ticket/:id/risolvi
PUT /ticket/:id/rifiuta

## CATEGORIES

GET /api/categorie

## STATS

GET /api/statistiche/ticket?mese=2026-05&categoriaId=1&tecnicoId=3

## UTILITY

GET /health
