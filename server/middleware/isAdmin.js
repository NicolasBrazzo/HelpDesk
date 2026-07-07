// Middleware di autorizzazione admin: da usare DOPO `protect`
// (si aspetta req.user già popolato dal token JWT).
const isAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ ok: false, error: "Accesso non autorizzato" });
  }
  next();
};

module.exports = isAdmin;
