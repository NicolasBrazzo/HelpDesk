const validatePartitaIva = (piva) => {
  if (typeof piva !== "string" && typeof piva !== "number") return false;

  const value = String(piva).trim();

  // La partita IVA deve essere esattamente 11 cifre
  if (!/^\d{11}$/.test(value)) return false;

  // Algoritmo di controllo (Luhn-like)
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const digit = parseInt(value[i]);
    if (i % 2 === 0) {
      // Posizione dispari (1-based): somma diretta
      sum += digit;
    } else {
      // Posizione pari (1-based): raddoppia, se >= 10 sottrai 9
      const doubled = digit * 2;
      sum += doubled >= 10 ? doubled - 9 : doubled;
    }
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(value[10]);
};

module.exports = { validatePartitaIva };
