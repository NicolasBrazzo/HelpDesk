// Speculare a client/src/utils/validators/validateName.js. Ritorna true se il
// valore è un nome/cognome valido: almeno 2 caratteri (dopo il trim, quindi
// niente valori composti da soli spazi) e solo lettere, spazi, apostrofi e
// trattini.
const validateName = (value) => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;
  return /^[A-Za-zÀ-ÿ' -]+$/.test(trimmed);
};

module.exports = { validateName };
