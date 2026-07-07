import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { UserCog, ArrowRight, Rocket } from "lucide-react";

import { fetchUsers } from "../services/userService";
import { useFetch } from "../hooks/useFetch";
import { ROLE_LABELS } from "../constants/app";

export const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Le anagrafiche utenti servono solo agli admin: se non lo è,
  // restituiamo una lista vuota senza chiamare il server (sostituisce "enabled").
  const {
    data: users,
    isLoading: loadingUsers,
    error: usersError,
  } = useFetch(
    () => (user?.isAdmin ? fetchUsers() : Promise.resolve([])),
    [user?.isAdmin],
  );

  if (loading) return <p>loading...</p>;
  if (!user) return <p>Accesso negato</p>;

  const totalUsers = users?.length ?? 0;

  return (
    <div className="px-6 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Panoramica generale delle attività del gestionale.
        </p>
        <p className="mt-1 text-sm">
          Utente:{" "}
          <span className="font-medium">
            {user.firstName ? `${user.firstName} ${user.lastName}` : user.email}
          </span>
          {user.isAdmin && (
            <span className="ml-2 inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/20">
              {ROLE_LABELS.admin}
            </span>
          )}
        </p>
      </div>

      {usersError && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive ring-1 ring-inset ring-destructive/20">
          Si è verificato un errore nel caricamento dei dati della dashboard.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {user?.isAdmin && (
          <div
            className="cursor-pointer rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-border/80 group"
            onClick={() => navigate("/users")}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <UserCog className="h-4 w-4 text-muted-foreground" />
              </div>
              {loadingUsers ? (
                <span className="text-xs text-muted-foreground">Caricamento...</span>
              ) : (
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
            <p className="text-2xl font-semibold">{totalUsers}</p>
            <p className="text-sm font-medium text-muted-foreground mt-0.5">Utenti</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Gestione degli account con accesso alla piattaforma.
            </p>
          </div>
        )}

        {/* Card segnaposto: sostituire con le statistiche del dominio del progetto */}
        <div className="rounded-xl border border-dashed bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Rocket className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Il tuo gestionale parte da qui
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Aggiungi le risorse del tuo dominio seguendo la ricetta in
            ADDING_A_RESOURCE.md, poi sostituisci questa card con le statistiche
            reali del progetto.
          </p>
        </div>
      </div>
    </div>
  );
};
