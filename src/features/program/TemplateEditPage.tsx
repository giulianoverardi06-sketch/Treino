import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, ChevronUp, GripVertical, Plus } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { ExercisePicker } from '@/components/ExercisePicker';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { LetterTile, Tile } from '@/components/Sign';
import { useToast } from '@/components/Toast';
import { db } from '@/db/db';
import { saveSlots, updateTemplate } from '@/db/programRepo';
import { applySlotDraft, createSlot, moveSlot } from '@/domain/program';
import { LETTERS, type Exercise, type Slot, type WorkoutTemplate } from '@/domain/types';
import { newId } from '@/lib/ids';
import { plural } from '@/lib/format';
import { SlotSheet } from './SlotSheet';

export function TemplateEditPage() {
  const { letter: param = '' } = useParams();
  const letter = LETTERS.find((l) => l === param.toUpperCase());
  const data = useLiveQuery(async () => {
    if (!letter) return null;
    const [template, exercises] = await Promise.all([
      db.templates.where('letter').equals(letter).first(),
      db.exercises.toArray(),
    ]);
    if (!template) return null;
    return { template, exercises: new Map(exercises.map((e) => [e.id, e])) };
  }, [letter]);

  if (data === undefined) return <p className="text-base text-muted">Carregando…</p>;
  if (data === null) {
    return (
      <>
        <PageHeader title="Treino" backTo="/programa" />
        <p className="text-base text-muted">Treino não encontrado.</p>
      </>
    );
  }
  return <TemplateEditor template={data.template} exercises={data.exercises} />;
}

const inputCls =
  'h-12 w-full rounded-[3px] border-2 border-edge bg-surface px-3 text-base text-text';

function TemplateEditor({
  template,
  exercises,
}: {
  template: WorkoutTemplate;
  exercises: ReadonlyMap<string, Exercise>;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const slots = template.slots;
  const editingSlot = slots.find((s) => s.id === editing);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function move(from: number, to: number) {
    void saveSlots(template.id, moveSlot(slots, from, to));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    move(
      slots.findIndex((s) => s.id === active.id),
      slots.findIndex((s) => s.id === over.id),
    );
  }

  function remove(slot: Slot) {
    const before = slots;
    void saveSlots(
      template.id,
      slots.filter((s) => s.id !== slot.id),
    );
    setEditing(null);
    toast({
      message: `${slot.label} removido do treino`,
      actionLabel: 'Desfazer',
      onAction: () => void saveSlots(template.id, before),
    });
  }

  return (
    <>
      <PageHeader
        title={`Treino ${template.letter}`}
        backTo="/programa"
        actions={<LetterTile letter={template.letter} size="lg" />}
      />

      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-base font-semibold">Nome</span>
          <input
            key={`nome-${template.name}`}
            defaultValue={template.name}
            onBlur={(e) => {
              if (e.target.value.trim() !== template.name) {
                void updateTemplate(template.id, { name: e.target.value });
              }
            }}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-base font-semibold">Ênfase</span>
          <input
            key={`enfase-${template.emphasis}`}
            defaultValue={template.emphasis}
            onBlur={(e) => {
              if (e.target.value.trim() !== template.emphasis) {
                void updateTemplate(template.id, { emphasis: e.target.value });
              }
            }}
            className={inputCls}
          />
        </label>
      </div>

      <section aria-labelledby="slots-title" className="mt-8">
        <h2 id="slots-title" className="mb-1 text-lg font-extrabold">
          Exercícios ({slots.length})
        </h2>
        <p className="mb-2 text-sm text-muted">
          Arraste pela alça ou use as setas para mudar a ordem. Toque para editar.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={slots.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ol
              className="rounded-[4px] border-2 border-edge bg-surface"
              aria-label="Exercícios do treino"
            >
              {slots.map((slot, i) => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  position={i + 1}
                  exercises={exercises}
                  isFirst={i === 0}
                  isLast={i === slots.length - 1}
                  onEdit={() => {
                    setEditing(slot.id);
                  }}
                  onMove={(dir) => {
                    move(i, i + dir);
                  }}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
        <button
          type="button"
          className="mt-3 flex min-h-14 w-full items-center gap-3 rounded-[3px] border-2 border-dashed border-edge px-3 text-base font-semibold text-muted hover:text-text"
          onClick={() => {
            setAdding(true);
          }}
        >
          <Plus aria-hidden size={22} strokeWidth={2.5} /> Exercício
        </button>
      </section>

      {adding && (
        <Modal
          title="Adicionar ao treino"
          onClose={() => {
            setAdding(false);
          }}
        >
          <ExercisePicker
            exercises={exercises}
            onPick={(id) => {
              const exercise = exercises.get(id);
              if (exercise) void saveSlots(template.id, [...slots, createSlot(exercise, newId)]);
              setAdding(false);
            }}
          />
        </Modal>
      )}

      {editingSlot && (
        <SlotSheet
          key={editingSlot.id}
          slot={editingSlot}
          exercises={exercises}
          onClose={() => {
            setEditing(null);
          }}
          onRemove={() => {
            remove(editingSlot);
          }}
          onSave={(draft) => {
            void saveSlots(
              template.id,
              slots.map((s) => (s.id === editingSlot.id ? applySlotDraft(s, draft) : s)),
            );
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

const arrowBtn =
  'flex size-11 items-center justify-center rounded-[3px] text-muted hover:bg-surface-2 hover:text-text disabled:opacity-25';

function SlotRow({
  slot,
  position,
  exercises,
  isFirst,
  isLast,
  onEdit,
  onMove,
}: {
  slot: Slot;
  position: number;
  exercises: ReadonlyMap<string, Exercise>;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slot.id });
  const primary = exercises.get(slot.primaryExerciseId)?.name ?? 'Exercício removido';
  const alts = slot.alternativeExerciseIds.length;
  const meta = [
    `${slot.plannedSets} ${plural(slot.plannedSets, 'série', 'séries')}`,
    alts > 0 ? `${alts} ${plural(alts, 'alternativa', 'alternativas')}` : null,
    slot.optional ? 'opcional' : null,
    slot.protocol === 'drop_lateral' ? 'drop lateral' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 border-b border-border pr-1 last:border-b-0 ${
        isDragging ? 'relative z-10 bg-surface-2' : ''
      }`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label={`Arrastar ${slot.label}`}
        className="flex h-16 w-10 shrink-0 cursor-grab touch-none items-center justify-center text-muted"
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden size={20} />
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2 text-left"
        aria-label={`Editar ${slot.label}: ${primary}`}
      >
        <Tile size="sm">{position}</Tile>
        <span className="min-w-0 flex-1">
          <span className="block text-base leading-tight font-bold">{slot.label}</span>
          {slot.label !== primary && <span className="block text-sm leading-snug">{primary}</span>}
          <span className="block text-sm leading-snug text-muted num">{meta}</span>
        </span>
      </button>
      <button
        type="button"
        aria-label={`Subir ${slot.label}`}
        disabled={isFirst}
        className={arrowBtn}
        onClick={() => {
          onMove(-1);
        }}
      >
        <ChevronUp aria-hidden size={20} />
      </button>
      <button
        type="button"
        aria-label={`Descer ${slot.label}`}
        disabled={isLast}
        className={arrowBtn}
        onClick={() => {
          onMove(1);
        }}
      >
        <ChevronDown aria-hidden size={20} />
      </button>
    </li>
  );
}
