import { Trophy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Tile } from '@/components/Sign';
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
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Voltar
          </Button>
          <Button
            variant="go"
            arrow
            className="flex-[2] justify-start"
            onClick={() => {
              onConfirm(notes);
            }}
          >
            Concluir treino
          </Button>
        </>
      }
    >
      <dl className="mb-4 grid grid-cols-2 divide-x divide-white/15 rounded-[4px] bg-tile px-4 py-3 text-on-tile num">
        <div className="pr-3">
          <dt className="text-sm text-white/70">Exercícios feitos</dt>
          <dd className="text-[2rem] leading-tight font-bold">{summary.exercisesDone}</dd>
        </div>
        <div className="pl-4">
          <dt className="text-sm text-white/70">Séries</dt>
          <dd className="text-[2rem] leading-tight font-bold">{summary.totalSets}</dd>
        </div>
      </dl>

      {summary.totalSets === 0 && (
        <p className="mb-4 text-base text-muted">
          Nenhuma série registrada. Se não treinou, prefira descartar a sessão.
        </p>
      )}

      {summary.records.length > 0 && (
        <section className="mb-4" aria-labelledby="records-title">
          <h3 id="records-title" className="mb-2 text-lg font-bold">
            Recordes
          </h3>
          <ul className="border-t border-border">
            {summary.records.map((r) => (
              <li
                key={r.exerciseId}
                className="flex items-center gap-3 border-b border-border py-2"
              >
                <Tile icon={Trophy} size="sm" />
                <span className="text-base">
                  <span className="font-semibold">
                    {data.exercises.get(r.exerciseId)?.name ?? r.exerciseId}
                  </span>
                  <span className="text-muted">
                    {' · '}
                    {r.kinds.map((k) => RECORD_LABELS[k]).join(', ')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <label className="block">
        <span className="mb-1 block text-base font-semibold">Observação (opcional)</span>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
          }}
          rows={3}
          className="w-full rounded-[3px] border-2 border-edge bg-surface p-3 text-base text-text"
        />
      </label>
    </Modal>
  );
}
