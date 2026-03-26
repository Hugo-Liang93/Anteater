# CLAUDE.md — Anteater (MT5 3D 虚拟办公室)

## 项目概述

将 MT5 自动交易系统的后端模块**人格化**为 10 个数字员工，在 3D 虚拟办公室中实时可视化系统运行状态、交易链路和模块协作。

**核心理念：** 不是装饰性 3D 页面，而是让用户直观看到——系统在做什么、流程卡在哪、哪个模块异常。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | React 19 + TypeScript 5.8 (strict) |
| 3D | Three.js + @react-three/fiber + @react-three/drei |
| 状态 | Zustand 5 |
| 样式 | Tailwind CSS 4 (主题变量在 `src/index.css` @theme) |
| 构建 | Vite 6 |
| 2D 备选 | PixiJS 8 + @pixi/react |

## 常用命令

```bash
npm run dev        # 开发服务器 http://localhost:3000
npm run build      # tsc -b && vite build
npm run lint       # eslint
npm run preview    # 预览构建产物
```

**Mock 模式（无需后端）：** 访问 `http://localhost:3000/?mock` 或设置 `VITE_MOCK_MODE=true`

## 项目结构

```
src/
├── api/              # 后端通信层
│   ├── endpoints.ts  #   REST API 请求函数
│   ├── ws.ts         #   WebSocket 客户端（自动重连）
│   ├── wsHandlers.ts #   WS 消息路由 → store
│   ├── adapters.ts   #   后端原始数据 → 前端标准化
│   ├── mockData.ts   #   Mock 模式模拟数据
│   └── types.ts      #   API 响应类型
├── components/
│   ├── studio/       # 3D 场景组件
│   │   ├── Studio3D.tsx      # Canvas 入口 + 光照 + 雾效
│   │   ├── Office3D.tsx      # 办公室模型（墙/窗/地面）
│   │   ├── Character3D.tsx   # Q版角色（几何体 + 状态动画）
│   │   ├── DataFlow3D.tsx    # 数据流线 + 粒子
│   │   └── Zones3D.tsx       # 功能区域地面标记
│   ├── layout/       # 页面骨架
│   │   ├── AppShell.tsx      # 主布局
│   │   ├── TopBar.tsx        # 顶栏（行情/账户/健康/环境）
│   │   ├── Sidebar.tsx       # 左侧可折叠导航
│   │   └── BottomEventFeed.tsx # 底部事件滚动条
│   ├── overlay/      # 浮层
│   │   └── EmployeeDetail.tsx # 右侧角色详情面板
│   └── panels/       # 侧边栏面板内容
├── config/           # 集中配置（不散落在组件中）
│   ├── index.ts      #   API/WS 地址、轮询间隔、mockMode
│   ├── employees.ts  #   10 角色定义（ID/名称/颜色/后端映射）
│   ├── layout.ts     #   3D 坐标、2D 坐标、区域、数据流连接
│   └── assets.ts     #   角色外观配色、模型路径
├── engine/           # 渲染引擎逻辑（非组件）
│   ├── sync.ts       #   store → employees 状态映射（主驱动）
│   ├── character.ts  #   2D 像素角色渲染
│   └── daynight.ts   #   日夜循环
├── hooks/
│   ├── usePolling.ts     # REST 轮询 + Mock 初始化 + 事件生成
│   └── useWebSocket.ts   # WS 连接管理
├── store/            # Zustand stores（单一数据源）
│   ├── employees.ts  #   10 角色运行时状态 + 选中状态
│   ├── events.ts     #   全局事件流（StudioEvent[]）
│   ├── market.ts     #   行情/账户/持仓
│   ├── signals.ts    #   健康/策略
│   ├── live.ts       #   指标/信号/队列
│   └── ui.ts         #   UI 状态（面板/Tab/过滤器）
├── types/
│   └── protocol.ts   #   StudioAgent + StudioEvent 协议类型
└── lib/utils.ts      #   cn() 工具函数
```

## 架构要点

### 6 层架构（从底到顶）

```
后端接口层   api/endpoints.ts, api/ws.ts
     ↓
数据适配层   api/adapters.ts, api/wsHandlers.ts → 标准化为 protocol.ts 类型
     ↓
状态层       store/*.ts (Zustand) — 单一数据源
     ↓
驱动引擎     engine/sync.ts — 定时将 market/signal/live 数据映射为 employee 状态
     ↓
3D 表现层    components/studio/* — Canvas/角色/流线/区域
     ↓
2D UI 层     components/layout/* + overlay/* + panels/*
```

### 交易主链路（9 核心角色 + 4 支持角色 = 13）

```
              采集员(collector)
             ↙              ↘
  分析师(analyst)    实时分析员(live_analyst)
  (confirmed指标)     (intrabar指标+迷你K线)
         ↓                    ↓
  策略师(strategist)  实时策略员(live_strategist)
  (confirmed信号)     (preview/armed信号)
         ↘              ↙
         审核员(auditor)
    (FilterChain+Regime亲和度过滤)
              ↓
  投票主席(voter) → 风控官(risk_officer) → 交易员(trader)
```

另有 4 个支持角色：position_manager, accountant, calendar_reporter, inspector

**前后端分工**：后端只返回结构化数据（`status`/`alertLevel`/`metrics`），`task` 不含数值；前端负责所有渲染

### 状态驱动动画

角色动画完全由 `ActivityStatus` 驱动，不手动控制：
- idle → 呼吸浮动
- working → 手臂旋转
- thinking → 头部晃动
- warning → 黄色光环
- error → 红色闪烁 + 抖动
- success → 绿色脉冲

完整状态列表见 `store/employees.ts` 的 `ActivityStatus` 类型。

## 后端接口

- **REST:** Vite proxy `/api` → `http://localhost:8808/v1`
- **WebSocket:** `ws://localhost:8808/ws/studio`
- 协议类型定义在 `types/protocol.ts`（StudioAgent / StudioEvent / WsMessage）

## 开发规范

### TypeScript
- 严格模式 (strict: true, noUncheckedIndexedAccess: true)
- 路径别名 `@/` → `src/`
- 无 any，无隐式类型

### 样式
- 仅用 Tailwind 工具类 + `@theme` 自定义变量
- 无 CSS modules，无 SCSS
- 暗色系交易终端风格（背景 #0f1923）

### 3D 场景
- 修改坐标/位置 → 改 `config/layout.ts`，不硬编码在组件中
- 添加角色 → 改 `config/employees.ts` + `config/assets.ts`
- 角色状态 → 只通过 store 驱动，不在组件中直接设置

### 状态管理
- 所有数据通过 Zustand store 流转
- engine/sync.ts 是唯一的 "store → employee 状态" 映射点
- 组件只读取 store，不直接修改其他 store

## 设计文档

保留在 `anteater/.ai/` 目录：

| 文档 | 用途 |
|------|------|
| ARCHITECTURE.md | 分层架构、数据流、模块边界 |
| API_CONTRACT.md | REST/WS 接口协议 |
| CHARACTER_ROSTER.md | 13 角色设计（外观/职责/动画） |
| VISUAL_STYLE_GUIDE.md | 视觉风格（暖色卡通 3D 工作室） |
| FOLLOW_UP_BACKEND.md | 后端待实现的状态推送清单 |

## 当前进度

**已完成（Phase A-H）：**
- 3D 场景 + 13 角色 + 12 功能区域 + 数据流粒子（错行流水线布局）
- 完整 UI（TopBar/Sidebar/DetailPanel/EventFeed）
- 状态驱动动画系统（10+ 状态映射）
- SSE 实时通道 + REST 轮询
- 13 角色详情面板：
  - 分析师(confirmed) / 实时分析员(intrabar+迷你K线) 双链路
  - 策略师(confirmed) / 实时策略员(preview信号) 双链路
  - 审核员（FilterChain 通过/拦截统计 + 滑动窗口）
  - 投票主席（TF 拔河条 + 类别投票倾向）
  - 风控官（信号决策漏斗 + 拦截原因明细）
  - 交易员（入场区间可视化 + pending entry）
  - 巡检员（组件健康 + 队列健康）
- Mock 模式已清空（使用真实后端数据）

**待实现：**
- Phase I: GLB 角色模型替换（等美术资源）
- Phase J: 扩展功能（多视图/巡检逻辑/回测可视化/intrabar 指标面板）
