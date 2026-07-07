import { useState, useEffect, useCallback } from "react";

/**
 * 
 * Serve per le LETTURE (GET). Gestisce loading, errore e dati della chiamata.
 *
 * Deps: Metti nelle deps ogni variabile che, se cambia, deve far ripartire la chiamata.
 * 
 */
export function useFetch(asyncFn, deps = []) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // useCallback memorizza la funzione: serve sia all'useEffect sia al refetch.
  // Il commento "eslint-disable" evita l'avviso sulle deps dinamiche.
  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      setData(result);
    } catch (err) {
      setError(err.message || "Si è verificato un errore");
    } finally {
      setIsLoading(false);
    }
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, isLoading, error, refetch: execute };
}
