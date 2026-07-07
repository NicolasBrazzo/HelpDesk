// Speculare a server/utils/validatePassword.js. Ritorna true se la password
// rispetta tutte le regole (min 6 caratteri, una maiuscola, un numero, un
// carattere speciale), false altrimenti.
export const validatePassword = (password) => {
  if (typeof password !== "string") return false;
  if (password.length < 6) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/;'`~]/.test(password)) return false;
  return true;
};
