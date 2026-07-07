import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMutation } from "../hooks/useMutation";
import { validateEmail, validatePassword, validateName } from "../utils/validators";
import { showSuccess } from "../utils/toast";
import Loader from "../components/Loader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { APP_NAME, APP_LOGO, ROLE_LABELS } from "../constants/app";

export const Register = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const {
    mutate: doRegister,
    isLoading: loading,
    error: submitError,
  } = useMutation(
    async (payload) => {
      if (!validateName(payload.first_name) || !validateName(payload.last_name)) {
        throw new Error("Nome e cognome sono obbligatori (minimo 2 caratteri, solo lettere, spazi, apostrofi e trattini)");
      }
      if (!validateEmail(payload.email)) {
        throw new Error("Formato email non valido: deve essere nel formato testo@dominio.tld");
      }
      if (!validatePassword(payload.password)) {
        throw new Error("La password deve contenere almeno 6 caratteri, una lettera maiuscola, un numero e un carattere speciale");
      }
      if (payload.password !== payload.repeatPassword) {
        throw new Error("Le password non coincidono");
      }
      const res = await register(payload);
      if (!res.ok) throw new Error(res.message);
      return res;
    },
    {
      onSuccess: () => {
        showSuccess("Registrazione avvenuta con successo");
        navigate("/dashboard");
      },
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await doRegister({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        repeatPassword: confirmPassword,
        isAdmin,
      });
    } catch {
      // errore già gestito dall'hook (stato `submitError`)
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
          <p className="text-sm text-muted-foreground">Registrati al gestionale</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Mario"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Cognome</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Rossi"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

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
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Conferma Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isAdmin">Registrati come {ROLE_LABELS.admin.toLowerCase()}</Label>
              <Switch id="isAdmin" checked={isAdmin} onCheckedChange={setIsAdmin} />
            </div>

            {submitError && (
              <p className="text-sm text-destructive font-medium">{submitError}</p>
            )}

            <Button type="submit" className="w-full">
              Registrati
            </Button>
          </form>
        </div>

        <div className="text-center">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};
