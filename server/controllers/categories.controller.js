const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const protect = require("../middleware/auth");
const { findAllCategories } = require("../models/categories.model");
const router = express.Router();

// GET categories
router.get("/", protect, async (req, res) => {
  try {
    const categories = await findAllCategories();

    return res.json({
      ok: true,
      categories,
    });
  } catch (err) {
    console.error("GET CATEGORIES ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Errore interno del server",
    });
  }
});

module.exports = router;
