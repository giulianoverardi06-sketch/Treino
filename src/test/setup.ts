import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom não tem ResizeObserver (usado pelo ResponsiveContainer do Recharts).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in globalThis)) {
  Object.assign(globalThis, { ResizeObserver: ResizeObserverStub });
}

// jsdom não implementa scrollIntoView (a sessão rola até o próximo exercício).
if (!('scrollIntoView' in Element.prototype)) {
  Object.assign(Element.prototype, { scrollIntoView() {} });
}

afterEach(() => {
  cleanup();
});
