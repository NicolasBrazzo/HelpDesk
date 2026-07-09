const supabase = require("../config/db_connection");

const TABLE_NAME = "hd_categories";

// get all categories 
const findAllCategories = async () => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, description, created_at")
    .order("description", { ascending: true });

  if (error) {
    throw new Error("DATABASE_FIND_ALL_CATEGORIES_ERROR");
  }

  return data;
};

// find category by id
const findCategoryById = async (id) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("id", id)
    .maybeSingle(); // .single genera un errore se non trova righe!

  if (error) {
    throw new Error("DATABASE_FIND_CATEGORY_ERROR");
  }

  return data;
};

module.exports = {
  findAllCategories,
  findCategoryById,
};
