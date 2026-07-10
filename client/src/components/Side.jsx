import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutDashboard, UserPlus, LogOut, Tickets } from "lucide-react";
import { APP_NAME, APP_LOGO } from "../constants/app";

// Voci di menu: aggiungere qui le pagine delle risorse del progetto.
const MENU_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: UserPlus, label: "Utenti", path: "/users" },
  { icon: Tickets, label: "Tickets", path: "/tickets" },
];

export const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <aside
      className={[
        "fixed left-0 top-0 z-50 flex h-full flex-col bg-sidebar",
        "transition-all duration-300 ease-in-out border-r border-sidebar-border",
        isOpen ? "w-64" : "w-16",
      ].join(" ")}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-sidebar-primary">
            <span className="text-sidebar-primary-foreground font-bold text-lg">
              {APP_LOGO}
            </span>
          </div>
          {isOpen && (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-sidebar-foreground text-sm font-medium whitespace-nowrap">
                {APP_NAME}
              </span>
            </div>
          )}
        </div>
      </div>

      <nav className="py-4">
        {MENU_ITEMS.filter((item) =>
          // Nascondi la voce "Utenti" se l'utente non è admin
          item.path === "/users" ? user?.isAdmin : true,
        ).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              [
                "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors",
                isActive ?
                  "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              ].join(" ")
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {isOpen && (
              <span className="overflow-hidden whitespace-nowrap text-sm">
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-sidebar-border py-4">
        <button
          type="button"
          onClick={() => logout()}
          className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 transition-colors text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {isOpen && (
            <span className="overflow-hidden whitespace-nowrap text-sm">
              Logout
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};
