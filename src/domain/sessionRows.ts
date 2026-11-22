import type { PrefillRow } from './prefill';
import type { RpeNote, SetLog } from './types';

/**
 * Regras das linhas de série na sessão ativa. Funções puras sobre o estado das linhas;
 * quem persiste é a camada de dados/UI.
 */

/** Valores editados numa linha ainda não confirmada. */
export interface DraftValues {
  weightKg?: number;
  reps?: number;
  toFailure?: boolean;
  /** O usuário mexeu na carga à mão. */
  touched?: boolean;
}

export interface SessionRow extends RowState {
  reps?: number;
  toFailure: boolean;
  /** Reps da mesma série na última vez (referência para o placeholder). */
  lastReps?: number;
  logId?: string;
  rpeNote?: RpeNote;
}

/**
 * Junta, por linha: registro confirmado (prioridade) → rascunho → pré-preenchimento.
 * Garante uma linha para cada registro, mesmo além das séries planejadas.
 */
export function buildRows(
  prefill: readonly PrefillRow[],
  logs: readonly SetLog[],
  drafts: Readonly<Record<number, DraftValues>>,
): SessionRow[] {
  const count = Math.max(prefill.length, ...logs.map((l) => l.setIndex));
  const last = prefill.at(-1);
  return Array.from({ length: count }, (_, i): SessionRow => {
    const setIndex = i + 1;
    const p = prefill[i] ?? last;
    const prefillKg = p?.weightKg ?? 0;
    const log = logs.find((l) => l.setIndex === setIndex);
    const draft = drafts[setIndex];

    const row: SessionRow = {
      setIndex,
      prefillKg,
      confirmed: log !== undefined,
      touched: draft?.touched ?? false,
      weightKg: log?.weightKg ?? draft?.weightKg ?? prefillKg,
      toFailure: log?.toFailure ?? draft?.toFailure ?? p?.toFailure ?? true,
    };
    const reps = log ? log.reps : draft?.reps;
    if (reps !== undefined) row.reps = reps;
    const lastReps = prefill[i]?.lastReps;
    if (lastReps !== undefined) row.lastReps = lastReps;
    if (log) row.logId = log.id;
    if (log?.rpeNote) row.rpeNote = log.rpeNote;
    return row;
  });
}

export interface RowState {
  setIndex: number;
  weightKg: number;
  /** Já tem SetLog. */
  confirmed: boolean;
  /** O usuário mexeu na carga desta linha (rascunho). */
  touched: boolean;
  /** Carga pré-preenchida da última sessão. */
  prefillKg: number;
}

/** Cargas novas por setIndex. */
export type WeightChanges = Map<number, number>;

const round = (kg: number) => Math.round(kg * 100) / 100;

/**
 * "↓ reduzir" do protocolo lateral (SPEC §5.3): a série `setIndex` passa a `carga − dropKg`
 * (mínimo 0) e as seguintes ainda não confirmadas ficam no máximo nessa carga
 * (reduzir nunca aumenta uma série). Séries confirmadas não mudam.
 */
export function applyDrop(
  rows: readonly RowState[],
  setIndex: number,
  dropKg: number,
): WeightChanges {
  const changes: WeightChanges = new Map();
  const target = rows.find((r) => r.setIndex === setIndex);
  if (!target || target.confirmed) return changes;

  const newWeight = Math.max(0, round(target.weightKg - dropKg));
  for (const r of rows) {
    if (r.confirmed || r.setIndex < setIndex) continue;
    const w = r.setIndex === setIndex ? newWeight : Math.min(r.weightKg, newWeight);
    if (w !== r.weightKg) changes.set(r.setIndex, w);
  }
  return changes;
}

/**
 * Ao confirmar uma série com carga diferente da pré-preenchida, leva a nova carga para as
 * séries seguintes não confirmadas e não editadas que tinham a mesma carga pré-preenchida.
 * Ex.: última vez 40/40/37,5; hoje a 1ª foi com 42,5 → a 2ª vira 42,5 e a 3ª segue 37,5.
 */
export function propagateWeight(
  rows: readonly RowState[],
  setIndex: number,
  confirmedKg: number,
): WeightChanges {
  const changes: WeightChanges = new Map();
  const source = rows.find((r) => r.setIndex === setIndex);
  if (!source || confirmedKg === source.prefillKg) return changes;

  for (const r of rows) {
    if (r.setIndex <= setIndex || r.confirmed || r.touched) continue;
    if (r.prefillKg === source.prefillKg && r.weightKg !== confirmedKg) {
      changes.set(r.setIndex, confirmedKg);
    }
  }
  return changes;
}

/** Aplica ± incremento, sem ficar negativo e sem ruído de ponto flutuante. */
export function stepWeight(weightKg: number, incrementKg: number, direction: -1 | 1): number {
  return Math.max(0, round(weightKg + direction * incrementKg));
}

/** Aceita "42,5", "42.5", " 40 ". Retorna `undefined` se inválido ou negativo. */
export function parseWeight(text: string): number | undefined {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '') return undefined;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? round(n) : undefined;
}

/** Aceita inteiros ≥ 0; vazio → `undefined` (reps são opcionais). */
export function parseReps(text: string): number | undefined {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return undefined;
  return Number(t);
}
