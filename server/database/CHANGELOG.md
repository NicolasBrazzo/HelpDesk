# Changelog del database

Registro delle modifiche allo schema, in ordine cronologico e con numero
progressivo. Ogni voce indica: cosa è cambiato, perché, e l'SQL eseguito
su Supabase. Tenere allineati [`schema.sql`](./schema.sql) e
[`schema.md`](./schema.md) a ogni modifica.

---

## #001 — Schema iniziale Help Desk

Schema di partenza del gestionale di assistenza tecnica. Tre tabelle con
prefisso `hd_` e identificatori in inglese:

- `hd_users` — utenti autenticati. Il boolean `isAdmin` modella il ruolo:
  `true` = Tecnico di supporto, `false` = Utente richiedente.
- `hd_categories` — categorie dei ticket (sola lettura per l'app), con
  `description` univoca.
- `hd_tickets` — ticket di assistenza. `created_at` = data di apertura;
  stati `open|in_progress|resolved|rejected` e priorità
  `low|medium|high|urgent` vincolati da `CHECK`; FK verso `hd_users`
  (richiedente e tecnico) e `hd_categories`; vincoli sulle date
  (presa in carico ≥ apertura, risoluzione ≥ presa in carico) e coerenza
  di risoluzione/rifiuto (ore lavorate / motivazione).

```sql
create extension if not exists "pgcrypto";

create table if not exists "hd_users" (
    "id"         uuid        primary key default gen_random_uuid(),
    "email"      text        not null unique,
    "password"   text        not null,
    "isAdmin"    boolean     not null default false,  -- true = Tecnico, false = Richiedente
    "first_name" text,
    "last_name"  text,
    "created_at" timestamptz not null default now()
);

create table if not exists "hd_categories" (
    "id"          uuid        primary key default gen_random_uuid(),
    "description" text        not null unique,
    "created_at"  timestamptz not null default now()
);

create table if not exists "hd_tickets" (
    "id"                     uuid         primary key default gen_random_uuid(),
    "title"                  text         not null,
    "description"            text         not null,
    "category_id"            uuid         not null references "hd_categories"("id"),
    "priority"               text         not null
                                          check ("priority" in ('low','medium','high','urgent')),
    "status"                 text         not null default 'open'
                                          check ("status" in ('open','in_progress','resolved','rejected')),
    "requester_id"           uuid         not null references "hd_users"("id"),
    "assigned_technician_id" uuid         references "hd_users"("id"),
    "taken_in_charge_at"     timestamptz,
    "resolved_at"            timestamptz,
    "worked_hours"           numeric(6,2) check ("worked_hours" is null or "worked_hours" > 0),
    "resolution_note"        text,
    "rejection_reason"       text,
    "created_at"             timestamptz  not null default now(),
    constraint "hd_tickets_taken_after_open"
        check ("taken_in_charge_at" is null or "taken_in_charge_at" >= "created_at"),
    constraint "hd_tickets_resolved_after_taken"
        check ("resolved_at" is null
               or ("taken_in_charge_at" is not null and "resolved_at" >= "taken_in_charge_at")),
    constraint "hd_tickets_resolved_requires_hours"
        check ("status" <> 'resolved' or "worked_hours" is not null),
    constraint "hd_tickets_rejected_requires_reason"
        check ("status" <> 'rejected'
               or ("rejection_reason" is not null and length(btrim("rejection_reason")) > 0))
);

create index if not exists idx_tickets_requester  on "hd_tickets"("requester_id");
create index if not exists idx_tickets_technician on "hd_tickets"("assigned_technician_id");
create index if not exists idx_tickets_status     on "hd_tickets"("status");
create index if not exists idx_tickets_category   on "hd_tickets"("category_id");
create index if not exists idx_tickets_created_at on "hd_tickets"("created_at");
```

> ⚠️ Da eseguire nel SQL Editor di Supabase.
>
> **Nota migrazione dal template:** il codice ereditato dal template usa ancora
> `TABLE_NAME = "T_Users"` (in `server/models/user.model.js` e
> `server/database/seed.js`). Va allineato a `"hd_users"` quando si costruiscono
> i model/seed di questo progetto.

---

## #002 — Popolamento iniziale di `hd_categories`

Nessuna modifica di schema: inserite le 6 categorie previste da
[`schema.md`](./schema.md) ("Valori iniziali (seed)"). La tabella era vuota e
`POST /ticket` non può funzionare senza almeno una categoria, dato che il
controller valida l'esistenza di `category_id`.

L'`upsert` su `description` (colonna `UNIQUE`) rende l'operazione ripetibile
senza creare duplicati.

```sql
insert into "hd_categories" ("description")
values
    ('Hardware'),
    ('Software'),
    ('Rete'),
    ('Account e accessi'),
    ('Posta elettronica'),
    ('Altro')
on conflict ("description") do nothing;
```

> 📌 **Da fare:** replicare questo inserimento in `server/database/seed.js` (con
> i ticket di esempio nei vari stati) così che `npm run seed` ricostruisca da
> solo i dati di dominio. Al momento le righe esistono su Supabase ma non sono
> riproducibili dal seed.
