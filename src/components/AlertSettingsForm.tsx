import { useEffect, useState } from "react";
import type { CoinInfo } from "../hooks";
import {
  getRulesForCoin,
  removeAlertRule,
  upsertAlertRule,
  type AlertRule,
  type AlertType,
} from "../alerts/alertManager";

type Props = {
  coin: CoinInfo;
  onClose: () => void;
  onSaved?: () => void;
  onRemoved?: () => void;
};

const ALERT_TYPE_OPTIONS: {
  label: string;
  value: AlertType;
}[] = [
  { label: "价格 ≥", value: "price_gte" },
  { label: "价格 ≤", value: "price_lte" },
  { label: "24h 涨跌 ≥", value: "change24h_gte" },
  { label: "24h 涨跌 ≤", value: "change24h_lte" },
];

export function AlertSettingsForm({
  coin,
  onClose,
  onSaved,
  onRemoved,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentRule, setCurrentRule] =
    useState<AlertRule | null>(null);
  const [type, setType] = useState<AlertType>("price_gte");
  const [threshold, setThreshold] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const rules = await getRulesForCoin(coin.id);
      if (!cancelled && rules.length > 0) {
        const rule = rules[0];
        setCurrentRule(rule);
        setType(rule.type);
        setThreshold(rule.threshold);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [coin.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number.isNaN(threshold)) {
      setError("请输入数值阈值");
      return;
    }
    setSaving(true);
    setError(null);
    const next = await upsertAlertRule({
      id: currentRule?.id,
      coinId: coin.id,
      type,
      threshold,
    });
    setCurrentRule(next);
    setSaving(false);
    onSaved?.();
    onClose();
  };

  const handleRemove = async () => {
    if (!currentRule) {
      onClose();
      return;
    }
    setSaving(true);
    await removeAlertRule(currentRule.id);
    setSaving(false);
    setCurrentRule(null);
    onRemoved?.();
    onClose();
  };

  return (
    <form className="alert-form" onSubmit={handleSave}>
      <div className="alert-form-header">
        <div>
          <div className="alert-title">
            为 {coin.symbol} 设置提醒
          </div>
          <div className="alert-subtitle">
            选择条件与阈值
          </div>
        </div>
        <button
          type="button"
          className="text-btn"
          onClick={onClose}
        >
          关闭
        </button>
      </div>

      {loading ? (
        <div className="alert-row">加载中...</div>
      ) : (
        <>
          <label className="alert-row">
            <span>条件</span>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as AlertType)
              }
            >
              {ALERT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="alert-row">
            <span>阈值</span>
            <input
              type="number"
              step="any"
              value={
                Number.isNaN(threshold) ? "" : threshold
              }
              onChange={(e) =>
                setThreshold(Number(e.target.value))
              }
              placeholder="数值，例如 50000"
            />
          </label>

          {error && (
            <div className="alert-error">{error}</div>
          )}

          <div className="alert-actions">
            {currentRule && (
              <button
                type="button"
                className="danger-btn"
                onClick={handleRemove}
                disabled={saving}
              >
                删除提醒
              </button>
            )}
            <div className="alert-actions-right">
              <button
                type="button"
                className="text-btn"
                onClick={onClose}
                disabled={saving}
              >
                取消
              </button>
              <button
                type="submit"
                className="primary-btn"
                disabled={saving}
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </>
      )}
    </form>
  );
}
