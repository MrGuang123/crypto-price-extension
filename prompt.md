🔧 Prompt 集合 — 用于插件不同模块

Prompt 1 — 项目基础 + manifest.json + 架构初始化

你是一个经验丰富的前端 + Chrome 扩展开发者。  
当前项目使用 React + Vite + TypeScript + Chrome Extension manifest v3。  
请帮我生成基础项目结构，以及初始配置文件。

输出以下内容：

- 一个 `manifest.json`，配置 extension 名称 “Crypto Price Watcher”，版本 0.1.0，manifest_version 3，action.default_popup 指向 React 打包后的 html (例如 index.html)，申请必要权限 (storage, notifications, fetch / host 权限用于调用公开 crypto price API)；
- 修改 `vite.config.ts`（或 `.js`）使构建输出适合 Chrome extension（base='./', outDir='dist'，以及资源路径正确）；
- 项目目录结构（文件夹 + 必要空文件 / placeholder） — 比如 public/, src/ , src/components, src/api, src/utils, src/types 等。

请以 code block 返回这些文件 (manifest.json, vite.config.ts, README.md 可选) / 目录结构说明。

⸻

Prompt 2 — API 接口模块 (获取加密货币价格)

模块名称: “price-fetch & API 接口模块”

需求:

- 使用 fetch (或其它适合浏览器环境的方法) 调用公共加密货币行情 API (例如 CoinGecko) —— 根据给定币种 symbol 或 contract address 请求当前价格 + 24h 涨跌百分比 + 最新时间戳 + 币种标识 + 币种名称 (和/或图标 url，如果 API 支持)
- 返回一个 Promise，返回类型为 `PriceInfo | null`，其中 `PriceInfo` 类型定义应为:

  type PriceInfo = {
  id: string; // 币种 id, e.g. 'bitcoin'
  symbol: string; // 币种 symbol, e.g. 'BTC'
  name: string; // 币种名称, e.g. 'Bitcoin'
  priceUsd: number; // 当前价格, USD
  change24h: number; // 最近 24 小时涨跌百分比
  timestamp: number; // fetch 返回时间戳 (ms)
  };

- 如果 API 返回错误 / 无该币种 / 网络失败 / 数据格式不符合预期 — 返回 null，并保证不抛未捕获异常
- 导出一个 async 函数 `getPriceInfo(coinIdOrSymbol: string): Promise<PriceInfo | null>`

输出格式: code block, 文件名 `src/api/priceApi.ts`。

⸻

Prompt 3 — Watch-list 逻辑 + 本地存储 (storage wrapper + custom hook)

模块名称: “watch-list 管理 + storage + React Hook”

需求:

- 定义 TypeScript 类型 `CoinInfo` (包括 id, symbol, name, 可选 iconUrl)
- 使用 Chrome 扩展 storage / localStorage（或你选择的 storage 机制）持久化用户的 watch-list — 即用户关注的币种数组 (CoinInfo[])
- 提供一个 React Hook `useWatchList()`，返回 `[watchList: CoinInfo[], addCoin: (coin: CoinInfo) => void, removeCoin: (coinId: string) => void]`，用于组件读取 / 添加 / 删除币种
- 确保对重复添加 (同 id) 的处理 (防止重复), 删除时正确移除；并初始化时能够从 storage 恢复已有 watch-list。

输出文件: `src/hooks/useWatchList.ts`，包括类型定义 + hook + storage 交互逻辑。

⸻

Prompt 4 — Popup UI: 显示 watch-list 币种 + 当前价格 + 刷新按钮

模块名称: “Popup UI — WatchList 展示 + 刷新功能”

需求:

- 创建一个 React 组件 `WatchListPopup.tsx` (或 `App.tsx` / 主 popup 入口)，显示当前用户 watch-list 中所有币种
- 对于每个币种，显示: 币种名 + symbol + 当前价格 (USD) + 24h 涨跌百分比 (正 / 负 用不同颜色, 例如绿色 / 红色) + 币种图标 (如果有 iconUrl, 否则默认图标)
- 添加一个 “Refresh Now” 按钮 / 控件 — 用户点击时触发所有 watch-list 币种通过 price-fetch 模块重新拉取价格，并刷新界面 /状态
- 简洁 UI — 用最基本 CSS / React，不需要复杂样式 (你可以 later 加主题 /样式)
- 支持 loading / error 状态 (比如 fetch 中, API 请求失败时显示 “—” 或 “Error” )

输出文件: `src/App.tsx` (或 `src/components/WatchListPopup.tsx`) + 必要类型／状态管理 (state / effect hooks) + minimal CSS (可 inline 或 modules)。

⸻

Prompt 5 — 提醒 (Alert) 功能 + 通知逻辑

模块名称: “Price Alert & Notification 模块”

需求:

- 允许用户为某个 watch-list 币种设定提醒规则 (alert rule)，例如:

  interface AlertRule {
  coinId: string;
  type: 'price_gte' | 'price_lte' | 'change24h_gte' | 'change24h_lte';
  threshold: number; // 数值:价格 (USD) 或百分比
  }

- 在插件运行时 (background / service worker 或定时 / on-popup 打开时)，检查 watch-list 币种当前价格 /涨跌数据 — 如果某条规则被满足 /超出阈值 — 使用 Chrome Notifications API (manifest v3) 弹出桌面通知 (包括 币种名 + 当前价 + 触发条件说明)
- 导出 / 实现一个函数 `checkAlerts()`，可被 popup UI / background script /定时触发，用于遍历所有规则 + 触发通知 + 标记已通知 (避免重复通知)
- 同时提供 UI / state 管理 — 在 watch-list 列表中 / 或币种右侧 添加 “🔔 设置提醒 / 编辑提醒规则 / 移除提醒规则” 的按钮 /控件

输出文件: `src/alerts/alertManager.ts` + React 相关组件 (例如 `AlertSettingsForm.tsx`) + 类型定义 (AlertRule) + 必要通知 / storage 逻辑。

⸻

Prompt 6 — Settings 面板 (刷新频率 / 价格单位 / 通知偏好)

模块名称: “Settings 面板 + 全局配置管理”

需求:

- 支持用户配置: 刷新频率 (None / 手动 / 自动 + 可选分钟间隔: 1, 5, 15, 60 …)， 显示价格单位 (USD, CNY, stable-coin…), 通知偏好 (是否允许桌面通知, 是否启用 badge / 图标提醒, 是否启用声音 / 提醒频率限制)
- 使用 React + TypeScript +组件 /表单 (Settings.tsx)，将用户设置保存在 storage (浏览器 local / chrome.storage)，并提供 hook (例如 `useSettings()`) 给其他模块读取 / 响应配置变化 (比如自动刷新间隔 /单位切换等)
- UI 简洁、直观 — 复选框 /下拉列表 /数值输入 /切换开关 (toggle) /保存按钮

输出文件: `src/components/Settings.tsx` + types (例如 `Settings` interface) + storage logic (settings persistence) + hook (useSettings)。

⸻

Prompt 7 — (可选) Toolbar Ticker / Badge / 快速查看模块

模块名称: “Toolbar Ticker / Badge & Quick-View 模块”

需求:

- 在浏览器扩展 toolbar 图标上，实现 badge 或 dropdown / tooltip behavior: 显示 1–3 个用户“优先 / 收藏 (star)” 的币种当前价格 +涨跌 %，方便用户快速 glance（不需要打开 popup）
- 当点击 toolbar 图标时，除了打开 popup，还可以选 “Quick-view / Ticker View” — 显示简洁列表 (币种 + 当前价 + 涨跌)
- 实现 badge 动态更新 (例如当某个优先币种价格 /涨跌满足提醒 / 或涨跌超过一定比例时 badge 显示 “! / ⚠️ / 数字”)
- 兼容 manifest v3 — 如果需要 background 或 service worker，确保逻辑在 extension 后台正确执行

输出包含必要脚本 / background / UI /样式 — 例如 `src/ticker/ToolbarTicker.tsx` + background logic + manifest 配置修改 (permissions / background) + badge 更新代码。

⸻

Prompt 8 — (可选) 多数据源 + 异常处理 + 数据缓存 / 限频机制

模块名称: “Data Source Fallback & Rate-Limit / Cache 管理模块”

需求:

- 支持多个行情 API 数据源 (例如 CoinGecko, 另一个公共 API) — 当 primary API 请求失败 / 返回错误 /限频 /超时 — 自动 fallback 到备用 API，并返回正确数据或 null
- 对频繁请求做节流 / 限频 /缓存 — 比如对同一币种在短时间 (例如 30 秒) 内重复请求时，返回缓存数据 + 跳过网络请求，以避免 API 限频 / 滥用
- 提供统一接口 (例如 `getPriceWithFallback(coinId: string): Promise<PriceInfo | null>`) 给上层模块调用
- 若 API 数据 format 不一致 (不同 source 返回字段不同) — 统一做数据适配 /标准化 (adapter pattern)

输出文件: `src/api/priceApiWithFallback.ts` + types + util functions (cache / rate-limit) + error handling.
