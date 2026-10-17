import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePresence } from './motion';
afterEach(() => vi.useRealTimers());
describe('Overlay presence', () => {
  it('retains closing state until the duration plus 50ms fallback', () => {
    vi.useFakeTimers(); document.documentElement.style.setProperty('--motion-standard','200ms');
    const exit=vi.fn(); const {result}=renderHook(()=>usePresence(exit));
    act(()=>result.current.close()); expect(result.current.state).toBe('closing');
    act(()=>vi.advanceTimersByTime(249)); expect(exit).not.toHaveBeenCalled();
    act(()=>vi.advanceTimersByTime(1)); expect(exit).toHaveBeenCalledTimes(1); expect(result.current.state).toBe('closed');
  });
  it('does not repeat close actions on fast second taps or animation end', () => {
    const exit=vi.fn(); const {result}=renderHook(()=>usePresence(exit));
    act(()=>{result.current.close();result.current.close();});
    act(()=>{result.current.finish();result.current.finish();}); expect(exit).toHaveBeenCalledTimes(1);
  });
});