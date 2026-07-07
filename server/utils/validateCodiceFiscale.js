const validateCodiceFiscale = (cf) => {
  if (typeof cf !== "string") return false;

  const value = cf.trim().toUpperCase();

  // Il codice fiscale deve essere esattamente 16 caratteri
  if (value.length !== 16) return false;

  // Formato: 6 lettere + 2 cifre + 1 lettera + 2 cifre + 1 lettera + 3 cifre + 1 lettera
  const cfRegex = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
  if (!cfRegex.test(value)) return false;

  // Tabella valori per posizioni dispari (1-based), cioè indici pari (0-based)
  const oddMap = {
    0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21,
    A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21,
    K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14,
    U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
  };

  // Tabella valori per posizioni pari (1-based), cioè indici dispari (0-based)
  const evenMap = {
    0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
    A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8, J: 9,
    K: 10, L: 11, M: 12, N: 13, O: 14, P: 15, Q: 16, R: 17, S: 18, T: 19,
    U: 20, V: 21, W: 22, X: 23, Y: 24, Z: 25,
  };

  // Calcolo del carattere di controllo sui primi 15 caratteri
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const char = value[i];
    if (i % 2 === 0) {
      // Indice pari (0-based) = posizione dispari (1-based)
      sum += oddMap[char];
    } else {
      // Indice dispari (0-based) = posizione pari (1-based)
      sum += evenMap[char];
    }
  }

  const expectedCheck = String.fromCharCode((sum % 26) + "A".charCodeAt(0));
  return value[15] === expectedCheck;
};

module.exports = { validateCodiceFiscale };
