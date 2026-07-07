import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMutation } from "../hooks/useMutation";
import { validateEmail } from "../utils/validators";
import { showSuccess } from "../utils/toast";
import Loader from "../components/Loader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_LOGO } from "../constants/app";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    mutate: doLogin,
    isLoading: loading,
    error,
  } = useMutation(
    async (credentials) => {
      if (!validateEmail(credentials.email)) {
        throw new Error("Formato email non valido: deve essere nel formato testo@dominio.tld");
      }
      const res = await login(credentials);
      if (!res.ok) throw new Error(res.message);
      return res;
    },
    {
      onSuccess: () => {
        showSuccess("Login avvenuto con successo");
        navigate("/dashboard");
      },
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await doLogin({ email, password });
    } catch {
      // errore già gestito dall'hook (stato `error`)
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <span className="text-2xl leading-none">{APP_LOGO}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">Accedi al gestionale</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@esempio.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}

            <Button type="submit" className="w-full">
              Accedi
            </Button>
          </form>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Non hai un account?{" "}
            <Link
              to="/register"
              className="text-foreground hover:underline transition-colors"
            >
              Registrati
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
