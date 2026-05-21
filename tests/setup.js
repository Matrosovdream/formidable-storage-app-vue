import { vi } from 'vitest';

// jsdom doesn't ship a clipboard implementation.
if (typeof navigator !== 'undefined' && !navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue() },
    configurable: true,
  });
}
