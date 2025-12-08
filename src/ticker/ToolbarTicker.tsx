import type { CoinInfo } from "../hooks";
import "./toolbarTicker.css";

export type TickerEntry = {
  coin: CoinInfo;
  priceUsd?: number;
  change24h?: number;
  loading?: boolean;
};

function formatPrice(value?: number) {
  if (typeof value !== "number") return "—";
  if (value >= 1) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${value.toPrecision(4)}`;
}

function formatChange(change?: number) {
  if (typeof change !== "number") return "—";
  const fixed = change.toFixed(2);
  return `${change > 0 ? "+" : ""}${fixed}%`;
}

export function ToolbarTicker({ entries }: { entries: TickerEntry[] }) {
  return (
    <div className="ticker-card">
      <div className="ticker-header">Quick View</div>
      {entries.length === 0 ? (
        <div className="ticker-empty">暂无优先币种</div>
      ) : (
        <div className="ticker-list">
          {entries.map((item) => {
            const changeClass =
              typeof item.change24h === "number"
                ? item.change24h > 0
                  ? "pos"
                  : item.change24h < 0
                    ? "neg"
                    : ""
                : "";
            return (
              <div className="ticker-row" key={item.coin.id}>
                <div className="ticker-name">
                  {item.coin.symbol} <span className="ticker-sub">{item.coin.name}</span>
                </div>
                <div className="ticker-meta">
                  <span>{item.loading ? "..." : formatPrice(item.priceUsd)}</span>
                  <span className={`ticker-change ${changeClass}`}>
                    {item.loading ? "" : formatChange(item.change24h)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

