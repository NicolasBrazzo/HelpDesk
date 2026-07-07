const validatePhoneNumber = (phone) => {
  if (typeof phone !== "string" && typeof phone !== "number") return false;

  const value = String(phone).trim();

  // Rimuove spazi, trattini e parentesi comuni nel formato telefono
  const normalized = value.replace(/[\s\-().]/g, "");

  // Accetta numeri italiani con o senza prefisso +39, 9-10 cifre nazionali (massimo 10)
  const phoneRegex = /^(?:\+39)?\d{9,10}$/;

  return phoneRegex.test(normalized);
};

module.exports = { validatePhoneNumber };

