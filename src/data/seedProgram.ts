import type {
  Equipment,
  Exercise,
  ImageSource,
  Letter,
  MuscleGroup,
  Settings,
  Slot,
  SlotProtocol,
  WorkoutTemplate,
} from '@/domain/types';
import { SEED_IMAGE_MAP } from './seedImageMap';

/**
 * Programa inicial (SPEC §4). Roda uma vez, na criação do banco; tudo fica editável depois.
 * IDs são slugs estáveis: o mapeamento de imagens (Fase 7) e os testes dependem deles.
 */

export const SCHEMA_VERSION = 2;

interface SeedExercise {
  id: string;
  name: string;
  primary: MuscleGroup[];
  secondary?: MuscleGroup[];
  equipment: Equipment;
  incrementKg: number;
}

const ex = (
  id: string,
  name: string,
  equipment: Equipment,
  incrementKg: number,
  primary: MuscleGroup[],
  secondary: MuscleGroup[] = [],
): SeedExercise => ({ id, name, equipment, incrementKg, primary, secondary });

export const SEED_EXERCISES: readonly SeedExercise[] = [
  // A — Peito, ombro e tríceps
  ex(
    'supino-inclinado-maquina',
    'Supino inclinado na máquina',
    'maquina',
    2.5,
    ['peito_superior'],
    ['deltoide_anterior', 'triceps'],
  ),
  ex(
    'supino-inclinado-halteres',
    'Supino inclinado com halteres',
    'halteres',
    2,
    ['peito_superior'],
    ['deltoide_anterior', 'triceps'],
  ),
  ex(
    'elevacao-lateral-halteres',
    'Elevação lateral com halteres',
    'halteres',
    1,
    ['deltoide_lateral'],
    ['trapezio'],
  ),
  ex('elevacao-lateral-polia', 'Elevação lateral na polia', 'polia', 2.5, ['deltoide_lateral']),
  ex('elevacao-lateral-maquina', 'Elevação lateral na máquina', 'maquina', 2.5, [
    'deltoide_lateral',
  ]),
  ex(
    'crossover-baixo-cima',
    'Crossover de baixo para cima',
    'polia',
    2.5,
    ['peito_superior'],
    ['deltoide_anterior'],
  ),
  ex('peck-deck', 'Peck deck', 'maquina', 2.5, ['peito'], ['deltoide_anterior']),
  ex('crossover-medio', 'Crossover médio', 'polia', 2.5, ['peito'], ['deltoide_anterior']),
  ex('triceps-polia-corda', 'Tríceps na polia com corda', 'polia', 2.5, ['triceps']),
  ex('triceps-polia-barra', 'Tríceps na polia com barra', 'polia', 2.5, ['triceps']),
  ex('triceps-acima-cabeca-polia', 'Extensão de tríceps acima da cabeça na polia', 'polia', 2.5, [
    'triceps',
  ]),
  ex('triceps-acima-cabeca-halter', 'Extensão acima da cabeça com halter', 'halteres', 2, [
    'triceps',
  ]),

  // B — Costas e bíceps
  ex('pulley-frente', 'Pulley frente', 'polia', 2.5, ['dorsais'], ['biceps', 'costas_medias']),
  ex(
    'puxada-pegada-neutra',
    'Puxada com pegada neutra',
    'polia',
    2.5,
    ['dorsais'],
    ['biceps', 'costas_medias'],
  ),
  ex('puxada-unilateral', 'Puxada unilateral', 'polia', 2.5, ['dorsais'], ['biceps']),
  ex(
    'remada-baixa',
    'Remada baixa',
    'polia',
    2.5,
    ['costas_medias', 'dorsais'],
    ['biceps', 'deltoide_posterior'],
  ),
  ex(
    'remada-maquina',
    'Remada na máquina',
    'maquina',
    2.5,
    ['costas_medias', 'dorsais'],
    ['biceps', 'deltoide_posterior'],
  ),
  ex(
    'remada-apoiada-pegada-aberta',
    'Remada apoiada com pegada aberta',
    'maquina',
    2.5,
    ['costas_medias'],
    ['deltoide_posterior', 'trapezio'],
  ),
  ex(
    'remada-curvada-halteres-apoiada',
    'Remada curvada com halteres apoiada',
    'halteres',
    2,
    ['costas_medias'],
    ['deltoide_posterior', 'dorsais'],
  ),
  ex(
    'peck-deck-reverso',
    'Peck deck reverso',
    'maquina',
    2.5,
    ['deltoide_posterior'],
    ['costas_medias', 'trapezio'],
  ),
  ex(
    'crucifixo-inverso-halteres',
    'Crucifixo inverso com halteres',
    'halteres',
    1,
    ['deltoide_posterior'],
    ['costas_medias'],
  ),
  ex('face-pull', 'Face pull', 'polia', 2.5, ['deltoide_posterior'], ['trapezio', 'costas_medias']),
  ex('rosca-direta-polia', 'Rosca direta na polia', 'polia', 2.5, ['biceps']),
  ex('rosca-direta-barra', 'Rosca direta com barra', 'barra', 2, ['biceps']),
  ex('rosca-alternada-halteres', 'Rosca alternada com halteres', 'halteres', 2, ['biceps']),
  ex('rosca-martelo', 'Rosca martelo', 'halteres', 2, ['biceps']),

  // C — Pernas e core
  ex('leg-press-45', 'Leg press 45°', 'maquina', 5, ['quadriceps'], ['gluteos']),
  ex('hack-squat', 'Hack squat', 'maquina', 5, ['quadriceps'], ['gluteos']),
  ex('stiff-halteres', 'Stiff com halteres', 'halteres', 2, ['posteriores'], ['gluteos']),
  ex('stiff-barra', 'Stiff com barra', 'barra', 2, ['posteriores'], ['gluteos']),
  ex('elevacao-pelvica', 'Elevação pélvica (hip thrust)', 'barra', 5, ['gluteos'], ['posteriores']),
  ex('cadeira-extensora', 'Cadeira extensora', 'maquina', 2.5, ['quadriceps']),
  // Separado do hack squat de propósito: a carga leve não deve virar referência do composto.
  ex('hack-squat-leve', 'Hack squat leve', 'maquina', 5, ['quadriceps'], ['gluteos']),
  ex('mesa-flexora', 'Mesa flexora', 'maquina', 2.5, ['posteriores']),
  ex('cadeira-flexora', 'Cadeira flexora', 'maquina', 2.5, ['posteriores']),
  ex('abdominal-maquina', 'Abdominal na máquina', 'maquina', 2.5, ['core']),
  ex('crunch-polia', 'Crunch na polia', 'polia', 2.5, ['core']),
  ex('panturrilha-em-pe-maquina', 'Panturrilha em pé na máquina', 'maquina', 5, ['panturrilha']),
  ex('panturrilha-leg-press', 'Panturrilha no leg press', 'maquina', 5, ['panturrilha']),
];

interface SeedSlot {
  label: string;
  primary: string;
  alternatives: string[];
  sets: number;
  optional?: boolean;
  protocol?: SlotProtocol;
  startWeightKg?: number;
}

interface SeedTemplate {
  letter: Letter;
  name: string;
  emphasis: string;
  slots: SeedSlot[];
}

export const SEED_TEMPLATES: readonly SeedTemplate[] = [
  {
    letter: 'A',
    name: 'Peito, ombro e tríceps',
    emphasis: 'Peitoral superior + deltoide lateral',
    slots: [
      {
        label: 'Pressão inclinada',
        primary: 'supino-inclinado-maquina',
        alternatives: ['supino-inclinado-halteres'],
        sets: 4,
      },
      {
        label: 'Deltoide lateral',
        primary: 'elevacao-lateral-halteres',
        alternatives: ['elevacao-lateral-polia', 'elevacao-lateral-maquina'],
        sets: 8,
        protocol: 'drop_lateral',
        startWeightKg: 8,
      },
      { label: 'Crucifixo ascendente', primary: 'crossover-baixo-cima', alternatives: [], sets: 3 },
      {
        label: 'Crucifixo médio',
        primary: 'peck-deck',
        alternatives: ['crossover-medio'],
        sets: 3,
      },
      {
        label: 'Tríceps (encurtado)',
        primary: 'triceps-polia-corda',
        alternatives: ['triceps-polia-barra'],
        sets: 3,
      },
      {
        label: 'Tríceps (alongado)',
        primary: 'triceps-acima-cabeca-polia',
        alternatives: ['triceps-acima-cabeca-halter'],
        sets: 3,
      },
    ],
  },
  {
    letter: 'B',
    name: 'Costas e bíceps',
    emphasis: 'Dorsais + costas médias + postura',
    slots: [
      {
        label: 'Puxada vertical',
        primary: 'pulley-frente',
        alternatives: ['puxada-pegada-neutra', 'puxada-unilateral'],
        sets: 3,
      },
      {
        label: 'Remada horizontal',
        primary: 'remada-baixa',
        alternatives: ['remada-maquina'],
        sets: 3,
      },
      {
        label: 'Remada costas médias',
        primary: 'remada-apoiada-pegada-aberta',
        alternatives: ['remada-curvada-halteres-apoiada'],
        sets: 3,
        optional: true,
      },
      {
        label: 'Deltoide posterior',
        primary: 'peck-deck-reverso',
        alternatives: ['crucifixo-inverso-halteres', 'face-pull'],
        sets: 3,
      },
      {
        label: 'Bíceps principal',
        primary: 'rosca-direta-polia',
        alternatives: ['rosca-direta-barra'],
        sets: 3,
      },
      {
        label: 'Bíceps complementar',
        primary: 'rosca-alternada-halteres',
        alternatives: ['rosca-martelo'],
        sets: 3,
        optional: true,
      },
    ],
  },
  {
    letter: 'C',
    name: 'Pernas e core',
    emphasis: 'Desenvolvimento equilibrado dos membros inferiores',
    slots: [
      {
        label: 'Quadríceps composto',
        primary: 'leg-press-45',
        alternatives: ['hack-squat'],
        sets: 3,
      },
      {
        label: 'Extensão de quadril',
        primary: 'stiff-halteres',
        alternatives: ['stiff-barra', 'elevacao-pelvica'],
        sets: 3,
        optional: true,
      },
      {
        label: 'Quadríceps isolado',
        primary: 'cadeira-extensora',
        alternatives: ['hack-squat-leve'],
        sets: 3,
      },
      { label: 'Posteriores', primary: 'mesa-flexora', alternatives: ['cadeira-flexora'], sets: 3 },
      {
        label: 'Core',
        primary: 'abdominal-maquina',
        alternatives: ['crunch-polia'],
        sets: 3,
        optional: true,
      },
      {
        label: 'Panturrilha',
        primary: 'panturrilha-em-pe-maquina',
        alternatives: ['panturrilha-leg-press'],
        sets: 3,
        optional: true,
      },
    ],
  },
];

/** Foto do free-exercise-db para um exercício do seed, quando existe correspondência. */
export function seedImageSource(exerciseId: string): ImageSource {
  const match = SEED_IMAGE_MAP[exerciseId];
  return match ? { kind: 'freeExerciseDb', dbId: match.dbId } : { kind: 'none' };
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  theme: 'dark',
  defaultToFailure: true,
  lateralDropKg: 2,
  wakeLock: true,
  schemaVersion: SCHEMA_VERSION,
};

export interface SeedData {
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  settings: Settings;
}

/** Monta o seed completo. `now` em ISO; imagens entram só na Fase 7. */
export function buildSeed(now: string): SeedData {
  const exercises: Exercise[] = SEED_EXERCISES.map((e) => ({
    id: e.id,
    name: e.name,
    primaryMuscles: e.primary,
    secondaryMuscles: e.secondary ?? [],
    equipment: e.equipment,
    imageSource: seedImageSource(e.id),
    defaultIncrementKg: e.incrementKg,
    archived: false,
    createdAt: now,
  }));

  const templates: WorkoutTemplate[] = SEED_TEMPLATES.map((t) => ({
    id: `tpl-${t.letter}`,
    letter: t.letter,
    name: t.name,
    emphasis: t.emphasis,
    updatedAt: now,
    slots: t.slots.map((s, i): Slot => {
      const slot: Slot = {
        id: `${t.letter}-${i + 1}`,
        label: s.label,
        primaryExerciseId: s.primary,
        alternativeExerciseIds: s.alternatives,
        plannedSets: s.sets,
        optional: s.optional ?? false,
        protocol: s.protocol ?? 'padrao',
      };
      if (s.startWeightKg !== undefined) slot.startWeightKg = s.startWeightKg;
      return slot;
    }),
  }));

  return { exercises, templates, settings: { ...DEFAULT_SETTINGS } };
}
