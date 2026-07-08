// Identità dell'app: personalizzare qui (e solo qui) per ogni progetto
// nato dal template. Usato da Sidebar, Login, Register.
// Ricordarsi anche del <title> in index.html.
export const APP_NAME = "Help Desk";
export const APP_LOGO = "💻";

// Etichette dei due ruoli (isAdmin true/false), usate da Register, Users e
// Dashboard. Personalizzarle in base al dominio del progetto, ad esempio:
// admin: "Tecnico", user: "Utente".
export const ROLE_LABELS = {
  admin: "Tecnico",
  user: "Utente",
};

// Contenuti della hero pubblica (HomePage, rotta "/").
// Il titolo è composto da titleStart + titleAccent: la parte "accent" riceve
// la sottolineatura animata. Personalizzare per dominio, ad esempio (rimborsi):
// titleStart: "Ogni rimborso", titleAccent: "al suo posto."
// La pagina usa i token shadcn condivisi; i font display/dati sono
// --font-display e --font-data in index.css.
export const HOME = {
  eyebrow: "Gestione operativa",
  titleStart: "Ogni cosa",
  titleAccent: "al suo posto.",
  subtitle:
    "Utenti, ruoli e attività di ogni giorno in un unico registro ordinato. Accedi con il tuo account, o creane uno per iniziare a lavorare.",
  ctaPrimary: "Accedi",
  ctaSecondary: "Crea un account",
  ctaLogged: "Vai alla dashboard",
  features: ["Autenticazione JWT", "Ruoli e permessi", "API documentate"],
  // Numeri della mini-dashboard dimostrativa (contenuto decorativo)
  stats: [
    { value: 128, label: "Utenti attivi" },
    { value: 342, label: "Attività oggi" },
    { value: 27, label: "Report generati" },
  ],
  // Righe dimostrative della scheda "registro attività" (contenuto decorativo)
  ledger: {
    title: "Registro attività",
    protocol: "Prot. 2026/014",
    rows: [
      { time: "09:12", text: "Nuovo utente registrato", tag: "Utenti" },
      { time: "09:47", text: "Anagrafica aggiornata", tag: "Archivio" },
      { time: "10:31", text: "Permessi modificati", tag: "Ruoli" },
      { time: "11:05", text: "Report mensile esportato", tag: "Report" },
    ],
  },
};
