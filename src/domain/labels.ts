import type { Equipment, MuscleGroup } from './types';

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  peito: 'Peito',
  peito_superior: 'Peito superior',
  deltoide_anterior: 'Deltoide anterior',
  deltoide_lateral: 'Deltoide lateral',
  deltoide_posterior: 'Deltoide posterior',
  dorsais: 'Dorsais',
  costas_medias: 'Costas médias',
  trapezio: 'Trapézio',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quadriceps: 'Quadríceps',
  posteriores: 'Posteriores',
  gluteos: 'Glúteos',
  panturrilha: 'Panturrilha',
  core: 'Core',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  maquina: 'Máquina',
  polia: 'Polia',
  halteres: 'Halteres',
  barra: 'Barra',
  peso_corporal: 'Peso corporal',
  outro: 'Outro',
};
