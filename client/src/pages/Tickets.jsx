import { useState } from "react";
import { Plus, UserCheck } from "lucide-react";

import Loader from "@/components/Loader";
import Modal from "@/components/Modal";
import { DataTable } from "@/components/DataTable";
import { FilterBar } from "@/components/FilterBar";
import { TicketForm } from "@/components/TicketForm";
import { TicketDetails } from "@/components/TicketDetails";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/hooks/useFetch";
import { useMutation } from "@/hooks/useMutation";
import {
  fetchTickets,
  createTicket,
  updateTicket,
  deleteTicket,
  takeTicketInCharge,
} from "@/services/ticketService";
import { fetchCategories } from "@/services/categoriesService";
import { validateName } from "@/utils/validators";
import { showSuccess, showError } from "@/utils/toast";
import { TICKETS_COLUMN_LABELS } from "@/constants/columnLabels";
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  PRIORITY_LABEL,
  STATUS_LABEL,
  PRIORITY_BADGE,
  STATUS_BADGE,
} from "@/constants/tickets";

// La lista ritorna solo category_id (uuid): lo mappo alla descrizione leggibile.
const buildColumns = (categoryMap) => [
  {
    key: "title",
    label: TICKETS_COLUMN_LABELS.title,
    sortable: true,
  },
  {
    key: "category_id",
    label: TICKETS_COLUMN_LABELS.category,
    render: (t) => categoryMap[t.category_id] || "—",
  },
  {
    key: "priority",
    label: TICKETS_COLUMN_LABELS.priority,
    sortable: true,
    render: (t) => (
      <Badge variant={PRIORITY_BADGE[t.priority] || "muted"}>
        {PRIORITY_LABEL[t.priority] || t.priority}
      </Badge>
    ),
  },
  {
    key: "status",
    label: TICKETS_COLUMN_LABELS.status,
    sortable: true,
    render: (t) => (
      <Badge variant={STATUS_BADGE[t.status] || "muted"}>
        {STATUS_LABEL[t.status] || t.status}
      </Badge>
    ),
  },
  {
    key: "created_at",
    label: TICKETS_COLUMN_LABELS.created_at,
    sortable: true,
    sortType: "date",
    render: (t) =>
      t.created_at ? new Date(t.created_at).toLocaleDateString("it-IT") : "—",
  },
];

export const Tickets = () => {
  const { user, loading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [viewingTicket, setViewingTicket] = useState(null);
  // Le chiavi coincidono con i query param del backend: passate così come sono.
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    categoryId: "",
    month: "",
  });

  // Categorie: servono sia al filtro sia alla select del form.
  const { data: categories } = useFetch(() => fetchCategories(), []);

  const {
    data: tickets,
    isLoading,
    error,
    refetch,
  } = useFetch(() => fetchTickets(filters), [filters]);

  const {
    mutate: saveTicket,
    error: saveError,
    reset: resetSaveError,
  } = useMutation(
    (formData) => {
      // Validazione speculare a quella del controller
      if (!validateName(formData.title)) {
        throw new Error(
          "Il titolo è obbligatorio (minimo 2 caratteri, solo lettere, spazi, apostrofi e trattini)",
        );
      }
      if (!formData.description.trim()) {
        throw new Error("La descrizione è obbligatoria");
      }
      if (!formData.categoryId) {
        throw new Error("La categoria è obbligatoria");
      }
      if (!PRIORITY_LABEL[formData.priority]) {
        throw new Error("Priorità non valida");
      }
      const payload = {
        title: formData.title,
        description: formData.description,
        categoryId: formData.categoryId,
        priority: formData.priority,
      };
      return editingTicket
        ? updateTicket(editingTicket.id, payload)
        : createTicket(payload);
    },
    {
      onSuccess: () => {
        showSuccess(
          editingTicket
            ? "Ticket aggiornato con successo"
            : "Ticket creato con successo",
        );
        refetch();
        setIsModalOpen(false);
        setEditingTicket(null);
      },
    },
  );

  const { mutate: removeTicket } = useMutation((ticketId) => deleteTicket(ticketId), {
    onSuccess: () => {
      showSuccess("Ticket eliminato con successo");
      refetch();
    },
  });

  // Presa in carico: solo il tecnico, solo su ticket ancora aperti (open → in_progress).
  const { mutate: takeInCharge } = useMutation(
    (ticketId) => takeTicketInCharge(ticketId),
    {
      onSuccess: () => {
        showSuccess("Ticket preso in carico");
        refetch();
      },
      // Il backend rifiuta con 409 se il ticket non è più 'open' (es. già preso
      // in carico da un altro tecnico): mostro il messaggio invece di ignorarlo.
      onError: (message) => showError(message),
    },
  );

  const handleTakeInCharge = async (ticket) => {
    const ticketId = ticket.id || ticket._id;
    if (!ticketId) return;

    const confirmTake = window.confirm(
      `Vuoi prendere in carico il ticket "${ticket.title}"?`,
    );
    if (!confirmTake) return;

    try {
      await takeInCharge(ticketId);
    } catch {
      // errore gestito dall'hook (toast in onError)
    }
  };

  const handleDelete = async (ticket) => {
    const ticketId = ticket.id || ticket._id;
    if (!ticketId) return;

    const confirmDelete = window.confirm(
      `Sei sicuro di voler eliminare il ticket "${ticket.title}"?`,
    );
    if (!confirmDelete) return;

    try {
      await removeTicket(ticketId);
    } catch {
      // errore gestito dall'hook
    }
  };

  const handleSubmit = async (formData) => {
    try {
      await saveTicket(formData);
    } catch {
      // errore gestito dall'hook (stato `saveError`)
    }
  };

  if (loading) {
    return <Loader />;
  }

  const categoryMap = Object.fromEntries(
    (categories || []).map((c) => [c.id, c.description]),
  );
  const categoryFilterOptions = (categories || []).map((c) => ({
    value: c.id,
    label: c.description,
  }));

  const TICKET_FILTERS = [
    { key: "status", label: "Stato", type: "select", options: STATUS_OPTIONS },
    { key: "priority", label: "Priorità", type: "select", options: PRIORITY_OPTIONS },
    { key: "categoryId", label: "Categoria", type: "select", options: categoryFilterOptions },
    { key: "month", label: "Mese di apertura", type: "month" },
  ];

  const hasTickets = tickets && tickets.length > 0;

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tickets</h1>
          <p className="text-sm text-muted-foreground">
            Consulta e filtra i ticket di assistenza
          </p>
        </div>
        <Button
          size="icon"
          aria-label="Nuovo ticket"
          title="Nuovo ticket"
          onClick={() => {
            setEditingTicket(null);
            resetSaveError();
            setIsModalOpen(true);
          }}
        >
          <Plus />
        </Button>
      </div>

      <FilterBar filters={TICKET_FILTERS} values={filters} onChange={setFilters} />

      {isLoading && <Loader />}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Errore: {error}
        </div>
      )}

      {hasTickets && (
        <DataTable
          columns={buildColumns(categoryMap)}
          data={tickets}
          onRowClick={(ticket) => setViewingTicket(ticket)}
          actions={{
            extra: [
              {
                key: "take-in-charge",
                icon: UserCheck,
                label: "Prendi in carico",
                // Azione riservata al tecnico e visibile solo sui ticket aperti
                isVisible: (ticket) => user?.isAdmin && ticket.status === "open",
                onClick: handleTakeInCharge,
              },
            ],
            onEdit: (ticket) => {
              setEditingTicket(ticket);
              resetSaveError();
              setIsModalOpen(true);
            },
            onDelete: handleDelete,
          }}
        />
      )}

      {!isLoading && !error && !hasTickets && (
        <p className="text-sm text-muted-foreground">Nessun ticket trovato.</p>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTicket(null);
          resetSaveError();
        }}
        title={editingTicket ? "Modifica ticket" : "Nuovo ticket"}
      >
        <TicketForm
          categories={categories}
          initialData={editingTicket}
          onSubmit={handleSubmit}
          error={saveError}
        />
      </Modal>

      <Modal
        isOpen={!!viewingTicket}
        onClose={() => setViewingTicket(null)}
        title="Dettaglio ticket"
      >
        <TicketDetails ticket={viewingTicket} categoryMap={categoryMap} />
      </Modal>
    </div>
  );
};
