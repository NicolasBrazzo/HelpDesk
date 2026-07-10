const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const protect = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const {
  findAllTickets,
  findTicketById,
  createNewTicket,
  updateTicketById,
  deleteTicketById,
  updateTicketStatusById,
} = require("../models/tickets.model");
const { validateName } = require("../utils/validateName");
const router = express.Router();

const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["open", "in_progress", "resolved", "rejected"];
// Whitelist dei campi ordinabili: mai passare al DB una colonna arbitraria dal client
const SORTABLE_FIELDS = ["created_at", "priority", "status", "taken_in_charge_at", "resolved_at"];
const MAX_LIMIT = 100;

// Converte "month" (YYYY-MM) o un periodo esplicito (dateFrom/dateTo) in filtri
// sulla data di apertura (created_at). "month" ha la precedenza se valido.
const resolveDateFilters = ({ month, dateFrom, dateTo }) => {
  if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
    const [year, m] = month.split("-").map(Number);
    if (m >= 1 && m <= 12) {
      const start = new Date(Date.UTC(year, m - 1, 1));
      const nextMonth = new Date(Date.UTC(year, m, 1));
      // Upper bound esclusivo: [primo giorno del mese, primo giorno del mese successivo)
      return {
        dateFrom: start.toISOString(),
        dateToExclusive: nextMonth.toISOString(),
      };
    }
  }

  const result = {};
  if (dateFrom) result.dateFrom = dateFrom;
  if (dateTo) result.dateTo = dateTo;
  return result;
};

// GET Tickets — elenco paginato con filtri (vedi FILTERS_BE.md)
router.get("/", protect, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || 20));

    const sort = SORTABLE_FIELDS.includes(req.query.sort) ? req.query.sort : "created_at";
    const order = req.query.order === "asc" ? "asc" : "desc";

    const filters = {};

    if (STATUSES.includes(req.query.status)) {
      filters.status = req.query.status;
    }
    if (req.query.categoryId) {
      filters.categoryId = req.query.categoryId;
    }
    if (PRIORITIES.includes(req.query.priority)) {
      filters.priority = req.query.priority;
    }
    Object.assign(filters, resolveDateFilters(req.query));

    if (req.user.isAdmin) {
      if (req.query.requesterId) {
        filters.requesterId = req.query.requesterId;
      }
    } else {
      filters.requesterId = req.user.sub;
    }

    const { data, count } = await findAllTickets({ page, limit, sort, order, filters });

    return res.status(200).json({
      data,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error("GET TICKETS ERROR:", err);

    return res.status(500).json({
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

    if (validateName(title) === false) {
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

// PUT Update ticket by ID — modifica i campi editabili (titolo, descrizione,
// categoria, priorità). I cambi di stato hanno endpoint dedicati.
router.put("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, categoryId, priority } = req.body;

    const ticket = await findTicketById(id);
    if (!ticket) {
      return res.status(404).json({
        ok: false,
        error: "Ticket non trovato",
      });
    }

    // Ownership: un richiedente può modificare solo i propri ticket
    if (!req.user.isAdmin && ticket.requester_id !== req.user.sub) {
      return res.status(403).json({
        ok: false,
        error: "Non sei autorizzato a modificare questo ticket",
      });
    }

    const updateData = {};

    if (title !== undefined) {
      if (validateName(title) === false) {
        return res.status(400).json({
          ok: false,
          error: "Il titolo è obbligatorio",
        });
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      if (!description || !description.trim()) {
        return res.status(400).json({
          ok: false,
          error: "La descrizione è obbligatoria",
        });
      }
      updateData.description = description.trim();
    }

    if (categoryId !== undefined) {
      if (!categoryId) {
        return res.status(400).json({
          ok: false,
          error: "La categoria è obbligatoria",
        });
      }
      updateData.category_id = categoryId;
    }

    if (priority !== undefined) {
      if (!PRIORITIES.includes(priority)) {
        return res.status(400).json({
          ok: false,
          error: `Priorità non valida: ammessi ${PRIORITIES.join(", ")}`,
        });
      }
      updateData.priority = priority;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Nessun campo da aggiornare",
      });
    }

    const updatedTicket = await updateTicketById(id, updateData);

    return res.status(200).json({
      ok: true,
      ticket: updatedTicket,
    });
  } catch (err) {
    console.error("PUT TICKET ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Errore interno del server",
    });
  }
});

// PATCH Prendi in carico — transizione open → in_progress (solo tecnico).
// Assegna il ticket al tecnico autenticato e registra la data di presa in carico.
router.patch("/:id/take-in-charge", protect, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await findTicketById(id);
    if (!ticket) {
      return res.status(404).json({
        ok: false,
        error: "Ticket non trovato",
      });
    }

    // La presa in carico è ammessa solo da uno stato 'open'
    if (ticket.status !== "open") {
      return res.status(409).json({
        ok: false,
        error: "Solo un ticket aperto può essere preso in carico",
      });
    }

    const updatedTicket = await updateTicketById(id, {
      status: "in_progress",
      assigned_technician_id: req.user.sub,
      taken_in_charge_at: new Date().toISOString(),
    });

    return res.status(200).json({
      ok: true,
      ticket: updatedTicket,
    });
  } catch (err) {
    console.error("TAKE TICKET IN CHARGE ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Errore interno del server",
    });
  }
});

// PATCH Update ticker a risolto
router.patch("/:id/resolve", protect, async (req, res) => {
  try {
    const { id } = req.params;

    if(!id) {
      return res.status(400).json({
        ok: false,
        error: "ID del ticket mancante",
      });
  }

    const ticket = await findTicketById(id);
    if (!ticket) {
      return res.status(404).json({
        ok: false,
        error: "Ticket non trovato",
      });
    }

    const updatedTicket = await updateTicketStatusById(id, "resolved");
    return res.status(200).json({
      ok: true,
      ticket: updatedTicket,
    });

  } catch (err) {
    console.error("CHANGE TICKET TO RESOLVED ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Errore interno del server",
    });
  }
});

// PATCH Update ticket to rifiutato
router.patch("/:id/reject", protect, async (req, res) => {
  try {
    const { id } = req.params;

    if(!id) {
      return res.status(400).json({
        ok: false,
        error: "ID del ticket mancante",
      });
  }

    const ticket = await findTicketById(id);
    if (!ticket) {
      return res.status(404).json({
        ok: false,
        error: "Ticket non trovato",
      });
    }

    const updatedTicket = await updateTicketStatusById(id, "rejected");
    return res.status(200).json({
      ok: true,
      ticket: updatedTicket,
    });

  } catch (err) {
    console.error("CHANGE TICKET TO REJECTED ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Errore interno del server",
    });
  }
});

// DELETE Delete ticket by ID
router.delete("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await findTicketById(id);
    if (!ticket) {
      return res.status(404).json({
        ok: false,
        error: "Ticket non trovato",
      });
    }

    // Ownership: un richiedente può eliminare solo i propri ticket
    if (!req.user.isAdmin && ticket.requester_id !== req.user.sub) {
      return res.status(403).json({
        ok: false,
        error: "Non sei autorizzato a eliminare questo ticket",
      });
    }

    const deletedTicket = await deleteTicketById(id);

    return res.status(200).json({
      ok: true,
      ticket: deletedTicket,
    });
  } catch (err) {
    console.error("DELETE TICKET ERROR:", err);

    return res.status(500).json({
      ok: false,
      error: "Errore interno del server",
    });
  }
});


module.exports = router;
