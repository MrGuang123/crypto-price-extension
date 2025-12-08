import { useEffect, useMemo, useState } from "react";
import { useSettings, type Settings, type RefreshMode } from "../hooks/useSettings";

const REFRESH_OPTIONS: { label: string; value: RefreshMode }[] = [
  { label: "不自动刷新", value: "none" },
  { label: "手动刷新", value: "manual" },
  { label: "自动刷新", value: "auto" },
];

const INTERVAL_OPTIONS = [1, 5, 15, 30, 60];

const CURRENCY_OPTIONS: Settings["currency"][] = ["USD", "CNY", "USDT", "USDC", "EUR"];

export function SettingsPanel() {
  const [settings, updateSettings, loading] = useSettings();
  const [draft, setDraft] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const canAutoInterval = useMemo(() => draft.refreshMode === "auto", [draft.refreshMode]);

  const handleSave = () => {
    setSaving(true);
    updateSettings(draft);
    setSaving(false);
    setSavedAt(Date.now());
  };

  return (
    <div className="settings-card">
      <div className="settings-header">
        <div>
          <div className="settings-title">设置</div>
          <div className="settings-subtitle">刷新频率 / 价格单位 / 通知偏好</div>
        </div>
        {savedAt && <div className="saved-tip">已保存</div>}
      </div>

      {loading ? (
        <div className="settings-row">加载中...</div>
      ) : (
        <>
          <div className="settings-row">
            <label>刷新模式</label>
            <select
              value={draft.refreshMode}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, refreshMode: e.target.value as RefreshMode }))
              }
            >
              {REFRESH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {canAutoInterval && (
            <div className="settings-row">
              <label>自动刷新间隔 (分钟)</label>
              <select
                value={draft.refreshIntervalMinutes}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    refreshIntervalMinutes: Number(e.target.value),
                  }))
                }
              >
                {INTERVAL_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} 分钟
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="settings-row">
            <label>价格单位</label>
            <select
              value={draft.currency}
              onChange={(e) => setDraft((prev) => ({ ...prev, currency: e.target.value as Settings["currency"] }))}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-group-title">通知偏好</div>

          <label className="settings-row checkbox">
            <input
              type="checkbox"
              checked={draft.notifications.enableDesktop}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  notifications: { ...prev.notifications, enableDesktop: e.target.checked },
                }))
              }
            />
            <span>允许桌面通知</span>
          </label>

          <label className="settings-row checkbox">
            <input
              type="checkbox"
              checked={draft.notifications.enableBadge}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  notifications: { ...prev.notifications, enableBadge: e.target.checked },
                }))
              }
            />
            <span>启用 badge / 图标提醒</span>
          </label>

          <label className="settings-row checkbox">
            <input
              type="checkbox"
              checked={draft.notifications.enableSound}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  notifications: { ...prev.notifications, enableSound: e.target.checked },
                }))
              }
            />
            <span>启用声音</span>
          </label>

          <div className="settings-row">
            <label>通知频率限制 (分钟)</label>
            <input
              type="number"
              min={0}
              value={draft.notifications.throttleMinutes}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  notifications: {
                    ...prev.notifications,
                    throttleMinutes: Number(e.target.value),
                  },
                }))
              }
            />
          </div>

          <div className="settings-actions">
            <button className="primary-btn" onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存设置"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

