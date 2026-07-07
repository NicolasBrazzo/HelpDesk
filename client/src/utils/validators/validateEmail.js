// Speculare a server/utils/validateEmail.js: stessa regex e stessa logica,
// così il messaggio mostrato prima dell'invio coincide con quello del backend.
export const validateEmail = (email) => {
  if (typeof email !== "string") return false;

  // RFC 5322-like basic validation: testo@dominio.tld (no spazi, con punto nel dominio)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(email.trim());
};
