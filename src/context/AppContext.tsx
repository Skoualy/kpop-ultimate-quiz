import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { GameConfig, Group, Idol, Label } from '../types';
import { DEFAULT_GAME_CONFIG } from '../types';
import { ALL_GROUPS, ALL_IDOLS, ALL_LABELS } from '../services/dataService';

// ─── Dataset store ────────────────────────────────────────────────────────────

interface DatasetState {
  groups: Group[];
  idols: Idol[];
  labels: Label[];
  addGroup: (group: Group) => void;
  updateGroup: (group: Group) => void;
  addOrUpdateIdols: (idols: Idol[]) => void;
}

interface AppContextValue extends DatasetState {
  config: GameConfig;
  setConfig: (update: Partial<GameConfig>) => void;
  resetConfig: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<GameConfig>(() => {
    try {
      const saved = localStorage.getItem('kpopquiz-config');
      if (saved) return { ...DEFAULT_GAME_CONFIG, ...JSON.parse(saved) };
    } catch {
      /* ignore */
    }
    return DEFAULT_GAME_CONFIG;
  });

  const [groups, setGroups] = useState<Group[]>(ALL_GROUPS);
  const [idols, setIdols] = useState<Idol[]>(ALL_IDOLS);
  const labels = ALL_LABELS;

  const setConfig = useCallback((update: Partial<GameConfig>) => {
    setConfigState((prev) => {
      const next = { ...prev, ...update };
      try {
        localStorage.setItem('kpopquiz-config', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    setConfigState(DEFAULT_GAME_CONFIG);
    localStorage.removeItem('kpopquiz-config');
  }, []);

  const addGroup = useCallback((group: Group) => {
    setGroups((prev) => [...prev.filter((g) => g.id !== group.id), group]);
  }, []);

  const updateGroup = useCallback((group: Group) => {
    setGroups((prev) => prev.map((g) => (g.id === group.id ? group : g)));
  }, []);

  const addOrUpdateIdols = useCallback((newIdols: Idol[]) => {
    setIdols((prev) => {
      const map = new Map(prev.map((i) => [i.id, i]));
      for (const idol of newIdols) map.set(idol.id, idol);
      return Array.from(map.values());
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        config,
        setConfig,
        resetConfig,
        groups,
        idols,
        labels,
        addGroup,
        updateGroup,
        addOrUpdateIdols,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
