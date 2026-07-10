# Komari Theme Aura - 交接文档 (Handoff Document)

## 📌 任务背景 (What are we doing?)
本项目是为 **Komari 探针 (Komari Monitor)** 专属开发的第三方前端主题 `komari-theme-aura`。
当前主要聚焦于优化前端交互逻辑（如 3D 地球组件的拖拽与缩放体验），以及重构并增强“剩余价值与成本计算器”的数据准确性和 UI/UX。

**开发规范与文档指引**：
- 本主题的开发需要严格遵循 **Komari 探针的官方主题开发文档**（开发新组件或获取面板数据时，请务必对齐 Komari 探针的 API 与状态注入规范）。官方文档及源码参考：[komari-monitor/komari](https://github.com/komari-monitor/komari)。
- 主题开发与api文档均位于文件夹下，为 `api.md` 以及`theme.md` 。
- 汇率转换功能依赖外部 API，请参考 [Frankfurter API 官方文档](https://api.frankfurter.dev/)。

## ✅ 已完成事项 (What has been done?)
1. **Globe 3D 地球交互重构 (`WorldMap.tsx`)**：
   - 修复了拖拽方向反直觉的问题（反转了 rotation 偏移量）。
   - 修复了在拖拽地球时意外选中国旗、文字等元素的 Bug（加入 `select-none` 和原生的 `preventDefault()` 拦截）。
   - 修复了鼠标滚轮在地球上滚动时导致整个页面一起滚动的冲突（剥离 React Synthetic `onWheel`，改用原生 `addEventListener('wheel', { passive: false })` 挂载在父卡片容器上）。
   - 将最大缩放倍率 `maxZoom` 从 5 降至 3，避免 SVG 被 `overflow:hidden` 裁切成死板的矩形“盒子”。
2. **计算器数据修正 (`ValueCalculator.tsx` & `useValueStats.ts`)**：
   - 修复了长期有效节点 `expired_at` 字段缺失导致的 `NaN` 计算报错（统一使用了鲁棒性更强的 `getRemainingDays` 钩子处理）。
   - 修复了用户输入 `¥/￥` 符号被错误识别为 `JPY` (日元) 的逻辑，强制将该符号覆写为 `CNY` (人民币)。
   - 移除了冗余的“几小时”显示，只保留“剩余天数”以保持 UI 清爽。
   - **解除了“长期合约不纳入计算”的限制**（删除了 `cycleDays > 1000` 的拦截逻辑），让 3 年付、10 年付、终身机等长期合约的金额也能正确平摊进入每月的财务流水。
3. **计算器功能增强**：
   - 为计算器面板新增了顶部的**“剩余价值” / “成本统计”**双视图切换功能。
   - 成本统计视图会汇总显示“总月成本”和“总年成本”，并在下方列表中直接展示每一台机器的月/年均摊成本。
   - 优化了由于信息缺失导致“无法计算”的卡片样式，加入了 `AlertCircle` 错误图标、移除了无意义的 `- / 月` 占位、并进行了 `opacity-70` 半透明暗化处理。
4. **版本发布与清理**：
   - 已将当前最新版本编译、打包并发布至 Github Release **`v1.0.45`**，包含上述所有热修复。
   - 已经清空了工作区目录下用于历史发布的冗余 `.zip` 文件。

## 🚀 发布与 GitHub 工作流 (Release & GitHub Workflow)
在后续接手开发并准备发布新版本时，请严格遵守以下 GitHub Release 标准流程：
1. **测试与检查**：提交前务必执行 `npm run lint` 和 `npm run build` 确保无编译报错。
2. **修改版本号**：同步修改 `package.json` 与 `komari-theme.json` 中的 `version` 字段（例如升级至 `1.0.46`）。
3. **提交与打标签**：
   ```bash
   git commit -am "feat/fix: xxx"
   git push origin main
   git tag v1.0.46
   git push origin v1.0.46
   ```
4. **编译并打包 ZIP**：
   ```bash
   npm run build
   npm run package
   ```
   *注意：`npm run package` 会调用 `scripts/package-zip.mjs` 自动生成形如 `Aura-v1.0.46.zip` 的压缩包。*
5. **创建 GitHub Release**（使用 `gh` CLI）：
   ```bash
   gh release create v1.0.46 Aura-v1.0.46.zip --title "Aura v1.0.46" --notes "描述你的更新内容..."
   ```
6. **清理**：发布完毕后，记得将本地产生的 `Aura-v1.0.46.zip` 删掉，以免占用空间。

## 🚧 当前进度与阻碍 (Where are we stuck?)
当前所有用户提出的反馈均已全部处理并上线！
目前处于“等待用户在本地测试 `v1.0.45` 以进行反馈验收”的状态。暂无已知 Bug，流程十分健康。

## 🎯 下一步计划 (What's next?)
1. 等待用户验收 `v1.0.45` 版本的 UI 视觉及地球控件体验。
2. （可能）继续微调仪表盘的 Grid 间距。虽然此次更新暂未修改 `NodeCard.tsx` 的 Grid padding 和 margin，但用户在稍早前曾提过“格子上面留白太少，下面留白太多”。如果用户继续反馈这一问题，需前往 `NodeCard.tsx` 或 `surface.css` 中缩减卡片高度/内部 Flex gap 以达到视觉平衡。
3. 任何用户基于最新计算器界面、地球交互提出的后续增强建议。

## 💣 踩过的坑 (Pitfalls - DO NOT step on these again)
1. **React 原生事件监听与 `preventDefault`**：
   - 在处理滚动冲突（Wheel scroll）时，**绝对不要**试图在 React 里的 `onWheel={(e) => e.preventDefault()}` 里拦截页面滑动。React 17+ 默认将所有 Wheel/Touch 事件设为 `passive: true`。必须使用 `element.addEventListener('wheel', handler, { passive: false })` 来手动挂载原生事件。
2. **探针的时间戳缺失问题**：
   - 后台如果没有设置服务器到期时间，探针 API 可能不返回远端时间，而是**直接没有** `expired_at` 字段。直接拿去乘以 1000 算时间戳会直接产生 `NaN`。涉及到时间计算必须做兜底逻辑。
3. **汇率 API 的 CSP 阻断**：
   - 获取汇率的 `api.frankfurter.dev` 如果写成 `.app`，可能会因为重定向或面板 CSP 策略被浏览器静默拦截（Console 报错但无 Network 发出），且没有 catch 处理就会卡死 loading 态。务必使用 `.dev/v1/latest`（旧版 v1）或 `/v2/rates`。
4. **清理陈旧代码后的残余闭合括号**：
   - 在 `useValueStats.ts` 中删除 if/else 逻辑块时，如果不小心留了一个悬空的 `}` 没有删掉，`vite build` 并不会捕捉到所有的语法错误，会在 `tsc -b` 阶段直接阻断 CI 流程！在用工具覆盖大段文件修改后，**必须先运行一次 `npm run lint` 或 `tsc --noEmit`，然后再提交打包**！
5. **货币符号本地化歧义**：
   - `¥` 和 `￥` 在代码库里是 `JPY` 和 `CNY` 共用的！由于目标用户绝大多数为中文探针用户，所有单独输入的 `¥` 都应该优先覆写强制解释为 `CNY`，切勿原封不动交给汇率 API 转换，否则算出来的钱会差一百多倍！
