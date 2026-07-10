import { Badge } from "@/components/ui/badge";
import { TICKETS_COLUMN_LABELS } from "@/constants/columnLabels";
import {
  PRIORITY_BADGE,
  PRIORITY_LABEL,
  STATUS_BADGE,
  STATUS_LABEL,
} from "@/constants/tickets";

// Dettaglio di sola lettura del ticket, mostrato nel modal alla selezione di una riga.
// Il ticket arriva già completo dalla lista (il backend fa select("*")).
export const TicketDetails = ({ ticket, categoryMap }) => {
  if (!ticket) return null;

  const formatDate = (v) => (v ? new Date(v).toLocaleDateString("it-IT") : "—");

  // Righe mostrate solo quando valorizzate (presa in carico / risoluzione / rifiuto)
  const extraRows = [
    ticket.taken_in_charge_at && ["Presa in carico il", formatDate(ticket.taken_in_charge_at)],
    ticket.resolved_at && ["Risolto il", formatDate(ticket.resolved_at)],
    ticket.worked_hours != null && ["Ore lavorate", String(ticket.worked_hours)],
    ticket.resolution_note && ["Nota di risoluzione", ticket.resolution_note],
    ticket.rejection_reason && ["Motivo del rifiuto", ticket.rejection_reason],
  ].filter(Boolean);

  return (
    <dl className="space-y-3">
      <div className="space-y-1">
        <dt className="text-sm text-muted-foreground">{TICKETS_COLUMN_LABELS.title}</dt>
        <dd className="text-sm font-medium">{ticket.title || "—"}</dd>
      </div>
      <div className="space-y-1">
        <dt className="text-sm text-muted-foreground">{TICKETS_COLUMN_LABELS.description}</dt>
        <dd className="text-sm whitespace-pre-wrap">{ticket.description || "—"}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-sm text-muted-foreground">{TICKETS_COLUMN_LABELS.category}</dt>
        <dd className="text-sm font-medium text-right">
          {categoryMap[ticket.category_id] || "—"}
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-sm text-muted-foreground">{TICKETS_COLUMN_LABELS.priority}</dt>
        <dd className="text-right">
          <Badge variant={PRIORITY_BADGE[ticket.priority] || "muted"}>
            {PRIORITY_LABEL[ticket.priority] || ticket.priority}
          </Badge>
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-sm text-muted-foreground">{TICKETS_COLUMN_LABELS.status}</dt>
        <dd className="text-right">
          <Badge variant={STATUS_BADGE[ticket.status] || "muted"}>
            {STATUS_LABEL[ticket.status] || ticket.status}
          </Badge>
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-sm text-muted-foreground">{TICKETS_COLUMN_LABELS.created_at}</dt>
        <dd className="text-sm font-medium text-right">{formatDate(ticket.created_at)}</dd>
      </div>

      {extraRows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="text-sm font-medium text-right">{value}</dd>
        </div>
      ))}
    </dl>
  );
};
