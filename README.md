<div align="center">
  <h1>Komari Theme: Aura</h1>
  <p>一款为 <a href="https://github.com/komari-monitor/komari">Komari Monitor</a> 打造的现代化探针监控主题。</p>

  <p>
    <img alt="版本" src="https://img.shields.io/badge/version-v1.0.69-blue.svg" />
    <img alt="React" src="https://img.shields.io/badge/React-19-61dafb.svg?logo=react" />
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-v4-38b2ac.svg?logo=tailwind-css" />
    <img alt="License" src="https://img.shields.io/badge/license-MIT-green.svg" />
  </p>
</div>

Aura 侧重清爽的信息密度、细腻的毛玻璃层次、实用的节点筛选和实时监控体验。它适合把 Komari 作为日常 VPS、服务器与区域状态看板的用户。

## 预览截图

建议把截图放在 `.github/assets/` 目录下，并使用下面预留的文件名。当前这些位置是占位，补图后 README 会自动展示。

### 1. 仪表盘总览

<!-- TODO: 插入首页总览截图，建议尺寸 1600x900，文件名 .github/assets/dashboard-overview.png -->
![仪表盘总览](.github/assets/dashboard-overview.png)

### 2. 世界地图与区域点亮

<!-- TODO: 插入世界地图截图，建议展示点亮区域和图例，文件名 .github/assets/world-map.png -->
![世界地图与区域点亮](.github/assets/world-map.png)

### 3. 节点网格视图

<!-- TODO: 插入节点卡片网格截图，文件名 .github/assets/node-grid.png -->
![节点网格视图](.github/assets/node-grid.png)

### 4. 节点列表与展开详情

<!-- TODO: 插入列表视图截图，最好包含一条展开的节点详情，文件名 .github/assets/node-table.png -->
![节点列表与展开详情](.github/assets/node-table.png)

### 5. 剩余价值计算器

<!-- TODO: 插入剩余价值/成本统计弹窗截图，文件名 .github/assets/value-calculator.png -->
![剩余价值计算器](.github/assets/value-calculator.png)

### 6. 主题设置

<!-- TODO: 插入主题设置页截图，建议展示壁纸、节点卡片颜色、地图点亮颜色等设置，文件名 .github/assets/theme-settings.png -->
![主题设置](.github/assets/theme-settings.png)

## 主要功能

- 全局仪表盘：展示当前时间、在线状态、区域覆盖、流量和节点概览。
- 世界地图：按节点区域点亮地图，支持自定义点亮颜色。
- 双视图节点列表：支持网格卡片和表格视图，表格中可展开查看节点详情。
- 实例监控：展示 CPU、内存、网络、连接数、负载等实时与历史图表。
- 智能筛选：支持按节点名称、地区、系统、分组等条件快速筛选。
- 剩余价值计算器：统计节点剩余价值、总价值、月成本，并支持多币种换算。
- 主题设置：支持默认外观、节点卡片标签颜色、地图点亮颜色、壁纸和首页延迟绑定。
- 本地开发代理：可通过 `.env.local` 配置 `VITE_KOMARI_PROXY_TARGET`，在本地直接连接已有 Komari 后端。

## 安装方式

1. 打开本仓库的 [Releases 页面](https://github.com/km-hl/komari-theme-aura/releases)。
2. 下载最新版本的 `Aura-vX.X.X.zip`。
3. 登录 Komari 管理后台。
4. 进入主题管理页面，上传下载好的 ZIP 文件。
5. 启用 Aura 主题。

## 本地开发

```bash
npm install
npm run dev
```

如需让本地主题直接访问线上或 VPS 上的 Komari 后端，可以在项目根目录创建 `.env.local`：

```env
VITE_KOMARI_PROXY_TARGET=https://your-komari.example.com
```

然后重新启动开发服务：

```bash
npm run dev
```

常用检查与打包命令：

```bash
npm run lint
npm run build
npm run package
```

`npm run package` 会根据 `komari-theme.json` 的版本号生成类似 `Aura-v1.0.69.zip` 的主题包。

## 致谢

Aura 基于社区主题 Lumina 的思路继续演进，并针对 Komari 的现代监控场景重构了仪表盘、筛选、图表、主题设置和多项交互细节。感谢 Komari 与相关开源项目提供的基础能力。
