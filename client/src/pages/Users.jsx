import { useState } from "react";

import Loader from "../components/Loader";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../services/userService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Modal from "@/components/Modal";
import { showSuccess } from "../utils/toast";
import { USERS_COLUMN_LABELS } from "../constants/columnLabels";
import { ROLE_LABELS } from "../constants/app";
import { useFetch } from "../hooks/useFetch";
import { useMutation } from "../hooks/useMutation";
import { validateEmail, validatePassword, validateName } from "../utils/validators";
import { DataTable } from "../components/DataTable";

const UsersForm = ({ initialData, onSubmit, error }) => {
  const [formState, setFormState] = useState({
    first_name: initialData?.first_name || "",
    last_name: initialData?.last_name || "",
    email: initialData?.email || "",
    password: initialData?.password || "",
    isAdmin: initialData?.isAdmin ?? false,
  });

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formState);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="first_name">Nome</Label>
          <Input
            id="first_name"
            type="text"
            name="first_name"
            value={formState.first_name}
            onChange={handleChange}
            placeholder="Mario"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name">Cognome</Label>
          <Input
            id="last_name"
            type="text"
            name="last_name"
            value={formState.last_name}
            onChange={handleChange}
            placeholder="Rossi"
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          name="email"
          value={formState.email}
          onChange={handleChange}
          placeholder="nome@esempio.it"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          name="password"
          value={formState.password}
          onChange={handleChange}
          placeholder={initialData ? "Cambia password" : "••••••••"}
          required={!initialData}
        />
        {initialData && (
          <p className="text-xs text-muted-foreground">Lascia vuoto per mantenere la password attuale.</p>
        )}
      </div>
      <div className="flex items-center gap-3 rounded-md border border-input px-3 py-2.5">
        <input
          type="checkbox"
          id="isAdmin"
          name="isAdmin"
          checked={!!formState.isAdmin}
          onChange={handleChange}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        <Label htmlFor="isAdmin" className="cursor-pointer">
          {ROLE_LABELS.admin}
        </Label>
      </div>

      {error && <p className="text-sm text-destructive font-medium">{error}</p>}
      <div className="flex justify-end space-x-2 pt-1">
        <Button type="submit" size="sm">
          Salva
        </Button>
      </div>
    </form>
  );
};

// Dettaglio di sola lettura, mostrato nel modal "view details"
const UserDetails = ({ user }) => {
  if (!user) return null;

  const rows = [
    [USERS_COLUMN_LABELS.last_name, user.last_name],
    [USERS_COLUMN_LABELS.first_name, user.first_name],
    [USERS_COLUMN_LABELS.email, user.email],
    [
      USERS_COLUMN_LABELS.isAdmin,
      user.isAdmin ? ROLE_LABELS.admin : ROLE_LABELS.user,
    ],
    [
      USERS_COLUMN_LABELS.created_at,
      user.created_at
        ? new Date(user.created_at).toLocaleDateString("it-IT")
        : "—",
    ],
  ];

  return (
    <dl className="space-y-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="text-sm font-medium text-right">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
};

const buildColumns = (onView) => [
  {
    key: "last_name",
    label: USERS_COLUMN_LABELS.last_name,
    sortable: true,
  },
  {
    key: "first_name",
    label: USERS_COLUMN_LABELS.first_name,
    sortable: true,
  },
  {
    key: "email",
    label: USERS_COLUMN_LABELS.email,
    sortable: true,
    onClick: onView,
  },
  {
    key: "isAdmin",
    label: USERS_COLUMN_LABELS.isAdmin,
    sortable: true,
    sortType: "boolean",
    render: (user) =>
      user.isAdmin ? (
        <Badge variant="indigo">{ROLE_LABELS.admin}</Badge>
      ) : (
        <Badge variant="muted">{ROLE_LABELS.user}</Badge>
      ),
  },
];

export const Users = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);

  const {
    data: users,
    isLoading,
    error,
    refetch,
  } = useFetch(() => fetchUsers(), []);

  const {
    mutate: saveUser,
    error: saveError,
    reset: resetSaveError,
  } = useMutation(
    (formData) => {
      if (!validateName(formData.first_name) || !validateName(formData.last_name)) {
        throw new Error("Nome e cognome sono obbligatori (minimo 2 caratteri, solo lettere, spazi, apostrofi e trattini)");
      }
      if (!validateEmail(formData.email)) {
        throw new Error("Formato email non valido: deve essere nel formato testo@dominio.tld");
      }
      // Password obbligatoria in creazione; in modifica si valida solo se inserita.
      if ((!editingItem || formData.password) && !validatePassword(formData.password)) {
        throw new Error("La password deve contenere almeno 6 caratteri, una lettera maiuscola, un numero e un carattere speciale");
      }
      return editingItem
        ? updateUser(editingItem.id, formData)
        : createUser(formData);
    },
    {
      onSuccess: () => {
        showSuccess(
          editingItem
            ? "Utente aggiornato con successo"
            : "Utente creato con successo",
        );
        refetch();
        setIsModalOpen(false);
        setEditingItem(null);
      },
    },
  );

  const { mutate: removeUser } = useMutation(
    (userId) => deleteUser(userId),
    {
      onSuccess: () => {
        showSuccess("Utente eliminato con successo");
        refetch();
      },
    },
  );

  const handleDelete = async (user) => {
    const userId = user.id || user._id;
    if (!userId) return;

    const confirmDelete = window.confirm(
      `Sei sicuro di voler eliminare l'utente ${user.email}?`,
    );
    if (!confirmDelete) return;

    try {
      await removeUser(userId);
    } catch {
      // errore gestito dall'hook
    }
  };

  const handleSubmit = async (formData) => {
    try {
      await saveUser(formData);
    } catch {
      // errore gestito dall'hook (stato `saveError`)
    }
  };

  const hasUsers = users && users.length > 0;

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Utenti</h1>
          <p className="text-sm text-muted-foreground">
            Visualizza, modifica e elimina gli utenti
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null);
            resetSaveError();
            setIsModalOpen(true);
          }}
        >
          Aggiungi utente
        </Button>
      </div>

      {isLoading && <Loader />}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Errore: {error.message}
        </div>
      )}

      {hasUsers && (
        <DataTable
          columns={buildColumns((user) => setViewingItem(user))}
          data={users}
          actions={{
            onEdit: (user) => {
              setEditingItem(user);
              resetSaveError();
              setIsModalOpen(true);
            },
            onDelete: handleDelete,
          }}
        />
      )}

      {!isLoading && !error && !hasUsers && (
        <p className="text-sm text-muted-foreground">
          Nessuno utente presente nel database.
        </p>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
          resetSaveError();
        }}
        title={editingItem ? "Modifica utente" : "Nuovo utente"}
      >
        <UsersForm
          initialData={editingItem}
          onSubmit={handleSubmit}
          error={saveError}
        />
      </Modal>

      <Modal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title="Dettaglio utente"
      >
        <UserDetails user={viewingItem} />
      </Modal>
    </div>
  );
};
