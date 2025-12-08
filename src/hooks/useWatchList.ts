import { useCallback, useEffect, useState } from "react";

export type CoinInfo = {
  id: string;
  symbol: string;
  name: string;
  iconUrl?: string;
};

const STORAGE_KEY = "watchList";

const hasChromeStorage =
  typeof chrome !== "undefined" && !!chrome.storage && !!chrome.storage.local;

async function readFromChromeStorage(): Promise<CoinInfo[] | null> {
  if (!hasChromeStorage) return null;
  try {
    const data = await new Promise<Record<string, CoinInfo[]>>((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (items) =>
        resolve(items as Record<string, CoinInfo[]>),
      );
    });
    const value = data?.[STORAGE_KEY] as CoinInfo[] | undefined;
    if (Array.isArray(value)) return value;
    return null;
  } catch {
    return null;
  }
}

function readFromLocalStorage(): CoinInfo[] | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function writeToChromeStorage(list: CoinInfo[]): Promise<void> {
  if (!hasChromeStorage) return;
  try {
    await new Promise<void>((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: list }, () => resolve());
    });
  } catch {
    // ignore
  }
}

function writeToLocalStorage(list: CoinInfo[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

async function loadWatchList(): Promise<CoinInfo[]> {
  const fromChrome = await readFromChromeStorage();
  if (fromChrome) return fromChrome;

  const fromLocal = readFromLocalStorage();
  if (fromLocal) return fromLocal;

  return [];
}

function persistWatchList(list: CoinInfo[]): void {
  void writeToChromeStorage(list);
  writeToLocalStorage(list);
}

export function useWatchList(): [
  CoinInfo[],
  (coin: CoinInfo) => void,
  (coinId: string) => void,
] {
  const [watchList, setWatchList] = useState<CoinInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadWatchList().then((list) => {
      if (!cancelled) setWatchList(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const addCoin = useCallback((coin: CoinInfo) => {
    setWatchList((prev) => {
      if (prev.some((c) => c.id === coin.id)) return prev;
      const next = [...prev, coin];
      persistWatchList(next);
      return next;
    });
  }, []);

  const removeCoin = useCallback((coinId: string) => {
    setWatchList((prev) => {
      const next = prev.filter((c) => c.id !== coinId);
      if (next.length === prev.length) return prev;
      persistWatchList(next);
      return next;
    });
  }, []);

  return [watchList, addCoin, removeCoin];
}

