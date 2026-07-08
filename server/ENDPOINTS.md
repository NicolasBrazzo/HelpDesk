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

Create dal seed (`npm run seed` da dentro `server/`, rilanciabile senza duplicati).
Ricorda: `isAdmin = true` → **Tecnico di supporto**, `isAdmin = false` → **Utente richiedente**.

| Ruolo               | `isAdmin` | Email             | Password     |
|---------------------|-----------|-------------------|--------------|
| Tecnico di supporto | `true`    | `admin@test.it`   | `Admin123!`  |
| Utente richiedente  | `false`   | `utente@test.it`  | `Utente123!` |

> Quando il seed verrà esteso con i dati di dominio (categorie + ticket con stati
> diversi), converrà usare email più parlanti (es. `tecnico@test.it`,
> `richiedente@test.it`) e più utenti per coprire filtri e statistiche.

## Convenzioni generali

- **Base URL**: definito dalla porta del server (`PORT`, default `3000`). Es. `http://localhost:3000`.
- **Formato**: tutte le richieste e risposte usano JSON (`Content-Type: application/json`).
- **Formato risposta**: ogni risposta ha la forma `{ "ok": true, ... }` in caso di successo, oppure `{ "ok": false, "error": <string | string[]> }` in caso di errore.
- **Autenticazione**: le rotte protette richiedono l'header `Authorization: Bearer <token>`. Il token JWT si ottiene tramite `POST /auth/login` o `POST /auth/register`.
- **Autorizzazione tecnico**: alcune rotte richiedono che l'utente autenticato sia un tecnico di supporto (`isAdmin: true`) — middleware `isAdmin` in `middleware/isAdmin.js`, da usare dopo `protect`. Riguardano la gestione utenti (`/users`) e, nel dominio, presa in carico / risoluzione / rifiuto dei ticket e le statistiche.

### Errori comuni di autenticazione

| Codice | Quando |
|--------|--------|
| `401 Non autenticato` | Header `Authorization` assente o non nel formato `Bearer <token>` |
| `401 Token non valido o scaduto` | Token JWT non verificabile o scaduto |
| `403 Accesso non autorizzato` | Rotta riservata ai tecnici richiesta da un utente non tecnico |
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

> ℹ️ **Ruolo in registrazione**: la rotta accetta `isAdmin` (`true` = Tecnico di
> supporto, `false` = Utente richiedente) senza vincoli, quindi l'utente sceglie
> il proprio ruolo. La traccia lo consente esplicitamente per la simulazione
> ("*è ammesso che la registrazione consenta di scegliere il ruolo*"), così un
> valutatore può testare entrambi i ruoli. Da segnalare nella consegna.

**Body**
| Campo | Tipo | Obbligatorio | Note |
|-------|------|--------------|------|
| `first_name` | string | sì | min 2 caratteri dopo il trim, solo lettere/spazi/apostrofi/trattini |
| `last_name` | string | sì | come `first_name` |
| `email` | string | sì | |
| `password` | string | sì | |
| `repeatPassword` | string | sì | deve coincidere con `password` |
| `isAdmin` | boolean | no | ruolo: `true` = Tecnico, `false` = Richiedente. Default `false`; se presente deve essere un booleano |

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

Tutte le rotte richiedono autenticazione **e ruolo tecnico** (`isAdmin: true`). Gestione degli account (ereditata dal template): utile per amministrare tecnici e richiedenti.

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

## Dominio — rotte da implementare (blueprint)

> ⚠️ Le rotte qui sotto **non sono ancora implementate**: sono il progetto delle
> API di dominio da costruire seguendo [`../ADDING_A_RESOURCE.md`](../ADDING_A_RESOURCE.md)
> e [`../PATTERNS.md`](../PATTERNS.md). Man mano che vengono realizzate, spostarle
> tra le rotte attive e aggiornare la collection Postman.
>
> **Convenzione path**: per coerenza con `/auth` e `/users`, i router di dominio
> si montano senza prefisso `/api` (`/ticket`, `/categorie`, `/statistiche`). La
> traccia li elenca come `/api/ticket`, `/api/categorie`, `/api/statistiche/...`:
> le due forme sono funzionalmente equivalenti.

### Categorie — `/categorie`

#### `GET /categorie`
Elenco delle categorie disponibili. **Protetta.**

**Risposte**
- `200` → `{ ok: true, categories }`

### Ticket — `/ticket`

Tutte protette (`protect`). Le rotte azione (presa in carico / risoluzione /
rifiuto) richiedono anche il ruolo tecnico (`isAdmin`).

#### `GET /ticket`
Elenco ticket. Il richiedente vede **solo i propri**; il tecnico vede **tutti**.

**Query (filtri, opzionali)**
| Param | Valori | Note |
|-------|--------|------|
| `status` | `open` \| `in_progress` \| `resolved` \| `rejected` | |
| `categoryId` | uuid | |
| `priority` | `low` \| `medium` \| `high` \| `urgent` | |
| `month` | `YYYY-MM` | filtra sulla data di apertura |
| `requesterId` | uuid | **solo tecnico**; per il richiedente è forzato a sé stesso |

**Risposte**
- `200` → `{ ok: true, tickets }`

#### `GET /ticket/:id`
Dettaglio di un ticket. Il richiedente può vedere solo i propri (404 altrimenti).

**Risposte**
- `200` → `{ ok: true, ticket }`
- `404` → ticket non trovato / non accessibile

#### `POST /ticket`
Crea un ticket. `requester_id` dal token, `status` iniziale `open`.

**Body**
| Campo | Tipo | Obbligatorio | Note |
|-------|------|--------------|------|
| `title` | string | sì | non solo spazi |
| `description` | string | sì | non vuota |
| `category_id` | uuid | sì | categoria esistente |
| `priority` | string | sì | tra le priorità previste |

**Risposte**
- `201` → `{ ok: true, ticket }`
- `400` → validazione fallita (titolo/descrizione/categoria/priorità)

#### `PUT /ticket/:id`
Modifica un ticket. Consentita **solo al richiedente proprietario** e **solo se
`status = open`** (non ancora preso in carico).

**Body**: come `POST` (campi modificabili: `title`, `description`, `category_id`, `priority`).

**Risposte**
- `200` → `{ ok: true, ticket }`
- `400` → validazione fallita
- `404` → ticket non trovato / non proprio
- `409` → ticket già preso in carico (non modificabile)

#### `DELETE /ticket/:id`
Elimina un ticket. Consentita **solo al richiedente proprietario** e **solo se
`status = open`**.

**Risposte**
- `200` → `{ ok: true, ticket }`
- `404` → ticket non trovato / non proprio
- `409` → ticket già preso in carico (non eliminabile)

#### `PUT /ticket/:id/prendi-in-carico`
Presa in carico. **Solo tecnico.** `open → in_progress`; assegna il ticket al
tecnico e imposta `taken_in_charge_at`.

**Risposte**
- `200` → `{ ok: true, ticket }`
- `409` → transizione non ammessa (ticket non `open`)

#### `PUT /ticket/:id/risolvi`
Risoluzione. **Solo tecnico.** `in_progress → resolved`; imposta `resolved_at`.

**Body**
| Campo | Tipo | Obbligatorio | Note |
|-------|------|--------------|------|
| `worked_hours` | number | sì | > 0 |
| `resolution_note` | string | no | se presente, non solo spazi |

**Risposte**
- `200` → `{ ok: true, ticket }`
- `400` → ore lavorate ≤ 0 / nota non valida
- `409` → transizione non ammessa (ticket non `in_progress`)

#### `PUT /ticket/:id/rifiuta`
Rifiuto. **Solo tecnico.** `open | in_progress → rejected`.

**Body**
| Campo | Tipo | Obbligatorio | Note |
|-------|------|--------------|------|
| `rejection_reason` | string | sì | motivazione valorizzata |

**Risposte**
- `200` → `{ ok: true, ticket }`
- `400` → motivazione mancante
- `409` → transizione non ammessa (ticket già terminale)

### Statistiche — `/statistiche`

#### `GET /statistiche/ticket`
Riepilogo aggregato per **mese e categoria**. **Solo tecnico.**

**Query (filtri, opzionali)**: `mese` (`YYYY-MM`), `categoriaId`, `priorita`, `tecnicoId`.

**Risposte**
- `200` → `{ ok: true, stats }` — ogni riga:
  `{ mese, categoria, numeroAperti, numeroRisolti, numeroRifiutati, tempoMedioRisoluzioneOre, totaleOreLavorate }`
- `403` → utente non tecnico

---

## Utility

### `GET /health`
Health check del server. **Pubblica.**

**Risposte**
- `200` → `{ status: "ok" }`
