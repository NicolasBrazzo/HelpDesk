# Struttura del Database

Backend dati: **Supabase (PostgreSQL)**. Lo schema reale vive su Supabase; questo
file è la documentazione leggibile (per umani e AI). Il file affiancato
[`schema.sql`](./schema.sql) è la fonte di verità tecnica/ricreabile.

> ⚠️ Documentazione mantenuta a mano. Dopo ogni modifica allo schema su Supabase,
> aggiornare **sia** questo file **sia** `schema.sql`, e registrare la modifica
> in [`CHANGELOG.md`](./CHANGELOG.md) con il numero progressivo (`#001`, `#002`, …).

## Convenzioni

- **Prefisso tabelle**: ogni progetto nato dal template sceglie un proprio
  prefisso (nel template è `T_`, neutro). Per cambiarlo: rinominare le
  tabelle su Supabase e aggiornare la costante `TABLE_NAME` in ogni file
  dentro `server/models/`.
- **Colonne standard**: ogni nuova tabella include `id uuid` (PK, default
  `gen_random_uuid()`) e `created_at timestamptz` (default `now()`);
  aggiungere `updated_at` se serve tracciare le modifiche.

---

## Diagramma relazioni

```
T_Users        (autenticazione / utenti del gestionale)
```

Il template parte con la sola tabella utenti: è l'unica davvero universale.
Le tabelle di dominio (anagrafiche, ordini, consegne, …) vanno aggiunte
progetto per progetto — vedi l'esempio in fondo e la ricetta in
[`../../ADDING_A_RESOURCE.md`](../../ADDING_A_RESOURCE.md).

---

## Tabella: `T_Users`

Utenti che accedono al gestionale. La lista utenti espone solo
`id, email, isAdmin, first_name, last_name, created_at`
(la `password` non viene mai restituita al client).

| Colonna      | Tipo        | Null | Default             | Note                                         |
| ------------ | ----------- | ---- | ------------------- | -------------------------------------------- |
| `id`         | uuid        | NO   | `gen_random_uuid()` | Primary key                                  |
| `email`      | text        | NO   | —                   | Univoca. Usata per login e lookup            |
| `password`   | text        | NO   | —                   | Hash bcrypt — **mai** in chiaro, mai esposta |
| `isAdmin`    | boolean     | NO   | `false`             | Flag privilegi amministratore                |
| `first_name` | text        | SÌ*  | —                   | Nome. *Obbligatorio a livello applicativo    |
| `last_name`  | text        | SÌ*  | —                   | Cognome. *Obbligatorio a livello applicativo |
| `created_at` | timestamptz | NO   | `now()`             | Data creazione account                       |

**Vincoli**
- `email` UNIQUE.

**Validazione applicativa**
- `email`: formato email valido.
- `password` (prima dell'hash): min 6 caratteri, almeno 1 maiuscola, 1 numero, 1 carattere speciale.
- `first_name` / `last_name` (`validateName`): obbligatori, min 2 caratteri dopo il trim
  (quindi mai vuoti o solo spazi), solo lettere/spazi/apostrofi/trattini.

---

## Esempio: aggiungere una tabella di dominio

Traccia da seguire quando il progetto ha bisogno di una nuova risorsa
(esempio: un'anagrafica clienti):

```sql
create table if not exists "T_Clients" (
    "id"         uuid        primary key default gen_random_uuid(),
    "name"       text        not null,
    "email"      text        unique,
    "phone"      text,
    "note"       text,
    "created_at" timestamptz not null default now()
);
```

Checklist:
1. Creare la tabella su Supabase.
2. Aggiungerla a `schema.sql` e documentarla qui (colonne, vincoli, validazioni).
3. Registrare la modifica in `CHANGELOG.md` con il numero progressivo.
4. Se ha stati/enum, preferire un vincolo `CHECK` e documentare i valori validi.
5. Indici sui campi usati per filtri e lookup frequenti.
