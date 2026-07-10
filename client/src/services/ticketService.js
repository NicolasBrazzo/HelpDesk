import api from "../api/client";

export const fetchTickets = async (filters = {}) => {
  try {
    // Scarta i filtri vuoti così non finiscono come query param inutili.
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== "" && value != null),
    );
    const res = await api.get("/tickets", { params });
    // Il backend risponde { data, pagination } (vedi tickets.controller.js)
    return res.data.data;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const fetchTicketById = async (id) => {
  try {
    const res = await api.get(`/tickets/${id}`);
    return res.data.ticket;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const createTicket = async (payload) => {
  try {
    const res = await api.post("/tickets", payload);
    return res.data.ticket;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const updateTicket = async (id, payload) => {
  try {
    const res = await api.put(`/tickets/${id}`, payload);
    return res.data.ticket;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const deleteTicket = async (id) => {
  try {
    const res = await api.delete(`/tickets/${id}`);
    return res.data.ticket;
  } catch (err) {
    throw new Error(err.message);
  }
};
