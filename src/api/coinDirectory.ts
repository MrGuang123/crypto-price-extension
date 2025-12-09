export type CoinDirectoryItem = {
  id: string;
  symbol: string;
  name: string;
  priceUsd?: number;
  change24h?: number;
  image?: string;
};

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const HOT_PER_PAGE = 10;
const SEARCH_FETCH_LIMIT = 50; // 先取 50 个命中，再本地分页
const ALL_PER_PAGE = 10;

async function safeFetchJson<T>(
  url: string
): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchHotCoins(
  page: number,
  perPage = HOT_PER_PAGE
): Promise<CoinDirectoryItem[]> {
  const p = Math.max(1, page);
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${p}&sparkline=false&price_change_percentage=24h`;
  const data = await safeFetchJson<
    Array<{
      id: string;
      symbol: string;
      name: string;
      current_price: number;
      price_change_percentage_24h: number;
      image?: string;
    }>
  >(url);
  if (!data) return [];
  return data.map((d) => ({
    id: d.id,
    symbol: d.symbol?.toUpperCase() ?? "",
    name: d.name ?? d.id,
    priceUsd: d.current_price,
    change24h: d.price_change_percentage_24h,
    image: d.image,
  }));
}

export async function fetchAllCoinsPage(
  page: number,
  perPage = ALL_PER_PAGE
): Promise<CoinDirectoryItem[]> {
  const p = Math.max(1, page);
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${p}&sparkline=false&price_change_percentage=24h`;
  const data = await safeFetchJson<
    Array<{
      id: string;
      symbol: string;
      name: string;
      current_price: number;
      price_change_percentage_24h: number;
      image?: string;
    }>
  >(url);
  if (!data) return [];
  return data.map((d) => ({
    id: d.id,
    symbol: d.symbol?.toUpperCase() ?? "",
    name: d.name ?? d.id,
    priceUsd: d.current_price,
    change24h: d.price_change_percentage_24h,
    image: d.image,
  }));
}

export async function searchCoins(
  query: string
): Promise<CoinDirectoryItem[]> {
  const q = query.trim();
  if (!q) return [];
  const searchUrl = `${COINGECKO_BASE}/search?query=${encodeURIComponent(
    q
  )}`;
  const data = await safeFetchJson<{
    coins?: Array<{
      id: string;
      name: string;
      symbol: string;
      large?: string;
    }>;
  }>(searchUrl);
  if (!data?.coins?.length) return [];

  const topCoins = data.coins.slice(0, SEARCH_FETCH_LIMIT);
  const ids = topCoins.map((c) => c.id).join(",");
  if (!ids) return [];

  const marketsUrl = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(
    ids
  )}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`;
  const markets = await safeFetchJson<
    Array<{
      id: string;
      symbol: string;
      name: string;
      current_price: number;
      price_change_percentage_24h: number;
      image?: string;
    }>
  >(marketsUrl);

  if (!markets?.length) {
    // 回退：仅返回 id/name/symbol
    return topCoins.map((c) => ({
      id: c.id,
      symbol: c.symbol?.toUpperCase() ?? "",
      name: c.name ?? c.id,
      priceUsd: undefined,
      change24h: undefined,
      image: c.large,
    }));
  }

  // 保持搜索结果的相对顺序
  const map = new Map(markets.map((m) => [m.id, m]));
  return topCoins
    .map((c) => {
      const m = map.get(c.id);
      return {
        id: c.id,
        symbol: c.symbol?.toUpperCase() ?? "",
        name: c.name ?? c.id,
        priceUsd: m?.current_price,
        change24h: m?.price_change_percentage_24h,
        image: m?.image ?? c.large,
      };
    })
    .filter(Boolean);
}
