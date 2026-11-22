import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Botões no rodapé. */
  footer?: ReactNode;
}

/**
 * Folha inferior modal. Fecha com Esc ou toque fora; foca o primeiro controle ao abrir e devolve
 * o foco ao fechar.
 */
export function Modal({ title, onClose, children, footer }: ModalProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>(
      'input, textarea, select, button:not([data-modal-close])',
    );
    (first ?? panel.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div aria-hidden className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[85dvh] w-full max-w-[480px] flex-col border-t-4 border-edge bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <h2 id={titleId} className="px-4 pt-5 pb-3 text-[1.375rem] leading-tight font-bold">
          {title}
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        {footer && <div className="flex gap-2 border-t border-border p-3">{footer}</div>}
      </div>
    </div>
  );
}
