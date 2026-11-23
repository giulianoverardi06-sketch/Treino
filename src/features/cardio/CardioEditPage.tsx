import { useLiveQuery } from 'dexie-react-hooks';
import { HeartPulse, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { Tile } from '@/components/Sign';
import { useToast } from '@/components/Toast';
import { deleteCardio, saveCardio } from '@/db/cardioRepo';
import { db } from '@/db/db';
import {
  averageSpeedKmh,
  CARDIO_ACTIVITIES,
  cardioLabel,
  cardioToDraft,
  INTENSITY_LABELS,
  parseDecimal,
  validateCardio,
  type CardioDraft,
  type CardioErrors,
} from '@/domain/cardio';
import type { CardioIntensity, CardioSession } from '@/domain/types';
import { formatNumber } from '@/lib/format';

/** /cardio/novo e /cardio/:id (SPEC §12.2). */
export function CardioEditPage() {
  const { id } = useParams();
  const isNew = id === undefined || id === 'novo';
  const data = useLiveQuery(
    async () => ({
      cardio: isNew ? undefined : await db.cardio.get(id),
      now: new Date(),
    }),
    [id, isNew],
  );

  if (data === undefined) return <p className="text-base text-muted">Carregando…</p>;
  if (!isNew && !data.cardio) {
    return (
      <>
        <PageHeader title="Cardio" backTo="/historico" />
        <p className="text-base text-muted">Registro de cardio não encontrado.</p>
      </>
    );
  }
  return <CardioForm key={data.cardio?.id ?? 'novo'} cardio={data.cardio} now={data.now} />;
}

const fieldCls = 'w-full rounded-[3px] border-2 border-edge bg-surface px-3 text-base text-text';
const labelCls = 'mb-1 block text-base font-semibold';
const chipCls = (on: boolean) =>
  `min-h-11 rounded-[3px] border-2 px-1 text-[0.9375rem] font-semibold transition-colors ${
    on ? 'border-transparent bg-text text-bg' : 'border-edge text-text hover:bg-surface-2'
  }`;

const INTENSITIES = Object.entries(INTENSITY_LABELS) as [CardioIntensity, string][];

function FieldError({ id, text }: { id: string; text: string | undefined }) {
  return text ? (
    <p id={id} className="mt-1 text-sm font-semibold">
      {text}
    </p>
  ) : null;
}

function CardioForm({ cardio, now }: { cardio: CardioSession | undefined; now: Date }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [draft, setDraft] = useState<CardioDraft>(() => cardioToDraft(cardio, now));
  const [errors, setErrors] = useState<CardioErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const patch = (p: Partial<CardioDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
  };

  const duration = parseDecimal(draft.durationMin);
  const distance = parseDecimal(draft.distanceKm);
  const speed =
    duration !== undefined && distance !== undefined
      ? averageSpeedKmh({ durationMin: duration, distanceKm: distance })
      : undefined;

  async function save() {
    const found = validateCardio(draft, new Date());
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    await saveCardio(draft, cardio?.id);
    toast({ message: cardio ? 'Cardio salvo' : 'Cardio registrado' });
    void navigate(cardio ? '/historico' : '/', { replace: true });
  }

  async function remove() {
    if (!cardio) return;
    await deleteCardio(cardio.id);
    toast({ message: `${cardioLabel(cardio)} excluído` });
    void navigate('/historico', { replace: true });
  }

  const invalid = (key: keyof CardioErrors) =>
    errors[key] ? { 'aria-invalid': true, 'aria-describedby': `erro-${key}` } : {};

  return (
    <>
      <PageHeader
        title={cardio ? 'Editar cardio' : 'Registrar cardio'}
        subtitle="Fora da rotação: não muda o próximo treino."
        backTo="/"
        historyBack
        actions={<Tile icon={HeartPulse} size="lg" />}
      />

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        noValidate
      >
        <div>
          <p id="atividade-label" className={labelCls}>
            Atividade
          </p>
          <div
            role="radiogroup"
            aria-labelledby="atividade-label"
            className="grid grid-cols-4 gap-2"
          >
            {CARDIO_ACTIVITIES.map((a) => (
              <button
                key={a.value}
                type="button"
                role="radio"
                aria-checked={draft.activity === a.value}
                onClick={() => {
                  patch({ activity: a.value });
                }}
                className={chipCls(draft.activity === a.value)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {draft.activity === 'outro' && (
          <div>
            <label className="block">
              <span className={labelCls}>Nome da atividade</span>
              <input
                value={draft.activityName}
                placeholder="Ex.: remo, pular corda"
                onChange={(e) => {
                  patch({ activityName: e.target.value });
                }}
                {...invalid('activityName')}
                className={`${fieldCls} h-12`}
              />
            </label>
            <FieldError id="erro-activityName" text={errors.activityName} />
          </div>
        )}

        <div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className={labelCls}>Data</span>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => {
                  patch({ date: e.target.value });
                }}
                {...invalid('date')}
                className={`${fieldCls} h-12 num`}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Hora</span>
              <input
                type="time"
                value={draft.time}
                onChange={(e) => {
                  patch({ time: e.target.value });
                }}
                className={`${fieldCls} h-12 num`}
              />
            </label>
          </div>
          <FieldError id="erro-date" text={errors.date} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block">
              <span className={labelCls}>Duração (min)</span>
              <input
                inputMode="numeric"
                value={draft.durationMin}
                onChange={(e) => {
                  patch({ durationMin: e.target.value });
                }}
                {...invalid('durationMin')}
                className={`${fieldCls} h-12 text-lg font-bold num`}
              />
            </label>
            <FieldError id="erro-durationMin" text={errors.durationMin} />
          </div>
          <div>
            <label className="block">
              <span className={labelCls}>
                Distância (km) <span className="font-normal text-muted">opcional</span>
              </span>
              <input
                inputMode="decimal"
                value={draft.distanceKm}
                onChange={(e) => {
                  patch({ distanceKm: e.target.value });
                }}
                {...invalid('distanceKm')}
                className={`${fieldCls} h-12 text-lg font-bold num`}
              />
            </label>
            <FieldError id="erro-distanceKm" text={errors.distanceKm} />
          </div>
        </div>
        {speed !== undefined && (
          <p className="-mt-3 text-base num" aria-live="polite">
            Velocidade média: <strong>{formatNumber(speed)} km/h</strong>
          </p>
        )}

        <div>
          <p className={labelCls} aria-hidden>
            Intensidade <span className="font-normal text-muted">opcional</span>
          </p>
          <div role="radiogroup" aria-label="Intensidade" className="grid grid-cols-3 gap-2">
            {INTENSITIES.map(([value, text]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={draft.intensity === value}
                onClick={() => {
                  // Tocar de novo desmarca.
                  patch({ intensity: draft.intensity === value ? '' : value });
                }}
                className={chipCls(draft.intensity === value)}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className={labelCls}>Observação</span>
          <textarea
            value={draft.notes}
            rows={2}
            onChange={(e) => {
              patch({ notes: e.target.value });
            }}
            className={`${fieldCls} py-2`}
          />
        </label>

        <Button type="submit" variant="solid" className="w-full">
          {cardio ? 'Salvar' : 'Registrar cardio'}
        </Button>
      </form>

      {cardio && (
        <div className="mt-8 border-t border-border pt-4">
          <Button
            variant="outline"
            icon={Trash2}
            className="w-full"
            onClick={() => {
              setConfirmDelete(true);
            }}
          >
            Excluir registro
          </Button>
        </div>
      )}

      {confirmDelete && cardio && (
        <Modal
          title="Excluir este cardio?"
          onClose={() => {
            setConfirmDelete(false);
          }}
          footer={
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setConfirmDelete(false);
                }}
              >
                Cancelar
              </Button>
              <Button variant="solid" className="flex-1" onClick={() => void remove()}>
                Excluir
              </Button>
            </>
          }
        >
          <p className="text-base text-muted">
            O registro sai do histórico e dos totais. Não dá para desfazer.
          </p>
        </Modal>
      )}
    </>
  );
}
