# FILTERS_BE.md — Convenzioni per API di elenco con paginazione, filtri e ordinamento

Questo file definisce lo standard con cui implementare gli endpoint di elenco (*list*) nel backend. Stack di riferimento: **Node.js + Express**, database **Supabase** (client `supabase-js`).

Quando questo file viene referenziato (es. *"crea l'API con i filtri, usa @FILTERS_BE.md"*), l'endpoint **DEVE** rispettare tutte le regole seguenti: contratto dei parametri, forma della risposta, implementazione Supabase e gestione dei casi limite.

---

## 1. Principio

Un endpoint di elenco **non restituisce mai l'intero insieme di dati**. Restituisce una pagina alla volta. Tutti i parametri di paginazione, filtro e ordinamento viaggiano nella *query string* dell'URL (è una `GET`, quindi niente body).

Esempio di richiesta completa:

```http
GET /api/requests?status=pending&page=2&limit=20&sort=created_at&order=desc
```

---

## 2. Contratto dei parametri (query string)

| Parametro | Tipo   | Default      | Descrizione                                              |
|-----------|--------|--------------|----------------------------------------------------------|
| `page`    | int    | `1`          | Pagina richiesta (1-based).                              |
| `limit`   | int    | `20`         | Elementi per pagina. Va limitato a un massimo (es. 100). |
| `sort`    | string | `created_at` | Campo di ordinamento. Va validato contro una whitelist.  |
| `order`   | string | `desc`       | `asc` oppure `desc`. Qualsiasi altro valore → `desc`.    |
| filtri    | vari   | —            | Es. `status`, `user_id`. Ognuno è opzionale.             |

### Regole obbligatorie

- I parametri arrivano sempre come **stringa**: fare `parseInt` su `page` e `limit`.
- Applicare i **default** se il parametro manca o non è valido (mai crashare).
- `limit` va **cappato** a un massimo per evitare che un client chieda 999999 elementi.
- `sort` e `order` vanno validati contro una **whitelist**: mai passare al DB un nome di colonna arbitrario che arriva dal client (rischio di errori e di abuso).

---

## 3. Forma della risposta (OBBLIGATORIA)

La risposta è sempre un oggetto con due chiavi: `data` e `pagination`.

```json
{
  "data": [ /* array degli elementi della pagina corrente */ ],
  "pagination": {
    "total": 4350,
    "page": 2,
    "limit": 20,
    "totalPages": 218
  }
}
```

- `data`: array degli elementi della pagina corrente.
- `pagination.total`: numero totale di elementi che soddisfano i filtri (**NON** solo quelli della pagina). Serve al frontend per calcolare quante pagine disegnare.
- `pagination.totalPages`: `Math.ceil(total / limit)`. Usare `ceil`, mai `floor`, altrimenti si perde l'ultima pagina parziale.

> Il codice di stato HTTP viaggia nella risposta HTTP (`res.status(...)`), **mai** dentro il body JSON.

---

## 4. Calcolo del range

Il numero di righe da saltare è: `offset = (page - 1) * limit`.

Supabase usa `.range(from, to)` con estremi **inclusi** su entrambi i lati, quindi:

```js
from = (page - 1) * limit
to   = from + limit - 1
```

Esempio con `page=3`, `limit=20`: `from = 40`, `to = 59` → elementi dal 41° al 60°.

---

## 5. Implementazione di riferimento (Express + Supabase)

```js
// Whitelist dei campi ordinabili: previene ordinamenti su colonne arbitrarie
const SORTABLE_FIELDS = ['created_at', 'amount', 'status'];
const MAX_LIMIT = 100;

app.get('/api/requests', async (req, res) => {
  try {
    // 1. Parsing + default + clamp
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || 20));

    // 2. Ordinamento validato
    const sort  = SORTABLE_FIELDS.includes(req.query.sort) ? req.query.sort : 'created_at';
    const order = req.query.order === 'asc' ? 'asc' : 'desc';

    // 3. Calcolo del range (estremi inclusi)
    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    // 4. Query base con conteggio totale esatto
    //    { count: 'exact' } fa restituire a Supabase il totale che soddisfa i filtri
    let query = supabase
      .from('requests')
      .select('*', { count: 'exact' });

    // 5. Filtri (applicati SOLO se presenti nella query string)
    if (req.query.status) {
      query = query.eq('status', req.query.status);
    }
    if (req.query.user_id) {
      query = query.eq('user_id', req.query.user_id);
    }

    // 6. Ordinamento + paginazione (dopo i filtri)
    query = query
      .order(sort, { ascending: order === 'asc' })
      .range(from, to);

    // 7. Esecuzione
    const { data, count, error } = await query;
    if (error) {
      return res.status(500).json({ error: 'Errore nel recupero dei dati' });
    }

    // 8. Risposta nel formato standard
    res.status(200).json({
      data,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
  }
});
```

### Note importanti sull'implementazione Supabase

- `{ count: 'exact' }` nel `.select()` fa sì che `count` contenga il totale che soddisfa i filtri applicati. Questo sostituisce la doppia query (dati + `COUNT(*)`) che si userebbe in SQL puro: Supabase restituisce dati e conteggio in un'unica chiamata.
- Il `count` **rispetta i filtri**: se applichi `.eq('status', 'pending')`, `count` conta solo le richieste pending. Corretto, è esattamente ciò che serve al frontend.
- L'`.order()` deve esserci **sempre**: senza un ordinamento stabile, il `range` può restituire doppioni o buchi tra una pagina e l'altra.
- I filtri (`.eq`, `.gte`, `.ilike`, ecc.) usano parametri gestiti dal client Supabase, quindi non c'è rischio di SQL injection concatenando stringhe.

---

## 6. Filtri: regola d'oro

Il conteggio totale deve riflettere gli **stessi filtri** applicati ai dati. Con Supabase questo è automatico perché `count` viene calcolato sulla stessa query filtrata. Se un domani si passasse a SQL puro, ricordarsi di applicare lo stesso `WHERE` sia alla query dei dati sia alla query di `COUNT(*)`.

Filtri comuni e operatori Supabase corrispondenti:

- **uguaglianza:** `.eq('campo', valore)`
- **maggiore/uguale, minore/uguale:** `.gte(...)`, `.lte(...)`
- **ricerca testuale case-insensitive:** ``.ilike('campo', `%${valore}%`)``
- **valore in un insieme:** `.in('campo', [a, b, c])`

---

## 7. Casi limite da gestire

- `page` o `limit` mancanti / non numerici → usare i **default**.
- `page` oltre l'ultima pagina → `data` sarà `[]` (array vuoto), **non** un errore. Stato `200`.
- `limit` esagerato → cappato a `MAX_LIMIT`.
- `sort` non in whitelist → fallback su `created_at`.
- Errore del database → stato `500` con body `{ "error": "..." }`.

---

## 8. Checklist di conformità

Un endpoint è conforme a questo standard se:

- [ ] Accetta `page`, `limit`, `sort`, `order` più eventuali filtri, tutti dalla query string.
- [ ] Applica default e clamp; non crasha su input mancante o invalido.
- [ ] Valida `sort` contro una whitelist e `order` a `asc`/`desc`.
- [ ] Usa `.range((page-1)*limit, (page-1)*limit + limit - 1)`.
- [ ] Ordina sempre i risultati (`.order(...)`).
- [ ] Restituisce `{ data, pagination: { total, page, limit, totalPages } }`.
- [ ] `total` rispetta i filtri (via `{ count: 'exact' }`).
- [ ] `totalPages` calcolato con `Math.ceil`.
- [ ] Codice di stato nell'HTTP, mai nel body.
- [ ] Errori DB → `500` con body `{ error }`.

---

## Appendice — Nota su offset vs cursor

Questo standard usa la paginazione **offset-based** (`page` + `limit` → `.range()`), ideale per la maggior parte dei casi. Su volumi molto grandi (centinaia di migliaia di righe) l'offset alto diventa lento perché il DB deve comunque scorrere tutte le righe saltate. In quel caso si passa a paginazione **cursor-based** (si pagina a partire dall'ultimo valore visto, es. `created_at < ultimo_valore`). Non è richiesto qui, ma è la direzione da prendere se le performance con offset alti diventassero un problema.
