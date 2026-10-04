import { create } from "zustand";
import { UserProfile, Commune, PrixAgrege } from "@/constants/types";
import { SyncStatus } from "@/services/sync";

// ============================================================
// STORE GLOBAL — ZUSTAND
// ============================================================

interface AppState {
  // ─── Utilisateur ───────────────────────────────────────
  user: UserProfile | null;
  setUser: (user: UserProfile) => void;
  updateUserScore: (delta: number) => void;

  // ─── Commune sélectionnée ──────────────────────────────
  communeSelectionnee: Commune;
  setCommuneSelectionnee: (commune: Commune) => void;

  // ─── Données agrégées (écran explorer) ────────────────
  prixAgreges: PrixAgrege[];
  setPrixAgreges: (prix: PrixAgrege[]) => void;

  // ─── État de synchronisation ──────────────────────────
  syncStatus: SyncStatus;
  setSyncStatus: (status: SyncStatus) => void;
  lastSyncAt: string | null;
  setLastSyncAt: (date: string) => void;

  // ─── IDs des signalements déjà validés par l'user ─────
  validationsEffectuees: Set<string>;
  addValidation: (signalementId: string) => void;

  // ─── Initialisation ────────────────────────────────────
  isInitialized: boolean;
  setInitialized: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  updateUserScore: (delta) =>
    set((state) =>
      state.user
        ? {
            user: {
              ...state.user,
              scoreConfiance: Math.max(
                0,
                Math.min(100, state.user.scoreConfiance + delta)
              ),
            },
          }
        : {}
    ),

  communeSelectionnee: "Yopougon",
  setCommuneSelectionnee: (commune) => set({ communeSelectionnee: commune }),

  prixAgreges: [],
  setPrixAgreges: (prixAgreges) => set({ prixAgreges }),

  syncStatus: "idle",
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  lastSyncAt: null,
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),

  validationsEffectuees: new Set(),
  addValidation: (signalementId) =>
    set((state) => ({
      validationsEffectuees: new Set([
        ...state.validationsEffectuees,
        signalementId,
      ]),
    })),

  isInitialized: false,
  setInitialized: (isInitialized) => set({ isInitialized }),
}));
