const validateEmail = (email) => {
  if (typeof email !== "string") return false;

  // RFC 5322-like basic validation: testo@dominio.tld (no spazi, con punto nel dominio)
  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(email.trim());
};

module.exports = { validateEmail };

