// Configurazione DB => connessione DB in un unico punto
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase environment variables missing");
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log("Database connected")

module.exports = supabase;