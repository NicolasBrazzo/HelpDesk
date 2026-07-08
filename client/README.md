# Help Desk — Client

Frontend SPA (client-side rendering) del gestionale **Gestione dei ticket di
assistenza tecnica**. Consuma le API del backend Express (`../server`) e gestisce
autenticazione, dashboard per ruolo, apertura e gestione dei ticket, riepilogo e
statistiche.

## Stack

React 19 + Vite + React Router 7 + Tailwind CSS v4 + shadcn/ui (Radix). JavaScript
(JSX), non TypeScript. Chiamate HTTP con Axios tramite l'istanza unica
`src/api/client.js` (inietta il token, normalizza gli errori).

## Avvio

Prerequisito: backend avviato (vedi `../server`) e file `.env` configurato.

```bash
npm install
npm run dev       # dev server Vite (http://localhost:5173)
```

Altri script:

```bash
npm run build     # build di produzione
npm run preview   # serve il bundle buildato
npm run lint      # ESLint (flat config in eslint.config.js)
```

## Ambiente

Copiare `.env.example` in `.env`:

| Variabile | Descrizione |
|-----------|-------------|
| `VITE_API_URL` | base URL del backend (es. `http://localhost:3000`), letta da `src/api/client.js` |

> Le variabili `VITE_*` sono compilate nel bundle: dopo averle cambiate, rilanciare
> `dev`/`build`.

## Ruoli

L'utente è **richiedente** o **tecnico di supporto** (nel modello dati:
`isAdmin = false` / `true`). La dashboard e le azioni disponibili dipendono dal
ruolo dell'utente autenticato; l'autorizzazione vera è comunque applicata lato
server.

## Dove mettere le mani

- `src/constants/app.js` — nome/logo app, etichette ruoli e testi della home.
- `src/pages/` — pagine (il pattern di riferimento è `Users.jsx`; le pagine di
  dominio Ticket / Statistiche si costruiscono copiandolo).
- `src/services/` — un modulo per risorsa che wrappa le chiamate API.
- `src/components/` — componenti riutilizzabili (`DataTable`, `FilterBar`,
  `Modal`, `Loader`, `Side`, `PrivateRoute`) e primitive shadcn in `ui/`.

Per aggiungere una risorsa lato client vedi
[`../ADDING_A_RESOURCE.md`](../ADDING_A_RESOURCE.md) (sezione Frontend) e i
pattern in [`../PATTERNS.md`](../PATTERNS.md). L'architettura completa è in
[`../CLAUDE.md`](../CLAUDE.md).
