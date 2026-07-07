# Pattern di dominio — ricette pronte

Ricette con codice copiabile per i 5 pattern che ogni gestionale (e ogni
traccia d'esame) richiede e che non sono cablati nel template:

1. [FK + join nelle liste](#1-fk--join-nelle-liste)
2. [Filtri via query-string](#2-filtri-via-query-string)
3. [Ownership (ogni utente vede solo il suo)](#3-ownership)
4. [Transizioni di stato](#4-transizioni-di-stato)
5. [Statistiche / aggregazioni](#5-statistiche--aggregazioni)

Tutte seguono le convenzioni del template (vedi `CLAUDE.md` e
`ADDING_A_RESOURCE.md`): controller = router Express con validazioni e
risposte `{ ok, error }`, model = solo accesso Supabase con sentinel error.
Gli esempi usano una risorsa `T_Requests` (richieste) con categoria e owner —
adattare i nomi al dominio della traccia.

---

## Tabella di esempio usata dalle ricette

```sql
create table if not exists "T_Categories" (
    "id"          uuid primary key default gen_random_uuid(),
    "description" text not null,
    "created_at"  timestamptz not null default now()
);

create table if not exists "T_Requests" (
    "id"            uuid primary key default gen_random_uuid(),
    "user_id"       uuid not null references "T_Users"("id"),
    "category_id"   uuid not null references "T_Categories"("id"),
    "amount"        numeric(10,2) not null check ("amount" > 0),
    "description"   text not null,
    "expense_date"  date not null,
    "status"        text not null default 'in_attesa'
                    check ("status" in ('in_attesa','approvata','rifiutata','liquidata')),
    "evaluated_at"  timestamptz,
    "evaluated_by"  uuid references "T_Users"("id"),
    "reject_reason" text,
    "paid_at"       timestamptz,
    "created_at"    timestamptz not null default now()
);

-- Indici sui campi usati da filtri e lookup
create index if not exists idx_requests_user     on "T_Requests"("user_id");
create index if not exists idx_requests_status   on "T_Requests"("status");
create index if not exists idx_requests_category on "T_Requests"("category_id");
```

> Le colonne `references` sono ciò che abilita la sintassi di join di
> supabase-js qui sotto: **senza FK il join non funziona**. Ricordarsi di
> registrare le tabelle in `schema.sql`, `schema.md` e `CHANGELOG.md`.

---

## 1. FK + join nelle liste

supabase-js segue le FK con la sintassi `alias:colonna_fk(campi)` dentro
`select()`. Nel model:

```js
// models/request.model.js
const supabase = require("../config/db_connection");

const TABLE_NAME = "T_Requests";

// Campi delle tabelle collegate direttamente nella lista
const SELECT_WITH_JOINS = `
  id, amount, description, expense_date, status, evaluated_at, paid_at, created_at,
  category:category_id ( id, description ),
  user:user_id ( id, first_name, last_name, email )
`;

const findAllRequests = async () => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(SELECT_WITH_JOINS)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("DATABASE_FIND_ALL_REQUESTS_ERROR");
  }
  return data;
};
```

Ogni riga arriva con gli oggetti annidati:

```json
{
  "id": "…",
  "amount": 42.5,
  "status": "in_attesa",
  "category": { "id": "…", "description": "Trasferta" },
  "user": { "id": "…", "first_name": "Ugo", "last_name": "Utente" }
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
  key: "user",
  label: "Dipendente",
  render: (item) => `${item.user?.first_name ?? ""} ${item.user?.last_name ?? ""}`,
},
```

---

## 2. Filtri via query-string

Il controller legge `req.query`, valida/normalizza e passa un oggetto
`filters` al model. Il model aggiunge le condizioni **solo se presenti**.

```js
// controllers/requests.controller.js
router.get("/", protect, async (req, res) => {
  try {
    const { status, categoryId, month } = req.query;

    if (status && !["in_attesa", "approvata", "rifiutata", "liquidata"].includes(status)) {
      return res.status(400).json({ ok: false, error: "Stato non valido" });
    }
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ ok: false, error: "Mese non valido (formato YYYY-MM)" });
    }

    const requests = await findAllRequests({ status, categoryId, month });
    return res.status(200).json({ ok: true, requests });
  } catch (err) {
    console.error("GET ALL REQUESTS ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});
```

```js
// models/request.model.js — query costruita condizionalmente
const findAllRequests = async (filters = {}) => {
  let query = supabase
    .from(TABLE_NAME)
    .select(SELECT_WITH_JOINS)
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.userId) query = query.eq("user_id", filters.userId);

  // month = "YYYY-MM" → intervallo [primo del mese, primo del mese dopo)
  if (filters.month) {
    const [year, month] = filters.month.split("-").map(Number);
    const from = `${filters.month}-01`;
    const to = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    query = query.gte("expense_date", from).lt("expense_date", to);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error("DATABASE_FIND_ALL_REQUESTS_ERROR");
  }
  return data;
};
```

Lato client: il service passa i filtri come `params` (Axios li serializza e
omette i valori vuoti va gestito prima), la pagina usa `FilterBar` +
`useFetch` con i filtri nelle deps:

```js
// services/requestService.js
export const fetchRequests = async (filters = {}) => {
  try {
    // rimuove i filtri vuoti per non sporcare la query string
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== "" && v != null),
    );
    const res = await api.get("/requests", { params });
    return res.data.requests;
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
      { value: "in_attesa", label: "In attesa" },
      { value: "approvata", label: "Approvata" },
      { value: "rifiutata", label: "Rifiutata" },
      { value: "liquidata", label: "Liquidata" },
    ],
  },
  { key: "month", label: "Mese", type: "month" },
];

const [filters, setFilters] = useState({ status: "", month: "" });
const { data: requests, isLoading, error, refetch } = useFetch(
  () => fetchRequests(filters),
  [filters],   // al cambio filtro la chiamata riparte da sola
);

<FilterBar filters={FILTERS} values={filters} onChange={setFilters} />
```

Per un filtro a opzioni dinamiche (es. le categorie), caricare le opzioni con
un secondo `useFetch` e costruire `FILTERS` da quelle.

---

## 3. Ownership

"Un utente vede/modifica solo le proprie risorse; l'admin le vede tutte."
I controlli stanno **nel controller, lato server** (nascondere i bottoni nel
frontend non basta — è il primo punto che un valutatore verifica).

**Lista scoped** — l'utente normale è forzato sulle proprie righe, il filtro
`userId` libero è riservato all'admin:

```js
router.get("/", protect, async (req, res) => {
  try {
    const filters = { /* …filtri da req.query… */ };

    if (req.user.isAdmin) {
      // l'admin può filtrare per utente specifico (o vederli tutti)
      if (req.query.userId) filters.userId = req.query.userId;
    } else {
      // l'utente normale vede SOLO le proprie, qualunque cosa passi in query
      filters.userId = req.user.sub;
    }

    const requests = await findAllRequests(filters);
    return res.status(200).json({ ok: true, requests });
  } catch (err) { /* … */ }
});
```

**Dettaglio / modifica / eliminazione** — carica la risorsa, poi verifica il
proprietario. 404 (non 403) per non rivelare l'esistenza di risorse altrui:

```js
router.put("/:id", protect, async (req, res) => {
  try {
    const request = await findRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ ok: false, error: "Richiesta non trovata" });
    }

    if (!req.user.isAdmin && request.user_id !== req.user.sub) {
      return res.status(404).json({ ok: false, error: "Richiesta non trovata" });
    }

    // …validazioni e update…
  } catch (err) { /* … */ }
});
```

**Alla creazione** l'owner viene sempre dal token, mai dal body:

```js
const request = await createNewRequest({ ...validatedData, user_id: req.user.sub });
```

---

## 4. Transizioni di stato

Stati come `in_attesa → approvata|rifiutata`, `approvata → liquidata`.
Tre ingredienti: il vincolo `CHECK` sul DB (vedi tabella di esempio), una
mappa delle transizioni valide e rotte azione dedicate.

```js
// controllers/requests.controller.js
const STATUSES = ["in_attesa", "approvata", "rifiutata", "liquidata"];

// da → a: transizioni ammesse
const VALID_TRANSITIONS = {
  in_attesa: ["approvata", "rifiutata"],
  approvata: ["liquidata"],
  rifiutata: [],
  liquidata: [],
};

// Helper condiviso dalle tre rotte azione
const transition = async (req, res, targetStatus, extraFields = {}) => {
  try {
    const request = await findRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ ok: false, error: "Richiesta non trovata" });
    }

    if (!VALID_TRANSITIONS[request.status].includes(targetStatus)) {
      return res.status(409).json({
        ok: false,
        error: `Una richiesta ${request.status.replace("_", " ")} non può diventare ${targetStatus}`,
      });
    }

    const updated = await updateRequestById(request.id, {
      status: targetStatus,
      ...extraFields,
    });
    return res.status(200).json({ ok: true, request: updated });
  } catch (err) {
    console.error("TRANSITION ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
};

// Rotte azione: PUT /:id/<azione>, riservate all'admin
router.put("/:id/approva", protect, isAdmin, (req, res) =>
  transition(req, res, "approvata", {
    evaluated_at: new Date().toISOString(),
    evaluated_by: req.user.sub,
  }),
);

router.put("/:id/rifiuta", protect, isAdmin, (req, res) =>
  transition(req, res, "rifiutata", {
    evaluated_at: new Date().toISOString(),
    evaluated_by: req.user.sub,
    reject_reason: req.body.reason || null,
  }),
);

router.put("/:id/liquida", protect, isAdmin, (req, res) =>
  transition(req, res, "liquidata", { paid_at: new Date().toISOString() }),
);
```

**Regole collegate** che le tracce chiedono quasi sempre:

```js
// modifica/eliminazione consentite solo nello stato iniziale
if (request.status !== "in_attesa") {
  return res.status(409).json({
    ok: false,
    error: "La richiesta è già stata valutata e non può essere modificata",
  });
}
```

```js
// validazioni sulle date (nelle rotte che le impostano/modificano)
if (evaluated_at && new Date(evaluated_at) < new Date(request.created_at)) {
  return res.status(400).json({
    ok: false,
    error: "La data di valutazione non può precedere la data di inserimento",
  });
}
if (paid_at && new Date(paid_at) < new Date(request.evaluated_at)) {
  return res.status(400).json({
    ok: false,
    error: "La data di liquidazione non può precedere la data di approvazione",
  });
}
```

Nel frontend gli stati si mostrano con `Badge` (pattern in `Users.jsx`) e i
bottoni azione si mostrano/nascondono in base a stato e ruolo — ma la regola
vera resta quella del server.

---

## 5. Statistiche / aggregazioni

supabase-js non fa `GROUP BY`: con i volumi di un esame la strategia più
semplice è **aggregare in JavaScript nel controller** — si riusa il model con
i filtri già pronti (ricetta 2) e non serve toccare il DB.

```js
// controllers/stats.controller.js
const express = require("express");
const protect = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const { findAllRequests } = require("../models/request.model");

const router = express.Router();

// GET /stats/requests?month=2026-05&categoryId=…&userId=…  (solo admin)
router.get("/requests", protect, isAdmin, async (req, res) => {
  try {
    const { month, categoryId, userId } = req.query;
    const requests = await findAllRequests({ month, categoryId, userId });

    // groupBy mese+categoria
    const groups = new Map();
    for (const r of requests) {
      const month = r.expense_date.slice(0, 7); // "YYYY-MM"
      const key = `${month}|${r.category?.id}`;

      if (!groups.has(key)) {
        groups.set(key, {
          month,
          category: r.category?.description ?? "—",
          count: 0,
          totalRequested: 0,
          totalApproved: 0,
          totalPaid: 0,
        });
      }

      const g = groups.get(key);
      g.count += 1;
      g.totalRequested += Number(r.amount);
      if (["approvata", "liquidata"].includes(r.status)) {
        g.totalApproved += Number(r.amount);
      }
      if (r.status === "liquidata") {
        g.totalPaid += Number(r.amount);
      }
    }

    // ordinamento stabile per mese poi categoria
    const stats = [...groups.values()].sort(
      (a, b) => a.month.localeCompare(b.month) || a.category.localeCompare(b.category),
    );

    return res.status(200).json({ ok: true, stats });
  } catch (err) {
    console.error("GET REQUEST STATS ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

module.exports = router;
```

Montare in `server.js` (`app.use("/stats", …)`), documentare in
`ENDPOINTS.md` e nella collection Postman. La pagina di riepilogo è una
normale pagina con `FilterBar` + `useFetch` + `DataTable` (le righe aggregate
hanno bisogno di una chiave: usare `render` e `key: "month"` oppure
aggiungere `id: key` agli oggetti).

> Alternativa per volumi reali: una **view Postgres** creata su Supabase
> (`create view … as select date_trunc(…), sum(…) … group by …`) letta dal
> model come una tabella normale con `.from("nome_view")`. Più efficiente ma
> è un oggetto in più da gestire sul DB: per una prova d'esame l'aggregazione
> in JS è più che sufficiente.
