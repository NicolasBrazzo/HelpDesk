import api from "../api/client";

export const fetchUsers = async () => {
  try {
    const res = await api.get("/users");
    return res.data.users;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const fetchUserById = async (id) => {
  try {
    const res = await api.get(`/users/${id}`);
    return res.data.user;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const createUser = async (payload) => {
  try {
    const res = await api.post("/users", payload);
    return res.data.user;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const updateUser = async (id, payload) => {
  try {
    const res = await api.put(`/users/${id}`, payload);
    return res.data.user;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const deleteUser = async (id) => {
  try {
    const res = await api.delete(`/users/${id}`);
    return res.data.user;
  } catch (err) {
    throw new Error(err.message);
  }
};
