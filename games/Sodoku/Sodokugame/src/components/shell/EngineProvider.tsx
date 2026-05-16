import { type ReactNode, useEffect, useState } from 'react';
import { EngineClient } from '../../lib/engine';
import { EngineContext } from '../../hooks/useEngine';

/** Singleton EngineClient for the app lifetime. Terminates the worker
 * on unmount so the SPA shutdown is clean (e.g. during HMR). */
export function EngineProvider({ children }: { children: ReactNode }) {
  const [engine, setEngine] = useState<EngineClient | null>(null);

  useEffect(() => {
    const e = new EngineClient();
    setEngine(e);
    return () => e.terminate();
  }, []);

  if (!engine) return null;
  return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>;
}
