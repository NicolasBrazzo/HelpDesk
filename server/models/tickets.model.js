const supabase = require("../config/db_connection");

const TABLE_NAME = "hd_tickets";

// get all tickets
const findAllTickets = async () => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*");
  if (error) {
    throw new Error("DATABASE_FIND_ALL_TICKETS_ERROR");
  }
  return data;
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
