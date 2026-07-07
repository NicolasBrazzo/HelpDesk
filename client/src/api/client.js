import axios from "axios";

// creazione involucro axios con configurazione di base
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor per aggiungere il token a ogni richiesta
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor per gestire gli errori in modo centralizzato
api.interceptors.response.use(
  response => response,
  error => {
    // console.log('=== ERRORE COMPLETO ===', error);
    // console.log('Response:', error.response);
    // console.log('Request:', error.request);
    // console.log('Config:', error.config);

    // Errore di rete (server non raggiungibile, CORS, timeout)
    if (!error.response) {
      console.error('Errore di rete:', {
        message: error.message,
        code: error.code,
        url: error.config?.url
      });

      return Promise.reject({
        status: null,
        message: "Server non raggiungibile. Verifica che il backend sia avviato.",
      });
    }

    // Errore HTTP dal server
    const { status, data } = error.response;
    let message = "Errore server";

    if (data?.error) {
      message = Array.isArray(data.error) 
        ? data.error.join('; ') 
        : data.error;
    }

    const normalizedError = {
      status: status,
      message: message,
    };

    console.log('❌ Errore API:', normalizedError);
    return Promise.reject(normalizedError);
  }
);

export default api; 