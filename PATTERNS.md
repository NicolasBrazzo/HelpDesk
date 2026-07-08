# Pattern di dominio — ricette pronte

Ricette con codice copiabile per i 5 pattern che questo gestionale (gestione
ticket di assistenza) richiede e che non sono cablati nel template:

1. [FK + join nelle liste](#1-fk--join-nelle-liste)
2. [Filtri via query-string](#2-filtri-via-query-string)
3. [Ownership (il richiedente vede solo i suoi ticket)](#3-ownership)
4. [Transizioni di stato](#4-transizioni-di-stato)
5. [Statistiche / aggregazioni](#5-statistiche--aggregazioni)

Tutte seguono le convenzioni del template (vedi `CLAUDE.md` e
`ADDING_A_RESOURCE.md`): controller = router Express con validazioni e
risposte `{ ok, error }`, model = solo accesso Supabase con sentinel error.
Gli esempi usano le risorse reali del progetto — `hd_tickets` (i ticket) e
`hd_categories` (le categorie) — così come definite in
[`server/database/schema.sql`](server/database/schema.sql).

Promemoria ruoli: `isAdmin = true` → **Tecnico di supporto**, `isAdmin = false`
→ **Utente richiedente**.

---

## Tabelle usate dalle ricette

Sono le tabelle di dominio dell'app (già in `schema.sql`):

```sql
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
    "created_at"             timestamptz  not null default now()
);

create index if not exists idx_tickets_requester  on "hd_tickets"("requester_id");
create index if not exists idx_tickets_technician on "hd_tickets"("assigned_technician_id");
create index if not exists idx_tickets_status     on "hd_tickets"("status");
create index if not exists idx_tickets_category   on "hd_tickets"("category_id");
create index if not exists idx_tickets_created_at on "hd_tickets"("created_at");
```

> Le colonne `references` sono ciò che abilita la sintassi di join di
> supabase-js qui sotto: **senza FK il join non funziona**. `hd_tickets` ha
> **due** FK verso `hd_users` (richiedente e tecnico): nel `select()` vanno
> disambiguate indicando la colonna FK — `requester:requester_id(...)` e
> `technician:assigned_technician_id(...)`.

---

## 1. FK + join nelle liste

supabase-js segue le FK con la sintassi `alias:colonna_fk(campi)` dentro
`select()`. Nel model:

```js
// models/ticket.model.js
const supabase = require("../config/db_connection");

const TABLE_NAME = "hd_tickets";

// Campi delle tabelle collegate direttamente nella lista
const SELECT_WITH_JOINS = `
  id, title, description, priority, status, created_at,
  taken_in_charge_at, resolved_at, worked_hours, resolution_note, rejection_reason,
  category:category_id ( id, description ),
  requester:requester_id ( id, first_name, last_name, email ),
  technician:assigned_technician_id ( id, first_name, last_name, email )
`;

const findAllTickets = async () => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(SELECT_WITH_JOINS)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("DATABASE_FIND_ALL_TICKETS_ERROR");
  }
  return data;
};
```

Ogni riga arriva con gli oggetti annidati:

```json
{
  "id": "…",
  "title": "PC non si accende",
  "priority": "high",
  "status": "open",
  "category": { "id": "…", "description": "Hardware" },
  "requester": { "id": "…", "first_name": "Ugo", "last_name": "Utente" },
  "technician": null
}
```

In `DataTable` si mostrano con un `render` custom (le colonne annidate non
sono ordinabili con `sortByField`, che legge campi piatti):

```jsx
{
  key: "category",
  label: "Categoria",
  render: (item) => item.category?.description ?? "—",
},
{
  key: "requester",
  label: "Richiedente",
  render: (item) => `${item.requester?.first_name ?? ""} ${item.requester?.last_name ?? ""}`,
},
{
  key: "technician",
  label: "Tecnico",
  render: (item) =>
    item.technician
      ? `${item.technician.first_name} ${item.technician.last_name}`
      : "—",
},
```

---

## 2. Filtri via query-string

Il controller legge `req.query`, valida/normalizza e passa un oggetto
`filters` al model. Il model aggiunge le condizioni **solo se presenti**.

Filtri richiesti dalla traccia: **stato, categoria, priorità, mese** e, per i
tecnici, **richiedente**.

```js
// controllers/ticket.controller.js
const STATUSES = ["open", "in_progress", "resolved", "rejected"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

router.get("/", protect, async (req, res) => {
  try {
    const { status, categoryId, priority, month } = req.query;

    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ ok: false, error: "Stato non valido" });
    }
    if (priority && !PRIORITIES.includes(priority)) {
      return res.status(400).json({ ok: false, error: "Priorità non valida" });
    }
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ ok: false, error: "Mese non valido (formato YYYY-MM)" });
    }

    const filters = { status, categoryId, priority, month };

    // ownership + filtro richiedente (vedi pattern 3)
    if (req.user.isAdmin) {
      if (req.query.requesterId) filters.requesterId = req.query.requesterId;
    } else {
      filters.requesterId = req.user.sub;
    }

    const tickets = await findAllTickets(filters);
    return res.status(200).json({ ok: true, tickets });
  } catch (err) {
    console.error("GET ALL TICKETS ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});
```

```js
// models/ticket.model.js — query costruita condizionalmente
const findAllTickets = async (filters = {}) => {
  let query = supabase
    .from(TABLE_NAME)
    .select(SELECT_WITH_JOINS)
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.requesterId) query = query.eq("requester_id", filters.requesterId);
  if (filters.technicianId) query = query.eq("assigned_technician_id", filters.technicianId);

  // month = "YYYY-MM" → intervallo [primo del mese, primo del mese dopo) sulla data di apertura
  if (filters.month) {
    const [year, m] = filters.month.split("-").map(Number);
    const from = new Date(Date.UTC(year, m - 1, 1)).toISOString();
    const to = new Date(Date.UTC(year, m, 1)).toISOString();
    query = query.gte("created_at", from).lt("created_at", to);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error("DATABASE_FIND_ALL_TICKETS_ERROR");
  }
  return data;
};
```

Lato client: il service passa i filtri come `params` (rimuovendo i vuoti), la
pagina usa `FilterBar` + `useFetch` con i filtri nelle deps:

```js
// services/ticketService.js
export const fetchTickets = async (filters = {}) => {
  try {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== "" && v != null),
    );
    const res = await api.get("/ticket", { params });
    return res.data.tickets;
  } catch (err) {
    throw new Error(err.message);
  }
};
```

```jsx
// pagina — FilterBar (componente generico in src/components/FilterBar.jsx)
const FILTERS = [
  {
    key: "status",
    label: "Stato",
    options: [
      { value: "open", label: "Aperto" },
      { value: "in_progress", label: "In lavorazione" },
      { value: "resolved", label: "Risolto" },
      { value: "rejected", label: "Rifiutato" },
    ],
  },
  {
    key: "priority",
    label: "Priorità",
    options: [
      { value: "low", label: "Bassa" },
      { value: "medium", label: "Media" },
      { value: "high", label: "Alta" },
      { value: "urgent", label: "Urgente" },
    ],
  },
  { key: "month", label: "Mese", type: "month" },
];

const [filters, setFilters] = useState({ status: "", priority: "", categoryId: "", month: "" });
const { data: tickets, isLoading, error, refetch } = useFetch(
  () => fetchTickets(filters),
  [filters],   // al cambio filtro la chiamata riparte da sola
);

<FilterBar filters={FILTERS} values={filters} onChange={setFilters} />
```

Il filtro **categoria** ha opzioni dinamiche: caricale con un secondo
`useFetch` da `GET /api/categorie` e costruisci quella voce di `FILTERS` dalle
categorie. Il filtro **richiedente** (solo tecnico) si popola allo stesso modo
dagli utenti.

---

## 3. Ownership

"Il richiedente vede/modifica solo i propri ticket; il tecnico li vede tutti."
I controlli stanno **nel controller, lato server** (nascondere i bottoni nel
frontend non basta — è il primo punto che un valutatore verifica).

**Lista scoped** — il richiedente è forzato sui propri ticket, il filtro
`requesterId` libero è riservato al tecnico (vedi pattern 2):

```js
if (req.user.isAdmin) {
  // il tecnico può filtrare per richiedente specifico (o vederli tutti)
  if (req.query.requesterId) filters.requesterId = req.query.requesterId;
} else {
  // il richiedente vede SOLO i propri, qualunque cosa passi in query
  filters.requesterId = req.user.sub;
}
```

**Dettaglio / modifica / eliminazione** — carica il ticket, poi verifica il
proprietario. 404 (non 403) per non rivelare l'esistenza di ticket altrui:

```js
router.put("/:id", protect, async (req, res) => {
  try {
    const ticket = await findTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ ok: false, error: "Ticket non trovato" });
    }

    // il richiedente può toccare solo i propri ticket
    if (!req.user.isAdmin && ticket.requester_id !== req.user.sub) {
      return res.status(404).json({ ok: false, error: "Ticket non trovato" });
    }

    // …e solo finché è ancora Aperto (vedi pattern 4)…
    // …validazioni e update…
  } catch (err) { /* … */ }
});
```

**Alla creazione** il richiedente viene sempre dal token, mai dal body, e lo
stato iniziale è `open`:

```js
const ticket = await createNewTicket({
  ...validatedData,
  requester_id: req.user.sub,
  status: "open",
});
```

---

## 4. Transizioni di stato

Gli stati del ticket sono `open → in_progress → resolved`, con
`open | in_progress → rejected`. Tre ingredienti: il vincolo `CHECK` sul DB
(già in `schema.sql`), una mappa delle transizioni valide e rotte azione
dedicate, riservate al tecnico (`isAdmin`).

```js
// controllers/ticket.controller.js
const STATUSES = ["open", "in_progress", "resolved", "rejected"];

// da → a: transizioni ammesse
const VALID_TRANSITIONS = {
  open: ["in_progress", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved: [],
  rejected: [],
};

const STATUS_LABELS = {
  open: "Aperto",
  in_progress: "In lavorazione",
  resolved: "Risolto",
  rejected: "Rifiutato",
};

// Helper condiviso dalle rotte azione
const transition = async (req, res, targetStatus, extraFields = {}) => {
  try {
    const ticket = await findTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ ok: false, error: "Ticket non trovato" });
    }

    if (!VALID_TRANSITIONS[ticket.status].includes(targetStatus)) {
      return res.status(409).json({
        ok: false,
        error: `Un ticket ${STATUS_LABELS[ticket.status]} non può passare a ${STATUS_LABELS[targetStatus]}`,
      });
    }

    const updated = await updateTicketById(ticket.id, {
      status: targetStatus,
      ...extraFields,
    });
    return res.status(200).json({ ok: true, ticket: updated });
  } catch (err) {
    console.error("TRANSITION ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
};

// Presa in carico: assegna il ticket al tecnico corrente
router.put("/:id/prendi-in-carico", protect, isAdmin, (req, res) =>
  transition(req, res, "in_progress", {
    assigned_technician_id: req.user.sub,
    taken_in_charge_at: new Date().toISOString(),
  }),
);

// Risoluzione: richiede ore lavorate (> 0) e nota di chiusura
router.put("/:id/risolvi", protect, isAdmin, async (req, res) => {
  const workedHours = Number(req.body.worked_hours);
  if (!Number.isFinite(workedHours) || workedHours <= 0) {
    return res.status(400).json({ ok: false, error: "Le ore lavorate devono essere maggiori di zero" });
  }
  if (req.body.resolution_note && !req.body.resolution_note.trim()) {
    return res.status(400).json({ ok: false, error: "La nota di risoluzione non può essere vuota" });
  }
  return transition(req, res, "resolved", {
    resolved_at: new Date().toISOString(),
    worked_hours: workedHours,
    resolution_note: req.body.resolution_note?.trim() || null,
  });
});

// Rifiuto: richiede una motivazione
router.put("/:id/rifiuta", protect, isAdmin, async (req, res) => {
  const reason = (req.body.rejection_reason || "").trim();
  if (!reason) {
    return res.status(400).json({ ok: false, error: "La motivazione di rifiuto è obbligatoria" });
  }
  return transition(req, res, "rejected", { rejection_reason: reason });
});
```

**Regole collegate** che la traccia chiede:

```js
// modifica/eliminazione consentite al richiedente solo nello stato iniziale
if (ticket.status !== "open") {
  return res.status(409).json({
    ok: false,
    error: "Il ticket è già stato preso in carico e non può più essere modificato",
  });
}
```

I vincoli sulle date (presa in carico ≥ apertura, risoluzione ≥ presa in
carico) sono garantiti a livello DB dai `CHECK` di `hd_tickets`; usando
`new Date().toISOString()` per gli istanti sono automaticamente coerenti.

Nel frontend gli stati si mostrano con `Badge` e i bottoni azione
(prendi in carico / risolvi / rifiuta) si mostrano in base a stato e ruolo — ma
la regola vera resta quella del server.

---

## 5. Statistiche / aggregazioni

supabase-js non fa `GROUP BY`: con i volumi di un esame la strategia più
semplice è **aggregare in JavaScript nel controller** — si riusa il model con
i filtri già pronti (ricetta 2). Riservata ai tecnici (`isAdmin`).

La traccia chiede, per **mese e categoria**: ticket ricevuti, risolti,
rifiutati; tempo medio di risoluzione (apertura → risoluzione); totale ore
lavorate. Filtri per mese, categoria, priorità e tecnico.

```js
// controllers/stats.controller.js  (montato su /statistiche)
const express = require("express");
const protect = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const { findAllTickets } = require("../models/ticket.model");

const router = express.Router();

// GET /statistiche/ticket?mese=2026-05&categoriaId=…&priorita=…&tecnicoId=…  (solo tecnico)
router.get("/ticket", protect, isAdmin, async (req, res) => {
  try {
    const { mese, categoriaId, priorita, tecnicoId } = req.query;
    const tickets = await findAllTickets({
      month: mese,
      categoryId: categoriaId,
      priority: priorita,
      technicianId: tecnicoId,
    });

    // groupBy mese(apertura) + categoria
    const groups = new Map();
    for (const t of tickets) {
      const mese = t.created_at.slice(0, 7); // "YYYY-MM"
      const key = `${mese}|${t.category?.id}`;

      if (!groups.has(key)) {
        groups.set(key, {
          mese,
          categoria: t.category?.description ?? "—",
          numeroAperti: 0,       // ricevuti nel periodo
          numeroRisolti: 0,
          numeroRifiutati: 0,
          _sommaOreRisoluzione: 0,
          totaleOreLavorate: 0,
        });
      }

      const g = groups.get(key);
      g.numeroAperti += 1;
      if (t.status === "resolved") {
        g.numeroRisolti += 1;
        g.totaleOreLavorate += Number(t.worked_hours ?? 0);
        if (t.resolved_at) {
          const ore = (new Date(t.resolved_at) - new Date(t.created_at)) / 3_600_000;
          g._sommaOreRisoluzione += ore;
        }
      }
      if (t.status === "rejected") {
        g.numeroRifiutati += 1;
      }
    }

    // tempo medio di risoluzione + pulizia campi interni
    const stats = [...groups.values()]
      .map(({ _sommaOreRisoluzione, ...g }) => ({
        ...g,
        tempoMedioRisoluzioneOre: g.numeroRisolti
          ? Number((_sommaOreRisoluzione / g.numeroRisolti).toFixed(1))
          : 0,
        totaleOreLavorate: Number(g.totaleOreLavorate.toFixed(1)),
      }))
      .sort((a, b) => a.mese.localeCompare(b.mese) || a.categoria.localeCompare(b.categoria));

    return res.status(200).json({ ok: true, stats });
  } catch (err) {
    console.error("GET TICKET STATS ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

module.exports = router;
```

Esempio di riga restituita (allineato alla traccia):

```json
{
  "mese": "2026-05",
  "categoria": "Rete",
  "numeroAperti": 12,
  "numeroRisolti": 9,
  "numeroRifiutati": 1,
  "tempoMedioRisoluzioneOre": 18.5,
  "totaleOreLavorate": 27.0
}
```

Montare in `server.js` (`app.use("/statistiche", …)`), documentare in
`ENDPOINTS.md` e nella collection Postman. La pagina di riepilogo è una
normale pagina con `FilterBar` + `useFetch` + `DataTable` (le righe aggregate
hanno bisogno di una chiave: usare `render` e `key: "mese"` oppure aggiungere
`id: key` agli oggetti). I dati possono essere anche mostrati graficamente
(opzionale).

> Alternativa per volumi reali: una **view Postgres** creata su Supabase
> (`create view … as select date_trunc(…), count(…) … group by …`) letta dal
> model come una tabella normale con `.from("nome_view")`. Più efficiente ma
> è un oggetto in più da gestire sul DB: per una prova d'esame l'aggregazione
> in JS è più che sufficiente.
