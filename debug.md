1. 构建扩展包

- 运行：`pnpm build`
- 产物在 `dist/`（包含 background.js、index.html、manifest 等）。

1. 在 Chrome 加载未打包扩展

- 打开 `chrome://extensions` → 开发者模式 ON → “加载已解压的扩展程序” → 选择 `dist/`。
- 首次加载后，如果修改代码并重新 build，需要在扩展页点击“重新加载”。

1. Popup 调试

- 点击工具栏图标打开 popup，然后右键 popup → “检查”打开 DevTools。
- 可以在 Console/Network 里看请求和报错。

1. Background/Service Worker 调试

- 在扩展页找到你的扩展，点击 “service worker” 下的 “Inspect views”/“检查” 打开后台控制台。
- alarm、消息传递、badge 更新等日志在这里查看。

1. 网络与权限

- 已声明 `host_permissions`（coingecko/coinpaprika）、`notifications`、`storage`、`alarms`，确保加载后在扩展页无红色错误。
- 若 API 被阻止，检查 CORS/网络，必要时在 background 调用，或在 popup DevTools 查看具体报错。

1. 自动刷新/提醒验证

- 在 popup 设置里切到自动刷新后，重载扩展；后台 alarm 会触发 `ticker-refresh`。
- 价格提醒与桌面通知：保持扩展运行，满足阈值后应在系统里收到通知（需允许站点通知）。

1. 图标与 badge

- 确保 `public/` 下的 PNG 已在 `manifest.json` 的 `icons` 与 `action.default_icon` 中引用；重载扩展查看工具栏显示。
- 若 badge 遮挡图标，可临时调用 `chrome.action.setBadgeText({ text: "" })` 清空。

1. 常见问题

- “找不到 chrome 类型”：已在 tsconfig.types 加入 `"chrome"`；如仍有问题重启 IDE/TS Server。
- 代码改动不生效：检查是否重新 `pnpm build`，并在扩展页点击“重新加载”。
- service worker 休眠：在控制台有时会提示停止，这是正常的；需要日志时可用 `chrome.runtime.onMessage` 触发或手动点击“重新加载”。
