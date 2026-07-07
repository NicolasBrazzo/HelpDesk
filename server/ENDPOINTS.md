# API Endpoints

Documentazione delle rotte del backend Express.

> Questo file è il riferimento di ogni rotta del backend: se aggiungi, rimuovi
> o modifichi un endpoint, aggiorna questo file nella stessa modifica.

## Test delle API con Postman

Nel repo è committata la collection [`postman_collection.json`](./postman_collection.json)
(Postman → File → Import). Contiene tutte le rotte con la variabile `{{baseUrl}}`
(default `http://localhost:3000` — per il deploy sostituirla con il dominio del
backend) e `{{token}}`, valorizzata automaticamente dopo Login/Register.
Se aggiungi o modifichi un endpoint, aggiorna anche la collection.

## Credenziali di test

Create dal seed (`npm run seed` da dentro `server/`, rilanciabile senza duplicati):

| Ruolo  | Email             | Password     |
|--------|-------------------|--------------|
| Admin  | `admin@test.it`   | `Admin123!`  |
| Utente | `utente@test.it`  | `Utente123!` |

## Convenzioni generali

- **Base URL**: definito dalla porta del server (`PORT`, default `3000`). Es. `http://localhost:3000`.
- **Formato**: tutte le richieste e risposte usano JSON (`Content-Type: application/json`).
- **Formato risposta**: ogni risposta ha la forma `{ "ok": true, ... }` in caso di successo, oppure `{ "ok": false, "error": <string | string[]> }` in caso di errore.
- **Autenticazione**: le rotte protette richiedono l'header `Authorization: Bearer <token>`. Il token JWT si ottiene tramite `POST /auth/login` o `POST /auth/register`.
- **Autorizzazione admin**: alcune rotte (tutte sotto `/users`) richiedono che l'utente autenticato abbia `isAdmin: true` (middleware `isAdmin` in `middleware/isAdmin.js`, da usare dopo `protect`).

### Errori comuni di autenticazione

| Codice | Quando |
|--------|--------|
| `401 Non autenticato` | Header `Authorization` assente o non nel formato `Bearer <token>` |
| `401 Token non valido o scaduto` | Token JWT non verificabile o scaduto |
| `403 Accesso non autorizzato` | Rotta admin richiesta da un utente non admin |
| `404 Rotta non trovata` | Endpoint inesistente |
| `500 Errore interno del server` | Errore non gestito lato server |

---

## Auth — `/auth`

### `POST /auth/login`
Autenticazione utente. **Pubblica.**

**Body**
| Campo | Tipo | Obbligatorio |
|-------|------|--------------|
| `email` | string | sì |
| `password` | string | sì |

**Risposte**
- `200` → `{ ok: true, token }`
- `400` → campi mancanti
- `401` → credenziali non valide

---

### `POST /auth/register`
Registrazione pubblica. **Pubblica.**

> ⚠️ **Attenzione**: la rotta accetta `isAdmin` senza alcun vincolo, quindi
> chiunque può registrarsi come amministratore. Scelta voluta per il template
> (comodità in sviluppo/demo): nei progetti derivati va protetta (es. codice di
> registrazione, whitelist, o rimozione del campo).

**Body**
| Campo | Tipo | Obbligatorio | Note |
|-------|------|--------------|------|
| `first_name` | string | sì | min 2 caratteri dopo il trim, solo lettere/spazi/apostrofi/trattini |
| `last_name` | string | sì | come `first_name` |
| `email` | string | sì | |
| `password` | string | sì | |
| `repeatPassword` | string | sì | deve coincidere con `password` |
| `isAdmin` | boolean | no | default `false`; se presente deve essere un booleano |

**Validazioni**: nome e cognome conformi a `validateName` (mai vuoti o solo spazi); formato email valido; password conforme alle regole di `validatePassword`; `password === repeatPassword`; `isAdmin` (se presente) booleano.

**Risposte**
- `201` → `{ ok: true, token }`
- `400` → campi mancanti, nome/cognome non validi, email non valida, password non valida, password non coincidenti, `isAdmin` non booleano
- `409` → email già in uso

---

### `GET /auth/me`
Restituisce i dati dell'utente autenticato (dal token). **Protetta.**

**Risposte**
- `200` → `{ ok: true, user }`
- `401` → non autenticato / token non valido

---

### `POST /auth/logout`
Logout. Stateless: risponde semplicemente con successo (l'invalidazione del token è a carico del client). **Pubblica.**

**Risposte**
- `200` → `{ ok: true }`

---

## Users — `/users`

Tutte le rotte richiedono autenticazione **e privilegi di amministratore** (`isAdmin: true`).

### `GET /users`
Elenco di tutti gli utenti.

**Risposte**
- `200` → `{ ok: true, users }`
- `403` → accesso non autorizzato

---

### `GET /users/:id`
Singolo utente per ID.

**Risposte**
- `200` → `{ ok: true, user }`
- `404` → utente non trovato

---

### `POST /users`
Crea un nuovo utente.

**Body**
| Campo | Tipo | Obbligatorio | Note |
|-------|------|--------------|------|
| `first_name` | string | sì | conforme a `validateName` |
| `last_name` | string | sì | conforme a `validateName` |
| `email` | string | sì | formato `testo@dominio.tld` |
| `password` | string | sì | conforme a `validatePassword` |
| `isAdmin` | boolean | sì | deve essere un booleano |

**Risposte**
- `201` → `{ ok: true, user }`
- `400` → campi mancanti, nome/cognome, email o password non validi
- `409` → email già in uso

---

### `PUT /users/:id`
Aggiorna un utente. La `password` è opzionale (se presente viene validata e re-hashata). Un admin **non può** rimuovere i propri privilegi di amministratore.

**Body**
| Campo | Tipo | Obbligatorio | Note |
|-------|------|--------------|------|
| `first_name` | string | sì | conforme a `validateName` |
| `last_name` | string | sì | conforme a `validateName` |
| `email` | string | sì | |
| `isAdmin` | boolean | sì | |
| `password` | string | no | se presente, conforme a `validatePassword` |

**Risposte**
- `200` → `{ ok: true, user }`
- `400` → campi mancanti, nome/cognome non validi, password non valida
- `403` → tentativo di rimuovere i propri privilegi admin

---

### `DELETE /users/:id`
Elimina un utente.

**Risposte**
- `200` → `{ ok: true, user }`

---

## Utility

### `GET /health`
Health check del server. **Pubblica.**

**Risposte**
- `200` → `{ status: "ok" }`
