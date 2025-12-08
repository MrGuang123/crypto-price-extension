import {
  getPriceWithFallback,
  type PriceInfo,
} from "../api/priceApiWithFallback";

export type AlertType =
  | "price_gte"
  | "price_lte"
  | "change24h_gte"
  | "change24h_lte";

export type AlertRule = {
  id: string;
  coinId: string;
  type: AlertType;
  threshold: number;
};

const ALERT_RULES_KEY = "alertRules";
const ALERT_NOTIFIED_KEY = "alertNotified";

const hasChromeStorage =
  typeof chrome !== "undefined" &&
  !!chrome.storage &&
  !!chrome.storage.local;
const hasChromeNotifications =
  typeof chrome !== "undefined" &&
  !!chrome.notifications &&
  typeof chrome.notifications.create === "function";

type NotifiedMap = Record<string, number>;

async function readFromChrome<T>(
  key: string
): Promise<T | null> {
  if (!hasChromeStorage) return null;
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

function readFromLocal<T>(key: string): T | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeToChrome<T>(
  key: string,
  value: T
): Promise<void> {
  if (!hasChromeStorage) return;
  try {
    await new Promise<void>((resolve) => {
      chrome.storage.local.set({ [key]: value }, () =>
        resolve()
      );
    });
  } catch {
    // ignore
  }
}

function writeToLocal<T>(key: string, value: T): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

async function loadRules(): Promise<AlertRule[]> {
  const fromChrome = await readFromChrome<AlertRule[]>(
    ALERT_RULES_KEY
  );
  if (Array.isArray(fromChrome)) return fromChrome;
  const fromLocal =
    readFromLocal<AlertRule[]>(ALERT_RULES_KEY);
  if (Array.isArray(fromLocal)) return fromLocal;
  return [];
}

async function saveRules(
  rules: AlertRule[]
): Promise<void> {
  await writeToChrome(ALERT_RULES_KEY, rules);
  writeToLocal(ALERT_RULES_KEY, rules);
}

async function loadNotified(): Promise<NotifiedMap> {
  const fromChrome = await readFromChrome<NotifiedMap>(
    ALERT_NOTIFIED_KEY
  );
  if (fromChrome && typeof fromChrome === "object")
    return fromChrome;
  const fromLocal = readFromLocal<NotifiedMap>(
    ALERT_NOTIFIED_KEY
  );
  if (fromLocal && typeof fromLocal === "object")
    return fromLocal;
  return {};
}

async function saveNotified(
  map: NotifiedMap
): Promise<void> {
  await writeToChrome(ALERT_NOTIFIED_KEY, map);
  writeToLocal(ALERT_NOTIFIED_KEY, map);
}

function ensureRuleId(
  rule: Omit<AlertRule, "id"> & { id?: string }
): AlertRule {
  return {
    ...rule,
    id:
      rule.id ||
      (typeof crypto !== "undefined" &&
      "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`),
  };
}

export async function getAlertRules(): Promise<
  AlertRule[]
> {
  return loadRules();
}

export async function getRulesForCoin(
  coinId: string
): Promise<AlertRule[]> {
  const rules = await loadRules();
  return rules.filter((r) => r.coinId === coinId);
}

export async function upsertAlertRule(
  rule: Omit<AlertRule, "id"> & { id?: string }
): Promise<AlertRule> {
  const nextRule = ensureRuleId(rule);
  const rules = await loadRules();
  const idx = rules.findIndex((r) => r.id === nextRule.id);
  if (idx >= 0) {
    rules[idx] = nextRule;
  } else {
    rules.push(nextRule);
  }
  await saveRules(rules);
  return nextRule;
}

export async function removeAlertRule(
  ruleId: string
): Promise<void> {
  const rules = await loadRules();
  const filtered = rules.filter((r) => r.id !== ruleId);
  if (filtered.length !== rules.length) {
    await saveRules(filtered);
  }
  const notified = await loadNotified();
  if (ruleId in notified) {
    delete notified[ruleId];
    await saveNotified(notified);
  }
}

function isTriggered(
  rule: AlertRule,
  info: PriceInfo
): boolean {
  switch (rule.type) {
    case "price_gte":
      return info.priceUsd >= rule.threshold;
    case "price_lte":
      return info.priceUsd <= rule.threshold;
    case "change24h_gte":
      return info.change24h >= rule.threshold;
    case "change24h_lte":
      return info.change24h <= rule.threshold;
    default:
      return false;
  }
}

async function sendNotification(
  rule: AlertRule,
  info: PriceInfo
) {
  const title = `${info.name} - 触发提醒`;
  const message = (() => {
    switch (rule.type) {
      case "price_gte":
        return `价格 ≥ $${
          rule.threshold
        }，当前 $${info.priceUsd.toFixed(2)}`;
      case "price_lte":
        return `价格 ≤ $${
          rule.threshold
        }，当前 $${info.priceUsd.toFixed(2)}`;
      case "change24h_gte":
        return `24h 涨跌 ≥ ${
          rule.threshold
        }% ，当前 ${info.change24h.toFixed(2)}%`;
      case "change24h_lte":
        return `24h 涨跌 ≤ ${
          rule.threshold
        }% ，当前 ${info.change24h.toFixed(2)}%`;
      default:
        return `${info.name} 触发提醒`;
    }
  })();

  const iconUrl = "icon.png";

  if (hasChromeNotifications) {
    try {
      await new Promise<void>((resolve, reject) => {
        chrome.notifications.create(
          {
            type: "basic",
            iconUrl,
            title,
            message,
            silent: false,
          },
          () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          }
        );
      });
      return;
    } catch {
      // fallback to Notification API
    }
  }

  if (typeof Notification !== "undefined") {
    if (Notification.permission === "granted") {
      new Notification(title, { body: message });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted")
          new Notification(title, { body: message });
      });
    }
  }
}

/**
 * 检查所有提醒规则，触发通知并返回已触发的规则列表。
 */
export async function checkAlerts(): Promise<AlertRule[]> {
  const rules = await loadRules();
  if (!rules.length) return [];

  const coinIds = Array.from(
    new Set(rules.map((r) => r.coinId))
  );
  const priceEntries = await Promise.all(
    coinIds.map(async (coinId) => {
      const info = await getPriceWithFallback(coinId);
      return [coinId, info] as const;
    })
  );
  const priceMap = Object.fromEntries(
    priceEntries
  ) as Record<string, PriceInfo | null>;

  const notified = await loadNotified();
  const triggered: AlertRule[] = [];

  for (const rule of rules) {
    const info = priceMap[rule.coinId];
    if (!info) {
      // 清除可能的通知锁，允许下次重试
      if (notified[rule.id]) delete notified[rule.id];
      continue;
    }
    const hit = isTriggered(rule, info);
    if (hit) {
      triggered.push(rule);
      if (!notified[rule.id]) {
        await sendNotification(rule, info);
        notified[rule.id] = Date.now();
      }
    } else if (notified[rule.id]) {
      delete notified[rule.id];
    }
  }

  await saveNotified(notified);
  return triggered;
}
