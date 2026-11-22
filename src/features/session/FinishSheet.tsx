import { Trophy } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { summarizeSession, type RecordKind } from '@/domain/sessionSummary';
import type { SessionData } from './useSessionData';

const RECORD_LABELS: Record<RecordKind, string> = {
  maxWeight: 'maior carga',
  bestSet: 'melhor série',
  maxSessionVolume: 'maior volume',
};

interface FinishSheetProps {
  data: SessionData;
  onConfirm: (notes: string) => void;
  onClose: () => void;
}

export function FinishSheet({ data, onConfirm, onClose }: FinishSheetProps) {
  const [notes, setNotes] = useState(data.session.notes ?? '');
  const summary = summarizeSession(data.session, data.sessions, [
    ...data.historyLogs.filter((l) => l.sessionId !== data.session.id),
    ...data.sessionLogs,
  ]);

  return (
    <Modal
      title="Finalizar treino"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="min-h-12 flex-1 rounded-xl border border-border font-medium"
            onClick={onClose}
          >
            Voltar
          </button>
          <button
            type="button"
            className="min-h-12 flex-1 rounded-xl bg-text font-semibold text-bg"
            onClick={() => {
              onConfirm(notes);
            }}
          >
            Concluir treino
          </button>
        </>
      }
    >
      <dl className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-surface-2 p-3">
          <dt className="text-xs text-muted">Exercícios feitos</dt>
          <dd className="text-2xl font-semibold num">{summary.exercisesDone}</dd>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <dt className="text-xs text-muted">Séries</dt>
          <dd className="text-2xl font-semibold num">{summary.totalSets}</dd>
        </div>
      </dl>

      {summary.totalSets === 0 && (
        <p className="mb-4 text-sm text-muted">
          Nenhuma série registrada. Se não treinou, prefira descartar a sessão.
        </p>
      )}

      {summary.records.length > 0 && (
        <section className="mb-4" aria-labelledby="records-title">
          <h3 id="records-title" className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Trophy aria-hidden size={16} /> Recordes
          </h3>
          <ul className="flex flex-col gap-1 text-sm">
            {summary.records.map((r) => (
              <li key={r.exerciseId}>
                <span className="font-medium">
                  {data.exercises.get(r.exerciseId)?.name ?? r.exerciseId}
                </span>
                <span className="text-muted">
                  {' '}
                  — {r.kinds.map((k) => RECORD_LABELS[k]).join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <label className="block">
        <span className="mb-1 block text-sm text-muted">Observação (opcional)</span>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
          }}
          rows={3}
          className="w-full rounded-lg bg-bg p-3 text-text"
        />
      </label>
    </Modal>
  );
}
