export type PriceInfo = {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
  timestamp: number;
};

type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
};

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

/**
 * 安全 fetch JSON，失败时返回 null。
 */
async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * 通过 search 接口将 symbol / id / 合约地址解析为 CoinGecko coin id。
 */
async function resolveCoinId(input: string): Promise<string | null> {
  const query = encodeURIComponent(input.trim());
  const searchUrl = `${COINGECKO_BASE}/search?query=${query}`;
  const data = await safeFetchJson<{
    coins?: Array<{ id: string; symbol: string; name: string; market_cap_rank?: number }>;
  }>(searchUrl);
  if (!data?.coins?.length) return null;

  const lowered = input.trim().toLowerCase();

  // 优先精确匹配 id 或 symbol，其次按市值排名排序后的第一个结果
  const exact =
    data.coins.find(
      (c) => c.id.toLowerCase() === lowered || c.symbol.toLowerCase() === lowered,
    ) ?? null;
  if (exact) return exact.id;

  // 回退：按市值排名最靠前的
  const sorted = [...data.coins].sort((a, b) => {
    const rankA = a.market_cap_rank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.market_cap_rank ?? Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
  });
  return sorted[0]?.id ?? null;
}

async function fetchMarketById(id: string): Promise<MarketCoin | null> {
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(
    id,
  )}&price_change_percentage=24h`;
  const data = await safeFetchJson<MarketCoin[]>(url);
  if (!data || data.length === 0) return null;
  const coin = data[0];
  if (
    !coin ||
    typeof coin.current_price !== "number" ||
    typeof coin.price_change_percentage_24h !== "number"
  ) {
    return null;
  }
  return coin;
}

/**
 * 获取单个币种的价格与 24h 涨跌数据。
 * @param coinIdOrSymbol coin id、symbol 或合约地址
 */
export async function getPriceInfo(coinIdOrSymbol: string): Promise<PriceInfo | null> {
  if (!coinIdOrSymbol?.trim()) return null;

  const resolvedId = await resolveCoinId(coinIdOrSymbol);
  if (!resolvedId) return null;

  const market = await fetchMarketById(resolvedId);
  if (!market) return null;

  return {
    id: market.id,
    symbol: market.symbol?.toUpperCase() ?? "",
    name: market.name ?? "",
    priceUsd: market.current_price,
    change24h: market.price_change_percentage_24h,
    timestamp: Date.now(),
  };
}

