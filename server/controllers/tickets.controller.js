const express = require("express");

const {
  findAllTickets,
  findTicketById,
  createNewTicket,
  updateTicketById,
  deleteTicketById,
} = require("../models/tickets.model");
const { findCategoryById } = require("../models/categories.model");

const protect = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

const router = express.Router();

const STATUSES = ["open", "in_progress", "resolved", "rejected"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

// da → a: transizioni di stato ammesse. `resolved` e `rejected` sono terminali.
const VALID_TRANSITIONS = {
  open: ["in_progress", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved: [],
  rejected: [],
};

const STATUS_LABELS = {
  open: "Aperto",
  in_progress: "In lavorazione",
  resolved: "Risolto",
  rejected: "Rifiutato",
};

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

// Valida i campi che il richiedente può impostare (create/update) e verifica
// che la categoria esista davvero. Ritorna { error } oppure { data }.
const validateTicketPayload = async (body) => {
  const { title, description, category_id, priority } = body;

  if (!isNonEmptyString(title)) {
    return { error: "Il titolo è obbligatorio" };
  }

  if (!isNonEmptyString(description)) {
    return { error: "La descrizione è obbligatoria" };
  }

  if (!isNonEmptyString(category_id)) {
    return { error: "La categoria è obbligatoria" };
  }

  if (!PRIORITIES.includes(priority)) {
    return { error: "Priorità non valida (valori ammessi: low, medium, high, urgent)" };
  }

  const category = await findCategoryById(category_id);
  if (!category) {
    return { error: "La categoria selezionata non esiste" };
  }

  return {
    data: {
      title: title.trim(),
      description: description.trim(),
      category_id,
      priority,
    },
  };
};

// Carica il ticket applicando la regola di ownership.
// Ritorna { status, error } se va bloccato, altrimenti { ticket }.
// Nota: a chi non è proprietario si risponde 404 (non 403) per non rivelare
// l'esistenza di ticket altrui.
const loadOwnedTicket = async (id, user) => {
  const ticket = await findTicketById(id);
  if (!ticket) {
    return { status: 404, error: "Ticket non trovato" };
  }

  if (ticket.requester_id !== user.sub) {
    return { status: 404, error: "Ticket non trovato" };
  }

  return { ticket };
};

// Helper condiviso dalle rotte azione del tecnico (presa in carico / risoluzione / rifiuto).
const transition = async (req, res, targetStatus, extraFields = {}) => {
  try {
    const ticket = await findTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ ok: false, error: "Ticket non trovato" });
    }

    const allowed = VALID_TRANSITIONS[ticket.status] ?? [];
    if (!allowed.includes(targetStatus)) {
      return res.status(409).json({
        ok: false,
        error: `Un ticket ${STATUS_LABELS[ticket.status]} non può passare a ${STATUS_LABELS[targetStatus]}`,
      });
    }

    const updated = await updateTicketById(ticket.id, {
      status: targetStatus,
      ...extraFields,
    });

    return res.status(200).json({ ok: true, ticket: updated });
  } catch (err) {
    console.error("TICKET TRANSITION ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
};

// Get All Tickets — il richiedente vede solo i propri, il tecnico li vede tutti
router.get("/", protect, async (req, res) => {
  try {
    const { status, categoryId, priority, month, requesterId } = req.query;

    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ ok: false, error: "Stato non valido" });
    }

    if (priority && !PRIORITIES.includes(priority)) {
      return res.status(400).json({ ok: false, error: "Priorità non valida" });
    }

    if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ ok: false, error: "Mese non valido (formato YYYY-MM)" });
    }

    const filters = { status, categoryId, priority, month };

    if (req.user.isAdmin) {
      // il tecnico può filtrare per richiedente specifico (o vederli tutti)
      if (requesterId) filters.requesterId = requesterId;
    } else {
      // il richiedente vede SOLO i propri, qualunque cosa passi in query
      filters.requesterId = req.user.sub;
    }

    const tickets = await findAllTickets(filters);
    return res.status(200).json({ ok: true, tickets });
  } catch (err) {
    console.error("GET ALL TICKETS ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Get single ticket by id — il richiedente può vedere solo i propri
router.get("/:id", protect, async (req, res) => {
  try {
    const ticket = await findTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ ok: false, error: "Ticket non trovato" });
    }

    if (!req.user.isAdmin && ticket.requester_id !== req.user.sub) {
      return res.status(404).json({ ok: false, error: "Ticket non trovato" });
    }

    return res.status(200).json({ ok: true, ticket });
  } catch (err) {
    console.error("GET SINGLE TICKET BY ID ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Create Ticket — requester_id viene sempre dal token, mai dal body; stato iniziale `open`
router.post("/", protect, async (req, res) => {
  try {
    const { error, data } = await validateTicketPayload(req.body);
    if (error) {
      return res.status(400).json({ ok: false, error });
    }

    const ticket = await createNewTicket({
      ...data,
      requester_id: req.user.sub,
      status: "open",
    });

    return res.status(201).json({ ok: true, ticket });
  } catch (err) {
    console.error("CREATE TICKET ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Update Ticket by ID — solo il richiedente proprietario e solo finché è `open`
router.put("/:id", protect, async (req, res) => {
  try {
    const { ticket, status, error: ownershipError } = await loadOwnedTicket(req.params.id, req.user);
    if (ownershipError) {
      return res.status(status).json({ ok: false, error: ownershipError });
    }

    if (ticket.status !== "open") {
      return res.status(409).json({
        ok: false,
        error: "Il ticket è già stato preso in carico e non può più essere modificato",
      });
    }

    const { error, data } = await validateTicketPayload(req.body);
    if (error) {
      return res.status(400).json({ ok: false, error });
    }

    const updated = await updateTicketById(ticket.id, data);
    return res.status(200).json({ ok: true, ticket: updated });
  } catch (err) {
    console.error("UPDATE TICKET BY ID ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Delete Ticket by ID — solo il richiedente proprietario e solo finché è `open`
router.delete("/:id", protect, async (req, res) => {
  try {
    const { ticket, status, error: ownershipError } = await loadOwnedTicket(req.params.id, req.user);
    if (ownershipError) {
      return res.status(status).json({ ok: false, error: ownershipError });
    }

    if (ticket.status !== "open") {
      return res.status(409).json({
        ok: false,
        error: "Il ticket è già stato preso in carico e non può più essere eliminato",
      });
    }

    const deleted = await deleteTicketById(ticket.id);
    return res.status(200).json({ ok: true, ticket: deleted });
  } catch (err) {
    console.error("DELETE TICKET BY ID ERROR:", err);
    return res.status(500).json({ ok: false, error: "Errore interno del server" });
  }
});

// Presa in carico — solo tecnico. `open → in_progress`, assegna il ticket al tecnico corrente
router.put("/:id/prendi-in-carico", protect, isAdmin, (req, res) =>
  transition(req, res, "in_progress", {
    assigned_technician_id: req.user.sub,
    taken_in_charge_at: new Date().toISOString(),
  })
);

// Risoluzione — solo tecnico. `in_progress → resolved`, richiede ore lavorate > 0
router.put("/:id/risolvi", protect, isAdmin, async (req, res) => {
  const { worked_hours, resolution_note } = req.body;

  const workedHours = Number(worked_hours);
  if (!Number.isFinite(workedHours) || workedHours <= 0) {
    return res.status(400).json({
      ok: false,
      error: "Le ore lavorate sono obbligatorie e devono essere maggiori di zero",
    });
  }

  // la nota è facoltativa, ma se presente non può essere di soli spazi
  if (resolution_note && !isNonEmptyString(resolution_note)) {
    return res.status(400).json({
      ok: false,
      error: "La nota di risoluzione non può essere vuota",
    });
  }

  return transition(req, res, "resolved", {
    resolved_at: new Date().toISOString(),
    worked_hours: workedHours,
    resolution_note: resolution_note ? resolution_note.trim() : null,
  });
});

// Rifiuto — solo tecnico. `open | in_progress → rejected`, richiede una motivazione
router.put("/:id/rifiuta", protect, isAdmin, async (req, res) => {
  const { rejection_reason } = req.body;

  if (!isNonEmptyString(rejection_reason)) {
    return res.status(400).json({
      ok: false,
      error: "La motivazione di rifiuto è obbligatoria",
    });
  }

  return transition(req, res, "rejected", {
    rejection_reason: rejection_reason.trim(),
  });
});

module.exports = router;
