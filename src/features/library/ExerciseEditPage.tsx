import { useLiveQuery } from 'dexie-react-hooks';
import { Archive, ArchiveRestore, Camera, ChartLine, ImageOff, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/Button';
import { buttonClass } from '@/components/buttonStyles';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { Select } from '@/components/Select';
import { LetterTile } from '@/components/Sign';
import { useToast } from '@/components/Toast';
import { ExerciseImage } from '@/components/ExerciseImage';
import { db } from '@/db/db';
import { importFromExerciseDb, removeExerciseImage, uploadExerciseImage } from '@/db/imageRepo';
import { ExerciseDbSheet } from './ExerciseDbSheet';
import {
  deleteExercise,
  exerciseHasHistory,
  saveExercise,
  setExerciseArchived,
} from '@/db/programRepo';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '@/domain/labels';
import {
  deletionPolicy,
  exerciseUsage,
  validateExercise,
  type ExerciseDraft,
  type ExerciseErrors,
} from '@/domain/program';
import { parseWeight } from '@/domain/sessionRows';
import type { Equipment, Exercise, MuscleGroup, WorkoutTemplate } from '@/domain/types';
import { formatNumber } from '@/lib/format';

interface EditData {
  exercise: Exercise | undefined;
  all: Exercise[];
  templates: WorkoutTemplate[];
  hasHistory: boolean;
}

/** /biblioteca/novo e /biblioteca/:id */
export function ExerciseEditPage() {
  const { id } = useParams();
  const isNew = id === undefined || id === 'novo';
  const data = useLiveQuery(async (): Promise<EditData> => {
    const [exercise, all, templates, hasHistory] = await Promise.all([
      isNew ? Promise.resolve(undefined) : db.exercises.get(id),
      db.exercises.toArray(),
      db.templates.toArray(),
      isNew ? Promise.resolve(false) : exerciseHasHistory(id),
    ]);
    return { exercise, all, templates, hasHistory };
  }, [id, isNew]);

  if (data === undefined) return <p className="text-base text-muted">Carregando…</p>;
  if (!isNew && !data.exercise) {
    return (
      <>
        <PageHeader title="Exercício" backTo="/biblioteca" />
        <p className="text-base text-muted">Exercício não encontrado.</p>
      </>
    );
  }
  return <ExerciseForm key={data.exercise?.id ?? 'novo'} data={data} />;
}

const EMPTY: ExerciseDraft = {
  name: '',
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: 'maquina',
  defaultIncrementKg: 2.5,
};

const fieldCls = 'w-full rounded-[3px] border-2 border-edge bg-surface px-3 text-base text-text';
const labelCls = 'mb-1 block text-base font-semibold';
const MUSCLES = Object.entries(MUSCLE_LABELS) as [MuscleGroup, string][];

function MuscleChips({
  legend,
  value,
  onChange,
  error,
}: {
  legend: string;
  value: MuscleGroup[];
  onChange: (value: MuscleGroup[]) => void;
  error?: string | undefined;
}) {
  return (
    <fieldset>
      <legend className={labelCls}>{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {MUSCLES.map(([m, text]) => {
          const on = value.includes(m);
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              onClick={() => {
                onChange(on ? value.filter((x) => x !== m) : [...value, m]);
              }}
              className={`min-h-11 rounded-[3px] border-2 px-3 text-sm font-semibold ${
                on
                  ? 'border-transparent bg-text text-bg'
                  : 'border-edge text-text hover:bg-surface-2'
              }`}
            >
              {text}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-sm font-semibold">{error}</p>}
    </fieldset>
  );
}

/** Foto do exercício: banco aberto, foto própria (câmera/galeria) ou nenhuma (SPEC §5.7). */
function ImageSection({ exercise }: { exercise: Exercise }) {
  const toast = useToast();
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasImage = exercise.imageSource.kind !== 'none';

  async function run(task: () => Promise<void>, done: string) {
    setBusy(true);
    try {
      await task();
      toast({ message: done });
      return true;
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : 'Não foi possível salvar a imagem.' });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="image-title" className="mb-8">
      <h2 id="image-title" className="mb-2 text-lg font-extrabold">
        Imagem
      </h2>
      <ExerciseImage
        exercise={exercise}
        size="large"
        emptyHint="Sem foto. Busque no banco aberto ou envie a sua."
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          variant="outline"
          icon={Search}
          disabled={busy}
          onClick={() => {
            setSearching(true);
          }}
        >
          Banco aberto
        </Button>
        <label
          className={buttonClass(
            'outline',
            `cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus ${busy ? 'pointer-events-none opacity-40' : ''}`,
          )}
        >
          <Camera aria-hidden size={20} strokeWidth={2.25} />
          <span>Enviar foto</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void run(() => uploadExerciseImage(exercise.id, file), 'Foto salva');
            }}
          />
        </label>
        {hasImage && (
          <Button
            variant="quiet"
            icon={ImageOff}
            disabled={busy}
            onClick={() => void run(() => removeExerciseImage(exercise.id), 'Imagem removida')}
          >
            Remover
          </Button>
        )}
      </div>
      {searching && (
        <ExerciseDbSheet
          initialQuery=""
          busy={busy}
          onClose={() => {
            setSearching(false);
          }}
          onPick={(entry) => {
            void run(
              () => importFromExerciseDb(exercise.id, entry),
              'Imagem do banco aberto salva',
            ).then((ok) => {
              if (ok) setSearching(false);
            });
          }}
        />
      )}
    </section>
  );
}

function ExerciseForm({ data }: { data: EditData }) {
  const { exercise, all, templates, hasHistory } = data;
  const navigate = useNavigate();
  const toast = useToast();
  const [draft, setDraft] = useState<ExerciseDraft>(() =>
    exercise
      ? {
          name: exercise.name,
          primaryMuscles: [...exercise.primaryMuscles],
          secondaryMuscles: [...exercise.secondaryMuscles],
          equipment: exercise.equipment,
          defaultIncrementKg: exercise.defaultIncrementKg,
          notes: exercise.notes,
        }
      : EMPTY,
  );
  const [incrementText, setIncrementText] = useState(formatNumber(draft.defaultIncrementKg));
  const [errors, setErrors] = useState<ExerciseErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const usage = exercise ? exerciseUsage(exercise.id, templates) : [];
  const policy = deletionPolicy(hasHistory, usage);
  const patch = (p: Partial<ExerciseDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
  };

  async function save() {
    const next = { ...draft, defaultIncrementKg: parseWeight(incrementText) ?? 0 };
    const found = validateExercise(next, all, exercise?.id);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    await saveExercise(next, exercise?.id);
    toast({ message: exercise ? 'Exercício salvo' : 'Exercício criado' });
    void navigate('/biblioteca');
  }

  async function remove() {
    if (!exercise) return;
    await deleteExercise(exercise.id);
    toast({ message: `${exercise.name} excluído` });
    void navigate('/biblioteca', { replace: true });
  }

  return (
    <>
      <PageHeader
        title={exercise ? 'Editar exercício' : 'Novo exercício'}
        backTo="/biblioteca"
        historyBack
      />

      {exercise ? (
        <ImageSection exercise={exercise} />
      ) : (
        <p className="mb-6 text-sm text-muted">Depois de criar, dá para adicionar uma foto.</p>
      )}

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        noValidate
      >
        <div>
          <label className="block">
            <span className={labelCls}>Nome</span>
            <input
              value={draft.name}
              onChange={(e) => {
                patch({ name: e.target.value });
              }}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'erro-nome' : undefined}
              className={`${fieldCls} h-12`}
            />
          </label>
          {errors.name && (
            <p id="erro-nome" className="mt-1 text-sm font-semibold">
              {errors.name}
            </p>
          )}
        </div>

        <MuscleChips
          legend="Músculos primários"
          value={draft.primaryMuscles}
          onChange={(primaryMuscles) => {
            patch({ primaryMuscles });
          }}
          error={errors.primaryMuscles}
        />
        <MuscleChips
          legend="Músculos secundários"
          value={draft.secondaryMuscles}
          onChange={(secondaryMuscles) => {
            patch({ secondaryMuscles });
          }}
        />

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>Equipamento</span>
            <Select
              value={draft.equipment}
              onChange={(e) => {
                patch({ equipment: e.target.value as Equipment });
              }}
            >
              {Object.entries(EQUIPMENT_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </Select>
          </label>
          <div>
            <label className="block">
              <span className={labelCls}>Incremento</span>
              <span className="relative block">
                <input
                  inputMode="decimal"
                  value={incrementText}
                  onChange={(e) => {
                    setIncrementText(e.target.value);
                  }}
                  aria-invalid={errors.defaultIncrementKg ? true : undefined}
                  aria-describedby={errors.defaultIncrementKg ? 'erro-incremento' : undefined}
                  className={`${fieldCls} h-12 pr-10 num`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">
                  kg
                </span>
              </span>
            </label>
            {errors.defaultIncrementKg && (
              <p id="erro-incremento" className="mt-1 text-sm font-semibold">
                {errors.defaultIncrementKg}
              </p>
            )}
          </div>
        </div>

        <label className="block">
          <span className={labelCls}>Dicas de execução</span>
          <textarea
            value={draft.notes ?? ''}
            rows={3}
            onChange={(e) => {
              patch({ notes: e.target.value });
            }}
            className={`${fieldCls} py-2`}
          />
        </label>

        <Button type="submit" variant="solid" className="w-full">
          {exercise ? 'Salvar' : 'Criar exercício'}
        </Button>
      </form>

      {exercise && (
        <>
          <section aria-labelledby="usage-title" className="mt-8">
            <h2 id="usage-title" className="mb-2 text-lg font-extrabold">
              No programa
            </h2>
            {usage.length === 0 ? (
              <p className="text-base text-muted">Não está em nenhum treino.</p>
            ) : (
              <ul className="rounded-[4px] border-2 border-edge bg-surface px-3">
                {usage.map((u) => (
                  <li
                    key={`${u.letter}-${u.slotLabel}`}
                    className="flex min-h-12 items-center gap-3 border-b border-border last:border-b-0"
                  >
                    <LetterTile letter={u.letter} size="sm" />
                    <span className="flex-1 text-base">{u.slotLabel}</span>
                    <span className="text-sm text-muted">{u.role}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link to={`/exercicio/${exercise.id}`} className={buttonClass('quiet', 'mt-2 px-0')}>
              <ChartLine aria-hidden size={18} />
              <span>Ver progresso</span>
            </Link>
          </section>

          <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6">
            <Button
              variant="outline"
              icon={exercise.archived ? ArchiveRestore : Archive}
              onClick={() => {
                void setExerciseArchived(exercise.id, !exercise.archived).then(() => {
                  toast({
                    message: exercise.archived ? 'Exercício restaurado' : 'Exercício arquivado',
                  });
                });
              }}
            >
              {exercise.archived ? 'Desarquivar' : 'Arquivar'}
            </Button>
            <Button
              variant="outline"
              icon={Trash2}
              disabled={!policy.canDelete}
              onClick={() => {
                setConfirmDelete(true);
              }}
            >
              Excluir
            </Button>
            {!policy.canDelete && <p className="text-sm text-muted">{policy.reason}</p>}
          </div>
        </>
      )}

      {confirmDelete && exercise && (
        <Modal
          title="Excluir exercício?"
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
            {exercise.name} sai da biblioteca de vez. Não dá para desfazer.
          </p>
        </Modal>
      )}
    </>
  );
}
