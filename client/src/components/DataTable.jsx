import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sortByField } from "../utils/sortHelpers";

const SortIcon = ({ field, sortField, sortDirection }) => {
  if (sortField !== field) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
  return sortDirection === "asc"
    ? <ChevronUp className="h-3.5 w-3.5 text-foreground" /> 
    : <ChevronDown className="h-3.5 w-3.5 text-foreground" />;
};

const HEADER_CLASS =
  "px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide";

/**
 * Tabella generica guidata dalla configurazione delle colonne.
 *
 * columns: array di oggetti
 *   - key            chiave del campo sull'item (e chiave React della colonna)
 *   - label          intestazione della colonna
 *   - sortable       true per abilitare l'ordinamento sulla colonna
 *   - sortType       "string" | "number" | "boolean" | "date" (default "string")
 *   - render(item)   render custom della cella (default: item[key])
 *   - onClick(item)  rende la cella cliccabile (es. apertura dettagli)
 *
 * data: array di item; la riga usa item.id || item._id come chiave
 *
 * actions: { onEdit(item), onDelete(item) } — se presente aggiunge la colonna Azioni
 */
export const DataTable = ({ columns, data, actions }) => {
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("desc");

  const handleSort = (field) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection("desc");
      return;
    }
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const sortConfig = Object.fromEntries(
    columns
      .filter((col) => col.sortable)
      .map((col) => [col.key, { type: col.sortType || "string" }]),
  );

  const sortedData = sortField
    ? sortByField(data, sortField, sortDirection, sortConfig)
    : data || [];

  const cellClass = (col) =>
    col.onClick
      ? "px-4 py-3 font-medium text-primary cursor-pointer hover:underline"
      : "px-4 py-3";

  return (
    <div className="rounded-lg border bg-card overflow-x-auto shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) =>
              col.sortable ? (
                <th
                  key={col.key}
                  className={`${HEADER_CLASS} cursor-pointer select-none hover:text-foreground transition-colors`}
                  onClick={() => handleSort(col.key)}
                  title={`Clicca per ordinare per ${col.label.toLowerCase()}`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    <SortIcon
                      field={col.key}
                      sortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </span>
                </th>
              ) : (
                <th key={col.key} className={HEADER_CLASS}>
                  {col.label}
                </th>
              ),
            )}
            {actions && <th className={HEADER_CLASS}>Azioni</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sortedData.map((item) => (
            <tr
              key={item.id || item._id}
              className="hover:bg-muted/30 transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cellClass(col)}
                  onClick={col.onClick ? () => col.onClick(item) : undefined}
                >
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
              {actions && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {actions.onEdit && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => actions.onEdit(item)}
                      >
                        <Edit />
                      </Button>
                    )}
                    {actions.onDelete && (
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => actions.onDelete(item)}
                      >
                        <Trash />
                      </Button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
