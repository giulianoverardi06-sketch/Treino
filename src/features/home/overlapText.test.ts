import { describe, expect, it } from 'vitest';
import { overlapText } from './overlapText';

const now = new Date(2026, 2, 20, 12, 0);
const today = new Date(2026, 2, 20, 8, 0).toISOString();
const yesterday = new Date(2026, 2, 19, 19, 0).toISOString();

describe('overlapText', () => {
  it('um grupo ontem', () => {
    expect(overlapText([{ muscle: 'biceps', finishedAt: yesterday }], now)).toBe(
      'Bíceps trabalhado ontem',
    );
  });

  it('vários grupos no mesmo dia', () => {
    expect(
      overlapText(
        [
          { muscle: 'biceps', finishedAt: today },
          { muscle: 'costas_medias', finishedAt: today },
          { muscle: 'dorsais', finishedAt: today },
        ],
        now,
      ),
    ).toBe('Bíceps, costas médias e dorsais trabalhados hoje');
  });

  it('dias diferentes', () => {
    expect(
      overlapText(
        [
          { muscle: 'dorsais', finishedAt: yesterday },
          { muscle: 'biceps', finishedAt: today },
        ],
        now,
      ),
    ).toBe('Bíceps trabalhado hoje · Dorsais trabalhado ontem');
  });
});
