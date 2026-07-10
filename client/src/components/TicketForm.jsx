import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_OPTIONS } from "@/constants/tickets";

// Form di creazione/modifica di un ticket (mostrato dentro la Modal).
// In modifica `initialData` popola i campi; in creazione parte vuoto.
export const TicketForm = ({ categories, initialData, onSubmit, error }) => {
  const [formState, setFormState] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    categoryId: initialData?.category_id || "",
    priority: initialData?.priority || "medium",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formState);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Titolo</Label>
        <Input
          id="title"
          name="title"
          value={formState.title}
          onChange={handleChange}
          placeholder="Sintesi del problema"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Descrizione</Label>
        <Textarea
          id="description"
          name="description"
          value={formState.description}
          onChange={handleChange}
          placeholder="Descrivi il problema nel dettaglio"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="categoryId">Categoria</Label>
          <Select
            id="categoryId"
            name="categoryId"
            value={formState.categoryId}
            onChange={handleChange}
            required
          >
            <option value="" disabled>
              Seleziona…
            </option>
            {(categories || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.description}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="priority">Priorità</Label>
          <Select
            id="priority"
            name="priority"
            value={formState.priority}
            onChange={handleChange}
            required
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
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
