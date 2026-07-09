const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const protect = require("../middleware/auth");
const { findAllTickets, findTicketById, createNewTicket } = require("../models/tickets.model");
const router = express.Router();

const PRIORITIES = ["low", "medium", "high", "urgent"];

// GET Tickets
router.get("/", protect, async (req, res) => {
  try {
    const tickets = await findAllTickets();

    return res.status(200).json({
      ok: true,
      tickets,
    });
  } catch (err) {
    console.error("GET TICKETS ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Errore interno del server",
    });
  }
});

// GET Ticket by ID
router.get("/:id", protect, async (req, res) => {
  try {
    const tickets = await findTicketById(req.params.id);

    return res.status(200).json({
      ok: true,
      tickets,
    });
  } catch (err) {
    console.error("GET TICKET BY ID ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Errore interno del server",
    });
  }
});

// POST Create a new ticket
router.post("/", protect, async (req, res) => {
  try {
    const { title, description, categoryId, priority } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        ok: false,
        error: "Il titolo è obbligatorio",
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        ok: false,
        error: "La descrizione è obbligatoria",
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        ok: false,
        error: "La categoria è obbligatoria",
      });
    }

    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({
        ok: false,
        error: `Priorità non valida: ammessi ${PRIORITIES.join(", ")}`,
      });
    }

    const newTicket = await createNewTicket(
      title.trim(),
      description.trim(),
      categoryId,
      priority,
      req.user.sub
    );

    return res.status(201).json({
      ok: true,
      ticket: newTicket,
    });
  } catch (err) {
    console.error("POST TICKET ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Errore interno del server",
    });
  }
});


module.exports = router;
