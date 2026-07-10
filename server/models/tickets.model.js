const supabase = require("../config/db_connection");

const TABLE_NAME = "hd_tickets";

// get all tickets — elenco paginato con filtri (vedi FILTERS_BE.md).
// `filters`, `sort` e `order` arrivano già validati dal controller.
// Ritorna { data, count }: `count` è il totale che soddisfa i filtri.
const findAllTickets = async ({ page, limit, sort, order, filters }) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from(TABLE_NAME).select("*", { count: "exact" });

  // Filtri: applicati solo se presenti
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.requesterId) query = query.eq("requester_id", filters.requesterId);
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo);
  if (filters.dateToExclusive) query = query.lt("created_at", filters.dateToExclusive);

  // Ordinamento (sempre, per un range stabile) + paginazione
  query = query.order(sort, { ascending: order === "asc" }).range(from, to);

  const { data, count, error } = await query;
  if (error) {
    throw new Error("DATABASE_FIND_ALL_TICKETS_ERROR");
  }

  return { data, count };
};

// get ticket by id
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

// create new ticket
const createNewTicket = async (title, description, categoryId, priority, requesterId) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([
      {
        title,
        description,
        category_id: categoryId,
        priority,
        requester_id: requesterId,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error("DATABASE_CREATE_TICKET_ERROR");
  }

  return data;
};

// edit ticket by id
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
