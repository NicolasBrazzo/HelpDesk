export const sortByField = (data, field, direction = "asc", config = {}) => {
  if (!Array.isArray(data) || !field) return data || [];

  const type = config[field]?.type || "string";
  const normalized = [...data];

  normalized.sort((a, b) => {
    let va = a?.[field];
    let vb = b?.[field];

    if (type === "boolean") {
      va = va ? 1 : 0;
      vb = vb ? 1 : 0;
    } else if (type === "number") {
      va = Number(va) || 0;
      vb = Number(vb) || 0;
    } else if (type === "date") {
      const da = va ? new Date(va) : null;
      const db = vb ? new Date(vb) : null;
      va =
        da instanceof Date && !Number.isNaN(da.getTime()) ? da.getTime() : 0;
      vb =
        db instanceof Date && !Number.isNaN(db.getTime()) ? db.getTime() : 0;
    } else {
      // default string
      va = (va ?? "").toString().toLowerCase();
      vb = (vb ?? "").toString().toLowerCase();
    }

    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  });

  if (direction === "desc") {
    normalized.reverse();
  }

  return normalized;
};

