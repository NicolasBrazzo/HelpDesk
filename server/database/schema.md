# Struttura del Database — Help Desk

Backend dati: **Supabase (PostgreSQL)**. Lo schema reale vive su Supabase; questo
file è la documentazione leggibile (per umani e AI). Il file affiancato
[`schema.sql`](./schema.sql) è la fonte di verità tecnica/ricreabile.

> ⚠️ Documentazione mantenuta a mano. Dopo ogni modifica allo schema su Supabase,
> aggiornare **sia** questo file **sia** `schema.sql`, e registrare la modifica
> in [`CHANGELOG.md`](./CHANGELOG.md) con il numero progressivo (`#001`, `#002`, …).

## Convenzioni

- **Prefisso tabelle**: tutte le tabelle usano il prefisso `hd_` (help desk).
  Il nome deve combaciare con la costante `TABLE_NAME` nel model corrispondente
  dentro `server/models/`.
- **Lingua identificatori**: nomi di tabelle e colonne in **inglese**; le
  stringhe rivolte all'utente (descrizioni categorie, etichette di stato/ruolo)
  restano in italiano lato frontend.
- **Colonne standard**: ogni tabella include `id uuid` (PK, default
  `gen_random_uuid()`) e `created_at timestamptz` (default `now()`).
- **Ruoli**: il ruolo utente è modellato con il boolean `isAdmin` —
  `true` = **Tecnico di supporto**, `false` = **Utente richiedente**.
  Il middleware `isAdmin` (`server/middleware/isAdmin.js`) protegge quindi le
  rotte riservate ai tecnici (presa in carico, risoluzione, rifiuto, statistiche).

---

## Diagramma relazioni

```
                 requester_id (obbligatorio)
hd_users  ────────────────────────────────────►  hd_tickets  ◄──────  hd_categories
   ▲              assigned_technician_id            category_id
   └───────────────(nullable)──────────────────────┘
```

- `hd_tickets.requester_id` → `hd_users.id` — chi ha aperto il ticket (obbligatorio).
- `hd_tickets.assigned_technician_id` → `hd_users.id` — tecnico che lo ha preso
  in carico (nullable, valorizzato alla presa in carico).
- `hd_tickets.category_id` → `hd_categories.id` — categoria del ticket (obbligatoria).

> Due FK di `hd_tickets` puntano alla stessa tabella `hd_users` (richiedente e
> tecnico). Nei join di supabase-js vanno disambiguate indicando la colonna FK,
> es. `requester:requester_id ( … )` e `technician:assigned_technician_id ( … )`.

---

## Tabella: `hd_users`

Utenti che accedono all'applicazione: **richiedenti** (`isAdmin = false`) e
**tecnici di supporto** (`isAdmin = true`). La lista utenti espone solo
`id, email, isAdmin, first_name, last_name, created_at`
(la `password` non viene mai restituita al client).

| Colonna      | Tipo        | Null | Default             | Note                                            |
| ------------ | ----------- | ---- | ------------------- | ----------------------------------------------- |
| `id`         | uuid        | NO   | `gen_random_uuid()` | Primary key                                     |
| `email`      | text        | NO   | —                   | Univoca. Usata per login e lookup               |
| `password`   | text        | NO   | —                   | Hash bcrypt — **mai** in chiaro, mai esposta    |
| `isAdmin`    | boolean     | NO   | `false`             | `true` = Tecnico di supporto, `false` = Richiedente |
| `first_name` | text        | SÌ*  | —                   | Nome. *Obbligatorio a livello applicativo       |
| `last_name`  | text        | SÌ*  | —                   | Cognome. *Obbligatorio a livello applicativo    |
| `created_at` | timestamptz | NO   | `now()`             | Data creazione account                          |

**Vincoli**
- `email` UNIQUE.

**Validazione applicativa**
- `email`: formato email valido, univoca.
- `password` (prima dell'hash): min 6 caratteri, almeno 1 maiuscola, 1 numero, 1 carattere speciale.
- `first_name` / `last_name` (`validateName`): obbligatori, min 2 caratteri dopo il trim
  (quindi mai vuoti o solo spazi).
- In registrazione l'utente sceglie il ruolo (richiedente o tecnico) → mappa su `isAdmin`.

---

## Tabella: `hd_categories`

Categorie a cui associare un ticket. Sola lettura per l'applicazione
(`GET /api/categorie`); il CRUD non è richiesto dalla traccia. Popolate dal seed
con dati realistici.

| Colonna       | Tipo        | Null | Default             | Note                                  |
| ------------- | ----------- | ---- | ------------------- | ------------------------------------- |
| `id`          | uuid        | NO   | `gen_random_uuid()` | Primary key                           |
| `description` | text        | NO   | —                   | Nome categoria, univoco (rivolto all'utente) |
| `created_at`  | timestamptz | NO   | `now()`             | Data creazione                        |

**Vincoli**
- `description` UNIQUE.

**Valori iniziali (seed):** `Hardware`, `Software`, `Rete`,
`Account e accessi`, `Posta elettronica`, `Altro`.

---

## Tabella: `hd_tickets`

Ticket di assistenza. `created_at` funge da **data di apertura**.

| Colonna                  | Tipo         | Null | Default             | Note                                                        |
| ------------------------ | ------------ | ---- | ------------------- | ----------------------------------------------------------- |
| `id`                     | uuid         | NO   | `gen_random_uuid()` | Primary key                                                 |
| `title`                  | text         | NO   | —                   | Titolo del ticket (non solo spazi)                          |
| `description`            | text         | NO   | —                   | Descrizione del problema (non vuota)                        |
| `category_id`            | uuid         | NO   | —                   | FK → `hd_categories.id`                                     |
| `priority`               | text         | NO   | —                   | `low` \| `medium` \| `high` \| `urgent`                     |
| `status`                 | text         | NO   | `'open'`            | `open` \| `in_progress` \| `resolved` \| `rejected`         |
| `requester_id`           | uuid         | NO   | —                   | FK → `hd_users.id` (chi apre il ticket)                     |
| `assigned_technician_id` | uuid         | SÌ   | —                   | FK → `hd_users.id` (tecnico, valorizzato alla presa in carico) |
| `taken_in_charge_at`     | timestamptz  | SÌ   | —                   | Data presa in carico                                        |
| `resolved_at`            | timestamptz  | SÌ   | —                   | Data risoluzione                                            |
| `worked_hours`           | numeric(6,2) | SÌ   | —                   | Ore lavorate (obbligatorie e > 0 alla risoluzione)          |
| `resolution_note`        | text         | SÌ   | —                   | Nota di chiusura (alla risoluzione)                         |
| `rejection_reason`       | text         | SÌ   | —                   | Motivazione del rifiuto                                     |
| `created_at`             | timestamptz  | NO   | `now()`             | **Data di apertura** del ticket                             |

**Stati e transizioni ammesse**

| Da            | A             | Azione            | Chi     |
| ------------- | ------------- | ----------------- | ------- |
| `open`        | `in_progress` | Presa in carico   | Tecnico |
| `in_progress` | `resolved`    | Risoluzione       | Tecnico |
| `open`        | `rejected`    | Rifiuto           | Tecnico |
| `in_progress` | `rejected`    | Rifiuto           | Tecnico |

Un ticket `rejected` o `resolved` è terminale. Il richiedente può modificarlo/eliminarlo
solo finché è `open`.

**Etichette (frontend, in italiano)**
- Priorità: `low` → Bassa, `medium` → Media, `high` → Alta, `urgent` → Urgente.
- Stato: `open` → Aperto, `in_progress` → In lavorazione, `resolved` → Risolto, `rejected` → Rifiutato.

**Vincoli DB (`CHECK` / FK)**
- `priority` ∈ {`low`,`medium`,`high`,`urgent`}.
- `status` ∈ {`open`,`in_progress`,`resolved`,`rejected`}.
- `worked_hours` NULL oppure > 0.
- `taken_in_charge_at` NULL oppure ≥ `created_at` (presa in carico non precedente all'apertura).
- `resolved_at` NULL oppure ≥ `taken_in_charge_at`, e richiede la presa in carico
  (risoluzione non precedente alla presa in carico).
- `status = 'resolved'` ⇒ `worked_hours` valorizzato.
- `status = 'rejected'` ⇒ `rejection_reason` valorizzato (non solo spazi).
- FK: `category_id`, `requester_id`, `assigned_technician_id`.

**Indici**
- `idx_tickets_requester (requester_id)`, `idx_tickets_technician (assigned_technician_id)`,
  `idx_tickets_status (status)`, `idx_tickets_category (category_id)`,
  `idx_tickets_created_at (created_at)`.

**Validazione applicativa (controller)** — oltre ai `CHECK`:
- `title` obbligatorio, non solo spazi; `description` obbligatoria, non vuota.
- `category_id` deve riferirsi a una categoria esistente.
- Regole di autorizzazione/ownership e transizioni di stato (vedi
  [`../../PATTERNS.md`](../../PATTERNS.md)): solo il tecnico prende in carico/risolve/rifiuta;
  il richiedente vede/modifica solo i propri ticket in stato `open`.
- `resolution_note`, se presente, non solo spazi; `worked_hours` > 0 alla risoluzione.
