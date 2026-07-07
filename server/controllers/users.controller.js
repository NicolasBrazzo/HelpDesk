const express = require("express");
const bcrypt = require("bcrypt");
const {
  findAllUsers,
  findUserById,
  findUserByEmail,
  createNewUser,
  updateUserById,
  deleteUserById,
} = require("../models/user.model");
const protect = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const { validateEmail } = require("../utils/validateEmail");
const { validatePassword } = require("../utils/validatePassword");
const { validateName } = require("../utils/validateName");

const router = express.Router();

// Get All Users
router.get("/", protect, isAdmin, async (req, res) => {
  try {
    const users = await findAllUsers();
    return res.status(200).json({ ok: true, users });
  } catch (err) {
    console.error("GET ALL USERS ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Get single user by id
router.get("/:id", protect, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({ ok: false, error: "Utente non trovato" });
    }
    return res.status(200).json({ ok: true, user });
  } catch (err) {
    console.error("GET SINGLE USER BY ID ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Create User
router.post("/", protect, isAdmin, async (req, res) => {
  try {
    const { email, password, isAdmin, first_name, last_name } = req.body;

    // Validazione base dei campi
    if (!email || !password || typeof isAdmin !== "boolean") {
      return res.status(400).json({
        ok: false,
        error: "Campi obbligatori mancanti: email, password, tipo utente",
      });
    }

    // Validazione nome e cognome
    if (!validateName(first_name) || !validateName(last_name)) {
      return res.status(400).json({
        ok: false,
        error: "Nome e cognome sono obbligatori (minimo 2 caratteri, solo lettere, spazi, apostrofi e trattini)",
      });
    }

    // Validazione email
    if (!validateEmail(email)) {
      return res.status(400).json({
        ok: false,
        error: "Formato email non valido: deve essere nel formato testo@dominio.tld",
      });
    }

    // Validazione password
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        ok: false,
        error: passwordErrors,
      });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        ok: false,
        error: "Email già in uso",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await createNewUser(
      email,
      hashedPassword,
      isAdmin,
      first_name.trim(),
      last_name.trim()
    );
    return res.status(201).json({ ok: true, user });
  } catch (err) {
    console.error("CREATE USER ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Update User by ID
router.put("/:id", protect, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, isAdmin, first_name, last_name } = req.body;

    if (String(req.user.sub) === id && req.user.isAdmin && isAdmin === false) {
      return res.status(403).json({
        ok: false,
        error: "Non puoi rimuovere i privilegi di amministratore dal tuo account.",
      });
    }

    // Validazione base dei campi (email obbligatoria, password opzionale ma se presente deve essere valida)
    if (!email || typeof isAdmin !== "boolean") {
      return res.status(400).json({
        ok: false,
        error: "Campi obbligatori mancanti: email, tipo utente",
      });
    }

    // Validazione nome e cognome
    if (!validateName(first_name) || !validateName(last_name)) {
      return res.status(400).json({
        ok: false,
        error: "Nome e cognome sono obbligatori (minimo 2 caratteri, solo lettere, spazi, apostrofi e trattini)",
      });
    }

    let updateData = {
      email,
      isAdmin,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
    };

    if (password) {
      const passwordErrors = validatePassword(password);
      if (passwordErrors.length > 0) {
        return res.status(400).json({
          ok: false,
          error: passwordErrors,
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const user = await updateUserById(id, updateData);
    return res.status(200).json({ ok: true, user });
  } catch (err) {
    console.error("UPDATE USER BY ID ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Delete User by ID
router.delete("/:id", protect, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await deleteUserById(id);
    return res.status(200).json({ ok: true, user });
  } catch (err) {
    console.error("DELETE USER BY ID ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

module.exports = router;
