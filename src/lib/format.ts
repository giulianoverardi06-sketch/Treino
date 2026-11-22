const kgFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

/** 42.5 → "42,5 kg" */
export function formatKg(value: number): string {
  return `${kgFormatter.format(value)} kg`;
}
