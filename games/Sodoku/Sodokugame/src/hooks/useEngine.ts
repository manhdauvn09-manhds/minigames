import { createContext, useContext } from 'react';
import type { EngineClient } from '../lib/engine';

export const EngineContext = createContext<EngineClient | null>(null);

export function useEngine(): EngineClient {
  const e = useContext(EngineContext);
  if (!e) throw new Error('useEngine: missing <EngineProvider> ancestor');
  return e;
}
