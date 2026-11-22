import { useId } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from 'recharts';
import type { Letter } from '@/domain/types';
import { formatNumber, formatShortDate } from '@/lib/format';

export interface ChartPoint {
  sessionId: string;
  /** ISO */
  date: string;
  letter: Letter;
  value: number;
}

interface SessionChartProps {
  title: string;
  kind: 'line' | 'bar';
  points: readonly ChartPoint[];
  /** Sufixo do valor ("kg", "séries"). */
  unit: string;
  /** Nota abaixo do título (ex.: "Só sessões com repetições"). */
  note?: string;
  /** Mínimo de pontos para desenhar (padrão 2: uma linha precisa de dois). */
  minPoints?: number;
}

/** Cor de cada letra como classe de preenchimento (tokens do tema; CSS vence o atributo SVG). */
const FILL: Record<Letter, string> = {
  A: 'fill-letter-a',
  B: 'fill-letter-b',
  C: 'fill-letter-c',
};

/*
 * Recharts escreve cores como atributos SVG; as classes abaixo aplicam os tokens do tema por CSS,
 * que tem prioridade, para o gráfico seguir o tema claro/escuro sem JS.
 */
const CHART_THEME = [
  '[&_.recharts-cartesian-grid_line]:stroke-border',
  '[&_.recharts-cartesian-axis-tick-value]:fill-muted',
  '[&_.recharts-cartesian-axis-tick-value]:text-[11px]',
  '[&_.recharts-tooltip-cursor]:stroke-border',
  '[&_.recharts-tooltip-cursor]:fill-surface-2',
].join(' ');

function formatValue(v: number, unit: string) {
  return `${formatNumber(v)} ${unit}`;
}

interface TooltipBoxProps {
  active?: boolean | undefined;
  payload?: readonly { payload?: unknown }[] | undefined;
  unit: string;
}

function TooltipBox({ active, payload, unit }: TooltipBoxProps) {
  const p = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !p) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs shadow-lg">
      <p className="text-muted">
        {formatShortDate(p.date)} · Treino {p.letter}
      </p>
      <p className="text-sm font-semibold text-text num">{formatValue(p.value, unit)}</p>
    </div>
  );
}

/** Ponto de 8px na cor da letra, com anel de 2px da cor da superfície. */
function Dot(props: { cx?: number; cy?: number; payload?: ChartPoint; r?: number }) {
  const { cx, cy, payload, r = 4 } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      strokeWidth={2}
      className={`${FILL[payload.letter]} stroke-surface`}
    />
  );
}

export function SessionChart({
  title,
  kind,
  points,
  unit,
  note,
  minPoints = 2,
}: SessionChartProps) {
  const data = points.map((p) => ({ ...p, label: formatShortDate(p.date) }));
  const letters = [...new Set(points.map((p) => p.letter))].sort();
  const enough = points.length >= minPoints;
  const titleId = useId();

  return (
    <figure className="rounded-xl bg-surface p-3" aria-labelledby={titleId}>
      <figcaption className="mb-2 px-1">
        <span id={titleId} className="block text-sm font-semibold">
          {title}
        </span>
        {note && <span className="block text-xs text-muted">{note}</span>}
      </figcaption>

      {!enough ? (
        <p className="px-1 py-6 text-center text-sm text-muted">
          {points.length === 0
            ? 'Sem dados no período.'
            : 'Faça mais uma sessão para ver a evolução.'}
        </p>
      ) : (
        <>
          <div className={`h-44 ${CHART_THEME}`} aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              {kind === 'line' ? (
                <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} />
                  <YAxis
                    width={36}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={(v: number) => formatNumber(v)}
                  />
                  <Tooltip
                    content={(p) => (
                      <TooltipBox active={p.active} payload={p.payload} unit={unit} />
                    )}
                    cursor={{ strokeWidth: 1 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="linear"
                    dataKey="value"
                    strokeWidth={2}
                    className="[&_.recharts-line-curve]:stroke-muted"
                    dot={<Dot />}
                    activeDot={<Dot r={6} />}
                    isAnimationActive={false}
                  />
                </LineChart>
              ) : (
                <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} />
                  <YAxis width={36} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    content={(p) => (
                      <TooltipBox active={p.active} payload={p.payload} unit={unit} />
                    )}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="value"
                    maxBarSize={24}
                    isAnimationActive={false}
                    shape={(props: BarShapeProps) => (
                      <Rectangle
                        x={props.x}
                        y={props.y}
                        width={props.width}
                        height={props.height}
                        radius={[4, 4, 0, 0]}
                        className={FILL[(props.payload as ChartPoint).letter]}
                      />
                    )}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {letters.length > 1 && (
            <ul className="mt-1 flex gap-3 px-1 text-xs text-muted" aria-label="Legenda">
              {letters.map((l) => (
                <li key={l} className="flex items-center gap-1">
                  <svg width="8" height="8" aria-hidden>
                    <circle cx="4" cy="4" r="4" className={FILL[l]} />
                  </svg>
                  Treino {l}
                </li>
              ))}
            </ul>
          )}

          <details className="mt-2 px-1 text-xs text-muted">
            <summary className="min-h-11 cursor-pointer content-center">Ver tabela</summary>
            <table className="w-full text-left num">
              <caption className="sr-only">{title}</caption>
              <thead>
                <tr>
                  <th className="py-1 font-medium">Data</th>
                  <th className="py-1 font-medium">Treino</th>
                  <th className="py-1 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="text-text">
                {[...points].reverse().map((p) => (
                  <tr key={p.sessionId} className="border-t border-border">
                    <td className="py-1">{formatShortDate(p.date)}</td>
                    <td className="py-1">{p.letter}</td>
                    <td className="py-1 text-right">{formatValue(p.value, unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </figure>
  );
}
