const validatePassword = (password) => {
  const errors = [];
  if (password.length < 6) {
    errors.push("La password deve contenere almeno 6 caratteri");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("La password deve contenere almeno una lettera maiuscola");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("La password deve contenere almeno un numero");
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;'`~]/.test(password)) {
    errors.push("La password deve contenere almeno un carattere speciale");
  }
  return errors;
};

module.exports = {validatePassword};
