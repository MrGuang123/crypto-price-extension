import { getPriceInfo, type PriceInfo } from "./priceApi";

export type { PriceInfo };

const CACHE_TTL_MS = 30_000;
const FETCH_TIMEOUT_MS = 8_000;

type CacheEntry = {
  value: PriceInfo | null;
  timestamp: number;
  pending?: Promise<PriceInfo | null>;
};

const cache = new Map<string, CacheEntry>();

async function fetchWithTimeout<T>(
  url: string
): Promise<T | null> {
  const controller = new AbortController();
  const id = setTimeout(
    () => controller.abort(),
    FETCH_TIMEOUT_MS
  );
  try {
    const res = await fetch(url, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

async function fetchFromCoinPaprika(
  coinIdOrSymbol: string
): Promise<PriceInfo | null> {
  const query = encodeURIComponent(coinIdOrSymbol.trim());
  // 1) 直接尝试 ticker id
  const tickerUrl = `https://api.coinpaprika.com/v1/tickers/${query}`;
  const ticker = await fetchWithTimeout<{
    id: string;
    name: string;
    symbol: string;
    quotes: {
      USD?: {
        price?: number;
        percent_change_24h?: number;
        last_updated?: string;
      };
    };
  }>(tickerUrl);

  const parseTicker = (
    data: typeof ticker
  ): PriceInfo | null => {
    if (!data) return null;
    const price = data.quotes?.USD?.price;
    const change24h = data.quotes?.USD?.percent_change_24h;
    if (
      typeof price !== "number" ||
      typeof change24h !== "number"
    )
      return null;
    const tsRaw = data.quotes?.USD?.last_updated;
    const ts = tsRaw ? Date.parse(tsRaw) : Date.now();
    return {
      id: data.id,
      symbol: data.symbol?.toUpperCase() ?? "",
      name: data.name ?? data.symbol ?? data.id,
      priceUsd: price,
      change24h,
      timestamp: Number.isNaN(ts) ? Date.now() : ts,
    };
  };

  const direct = parseTicker(ticker);
  if (direct) return direct;

  // 2) search 兜底找到第一个匹配 id 再取 ticker
  const searchUrl = `https://api.coinpaprika.com/v1/search?q=${query}&c=currencies,coins,fiats&limit=1`;
  const search = await fetchWithTimeout<{
    currencies?: Array<{ id: string }>;
  }>(searchUrl);
  const firstId = search?.currencies?.[0]?.id;
  if (!firstId) return null;
  const ticker2 = await fetchWithTimeout<typeof ticker>(
    `https://api.coinpaprika.com/v1/tickers/${encodeURIComponent(
      firstId
    )}`
  );
  return parseTicker(ticker2);
}

function getFreshFromCache(
  coinId: string
): PriceInfo | null | undefined {
  const entry = cache.get(coinId);
  if (!entry) return undefined;
  const age = Date.now() - entry.timestamp;
  if (age <= CACHE_TTL_MS) return entry.value;
  return undefined;
}

export async function getPriceWithFallback(
  coinIdOrSymbol: string
): Promise<PriceInfo | null> {
  if (!coinIdOrSymbol?.trim()) return null;

  const trimmedId = coinIdOrSymbol.trim();
  const cached = getFreshFromCache(trimmedId);
  if (cached !== undefined) return cached;

  const current = cache.get(trimmedId);
  if (current?.pending) return current.pending;

  const pending = (async () => {
    const primary = await getPriceInfo(trimmedId);
    if (primary) {
      cache.set(trimmedId, {
        value: primary,
        timestamp: Date.now(),
      });
      return primary;
    }

    const fallback = await fetchFromCoinPaprika(trimmedId);
    cache.set(trimmedId, {
      value: fallback,
      timestamp: Date.now(),
    });
    return fallback;
  })();

  cache.set(trimmedId, {
    value: current?.value ?? null,
    timestamp: current?.timestamp ?? 0,
    pending,
  });

  return pending;
}
