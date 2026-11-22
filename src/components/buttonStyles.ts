/*
 * go:      amarelo de sinalização — o próximo passo do caminho (Iniciar, Finalizar).
 * ink:     preto de placa sobre a placa amarela.
 * onInk:   contorno claro sobre a barra preta (ação que ainda não é o próximo passo).
 * solid:   tinta invertida do tema (confirmação em diálogo).
 * outline: ação secundária.
 * quiet:   ação pequena de linha.
 */
export type ButtonVariant = 'go' | 'ink' | 'onInk' | 'solid' | 'outline' | 'quiet';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-[4px] font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none';

const VARIANTS: Record<ButtonVariant, string> = {
  go: 'min-h-14 bg-sign px-4 text-lg text-on-sign hover:brightness-95 active:brightness-90',
  ink: 'min-h-14 bg-tile px-4 text-lg text-on-tile hover:bg-black/85',
  onInk:
    'min-h-14 border-2 border-white/45 px-4 text-lg text-white hover:border-white active:bg-white/10',
  solid: 'min-h-12 bg-text px-4 text-base text-bg hover:opacity-90',
  outline:
    'min-h-12 border-2 border-edge px-4 text-base text-text hover:bg-surface-2 active:bg-surface-2',
  quiet: 'min-h-11 px-3 text-sm text-muted hover:text-text',
};

/** Classes de botão, para links que se comportam como botão. */
export function buttonClass(variant: ButtonVariant, extra = ''): string {
  return `${BASE} ${VARIANTS[variant]} ${extra}`;
}
