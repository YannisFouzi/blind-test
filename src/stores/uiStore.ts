import { create } from 'zustand';
import type { ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

type ToastPayload = Omit<Toast, 'id'>;

interface UIStore {
  isModalOpen: boolean;
  modalContent: ReactNode | null;
  modalTitle?: string;

  toasts: Toast[];

  isLoading: boolean;
  loadingMessage?: string;

  openModal: (content: ReactNode, title?: string) => void;
  closeModal: () => void;

  addToast: (toast: ToastPayload) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };

  setLoading: (isLoading: boolean, message?: string) => void;
}

const DEFAULT_TOAST_DURATION = 3000;

const generateToastId = () => `toast-${Date.now()}-${Math.random()}`;

const createToastHandler = (get: () => UIStore, type: ToastType) =>
  (message: string, duration?: number) =>
    get().addToast({ type, message, duration });

export const useUIStore = create<UIStore>((set, get) => ({
  isModalOpen: false,
  modalContent: null,
  modalTitle: undefined,
  toasts: [],
  isLoading: false,
  loadingMessage: undefined,

  openModal: (content, title) =>
    set({
      isModalOpen: true,
      modalContent: content,
      modalTitle: title,
    }),

  closeModal: () =>
    set({
      isModalOpen: false,
      modalContent: null,
      modalTitle: undefined,
    }),

  addToast: (toast) => {
    const id = generateToastId();
    const duration = toast.duration ?? DEFAULT_TOAST_DURATION;
    const newToast: Toast = {
      ...toast,
      id,
      duration,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),

  clearToasts: () => set({ toasts: [] }),

  toast: {
    success: createToastHandler(get, 'success'),
    error: createToastHandler(get, 'error'),
    warning: createToastHandler(get, 'warning'),
    info: createToastHandler(get, 'info'),
  },

  setLoading: (isLoading, message) =>
    set({
      isLoading,
      loadingMessage: message,
    }),
}));

export const uiSelectors = {
  isModalOpen: (state: UIStore) => state.isModalOpen,
  modalContent: (state: UIStore) => state.modalContent,
  modalTitle: (state: UIStore) => state.modalTitle,
  openModal: (state: UIStore) => state.openModal,
  closeModal: (state: UIStore) => state.closeModal,

  toasts: (state: UIStore) => state.toasts,
  addToast: (state: UIStore) => state.addToast,
  removeToast: (state: UIStore) => state.removeToast,
  clearToasts: (state: UIStore) => state.clearToasts,
  toast: (state: UIStore) => state.toast,

  isLoading: (state: UIStore) => state.isLoading,
  loadingMessage: (state: UIStore) => state.loadingMessage,
  setLoading: (state: UIStore) => state.setLoading,
};

export const useModal = () => ({
  isOpen: useUIStore(uiSelectors.isModalOpen),
  content: useUIStore(uiSelectors.modalContent),
  title: useUIStore(uiSelectors.modalTitle),
  open: useUIStore(uiSelectors.openModal),
  close: useUIStore(uiSelectors.closeModal),
});

export const useToast = () => ({
  toasts: useUIStore(uiSelectors.toasts),
  addToast: useUIStore(uiSelectors.addToast),
  removeToast: useUIStore(uiSelectors.removeToast),
  clearToasts: useUIStore(uiSelectors.clearToasts),
  toast: useUIStore(uiSelectors.toast),
});

export const useLoading = () => ({
  isLoading: useUIStore(uiSelectors.isLoading),
  message: useUIStore(uiSelectors.loadingMessage),
  setLoading: useUIStore(uiSelectors.setLoading),
});
