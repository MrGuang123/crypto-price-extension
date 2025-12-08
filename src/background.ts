import { getPriceWithFallback } from "./api/priceApiWithFallback";
import { checkAlerts } from "./alerts/alertManager";
import type { Settings } from "./hooks/useSettings";
import type { CoinInfo } from "./hooks/useWatchList";

const WATCHLIST_KEY = "watchList";
const SETTINGS_KEY = "settings";
const TICKER_SNAPSHOT_KEY = "tickerSnapshot";

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

async function readFromStorage<T>(
  key: string
): Promise<T | null> {
  try {
    const data = await new Promise<Record<string, T>>(
      (resolve) => {
        chrome.storage.local.get(key, (items) =>
          resolve(items as Record<string, T>)
        );
      }
    );
    return data?.[key] ?? null;
  } catch {
    return null;
  }
}

async function writeToStorage<T>(
  key: string,
  value: T
): Promise<void> {
  try {
    await new Promise<void>((resolve) =>
      chrome.storage.local.set({ [key]: value }, () =>
        resolve()
      )
    );
  } catch {
    // ignore
  }
}

async function loadWatchList(): Promise<CoinInfo[]> {
  const list = await readFromStorage<CoinInfo[]>(
    WATCHLIST_KEY
  );
  return Array.isArray(list) ? list : [];
}

async function loadSettings(): Promise<Settings> {
  const settings = await readFromStorage<Settings>(
    SETTINGS_KEY
  );
  if (!settings) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...settings.notifications,
    },
  };
}

type TickerItem = {
  coin: CoinInfo;
  priceUsd?: number;
  change24h?: number;
  timestamp?: number;
};

async function fetchTickerSnapshot(): Promise<
  TickerItem[]
> {
  const watchList = await loadWatchList();
  const top = watchList.slice(0, 3);
  if (!top.length) return [];

  const results = await Promise.all(
    top.map(async (coin) => {
      const info = await getPriceWithFallback(
        coin.id || coin.symbol
      );
      return {
        coin,
        priceUsd: info?.priceUsd,
        change24h: info?.change24h,
        timestamp: info?.timestamp,
      } as TickerItem;
    })
  );
  await writeToStorage(TICKER_SNAPSHOT_KEY, results);
  return results;
}

function formatBadgeText(item?: TickerItem): {
  text: string;
  color: string;
} {
  if (!item || typeof item.priceUsd !== "number")
    return { text: "", color: "#94a3b8" };
  const change = item.change24h ?? 0;
  if (Math.abs(change) >= 5) {
    return {
      text: change > 0 ? "↑!" : "↓!",
      color: change > 0 ? "#16a34a" : "#dc2626",
    };
  }
  const price = item.priceUsd;
  const text =
    price >= 1000
      ? `${Math.round(price / 1000)}k`
      : price >= 1
      ? `${Math.round(price)}`
      : price.toPrecision(3);
  const color =
    change > 0
      ? "#16a34a"
      : change < 0
      ? "#dc2626"
      : "#475569";
  return { text, color };
}

async function updateBadge(): Promise<void> {
  const settings = await loadSettings();
  if (!settings.notifications.enableBadge) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }
  const snapshot = await fetchTickerSnapshot();
  if (!snapshot.length) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }
  const primary = snapshot[0];
  const { text, color } = formatBadgeText(primary);
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

async function maybeScheduleAlarm() {
  const settings = await loadSettings();
  if (settings.refreshMode !== "auto") {
    chrome.alarms.clear("ticker-refresh");
    return;
  }
  const period = Math.max(
    1,
    settings.refreshIntervalMinutes
  );
  chrome.alarms.create("ticker-refresh", {
    periodInMinutes: period,
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  await maybeScheduleAlarm();
  await updateBadge();
  await checkAlerts();
});

chrome.runtime.onStartup.addListener(async () => {
  await maybeScheduleAlarm();
  await updateBadge();
  await checkAlerts();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "ticker-refresh") {
    await updateBadge();
    await checkAlerts();
  }
});

chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    if (message?.type === "forceTickerUpdate") {
      updateBadge()
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }
    if (message?.type === "getTickerSnapshot") {
      (async () => {
        const snapshot =
          (await readFromStorage<TickerItem[]>(
            TICKER_SNAPSHOT_KEY
          )) ?? [];
        if (!snapshot.length) {
          const fetched = await fetchTickerSnapshot();
          sendResponse({ snapshot: fetched });
        } else {
          sendResponse({ snapshot });
        }
      })();
      return true;
    }
    return undefined;
  }
);
