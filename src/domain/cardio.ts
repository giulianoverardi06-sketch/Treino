import { calendarDaysBetween } from '@/lib/dates';
import type { CardioActivity, CardioIntensity, CardioSession } from './types';

/* Cardio avulso (SPEC §12.2). Funções puras. */

export const CARDIO_ACTIVITIES: readonly { value: CardioActivity; label: string }[] = [
  { value: 'esteira', label: 'Esteira' },
  { value: 'bicicleta', label: 'Bicicleta' },
  { value: 'corrida', label: 'Corrida' },
  { value: 'eliptico', label: 'Elíptico' },
  { value: 'escada', label: 'Escada' },
  { value: 'natacao', label: 'Natação' },
  { value: 'caminhada', label: 'Caminhada' },
  { value: 'outro', label: 'Outro' },
];

export const INTENSITY_LABELS: Record<CardioIntensity, string> = {
  leve: 'Leve',
  moderada: 'Moderada',
  forte: 'Forte',
};

export const MAX_CARDIO_MIN = 600;
export const MAX_CARDIO_KM = 300;

/** Nome mostrado: o nome livre de "outro", senão o rótulo da atividade. */
export function cardioLabel(c: Pick<CardioSession, 'activity' | 'activityName'>): string {
  if (c.activity === 'outro' && c.activityName?.trim()) return c.activityName.trim();
  return CARDIO_ACTIVITIES.find((a) => a.value === c.activity)?.label ?? 'Cardio';
}

/** Velocidade média em km/h (1 casa), quando há distância. */
export function averageSpeedKmh(
  c: Pick<CardioSession, 'durationMin' | 'distanceKm'>,
): number | undefined {
  if (c.distanceKm === undefined || c.distanceKm <= 0 || c.durationMin <= 0) return undefined;
  return Math.round((c.distanceKm / (c.durationMin / 60)) * 10) / 10;
}

export interface CardioTotals {
  count: number;
  minutes: number;
  km: number;
}

/** Totais dos últimos `days` dias de calendário, hoje incluído (mesma regra do Início). */
export function cardioTotals(
  sessions: readonly CardioSession[],
  now: Date,
  days: number,
): CardioTotals {
  const totals: CardioTotals = { count: 0, minutes: 0, km: 0 };
  for (const c of sessions) {
    const d = calendarDaysBetween(c.startedAt, now);
    if (d < 0 || d >= days) continue;
    totals.count += 1;
    totals.minutes += c.durationMin;
    totals.km += c.distanceKm ?? 0;
  }
  totals.km = Math.round(totals.km * 100) / 100;
  return totals;
}

/* ---------- Formulário ---------- */

export interface CardioDraft {
  activity: CardioActivity;
  activityName: string;
  /** AAAA-MM-DD (local). */
  date: string;
  /** HH:MM (local). */
  time: string;
  durationMin: string;
  distanceKm: string;
  intensity: CardioIntensity | '';
  notes: string;
}

export type CardioErrors = Partial<
  Record<'activityName' | 'date' | 'durationMin' | 'distanceKm', string>
>;

/** Número digitado com vírgula ou ponto. Vazio → `undefined`; inválido → `NaN`. */
export function parseDecimal(text: string): number | undefined {
  const t = text.trim().replace(',', '.');
  if (t === '') return undefined;
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

function localIso(date: string, time: string): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const h = /^(\d{2}):(\d{2})$/.exec(time || '00:00');
  if (!m || !h) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(h[1]), Number(h[2]));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function validateCardio(draft: CardioDraft, now: Date): CardioErrors {
  const errors: CardioErrors = {};
  if (draft.activity === 'outro' && !draft.activityName.trim()) {
    errors.activityName = 'Dê um nome à atividade.';
  }
  const startedAt = localIso(draft.date, draft.time);
  if (!startedAt) errors.date = 'Informe a data.';
  else if (Date.parse(startedAt) > now.getTime() + 60_000) errors.date = 'A data está no futuro.';

  const duration = parseDecimal(draft.durationMin);
  if (duration === undefined) errors.durationMin = 'Informe a duração.';
  else if (Number.isNaN(duration) || duration < 1 || duration > MAX_CARDIO_MIN) {
    errors.durationMin = `Use minutos entre 1 e ${MAX_CARDIO_MIN}.`;
  }
  const distance = parseDecimal(draft.distanceKm);
  if (
    distance !== undefined &&
    (Number.isNaN(distance) || distance <= 0 || distance > MAX_CARDIO_KM)
  ) {
    errors.distanceKm = `Use km entre 0,1 e ${MAX_CARDIO_KM}, ou deixe vazio.`;
  }
  return errors;
}

/** Monta a sessão a partir de um rascunho já validado. */
export function applyCardioDraft(id: string, draft: CardioDraft): CardioSession {
  const distance = parseDecimal(draft.distanceKm);
  const c: CardioSession = {
    id,
    activity: draft.activity,
    startedAt: localIso(draft.date, draft.time) ?? new Date().toISOString(),
    durationMin: Math.round(parseDecimal(draft.durationMin) ?? 0),
  };
  if (draft.activity === 'outro' && draft.activityName.trim()) {
    c.activityName = draft.activityName.trim();
  }
  if (distance !== undefined && !Number.isNaN(distance)) {
    c.distanceKm = Math.round(distance * 100) / 100;
  }
  if (draft.intensity) c.intensity = draft.intensity;
  if (draft.notes.trim()) c.notes = draft.notes.trim();
  return c;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Rascunho para editar uma sessão existente ou criar uma nova (agora, esteira). */
export function cardioToDraft(c: CardioSession | undefined, now: Date): CardioDraft {
  const d = c ? new Date(c.startedAt) : now;
  return {
    activity: c?.activity ?? 'esteira',
    activityName: c?.activityName ?? '',
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    durationMin: c ? String(c.durationMin) : '',
    distanceKm: c?.distanceKm === undefined ? '' : String(c.distanceKm).replace('.', ','),
    intensity: c?.intensity ?? '',
    notes: c?.notes ?? '',
  };
}
