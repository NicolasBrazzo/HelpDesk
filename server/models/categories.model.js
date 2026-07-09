const supabase = require("../config/db_connection");

const TABLE_NAME = "hd_categories";

// get all categories
const findAllCategories = async () => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, description");
  if (error) {
    throw new Error("DATABASE_FIND_ALL_CATEGORIES_ERROR");
  }
  return data;
};

module.exports = {
  findAllCategories
};