-- =============================================================================
-- Schema del database — Help Desk (gestione ticket di assistenza)
-- Supabase / PostgreSQL
-- =============================================================================
-- Fonte di verità tecnica/ricreabile. La documentazione leggibile è in
-- schema.md (mantenere allineati i due file dopo ogni modifica).
--
-- NOTA: questo file è ricostruito dal codice applicativo (models, controllers,
-- validators), NON esportato da Supabase. Verificare default, nullability e
-- vincoli reali sulla dashboard ed eventualmente correggere qui.
--
-- CONVENZIONE PREFISSO: tutte le tabelle usano il prefisso `hd_` (help desk).
-- La costante TABLE_NAME in ogni file dentro server/models/ deve combaciare
-- con il nome qui definito (es. "hd_users", "hd_tickets").
--
-- CONVENZIONE COLONNE: ogni tabella include `id uuid` (PK, default
-- gen_random_uuid()) e `created_at timestamptz` (default now()). Nomi di
-- tabelle e colonne sono in inglese.
--
-- RUOLI: il ruolo utente è modellato con il boolean `isAdmin`:
--     isAdmin = true  → Tecnico di supporto
--     isAdmin = false → Utente richiedente
-- =============================================================================

-- Estensione per gen_random_uuid() (di norma già attiva su Supabase)
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tabella: hd_users — utenti autenticati (richiedenti e tecnici)
-- -----------------------------------------------------------------------------
create table if not exists "hd_users" (
    "id"         uuid        primary key default gen_random_uuid(),
    "email"      text        not null unique,
    "password"   text        not null,           -- hash bcrypt, mai in chiaro
    "isAdmin"    boolean     not null default false,  -- true = Tecnico, false = Richiedente
    "first_name" text,                           -- obbligatorio a livello applicativo (validateName)
    "last_name"  text,                           -- obbligatorio a livello applicativo (validateName)
    "created_at" timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Tabella: hd_categories — categorie dei ticket
-- -----------------------------------------------------------------------------
-- Dati realistici: Hardware, Software, Rete, Account e accessi,
-- Posta elettronica, Altro (popolati dal seed). CRUD non obbligatorio.
create table if not exists "hd_categories" (
    "id"          uuid        primary key default gen_random_uuid(),
    "description" text        not null unique,
    "created_at"  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Tabella: hd_tickets — ticket di assistenza
-- -----------------------------------------------------------------------------
-- `created_at` funge da data di apertura (DataApertura).
-- Stati e transizioni:
--     open        → in_progress   (presa in carico)
--     in_progress → resolved      (risoluzione: ore lavorate + nota)
--     open|in_progress → rejected (rifiuto: motivazione)
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

    -- la presa in carico non può precedere l'apertura
    constraint "hd_tickets_taken_after_open"
        check ("taken_in_charge_at" is null or "taken_in_charge_at" >= "created_at"),

    -- la risoluzione richiede la presa in carico e non può precederla
    constraint "hd_tickets_resolved_after_taken"
        check ("resolved_at" is null
               or ("taken_in_charge_at" is not null and "resolved_at" >= "taken_in_charge_at")),

    -- un ticket risolto deve avere ore lavorate (> 0, garantito dal check sopra)
    constraint "hd_tickets_resolved_requires_hours"
        check ("status" <> 'resolved' or "worked_hours" is not null),

    -- un ticket rifiutato deve avere la motivazione valorizzata (non solo spazi)
    constraint "hd_tickets_rejected_requires_reason"
        check ("status" <> 'rejected'
               or ("rejection_reason" is not null and length(btrim("rejection_reason")) > 0))
);

-- Indici sui campi usati da filtri, lookup e join
create index if not exists idx_tickets_requester  on "hd_tickets"("requester_id");
create index if not exists idx_tickets_technician on "hd_tickets"("assigned_technician_id");
create index if not exists idx_tickets_status     on "hd_tickets"("status");
create index if not exists idx_tickets_category   on "hd_tickets"("category_id");
create index if not exists idx_tickets_created_at on "hd_tickets"("created_at");
