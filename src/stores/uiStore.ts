/**
 * UI Store
 *
 * Gestion de l'état UI éphémère de l'application (modals, toasts, etc.).
 * Pas de persistence - état reset au rechargement de la page.
 */

import { create } from 'zustand';
import type { ReactNode } from 'react';

/**
 * Type de toast
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Interface pour un toast
 */
export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // ms (défaut: 3000)
}

/**
 * État du store UI
 */
interface UIStore {
  // ========== MODALS ==========

  /**
   * Modal principale ouverte ou non
   */
  isModalOpen: boolean;

  /**
   * Contenu de la modal (composant React)
   */
  modalContent: ReactNode | null;

  /**
   * Titre de la modal (optionnel)
   */
  modalTitle?: string;

  // ========== TOASTS ==========

  /**
   * Liste des toasts actifs
   */
  toasts: Toast[];

  // ========== LOADING ==========

  /**
   * État de chargement global
   */
  isLoading: boolean;

  /**
   * Message de chargement (optionnel)
   */
  loadingMessage?: string;

  // ========== ACTIONS - MODALS ==========

  /**
   * Ouvrir une modal avec du contenu
   */
  openModal: (content: ReactNode, title?: string) => void;

  /**
   * Fermer la modal
   */
  closeModal: () => void;

  // ========== ACTIONS - TOASTS ==========

  /**
   * Ajouter un toast
   */
  addToast: (toast: Omit<Toast, 'id'>) => void;

  /**
   * Retirer un toast par son ID
   */
  removeToast: (id: string) => void;

  /**
   * Retirer tous les toasts
   */
  clearToasts: () => void;

  /**
   * Helpers pour créer des toasts rapidement
   */
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };

  // ========== ACTIONS - LOADING ==========

  /**
   * Activer l'état de chargement global
   */
  setLoading: (isLoading: boolean, message?: string) => void;
}

/**
 * Générer un ID unique pour les toasts
 */
const generateToastId = () => `toast-${Date.now()}-${Math.random()}`;

/**
 * Store Zustand pour l'UI
 *
 * @example
 * ```tsx
 * // Ouvrir une modal
 * import { useUIStore } from '@/stores';
 *
 * function MyComponent() {
 *   const openModal = useUIStore((state) => state.openModal);
 *
 *   const handleClick = () => {
 *     openModal(<div>Contenu de la modal</div>, "Titre");
 *   };
 *
 *   return <button onClick={handleClick}>Ouvrir modal</button>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Afficher un toast
 * import { useUIStore } from '@/stores';
 *
 * function MyComponent() {
 *   const { success, error } = useUIStore((state) => state.toast);
 *
 *   const handleSuccess = () => {
 *     success("Opération réussie !");
 *   };
 *
 *   const handleError = () => {
 *     error("Une erreur est survenue", 5000);
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={handleSuccess}>Success</button>
 *       <button onClick={handleError}>Error</button>
 *     </>
 *   );
 * }
 * ```
 */
export const useUIStore = create<UIStore>((set, get) => ({
  // ========== INITIAL STATE ==========
  isModalOpen: false,
  modalContent: null,
  modalTitle: undefined,
  toasts: [],
  isLoading: false,
  loadingMessage: undefined,

  // ========== ACTIONS - MODALS ==========
  openModal: (content, title) => set({
    isModalOpen: true,
    modalContent: content,
    modalTitle: title,
  }),

  closeModal: () => set({
    isModalOpen: false,
    modalContent: null,
    modalTitle: undefined,
  }),

  // ========== ACTIONS - TOASTS ==========
  addToast: (toast) => {
    const id = generateToastId();
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 3000,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove après la durée spécifiée
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, newToast.duration);
    }
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(toast => toast.id !== id),
  })),

  clearToasts: () => set({ toasts: [] }),

  // ========== TOAST HELPERS ==========
  toast: {
    success: (message, duration) => get().addToast({ type: 'success', message, duration }),
    error: (message, duration) => get().addToast({ type: 'error', message, duration }),
    warning: (message, duration) => get().addToast({ type: 'warning', message, duration }),
    info: (message, duration) => get().addToast({ type: 'info', message, duration }),
  },

  // ========== ACTIONS - LOADING ==========
  setLoading: (isLoading, message) => set({
    isLoading,
    loadingMessage: message,
  }),
}));

/**
 * Sélecteurs optimisés
 */
export const uiSelectors = {
  // Modals
  isModalOpen: (state: UIStore) => state.isModalOpen,
  modalContent: (state: UIStore) => state.modalContent,
  modalTitle: (state: UIStore) => state.modalTitle,
  openModal: (state: UIStore) => state.openModal,
  closeModal: (state: UIStore) => state.closeModal,

  // Toasts
  toasts: (state: UIStore) => state.toasts,
  addToast: (state: UIStore) => state.addToast,
  removeToast: (state: UIStore) => state.removeToast,
  clearToasts: (state: UIStore) => state.clearToasts,
  toast: (state: UIStore) => state.toast,

  // Loading
  isLoading: (state: UIStore) => state.isLoading,
  loadingMessage: (state: UIStore) => state.loadingMessage,
  setLoading: (state: UIStore) => state.setLoading,
};

/**
 * Hook personnalisé pour accéder aux modals (version optimisée)
 */
export const useModal = () => ({
  isOpen: useUIStore(uiSelectors.isModalOpen),
  content: useUIStore(uiSelectors.modalContent),
  title: useUIStore(uiSelectors.modalTitle),
  open: useUIStore(uiSelectors.openModal),
  close: useUIStore(uiSelectors.closeModal),
});

/**
 * Hook personnalisé pour accéder aux toasts (version optimisée)
 */
export const useToast = () => ({
  toasts: useUIStore(uiSelectors.toasts),
  addToast: useUIStore(uiSelectors.addToast),
  removeToast: useUIStore(uiSelectors.removeToast),
  clearToasts: useUIStore(uiSelectors.clearToasts),
  toast: useUIStore(uiSelectors.toast),
});

/**
 * Hook personnalisé pour accéder au loading (version optimisée)
 */
export const useLoading = () => ({
  isLoading: useUIStore(uiSelectors.isLoading),
  message: useUIStore(uiSelectors.loadingMessage),
  setLoading: useUIStore(uiSelectors.setLoading),
});
