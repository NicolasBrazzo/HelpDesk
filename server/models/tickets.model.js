const supabase = require("../config/db_connection");

const TABLE_NAME = "hd_tickets";

// get all tickets — i filtri sono opzionali e vengono applicati solo se presenti
// filters: { status, categoryId, priority, requesterId, technicianId, month }
const findAllTickets = async (filters = {}) => {
  let query = supabase
    .from(TABLE_NAME)
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.requesterId) query = query.eq("requester_id", filters.requesterId);
  if (filters.technicianId) {
    query = query.eq("assigned_technician_id", filters.technicianId);
  }

  // month = "YYYY-MM" → intervallo [primo del mese, primo del mese dopo)
  // sulla data di apertura (created_at)
  if (filters.month) {
    const [year, month] = filters.month.split("-").map(Number);
    const from = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const to = new Date(Date.UTC(year, month, 1)).toISOString();
    query = query.gte("created_at", from).lt("created_at", to);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("DATABASE_FIND_ALL_TICKETS_ERROR");
  }

  return data;
};

// find ticket by id
const findTicketById = async (id) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error("DATABASE_FIND_TICKET_ERROR");
  }

  return data;
};

// create new ticket — lo stato iniziale e il richiedente li imposta il controller
const createNewTicket = async (ticketData) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([ticketData])
    .select()
    .single();

  if (error) {
    throw new Error("DATABASE_CREATE_TICKET_ERROR");
  }

  return data;
};

// edit ticket by id — usata sia per la modifica del richiedente sia per le
// transizioni di stato (presa in carico / risoluzione / rifiuto)
const updateTicketById = async (id, ticketData) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(ticketData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error("DATABASE_EDIT_TICKET_ERROR");
  }

  return data;
};

// delete ticket by id
const deleteTicketById = async (id) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error("DATABASE_DELETE_TICKET_ERROR");
  }

  return data;
};

module.exports = {
  createNewTicket,
  findAllTickets,
  findTicketById,
  updateTicketById,
  deleteTicketById,
};
