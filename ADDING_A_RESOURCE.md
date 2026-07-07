# Aggiungere una risorsa al gestionale

Ricetta per aggiungere una nuova risorsa (es. "clienti", "ordini", "spese")
partendo dal template. I passi sono sempre gli stessi; l'esempio vivo del
pattern completo è la risorsa **Utenti** (`server/controllers/users.controller.js`
+ `client/src/pages/Users.jsx`).

> Se la risorsa ha relazioni (FK), filtri, un owner, stati o statistiche,
> le ricette pronte sono in [`PATTERNS.md`](PATTERNS.md).

## 1. Database (Supabase)

1. Leggi `server/database/schema.md` e `schema.sql`.
2. Crea la tabella su Supabase seguendo le convenzioni: prefisso del progetto,
   `id uuid` PK con `gen_random_uuid()`, `created_at timestamptz default now()`.
3. Aggiorna **sia** `schema.sql` **sia** `schema.md`, e registra la modifica in
   `server/database/CHANGELOG.md` con il numero progressivo (`#00N`).

## 2. Backend (`server/`)

1. **Model** — `models/<risorsa>.model.js`: solo accesso dati Supabase.
   Costante `TABLE_NAME` in testa; ogni funzione lancia un sentinel
   `Error("DATABASE_*_ERROR")` in caso di errore. Nessuna validazione o HTTP.
2. **Controller** — `controllers/<risorsa>.controller.js`: esporta un
   `express.Router()`. Qui vivono routing, validazione input (usa i validator
   in `utils/`), regole di business e risposte HTTP nel formato
   `{ ok: true, ... }` / `{ ok: false, error }` (errori in italiano).
   - Rotte protette: middleware `protect` (`middleware/auth.js`).
   - Rotte solo-admin: aggiungi anche `isAdmin` (`middleware/isAdmin.js`).
3. **Mount** — in `server.js`: `app.use("/<risorsa>", require("./controllers/<risorsa>.controller"));`
4. **Documentazione** — aggiungi ogni rotta a `server/ENDPOINTS.md` nella
   stessa modifica.
5. **Collection Postman** — aggiungi una cartella con le richieste della
   risorsa a `server/postman_collection.json` (stesso pattern delle cartelle
   esistenti: `{{baseUrl}}` + Bearer `{{token}}` ereditato dalla collection).
6. **Seed** — se la risorsa serve ai casi d'uso da testare, popola dati
   realistici in `server/database/seed.js` (stati diversi, più utenti, casi
   utili a filtri e statistiche).

## 3. Frontend (`client/`)

1. **Service** — `src/services/<risorsa>Service.js`: wrappa le chiamate con
   l'istanza `api` (`src/api/client.js`), fa l'unwrap della risposta
   (es. `return res.data.items`) e rilancia gli errori come `Error(message)`.
2. **Pagina** — `src/pages/<Risorsa>.jsx` copiando il pattern di
   `src/pages/Users.jsx`:
   - `useFetch` per la lista + `useMutation` per create/update/delete;
   - sottocomponente `*Form` inline guidato da `formState` locale;
   - `Modal` per crea/modifica e un altro per il dettaglio;
   - validazione client-side dentro la mutation fn (throw per far emergere
     l'errore) usando i validator di `src/utils/validators/`;
   - `refetch()` in `onSuccess` + toast (`showSuccess`/`showError`).
3. **Rotta** — in `App.jsx`, dentro `PrivateRoute` → `AppLayout`.
4. **Sidebar** — voce in `MENU_ITEMS` in `src/components/Side.jsx`
   (icona lucide + label + path).
5. **Label tabella** — mappa `<RISORSA>_COLUMN_LABELS` in
   `src/constants/columnLabels.js`.

## Personalizzare il template (una tantum, a inizio progetto)

- Nome e logo app: `client/src/constants/app.js` + `<title>` in `client/index.html`.
- Prefisso tabelle: scegli il prefisso del progetto e allinea le costanti
  `TABLE_NAME` nei models (vedi `server/database/schema.md`).
- `.env` di entrambi i lati (copiando i `.env.example`).
