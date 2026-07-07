import { toast } from "react-toastify";

// Toast di successo
export const showSuccess = (message, options = {}) => {
  toast.success(message, {
    position: "top-right",
    autoClose: 2000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "colored",
    ...options,
  });
};

// Toast di errore
export const showError = (message, options = {}) => {
  toast.error(message, {
    position: "top-right",
    autoClose: 2000,
    theme: "colored",
    ...options,
  });
};

// Toast informativo
export const showInfo = (message, options = {}) => {
  toast.info(message, {
    position: "top-right",
    autoClose: 2000,
    theme: "light",
    ...options,
  });
};

// Toast warning
export const showWarning = (message, options = {}) => {
  toast.warning(message, {
    position: "top-right",
    autoClose: 2500,
    theme: "colored",
    ...options,
  });
};
