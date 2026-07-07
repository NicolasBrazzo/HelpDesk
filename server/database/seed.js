// =============================================================================
// Seed del database — dati iniziali e credenziali di test
// =============================================================================
// Esecuzione:  npm run seed  (da dentro server/)
//
// Idempotente: usa upsert con onConflict sull'email, quindi può essere
// rilanciato senza creare duplicati. Punta al database configurato in .env
// (SUPABASE_URL / SUPABASE_KEY), quindi funziona sia in locale sia per
// popolare il DB usato dal deploy.
//
// Le credenziali qui sotto sono quelle da consegnare come "utenti di test".
// =============================================================================

require("dotenv").config();
const bcrypt = require("bcrypt");
const supabase = require("../config/db_connection");

// Non importiamo config/jwt.js (fail-fast su JWT_SECRET, qui non serve)
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10;

const USERS_TABLE = "T_Users";

// Utenti di test: 1 admin + 1 utente ordinario.
// Password conformi a validatePassword (min 6 char, maiuscola, numero, speciale).
const SEED_USERS = [
  {
    email: "admin@test.it",
    password: "Admin123!",
    isAdmin: true,
    first_name: "Anna",
    last_name: "Amministratore",
  },
  {
    email: "utente@test.it",
    password: "Utente123!",
    isAdmin: false,
    first_name: "Ugo",
    last_name: "Utente",
  },
];

const seedUsers = async () => {
  for (const user of SEED_USERS) {
    const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

    const { error } = await supabase
      .from(USERS_TABLE)
      .upsert(
        {
          email: user.email,
          password: hashedPassword,
          isAdmin: user.isAdmin,
          first_name: user.first_name,
          last_name: user.last_name,
        },
        { onConflict: "email" }
      );

    if (error) {
      console.error(`✗ Errore su ${user.email}:`, error.message);
      process.exitCode = 1;
    } else {
      console.log(
        `✓ ${user.email} (${user.isAdmin ? "admin" : "utente"}) — password: ${user.password}`
      );
    }
  }
};

// -----------------------------------------------------------------------------
// Dati di dominio: aggiungere qui le entità del progetto (categorie, richieste,
// ordini, …) seguendo lo stesso pattern upsert. Ricordarsi di coprire i casi
// utili ai test: stati diversi, più utenti, dati per filtri e statistiche.
// -----------------------------------------------------------------------------
// const seedCategories = async () => { ... };

const main = async () => {
  console.log("Seed del database in corso...\n");
  await seedUsers();
  // await seedCategories();
  console.log("\nSeed completato. Credenziali di test pronte per la consegna.");
};

main().catch((err) => {
  console.error("Seed fallito:", err);
  process.exit(1);
});
