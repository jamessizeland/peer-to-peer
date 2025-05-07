import { Id, toast, ToastOptions } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const toastConfig: ToastOptions = {
  position: "bottom-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "dark",
};

export const notify = (
  message: string,
  id?: string,
  timeout = 3000
): string => {
  toastConfig.autoClose = timeout;
  toastConfig.toastId = id ? id : Date.now().toString(16);
  toast.info(message, toastConfig);
  return toastConfig.toastId;
};

export const notifyError = (
  message: string,
  id?: string,
  timeout = 3000
): string => {
  toastConfig.autoClose = timeout;
  toastConfig.toastId = id ? id : Date.now().toString(16);
  toast.error(message, toastConfig);
  return toastConfig.toastId;
};

export const notifySuccess = (
  message: string,
  id?: string,
  timeout = 3000
): string => {
  toastConfig.autoClose = timeout;
  toastConfig.toastId = id ? id : Date.now().toString(16);
  toast.success(message, toastConfig);
  return toastConfig.toastId;
};

export const notifyWarning = (
  message: string,
  id?: string,
  timeout = 3000
): string => {
  toastConfig.autoClose = timeout;
  toastConfig.toastId = id ? id : Date.now().toString(16);
  toast.warning(message, toastConfig);
  return toastConfig.toastId;
};

export const notifyInfo = (
  message: string,
  id?: string,
  timeout = 3000
): string => {
  toastConfig.autoClose = timeout;
  toastConfig.toastId = id ? id : Date.now().toString(16);
  toast.info(message, toastConfig);
  return toastConfig.toastId;
};

export const notifySuspense = (
  message: string,
  id?: string,
  timeout = 3000
): { id: Id; cancel: () => void } => {
  toastConfig.autoClose = false;
  toastConfig.toastId = id ? id : Date.now().toString(16);
  const toastId = toast.loading(message, toastConfig);

  const cancel = () => {
    toast.dismiss(toastId);
  };

  setTimeout(() => {
    toast.update(toastId, {
      render: message,
      type: "info",
      autoClose: timeout,
    });
  }, timeout);

  return { id: toastId, cancel };
};
