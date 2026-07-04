<div align="center">
  <h1>✨ Komari Theme: Aura ✨</h1>
  <p>一款专为 <a href="https://github.com/komari-monitor/komari">Komari Monitor</a> 打造的现代、高级且功能丰富的探针监控主题。</p>
  
  <p>
    <img alt="版本" src="https://img.shields.io/badge/version-v1.0.14-blue.svg" />
    <img alt="React" src="https://img.shields.io/badge/React-19-61dafb.svg?logo=react" />
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-v4-38b2ac.svg?logo=tailwind-css" />
    <img alt="License" src="https://img.shields.io/badge/license-MIT-green.svg" />
  </p>
</div>

<br>

Aura 旨在为您提供一个极其直观的全局数据概览视界，让您能够在一个优雅、充满科技感的界面中，轻松掌握所有服务器的实时状态。

---

## 📸 预览效果

> 💡 **提示**：为了展示效果，请在这里上传您的截图，并替换下方括号里的图片链接！建议把截图放在 `docs` 或 `.github/assets` 文件夹下。

- **全局概览 (Dashboard) 与 搜索栏**
  ![仪表盘概览](https://via.placeholder.com/800x400?text=上传您的仪表盘截图到这里)
  
- **网格视图 (Grid View)**
  ![网格视图](https://via.placeholder.com/800x400?text=上传您的网格卡片截图到这里)

- **列表视图与可展开详情 (Table View)**
  ![列表视图下拉](https://via.placeholder.com/800x400?text=上传您的NodeTable下拉展开截图到这里)

- **实例监控与图表 (Instance Details)**
  ![实例图表](https://via.placeholder.com/800x400?text=上传您的负载图表截图到这里)

---

## 🚀 核心特性

- 📊 **全局仪表盘 (Global Dashboard)**
  - 页面顶部实时展示：服务器当前时间、在线/离线节点比例、覆盖的区域数量。
  - 精准统计全局总上下行流量（Total Traffic）及当前实时网络收发速率。
- 🔍 **丝滑的搜索与多维度过滤 (Smart Filter)**
  - 强大的搜索栏：支持按节点名称、国家/地区、操作系统实时进行模糊匹配过滤。
  - 智能分组 (Group) 标签：自动提取节点配置中的 Group 信息生成分类胶囊按钮，一键快速切换业务视图。
- 🖥️ **双视图无缝切换 (Grid & Table)**
  - **网格视图**：提供精致的毛玻璃卡片式布局，一目了然。
  - **列表视图**：高度紧凑的表格布局。不仅支持概览，还支持**单行下拉展开**，在列表中直接查看节点的硬件详情与实时负载折线图。
- 📈 **详尽的实例级监控 (Instance Deep-Dive)**
  - 单独的实例详情页（或列表下拉栏），提供 CPU 型号、架构、虚拟化类型、Swap 信息。
  - 基于 `uPlot` 的高性能折线图表，展示 CPU、内存、网络、连接数、系统负载的实时与历史趋势。
  - 支持“断点连线”功能及动态时间范围（实时 / 24小时 / 7天等）切换。
- 🎨 **极致的现代 UI 设计**
  - 精心调优的深色模式 (Dark Mode)，保护视力且极具极客感。
  - 大量使用柔和微动画 (Framer Motion)、优雅的圆角和细致的排版间距，告别传统的死板报表。
- ⚡ **毫秒级的数据流转**
  - 完全拥抱 Komari 的 WebSocket 架构，确保数据零延迟展示。

---

## 📥 安装方式

1. 进入本仓库的 [Releases 页面](https://github.com/km-hl/komari-theme-aura/releases)。
2. 下载最新发布版本的压缩包，例如 `Aura-v1.0.14.zip`。
3. 登录您的 Komari 管理员后台。
4. 进入 **主题管理** 页面。
5. 点击上传按钮，选择下载的 `.zip` 文件，系统将自动解压并完成配置。
6. 一键启用，立即享受 Aura 带来的全新体验！

---

## 🛠️ 开发与构建指南

本项目完全开源，基于现代化的前端构建生态，欢迎二次开发：
**技术栈：React 19 + Vite + Tailwind CSS v4 + Framer Motion**

```bash
# 1. 克隆仓库
git clone https://github.com/km-hl/komari-theme-aura.git
cd komari-theme-aura

# 2. 安装依赖 (推荐使用 npm 或 pnpm)
npm install

# 3. 启动开发服务器 (支持热重载)
npm run dev

# 4. 构建生产版本
npm run build

# 5. 一键生成 Komari 专属主题 Zip 包
npm run package 
# 运行后会在根目录生成类似 Aura-vX.X.X.zip 的包
```

---

## 💖 鸣谢与致敬

Aura 主题是基于优秀的 [Lumina](https://github.com/stqfdyr/komari-theme-Lumina) (由 shark & codex 开发) 深度改进与重构而来。
我们在 Lumina 扎实的基础上，引入了全新的组件架构、全局仪表盘、智能过滤以及大量 UX/UI 细节打磨。感谢原作者为社区做出的卓越贡献！

---

<div align="center">
  <sub>Built with ❤️ for Komari Monitor.</sub>
</div>
