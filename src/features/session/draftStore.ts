import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { DraftValues } from '@/domain/sessionRows';

/**
 * Rascunhos das séries ainda não confirmadas (carga/reps/falha editadas antes do ✓).
 * Ficam no localStorage para sobreviver a fechar o app; séries confirmadas vão para o IndexedDB.
 * Estrutura: sessionId → entryId → setIndex → valores.
 */
type EntryDrafts = Record<number, DraftValues>;
type SessionDrafts = Record<string, EntryDrafts>;

export interface DraftPatch {
  weightKg?: number;
  reps?: number | null;
  toFailure?: boolean;
  touched?: boolean;
}

interface DraftState {
  drafts: Record<string, SessionDrafts>;
  patchRow: (sessionId: string, entryId: string, setIndex: number, patch: DraftPatch) => void;
  /** Várias cargas de uma vez (↓ reduzir, propagação). */
  setWeights: (
    sessionId: string,
    entryId: string,
    weights: ReadonlyMap<number, number>,
    touched: boolean,
  ) => void;
  clearRow: (sessionId: string, entryId: string, setIndex: number) => void;
  /** Depois de remover a linha `setIndex`: apaga o rascunho dela e desloca os seguintes. */
  removeRow: (sessionId: string, entryId: string, setIndex: number) => void;
  replaceEntry: (sessionId: string, entryId: string, rows: EntryDrafts) => void;
  clearSession: (sessionId: string) => void;
}

const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* sem armazenamento (aba privada etc.): rascunhos ficam só em memória */
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* idem */
    }
  },
};

function withEntry(
  state: DraftState,
  sessionId: string,
  entryId: string,
  fn: (rows: EntryDrafts) => EntryDrafts,
): Pick<DraftState, 'drafts'> {
  const session = state.drafts[sessionId] ?? {};
  return {
    drafts: { ...state.drafts, [sessionId]: { ...session, [entryId]: fn(session[entryId] ?? {}) } },
  };
}

function applyPatch(row: DraftValues | undefined, patch: DraftPatch): DraftValues {
  const next: DraftValues = { ...row };
  if (patch.weightKg !== undefined) next.weightKg = patch.weightKg;
  if (patch.toFailure !== undefined) next.toFailure = patch.toFailure;
  if (patch.touched !== undefined) next.touched = patch.touched;
  if (patch.reps === null) delete next.reps;
  else if (patch.reps !== undefined) next.reps = patch.reps;
  return next;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      drafts: {},
      patchRow: (sessionId, entryId, setIndex, patch) => {
        set((s) =>
          withEntry(s, sessionId, entryId, (rows) => ({
            ...rows,
            [setIndex]: applyPatch(rows[setIndex], patch),
          })),
        );
      },
      setWeights: (sessionId, entryId, weights, touched) => {
        set((s) =>
          withEntry(s, sessionId, entryId, (rows) => {
            const next = { ...rows };
            for (const [i, w] of weights) next[i] = applyPatch(next[i], { weightKg: w, touched });
            return next;
          }),
        );
      },
      clearRow: (sessionId, entryId, setIndex) => {
        set((s) =>
          withEntry(s, sessionId, entryId, (rows) =>
            Object.fromEntries(Object.entries(rows).filter(([k]) => Number(k) !== setIndex)),
          ),
        );
      },
      removeRow: (sessionId, entryId, setIndex) => {
        set((s) =>
          withEntry(s, sessionId, entryId, (rows) => {
            const next: EntryDrafts = {};
            for (const [k, v] of Object.entries(rows)) {
              const i = Number(k);
              if (i < setIndex) next[i] = v;
              else if (i > setIndex) next[i - 1] = v;
            }
            return next;
          }),
        );
      },
      replaceEntry: (sessionId, entryId, rows) => {
        set((s) => withEntry(s, sessionId, entryId, () => rows));
      },
      clearSession: (sessionId) => {
        set((s) => ({
          drafts: Object.fromEntries(Object.entries(s.drafts).filter(([k]) => k !== sessionId)),
        }));
      },
    }),
    { name: 'treino-abc:rascunhos', storage: createJSONStorage(() => safeStorage) },
  ),
);

const EMPTY: EntryDrafts = {};

/** Rascunhos de uma entrada (referência estável quando não há nenhum). */
export function useEntryDrafts(sessionId: string, entryId: string): EntryDrafts {
  return useDraftStore((s) => s.drafts[sessionId]?.[entryId] ?? EMPTY);
}
