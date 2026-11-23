/**
 * Exercícios do seed → id no free-exercise-db (domínio público), para a foto de referência.
 * Proposto por busca de nome e equipamento em `exerciseDbIndex.json`; nenhum id foi inventado.
 *
 * `alta`  = mesmo movimento e equipamento.
 * `media` = movimento certo com alguma diferença (postura, pegada, máquina). REVISAR.
 * `null`  = sem correspondência no banco: placeholder + upload próprio.
 *
 * A lista de revisão está em docs/IMAGENS-REVISAO.md.
 */

export interface SeedImageMatch {
  dbId: string;
  confidence: 'alta' | 'media';
  note?: string;
}

export const SEED_IMAGE_MAP: Readonly<Record<string, SeedImageMatch | null>> = {
  // A — Peito, ombro e tríceps
  'supino-inclinado-maquina': {
    dbId: 'Leverage_Incline_Chest_Press',
    confidence: 'media',
    note: 'Máquina de alavanca; a da sua academia pode ser de cabo/guiada.',
  },
  'supino-inclinado-halteres': { dbId: 'Incline_Dumbbell_Press', confidence: 'alta' },
  'elevacao-lateral-halteres': { dbId: 'Side_Lateral_Raise', confidence: 'alta' },
  'elevacao-lateral-polia': {
    dbId: 'Cable_Seated_Lateral_Raise',
    confidence: 'media',
    note: 'A foto é sentado; costuma ser feito em pé.',
  },
  'elevacao-lateral-maquina': null,
  'crossover-baixo-cima': { dbId: 'Low_Cable_Crossover', confidence: 'alta' },
  'peck-deck': { dbId: 'Butterfly', confidence: 'alta' },
  'crossover-medio': {
    dbId: 'Cable_Crossover',
    confidence: 'media',
    note: 'A foto mostra o crossover de cima para baixo, não na altura média.',
  },
  'triceps-polia-corda': { dbId: 'Triceps_Pushdown_-_Rope_Attachment', confidence: 'alta' },
  'triceps-polia-barra': { dbId: 'Triceps_Pushdown', confidence: 'alta' },
  'triceps-acima-cabeca-polia': {
    dbId: 'Cable_Rope_Overhead_Triceps_Extension',
    confidence: 'alta',
  },
  'triceps-acima-cabeca-halter': {
    dbId: 'Standing_Dumbbell_Triceps_Extension',
    confidence: 'media',
    note: 'Em pé com um halter; se você faz sentado, a postura difere.',
  },

  // B — Costas e bíceps
  'pulley-frente': { dbId: 'Wide-Grip_Lat_Pulldown', confidence: 'alta' },
  'puxada-pegada-neutra': { dbId: 'V-Bar_Pulldown', confidence: 'alta' },
  'puxada-unilateral': { dbId: 'One_Arm_Lat_Pulldown', confidence: 'alta' },
  'remada-baixa': { dbId: 'Seated_Cable_Rows', confidence: 'alta' },
  'remada-maquina': {
    dbId: 'Leverage_Iso_Row',
    confidence: 'media',
    note: 'Remada em máquina de alavanca; modelos variam.',
  },
  'remada-apoiada-pegada-aberta': {
    dbId: 'Lying_T-Bar_Row',
    confidence: 'media',
    note: 'Remada T com peito apoiado; a pegada aberta da foto pode não bater.',
  },
  'remada-curvada-halteres-apoiada': { dbId: 'Dumbbell_Incline_Row', confidence: 'alta' },
  'peck-deck-reverso': { dbId: 'Reverse_Machine_Flyes', confidence: 'alta' },
  'crucifixo-inverso-halteres': { dbId: 'Reverse_Flyes', confidence: 'alta' },
  'face-pull': { dbId: 'Face_Pull', confidence: 'alta' },
  'rosca-direta-polia': { dbId: 'Standing_Biceps_Cable_Curl', confidence: 'alta' },
  'rosca-direta-barra': { dbId: 'Barbell_Curl', confidence: 'alta' },
  'rosca-alternada-halteres': { dbId: 'Dumbbell_Alternate_Bicep_Curl', confidence: 'alta' },
  'rosca-martelo': { dbId: 'Hammer_Curls', confidence: 'alta' },

  // C — Pernas e core
  'leg-press-45': { dbId: 'Leg_Press', confidence: 'alta' },
  'hack-squat': { dbId: 'Hack_Squat', confidence: 'alta' },
  'stiff-halteres': { dbId: 'Stiff-Legged_Dumbbell_Deadlift', confidence: 'alta' },
  'stiff-barra': { dbId: 'Stiff-Legged_Barbell_Deadlift', confidence: 'alta' },
  'elevacao-pelvica': { dbId: 'Barbell_Hip_Thrust', confidence: 'alta' },
  'cadeira-extensora': { dbId: 'Leg_Extensions', confidence: 'alta' },
  'hack-squat-leve': {
    dbId: 'Hack_Squat',
    confidence: 'alta',
    note: 'Mesma foto do hack squat (o exercício só é separado para não misturar cargas).',
  },
  'mesa-flexora': { dbId: 'Lying_Leg_Curls', confidence: 'alta' },
  'cadeira-flexora': { dbId: 'Seated_Leg_Curl', confidence: 'alta' },
  'abdominal-maquina': { dbId: 'Ab_Crunch_Machine', confidence: 'alta' },
  'crunch-polia': { dbId: 'Cable_Crunch', confidence: 'alta' },
  'panturrilha-em-pe-maquina': { dbId: 'Standing_Calf_Raises', confidence: 'alta' },
  'panturrilha-leg-press': { dbId: 'Calf_Press_On_The_Leg_Press_Machine', confidence: 'alta' },
};
