import { useState, useCallback } from "react";

/**
 * Per le SCRITTURE (POST / PUT / DELETE). Gestisce loading ed errore
 * della singola operazione, così nelle pagine non ripeti ogni volta
 * try/catch + stato di caricamento.
 *
 * A differenza di useFetch NON parte da solo: lo lanci tu quando serve
 * (es. nel submit di un form o nell'onClick di un bottone).
 */
export function useMutation(mutationFn, options = {}) {
  const { onSuccess, onError } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(
    async (...args) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await mutationFn(...args);
        if (onSuccess) onSuccess(result);
        return result;
      } catch (err) {
        const message = err.message || "Si è verificato un errore";
        setError(message);
        if (onError) onError(message);
        // rilancio: così chi chiama mutate() può anche gestirlo con try/catch
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutationFn]
  );

  // utile per ripulire l'errore (es. alla riapertura di un form/modale)
  const reset = useCallback(() => setError(null), []);

  return { mutate, isLoading, error, reset };
}
