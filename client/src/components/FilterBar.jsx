import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Barra filtri generica, guidata dalla configurazione (come DataTable).
 * Va usata come componente controllato insieme a useFetch:
 *
 *   const [filters, setFilters] = useState({ stato: "", mese: "" });
 *   const { data } = useFetch(() => fetchItems(filters), [filters]);
 *   <FilterBar filters={FILTERS} values={filters} onChange={setFilters} />
 *
 * filters: array di oggetti
 *   - key       chiave del filtro (diventa il query param)
 *   - label     etichetta mostrata sopra il campo
 *   - type      "select" | "month" (default "select")
 *   - options   per i select: array di { value, label }
 *
 * values:   oggetto { key: valore } (stringa vuota = filtro non attivo)
 * onChange: riceve il nuovo oggetto values completo
 */
export const FilterBar = ({ filters, values, onChange }) => {
  const setValue = (key, value) => onChange({ ...values, [key]: value });

  const emptyValues = Object.fromEntries(filters.map((f) => [f.key, ""]));
  const hasActiveFilters = filters.some((f) => values[f.key]);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm">
      {filters.map((filter) => (
        <div key={filter.key} className="space-y-1.5 min-w-40">
          <Label htmlFor={`filter-${filter.key}`}>{filter.label}</Label>
          {filter.type === "month" ? (
            <Input
              id={`filter-${filter.key}`}
              type="month"
              value={values[filter.key] || ""}
              onChange={(e) => setValue(filter.key, e.target.value)}
            />
          ) : (
            <Select
              id={`filter-${filter.key}`}
              value={values[filter.key] || ""}
              onChange={(e) => setValue(filter.key, e.target.value)}
            >
              <option value="">Tutti</option>
              {(filter.options || []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          )}
        </div>
      ))}

      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(emptyValues)}
        >
          Azzera filtri
        </Button>
      )}
    </div>
  );
};
