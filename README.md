# Komari Theme: Aura

Aura 是一款专为 [Komari Monitor](https://github.com/komari-monitor/komari) 打造的现代、高级且功能丰富的监控主题。

它为您提供了一个极其直观的全局数据概览视界，让您能够轻松掌握所有服务器的实时状态。

## ✨ 核心特性

- **全局仪表盘 (Dashboard)**：在页面顶部提供实时时间、在线节点比例、区域覆盖数量以及全局的上下行流量和当前速率统计。
- **快速节点搜索与过滤**：内置强大的搜索栏，支持按节点名称、国家/地区、操作系统进行实时过滤；自动提取节点的分组 (Group) 标签，一键切换视图。
- **现代化 UI 设计**：运用了卡片毛玻璃效果、优美的微动画，以及精致的深色模式体验。
- **平滑的数据流转**：完全适配 Komari 的 WebSocket 数据推送，确保流量、速率及资源占用数据的无缝刷新。

## 📥 安装方式

1. 下载最新发布版本的 `aura-theme.zip`。
2. 登录您的 Komari 管理员后台。
3. 进入 **主题管理** 页面。
4. 点击上传按钮，选择下载的 `.zip` 文件，即可一键安装并启用。

## 🛠️ 开发指南

本项目基于现代化的前端构建工具：**React 19 + Vite + Tailwind CSS v4 + Framer Motion**。

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 构建与打包
npm run build
npm run package # 此命令将生成可用于安装的主题 zip 包
```

## 💖 鸣谢

Aura 主题是基于优秀的 [Lumina](https://github.com/stqfdyr/komari-theme-Lumina) (由 shark & codex 开发) 深度改进与优化而来。
在 Lumina 扎实的基础上，Aura 引入了全新的统计视图与数据过滤架构，为您带来更进一步的监控体验！
