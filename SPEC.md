Crypto Price Watcher 插件 — 需求 & UI 规范 (Spec Document)

1. 项目概述

插件名称：Crypto Price Watcher
目的：为用户提供方便、轻量、快速的加密货币价格监控与提醒功能 — 用户可自定义关注币种 (主流币 / alt-coin / token)，查看实时／定时更新的价格与涨跌，设定价格或涨跌幅提醒，当触发提醒时通过浏览器通知提示用户。适合不想频繁打开交易所网页、希望随时掌握币价波动的用户。
目标用户：加密货币爱好者 / 投资者 /关注者 — 无论主流币／小币／多币种持有者，希望便捷追踪价格 & 收到提醒的人群。
技术栈：React + Vite + TypeScript + Chrome Extension manifest V3

1. 功能需求 (Feature List)
   ✅ 必须／基础 (MVP)
   • 添加 / 删除 / 管理 “关注币种 (watch-list)”
   • 拉取币种最新行情 (价格 + 24h 或实时涨跌百分比)
   • 在插件图标点击后，弹出 UI 显示所有 watch-list 币种及其当前价格／涨跌信息
   • 支持设定“提醒条件 (Alert)”功能：例如 当某币价格 ≥ / ≤ 某值，或当 24h 涨跌百分比 ≥ / ≤ 某值 → 触发浏览器通知
   • 本地存储用户设置 (watch-list，提醒条件，偏好设置等)，保证关闭／重启浏览器后依然保留

🌟 推荐／实用 (推荐纳入)
• 支持用户输入主流 + alt-coin + 自定义 token／合约地址 (如果 API 支持)
• 可配置刷新机制：允许用户选择 “手动刷新” 或 “自动定时刷新 (频率可设，如 1 分钟 / 5 分钟 / 15 分钟 / 1 小时 / …)”
• 搜索 / 筛选 /排序功能 — 当 watch-list 币种较多时，可快速查找 / 管理
• 设置页面 (Options/Settings) — 用于配置刷新频率、价格单位 (USD / CNY / 稳定币 / …)、通知偏好 (是否开启桌面提醒 / badge / 声音)

✨ 加分 / 可选增强功能
• 币种历史数据 + 简易走势图 (例如最近 24h / 7d / 30d) — 让用户直观看到价格变化趋势
• Portfolio (持仓估值) 功能 — 允许用户输入自己持有各币数量 → 显示当前总价值 + 盈亏 (注意隐私／安全)
• 工具栏 “Ticker bar” 或 “Badge / 动态图标 + 快速查看” — 在浏览器 toolbar 显示几个蓝筹或用户标记币种的价格／涨跌 → 用户无需点击插件即可快速查看
• 多数据源支持 + fallback 机制 — 当一个行情 API 不可用时，自动切换到备用 API，提升稳定性
• 国际化 / 多语言 / 主题 (Light / Dark) / 单位切换 (USD / CNY / …)

1. UI / 交互 规范 (User Interface & Interaction Spec)

[Browser Toolbar] — 插件图标 (CryptoWatcher 图标)
↓ 点击
———————————— Popup 窗口 — 主界面
| Header: “CryptoWatcher” LOGO + 设置 ⚙️ 按钮 |
| Tabs: [ Watch-list | All Coins | Settings ] |
————————————————————————
[Watch-list Tab] (默认)
| + “Add Coin” 按钮 / 搜索框 |
| — 列表 (每行代表一个币种) — |
| · 币种图标 + 名称 (例如 BTC / Bitcoin) |
| · 当前价格 (单位可切换 USD / CNY / …) |
| · 24h (或最近周期) 涨跌百分比 (绿色/红色) |
| · “收藏 / 优先 / Star” 标记按钮 |
| · “提醒 🔔” 图标 + 当前提醒状态 (有/无) |
————————————————————————
| 按钮: “Refresh Now” (手动更新) |
| 显示: “Last updated: 2025-12-08 14:23” |
————————————————————————

[All Coins Tab]
| 搜索 / 筛选 /分页 |
| 币种列表 — 显示支持 / 可选添加的币 |
| 每行: 币种 + 当前价 + “Add to Watch-list”按钮 |

[Settings Tab]
| 刷新频率选择 (None / 1 min / 5 min / 15 min / 1 h / custom) |
| 价格单位选择 (USD / CNY / stable-coin / …) |
| 通知设置: Enable desktop notification / badge / sound |
| 主题选择: Light / Dark |
| (可选) 数据源选择 / fallback 设置 |

--- 弹窗 / 通知交互 ---
当设定提醒达成条件时 — 插件将触发桌面通知 (含币种 + 当前价 +涨跌 + 触发原因)，并 (可选) 在插件图标 badge /ticker bar 高亮 /闪烁，直到用户确认或刷新。

可选扩展: 点击币种可展开详情 (历史走势图 /持仓估值 /跳转到交易所页面)

设计原则 / 注意事项
• 界面简洁 — 避免过重／复杂 UI，保证快速响应、轻量。
• 用户控制 — 所有重要行为 (添加币／设提醒／删除) 必须用户主动触发，不自动拉入／设置。
• 性能友好 — 避免非常频繁请求／刷新 (建议最短 1 min)，并对 API 呼叫进行缓存／限频处理。
• 隐私优先 — 除非用户明确输入持仓量，不保存／上传任何用户资产数据。
• 可扩展／模块化 — 结构清晰、功能模块分明，方便未来添加更多功能 (图表 / portfolio / 多数据源 / 国际化 …)。

1. 项目结构建议 (目录 / 文件 & 架构)

/crypto-price-watcher
├── public/
│ └── manifest.json # Chrome Extension 配置
├── src/
│ ├── App.tsx # 主 React 入口 (Popup UI)
│ ├── components/ # UI 组件 (CoinList, CoinItem, AddCoinForm, Settings, Tabs …)
│ ├── hooks/ # React Hooks (useCoins, useAlerts, useStorage, useFetch …)
│ ├── api/ # 与行情 API 交互 (fetchPrice, getCoinList, etc.)
│ ├── utils/ # 工具函数 (格式化价格、时间、storage wrapper, notification helper)
│ ├── types/ # TypeScript 类型定义 (Coin, PriceInfo, AlertRule, Settings …)
│ └── index.tsx # React DOM rendering
├── package.json
├── vite.config.ts # Vite + bundler 配置 (确保 base='./', 输出 dist, manifest-v3 支持)
└── README.md # 项目说明 + 使用 /开发说明
