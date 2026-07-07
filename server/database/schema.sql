-- =============================================================================
-- Schema del database — Template Gestionale (Supabase / PostgreSQL)
-- =============================================================================
-- Fonte di verità tecnica/ricreabile. La documentazione leggibile è in
-- schema.md (mantenere allineati i due file dopo ogni modifica).
--
-- NOTA: questo file è ricostruito dal codice applicativo (models, controllers,
-- validators), NON esportato da Supabase. Verificare default, nullability e
-- vincoli reali sulla dashboard ed eventualmente correggere qui.
--
-- CONVENZIONE PREFISSO: ogni progetto nato da questo template sceglie un
-- proprio prefisso per le tabelle (nel template è `T_`, neutro). Per
-- cambiarlo: rinominare le tabelle su Supabase e aggiornare la costante
-- TABLE_NAME in ogni file dentro server/models/.
--
-- CONVENZIONE COLONNE: ogni nuova tabella include `created_at` (e, se serve
-- tracciare le modifiche, `updated_at`).
-- =============================================================================

-- Estensione per gen_random_uuid() (di norma già attiva su Supabase)
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tabella: T_Users
-- -----------------------------------------------------------------------------
create table if not exists "T_Users" (
    "id"         uuid        primary key default gen_random_uuid(),
    "email"      text        not null unique,
    "password"   text        not null,           -- hash bcrypt, mai in chiaro
    "isAdmin"    boolean     not null default false,
    "first_name" text,                           -- obbligatorio a livello applicativo (validateName)
    "last_name"  text,                           -- obbligatorio a livello applicativo (validateName)
    "created_at" timestamptz not null default now()
);
