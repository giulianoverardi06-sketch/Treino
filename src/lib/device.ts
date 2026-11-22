import { useEffect } from 'react';

/** Vibração curta de confirmação, se o aparelho suportar. */
export function vibrate(ms = 30): void {
  try {
    navigator.vibrate(ms);
  } catch {
    /* sem suporte */
  }
}

/**
 * Mantém a tela acesa enquanto `enabled` (Wake Lock API). O navegador solta o lock quando a aba
 * fica oculta; ele é pedido de novo ao voltar.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) await lock.release();
        else sentinel = lock;
      } catch {
        /* negado (bateria fraca etc.) */
      }
    };
    const onVisibility = () => {
      void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release();
    };
  }, [enabled]);
}
