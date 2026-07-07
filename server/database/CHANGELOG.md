# Changelog del database

Registro delle modifiche allo schema, in ordine cronologico e con numero
progressivo. Ogni voce indica: cosa è cambiato, perché, e l'SQL eseguito
su Supabase. Tenere allineati [`schema.sql`](./schema.sql) e
[`schema.md`](./schema.md) a ogni modifica.

---

## #001 — Schema iniziale

Tabella `T_Users` per autenticazione e gestione utenti del template
(uuid PK, email univoca, password bcrypt, flag `isAdmin`, `created_at`).

```sql
create extension if not exists "pgcrypto";

create table if not exists "T_Users" (
    "id"         uuid        primary key default gen_random_uuid(),
    "email"      text        not null unique,
    "password"   text        not null,
    "isAdmin"    boolean     not null default false,
    "created_at" timestamptz not null default now()
);
```

---

## #002 — Nome e cognome su `T_Users`

Aggiunte le colonne `first_name` e `last_name`: la registrazione richiede
nome e cognome obbligatori (requisito standard delle prove d'esame).
Colonne nullable a livello DB per non rompere gli utenti esistenti;
l'obbligatorietà è applicata dai controller (`validateName`).

```sql
alter table "T_Users"
  add column "first_name" text,
  add column "last_name"  text;
```

> ⚠️ Da eseguire manualmente nel SQL Editor di Supabase.
