import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Side.jsx";

export const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <main className="flex-1 overflow-auto ml-16">
        <Outlet />
      </main>
    </div>
  );
};

