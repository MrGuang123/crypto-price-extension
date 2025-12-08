import { useCallback, useEffect, useState } from "react";

export type RefreshMode = "none" | "manual" | "auto";

export type Settings = {
  refreshMode: RefreshMode;
  refreshIntervalMinutes: number; // 当 refreshMode === "auto" 时生效
  currency: "USD" | "CNY" | "USDT" | "USDC" | "EUR";
  notifications: {
    enableDesktop: boolean;
    enableBadge: boolean;
    enableSound: boolean;
    throttleMinutes: number; // 防止频繁通知
  };
};

const DEFAULT_SETTINGS: Settings = {
  refreshMode: "manual",
  refreshIntervalMinutes: 5,
  currency: "USD",
  notifications: {
    enableDesktop: true,
    enableBadge: true,
    enableSound: false,
    throttleMinutes: 5,
  },
};

const STORAGE_KEY = "settings";
const hasChromeStorage =
  typeof chrome !== "undefined" &&
  !!chrome.storage &&
  !!chrome.storage.local;

async function readFromChrome(): Promise<Settings | null> {
  if (!hasChromeStorage) return null;
  try {
    const data = await new Promise<
      Record<string, Settings>
    >((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (items) =>
        resolve(items as Record<string, Settings>)
      );
    });
    return data?.[STORAGE_KEY] ?? null;
  } catch {
    return null;
  }
}

function readFromLocal(): Settings | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Settings;
  } catch {
    return null;
  }
}

async function writeToChrome(
  settings: Settings
): Promise<void> {
  if (!hasChromeStorage) return;
  try {
    await new Promise<void>((resolve) => {
      chrome.storage.local.set(
        { [STORAGE_KEY]: settings },
        () => resolve()
      );
    });
  } catch {
    // ignore
  }
}

function writeToLocal(settings: Settings): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settings)
    );
  } catch {
    // ignore
  }
}

async function loadSettings(): Promise<Settings> {
  const fromChrome = await readFromChrome();
  if (fromChrome)
    return { ...DEFAULT_SETTINGS, ...fromChrome };
  const fromLocal = readFromLocal();
  if (fromLocal)
    return { ...DEFAULT_SETTINGS, ...fromLocal };
  return DEFAULT_SETTINGS;
}

function persist(settings: Settings) {
  void writeToChrome(settings);
  writeToLocal(settings);
}

export function useSettings(): [
  Settings,
  (next: Partial<Settings>) => void,
  boolean
] {
  const [settings, setSettings] = useState<Settings>(
    DEFAULT_SETTINGS
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadSettings().then((loaded) => {
      if (!cancelled) {
        setSettings(loaded);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback(
    (next: Partial<Settings>) => {
      setSettings((prev) => {
        const merged: Settings = {
          ...prev,
          ...next,
          notifications: {
            ...prev.notifications,
            ...(next.notifications ?? {}),
          },
        };
        // 确保间隔为正
        if (merged.refreshIntervalMinutes <= 0) {
          merged.refreshIntervalMinutes =
            DEFAULT_SETTINGS.refreshIntervalMinutes;
        }
        if (merged.notifications.throttleMinutes < 0) {
          merged.notifications.throttleMinutes = 0;
        }
        persist(merged);
        return merged;
      });
    },
    []
  );

  return [settings, updateSettings, loading];
}
