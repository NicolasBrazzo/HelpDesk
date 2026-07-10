import api from "../api/client";

export const fetchCategories = async () => {
  try {
    const res = await api.get("/categories");
    return res.data.categories;
  } catch (err) {
    throw new Error(err.message);
  }
};
