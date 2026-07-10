// Vocabolario di dominio dei ticket, condiviso tra la pagina, il form e il dettaglio.
// I `value` coincidono con quelli accettati dal backend (tickets.controller.js).
export const PRIORITY_OPTIONS = [
  { value: "low", label: "Bassa" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

export const STATUS_OPTIONS = [
  { value: "open", label: "Aperto" },
  { value: "in_progress", label: "In lavorazione" },
  { value: "resolved", label: "Risolto" },
  { value: "rejected", label: "Rifiutato" },
];

// Mappe valore → etichetta, derivate dalle opzioni per non riscriverle a mano.
export const PRIORITY_LABEL = Object.fromEntries(PRIORITY_OPTIONS.map((o) => [o.value, o.label]));
export const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));

// Varianti del componente Badge associate a ciascun valore.
export const PRIORITY_BADGE = { low: "muted", medium: "info", high: "warning", urgent: "destructive" };
export const STATUS_BADGE = { open: "info", in_progress: "warning", resolved: "success", rejected: "destructive" };
