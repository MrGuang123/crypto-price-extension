import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import "./App.css";
import {
  useWatchList,
  useSettings,
  type CoinInfo,
} from "./hooks";
import {
  getPriceWithFallback,
  type PriceInfo,
} from "./api/priceApiWithFallback";
import {
  AlertSettingsForm,
  SettingsPanel,
} from "./components";
import {
  getAlertRules,
  type AlertRule,
} from "./alerts/alertManager";

type PriceState = {
  loading: boolean;
  priceUsd?: number;
  change24h?: number;
  error?: string;
  timestamp?: number;
};

const DEFAULT_COINS: CoinInfo[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
];

function currencySymbol(currency: string) {
  switch (currency) {
    case "CNY":
      return "¥";
    case "EUR":
      return "€";
    case "USDT":
    case "USDC":
    case "USD":
    default:
      return "$";
  }
}

function formatPrice(value?: number, currency?: string) {
  if (typeof value !== "number") return "—";
  const sym = currencySymbol(currency ?? "USD");
  if (value >= 1)
    return `${sym}${value.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    })}`;
  return `${sym}${value.toPrecision(4)}`;
}

function formatChange(change?: number) {
  if (typeof change !== "number") return "—";
  const fixed = change.toFixed(2);
  return `${change > 0 ? "+" : ""}${fixed}%`;
}

function CoinIcon({ coin }: { coin: CoinInfo }) {
  if (coin.iconUrl) {
    return (
      <img
        className="coin-icon"
        src={coin.iconUrl}
        alt={coin.name}
      />
    );
  }
  return (
    <div className="coin-icon placeholder" aria-hidden>
      {coin.symbol?.slice(0, 1)?.toUpperCase() ?? "?"}
    </div>
  );
}

function App() {
  const [watchList, addCoin, removeCoin] = useWatchList();
  const [settings] = useSettings();
  const [prices, setPrices] = useState<
    Record<string, PriceState>
  >({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alertRules, setAlertRules] = useState<
    Record<string, AlertRule[]>
  >({});
  const [activeCoin, setActiveCoin] =
    useState<CoinInfo | null>(null);
  const [tab, setTab] = useState<
    "watch" | "all" | "settings"
  >("watch");
  const [input, setInput] = useState("");

  const loadAlertRules = useCallback(async () => {
    const rules = await getAlertRules();
    const grouped: Record<string, AlertRule[]> = {};
    rules.forEach((rule) => {
      if (!grouped[rule.coinId]) grouped[rule.coinId] = [];
      grouped[rule.coinId].push(rule);
    });
    setAlertRules(grouped);
  }, []);

  const sortedList = useMemo(
    () =>
      [...watchList].sort((a, b) =>
        a.symbol.localeCompare(b.symbol)
      ),
    [watchList]
  );

  const refreshAll = useCallback(
    async (list: CoinInfo[]) => {
      if (!list.length) {
        setPrices({});
        return;
      }
      setIsRefreshing(true);
      setPrices((prev) => {
        const next = { ...prev };
        list.forEach((coin) => {
          next[coin.id] = {
            ...next[coin.id],
            loading: true,
            error: undefined,
          };
        });
        return next;
      });

      const results = await Promise.all(
        list.map(async (coin) => {
          const info = await getPriceWithFallback(
            coin.id || coin.symbol
          );
          return { coinId: coin.id, info };
        })
      );

      setPrices((prev) => {
        const next = { ...prev };
        results.forEach(({ coinId, info }) => {
          if (!info) {
            next[coinId] = {
              loading: false,
              error: "Error",
            };
            return;
          }
          const { priceUsd, change24h, timestamp } =
            info as PriceInfo;
          next[coinId] = {
            loading: false,
            priceUsd,
            change24h,
            timestamp,
          };
        });
        return next;
      });
      setIsRefreshing(false);
    },
    []
  );

  useEffect(() => {
    const id = setTimeout(() => {
      void refreshAll(watchList);
    }, 0);
    return () => clearTimeout(id);
  }, [watchList, refreshAll]);

  useEffect(() => {
    const id = setTimeout(() => {
      void loadAlertRules();
    }, 0);
    return () => clearTimeout(id);
  }, [loadAlertRules]);

  useEffect(() => {
    if (watchList.length === 0) {
      DEFAULT_COINS.forEach((c) => addCoin(c));
    }
  }, [watchList.length, addCoin]);

  useEffect(() => {
    if (settings.refreshMode === "auto") {
      const ms =
        Math.max(1, settings.refreshIntervalMinutes) *
        60 *
        1000;
      const id = setInterval(
        () => refreshAll(watchList),
        ms
      );
      return () => clearInterval(id);
    }
    return undefined;
  }, [
    settings.refreshMode,
    settings.refreshIntervalMinutes,
    watchList,
    refreshAll,
  ]);

  const handleAdd = () => {
    const value = input.trim();
    if (!value) return;
    const lower = value.toLowerCase();
    if (
      watchList.some(
        (c) =>
          c.id === lower || c.symbol.toLowerCase() === lower
      )
    ) {
      setInput("");
      return;
    }
    addCoin({
      id: lower,
      symbol: value.toUpperCase(),
      name: value,
    });
    setInput("");
    refreshAll([
      ...watchList,
      {
        id: lower,
        symbol: value.toUpperCase(),
        name: value,
      },
    ]);
  };

  return (
    <div className="popup">
      <header className="header">
        <div>
          <h1 className="title">Crypto Price Watcher</h1>
          <p className="subtitle">快速查看与提醒</p>
        </div>
        <button
          className="refresh-btn"
          onClick={() => refreshAll(watchList)}
          disabled={isRefreshing || watchList.length === 0}
        >
          {isRefreshing ? "Refreshing..." : "Refresh Now"}
        </button>
      </header>

      <div className="tabs">
        <button
          className={`tab-btn ${
            tab === "watch" ? "active" : ""
          }`}
          onClick={() => setTab("watch")}
        >
          Watch-list
        </button>
        <button
          className={`tab-btn ${
            tab === "all" ? "active" : ""
          }`}
          onClick={() => setTab("all")}
        >
          All Coins
        </button>
        <button
          className={`tab-btn ${
            tab === "settings" ? "active" : ""
          }`}
          onClick={() => setTab("settings")}
        >
          Settings
        </button>
      </div>

      {tab === "watch" && (
        <>
          <div className="add-bar">
            <input
              className="add-input"
              placeholder="输入 coin id 或 symbol，如 bitcoin / eth"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
            <button
              className="primary-btn"
              onClick={handleAdd}
            >
              添加
            </button>
          </div>

          {sortedList.length === 0 ? (
            <div className="empty">
              暂无关注币种，请先添加。
            </div>
          ) : (
            <div className="list">
              {sortedList.map((coin) => {
                const state = prices[coin.id];
                const hasAlert =
                  !!alertRules[coin.id]?.length;
                const changeClass =
                  typeof state?.change24h === "number"
                    ? state.change24h > 0
                      ? "positive"
                      : state.change24h < 0
                      ? "negative"
                      : ""
                    : "";
                return (
                  <div className="row" key={coin.id}>
                    <CoinIcon coin={coin} />
                    <div className="info">
                      <div className="name">
                        {coin.name}{" "}
                        <span className="symbol">
                          {coin.symbol}
                        </span>
                      </div>
                      <div className="meta">
                        <span className="price">
                          {state?.loading
                            ? "Loading..."
                            : formatPrice(
                                state?.priceUsd,
                                settings.currency
                              )}
                        </span>
                        <span
                          className={`change ${changeClass}`}
                        >
                          {state?.loading
                            ? ""
                            : formatChange(
                                state?.change24h
                              )}
                        </span>
                      </div>
                    </div>
                    <div className="status">
                      {state?.loading && (
                        <span className="badge">
                          fetching
                        </span>
                      )}
                      {state?.error && (
                        <span className="badge error">
                          {state.error}
                        </span>
                      )}
                      {!state && (
                        <span className="badge muted">
                          idle
                        </span>
                      )}
                      {hasAlert && (
                        <span className="badge alert">
                          已设提醒
                        </span>
                      )}
                      <button
                        className="alert-btn"
                        onClick={() => setActiveCoin(coin)}
                      >
                        🔔{" "}
                        {hasAlert ? "编辑提醒" : "设置提醒"}
                      </button>
                      <button
                        className="text-btn"
                        onClick={() => removeCoin(coin.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "all" && (
        <div className="card">
          <p className="subtitle">
            输入想添加的币种 ID 或 symbol，点击添加
          </p>
          <div className="add-bar">
            <input
              className="add-input"
              placeholder="如 bitcoin / eth / sol"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
            <button
              className="primary-btn"
              onClick={handleAdd}
            >
              添加
            </button>
          </div>
          <p className="note">
            后续可接入全量列表/搜索 API。
          </p>
        </div>
      )}

      {tab === "settings" && (
        <div className="card">
          <SettingsPanel />
        </div>
      )}

      {activeCoin && (
        <div className="alert-modal">
          <AlertSettingsForm
            coin={activeCoin}
            onClose={() => setActiveCoin(null)}
            onSaved={loadAlertRules}
            onRemoved={loadAlertRules}
          />
        </div>
      )}
    </div>
  );
}

export default App;
