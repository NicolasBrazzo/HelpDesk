# Deploy — Railway (backend) + Vercel (frontend)

Procedura collaudata per pubblicare il gestionale: server Express su
**Railway**, client Vite su **Vercel**, database già su Supabase (non va
deployato: è lo stesso usato in locale).

**Ordine**: prima il backend (serve il suo URL per configurare il frontend),
poi il frontend, poi si torna su Railway per il CORS.

> Prerequisiti: repo pushato su GitHub; account Railway e Vercel collegati a GitHub. 
> Su Railway verificare di avere **crediti/trial attivi** — farlo il giorno prima, non scoprirlo durante la consegna.

---

## 1. Backend su Railway

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo** → seleziona il repo.
2. Nelle impostazioni del servizio (**Settings**):
   - **Root Directory**: `server`
   - **Start Command**: `npm start` (di norma auto-rilevato)
3. Tab **Variables** → aggiungi:

   | Variabile | Valore |
   |---|---|
   | `SUPABASE_URL` | come nel tuo `server/.env` |
   | `SUPABASE_KEY` | come nel tuo `server/.env` |
   | `JWT_SECRET` | un segreto robusto (può essere diverso da quello locale) |
   | `FRONTEND_URL` | per ora `http://localhost:5173`, si aggiorna al passo 3 |
   | `NODE_ENV` | `production` |

   `PORT` **non serve**: la inietta Railway e `server.js` la legge già.
4. **Settings → Networking → Generate Domain**: ottieni l'URL pubblico,
   es. `https://<progetto>.up.railway.app`.
5. Verifica: apri `https://<progetto>.up.railway.app/health` → deve
   rispondere `{"status":"ok"}`.

## 2. Frontend su Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importa il repo.
2. **Il nome del progetto diventa l'URL**: usa nome e cognome, es.
   `app-nicolas-brazzo` → `https://app-nicolas-brazzo.vercel.app`
   (requisito d'esame: l'URL deve contenere nome e cognome).
3. Configurazione build:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite (auto-rilevato)
4. **Environment Variables**:

   | Variabile | Valore |
   |---|---|
   | `VITE_API_URL` | l'URL Railway del passo 1 (senza slash finale) |

   ⚠️ Le variabili `VITE_*` vengono **compilate nel bundle**: se cambi
   `VITE_API_URL` dopo il deploy devi fare **Redeploy**.
5. Deploy. Il file `client/vercel.json` (già nel repo) riscrive tutte le
   rotte su `index.html`: senza, il refresh su `/dashboard` darebbe 404.

## 3. CORS: chiudi il cerchio

Torna su Railway → **Variables** → imposta `FRONTEND_URL` con l'URL Vercel
esatto (es. `https://app-nicolas-brazzo.vercel.app`, **senza slash finale**:
il valore viene usato tale e quale come origin CORS). Railway ri-deploya da solo.

## 4. Seed e checklist finale

Il seed si lancia **in locale** ma popola lo stesso Supabase usato dal deploy:

```bash
cd server
npm run seed
```

Checklist (dall'URL Vercel, in incognito):

- [ ] `https://<railway>/health` risponde `{"status":"ok"}`
- [ ] Registrazione di un nuovo utente (nome, cognome, email, password, ruolo) funziona
- [ ] Logout e login con le credenziali di test del seed (`admin@test.it` / `Admin123!` = tecnico; `utente@test.it` / `Utente123!` = richiedente)
- [ ] Da richiedente: apertura di un ticket, con modifica/eliminazione consentite solo finché è Aperto
- [ ] Da tecnico: elenco di tutti i ticket, presa in carico / risoluzione / rifiuto e pagina statistiche
- [ ] Refresh del browser su `/dashboard` → nessun 404
- [ ] Collection Postman: cambia `baseUrl` con l'URL Railway e verifica login + una rotta protetta

## Problemi tipici

| Sintomo | Causa probabile |
|---|---|
| Il frontend mostra "Server non raggiungibile" | `VITE_API_URL` sbagliata (o cambiata senza redeploy), oppure backend Railway giù |
| Errore CORS in console | `FRONTEND_URL` su Railway non coincide con l'URL Vercel (occhio a https e slash finale) |
| 404 al refresh su una rotta interna | manca `client/vercel.json` (rewrite SPA) |
| Il backend crasha all'avvio | variabile mancante: `config/jwt.js` e `db_connection.js` fanno fail-fast su `JWT_SECRET` / `SUPABASE_*` |
| Login ok in locale ma non online | seed non eseguito sul DB giusto, o `JWT_SECRET` diverso non c'entra (il token si rigenera al login) — controlla i log Railway |
