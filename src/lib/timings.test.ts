import { expect, it } from 'vitest';
import { recordTiming } from './timings';
it('records finite timings without requiring a browser session', () => { expect(() => recordTiming('queue refill', 12.5)).not.toThrow(); });