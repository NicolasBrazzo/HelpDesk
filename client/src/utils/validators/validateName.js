// Ritorna true se il valore è un nome/cognome valido: almeno 2 caratteri e
// solo lettere, spazi, apostrofi e trattini.
export const validateName = (value) => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < 2) return false;
  return /^[A-Za-zÀ-ÿ' -]+$/.test(trimmed);
};
