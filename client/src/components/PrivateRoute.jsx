import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Rotta privata per rotte con login obbligatorio
export const PrivateRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
};
