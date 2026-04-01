# 前后端对接完整分析

> 基于 [Hugo-Liang93/MT5Services](https://github.com/Hugo-Liang93/MT5Services)（FastAPI 后端）与 Anteater 前端的逐一比对。
>
> 生成时间：2026-03-25

---

## 一、接口匹配总览

| 前端调用 | 后端路由 | 状态 | 责任方 |
|----------|----------|------|--------|
| `GET /quote?symbol=` | `GET /v1/quote?symbol=` | ✅ 匹配 | — |
| `GET /ohlc?symbol=&timeframe=&count=` | `GET /v1/ohlc?symbol=&timeframe=&limit=` | ⚠️ 参数名不同 | 前端 |
| `GET /account/info` | `GET /v1/account/info` | ✅ 匹配 | — |
| `GET /account/positions` | `GET /v1/account/positions` | ✅ 匹配 | — |
| `GET /indicators/{symbol}/{tf}` | `GET /v1/indicators/{symbol}/{tf}` | ✅ 匹配 | — |
| `GET /indicators/list` | `GET /v1/indicators/list` | ✅ 匹配 | — |
| `GET /signals/recent?symbol=&timeframe=` | `GET /v1/signals/recent?symbol=&timeframe=` | ⚠️ 字段不匹配 | 双方 |
| `GET /signals/strategies` | `GET /v1/signals/strategies` | ⚠️ 返回类型不足 | 后端 |
| `GET /monitoring/health` | `GET /v1/monitoring/health` | ⚠️ 结构不同 | 双方 |
| `GET /monitoring/queues` | `GET /v1/monitoring/queues` | ⚠️ 字段名混乱 | 双方 |
| `GET /economic/calendar/risk-windows` | `GET /v1/economic/calendar/risk-windows` | ✅ 匹配 | — |
| `POST /trade/precheck` | `POST /v1/trade/precheck` | ✅ 匹配 | — |
| `GET /studio/agents` | `GET /v1/studio/agents` | ✅ 已实现 | — |
| `GET /studio/events` | `GET /v1/studio/events` | ✅ 已实现 | — |
| `GET /studio/summary` | `GET /v1/studio/summary` | ✅ 已实现 | — |
| `GET /studio/agents/{id}` | `GET /v1/studio/agents/{id}` | ✅ 已实现 | — |
| `SSE /studio/stream` | `GET /v1/studio/stream` | ✅ SSE 推送 | — |

### 路由前缀

| 项目 | 配置 |
|------|------|
| 前端 Vite 代理 | `/api/*` → `http://localhost:8808/v1/*` |
| 后端路由 | 同时注册了 `/v1/*`（版本化）和 `/`（无前缀兼容） |

前缀已匹配：前端 `/api/quote` → 代理到 `/v1/quote` → 后端有此路由。

---

## 二、字段/参数不匹配 — 逐项分析

### 2.1 OHLC 参数名 `count` vs `limit`

```
前端:  /ohlc?symbol=XAUUSD&timeframe=M5&count=100
后端:  limit: Optional[int] = Query(default=None, ge=1, le=5000)
```

后端不识别 `count`，会退回默认值。

| 方案 | 改谁 | 理由 |
|------|------|------|
| ✅ 推荐 | **前端** | 前端改 `count` → `limit`，`limit` 是通用 REST 分页惯例，后端无需改。 |

**前端改动点：** `src/api/endpoints.ts` — `fetchOhlc()` 函数参数名。

---

### 2.2 信号字段不匹配 (`/signals/recent`)

前端 `usePolling.ts` 中硬解析的字段：

```typescript
{ signal_id, symbol, timeframe, strategy, direction, confidence, reason, scope, generated_at }
```

后端 `SignalEventModel` 实际可能的字段：

```python
{ symbol, timeframe, strategy, signal_state, direction, confidence, scope, timestamp }
```

**不匹配点：**

| 字段 | 前端期望 | 后端实际 | 谁改 | 理由 |
|------|----------|----------|------|------|
| `signal_id` | 必须 | 可能缺失 | **后端** | 前端用它做信号去重（`lastLoggedSignalId`），后端应生成此 ID |
| `generated_at` | 用此名 | 用 `timestamp` | **前端** | 时间字段命名以后端为准，前端 adapter 做映射 |
| `reason` | 需要 | 可能缺失 | **后端** | 策略决策原因属于后端业务数据 |
| `signal_state` | 未使用 | 已返回 | — | 前端可忽略 |

---

### 2.3 策略列表返回类型 (`/signals/strategies`)

```python
# 后端实际返回
ApiResponse[list[str]]   # 纯字符串数组 ["MA_Cross", "RSI_Reversal", ...]
```

```typescript
// 前端期望
StrategyInfo { name, category, preferred_scopes, required_indicators, regime_affinity }
```

前端 adapter 已兼容（字符串 → `{ name: item, category: "", ... }`），但丢失了所有元数据。

| 方案 | 改谁 | 理由 |
|------|------|------|
| ✅ 推荐 | **后端** | 返回 `list[StrategyInfoModel]`，含 category、scope 等。这些信息在后端 `composites.json` 配置中已存在，只需暴露。 |
| 保持现状 | — | 前端 adapter 已兼容，功能可用但展示信息有限。 |

---

### 2.4 健康检查响应结构 (`/monitoring/health`)

后端实际返回非标准嵌套结构（不是 `ApiResponse` 包装）：

```python
{
  "runtime": {
    "storage": { "status": ..., "threads": ..., "summary": ... },
    "indicators": { "status": ..., "event_loop_running": ... },
    "trading": { "status": ..., "daily": ..., "risk": ... }
  }
}
```

前端期望的 `HealthStatus`：

```typescript
{
  status: "healthy" | "degraded" | "unhealthy",
  components: { [name]: { status, message? } },
  uptime_seconds: number
}
```

前端 `normalizeHealth()` 已做兼容，但映射逻辑较脆弱。

| 方案 | 改谁 | 理由 |
|------|------|------|
| ✅ 推荐 | **后端** | 新增轻量 `GET /monitoring/health/summary`，返回规范化 `{ overall_status, components }` 结构。现有 `/monitoring/health` 保持不变供运维使用。 |
| 备选 | 前端 | 加固 `normalizeHealth()` 以应对 `runtime.storage.status` 等嵌套路径。 |

---

### 2.5 队列监控字段名混乱 (`/monitoring/queues`)

**三方全不一致：**

| 来源 | 字段定义 |
|------|----------|
| 后端 `ingestor.queue_stats()` | `{ queues: { name: { status, utilization_pct, pending } }, summary, threads }` |
| 前端 `types.ts` QueueStatus | `{ channel, size, capacity, usage_pct, drops }` |
| 前端 `usePolling.ts` 实际解析 | `{ name, size, max, utilization_pct, status, drops_oldest, drops_newest }` |

| 方案 | 改谁 | 理由 |
|------|------|------|
| ✅ 推荐 | **双方** | 后端返回 `list[QueueInfoModel]`，统一字段：`name, size, max_size, utilization_pct, status, drops`。前端统一 `types.ts` 和 `usePolling.ts` 与此对齐。 |

---

## 三、后端未实现 — Studio 协议层

这是**最大的缺口**，也是 Anteater 3D 可视化的核心价值所在。

### 3.1 当前状态

前端通过 `engine/sync.ts` 从现有 REST 数据**推导**角色状态：

- quote 有数据 → collector = working
- indicators 有结果 → analyst = working
- signals 有信号 → strategist = working
- health 有异常 → inspector = alert

**问题：推导逻辑无法反映后端真实运行时状态。** 比如后端 `BackgroundIngestor` 正在重连 MT5，但 quote 缓存中仍有上一次的数据，前端会错误地显示 collector = working。

### 3.2 后端需要实现什么

```
src/api/studio.py  (新文件)
├── GET /v1/studio/agents
│   → 聚合 10 个模块的运行时状态，映射为 StudioAgent[]
│   → 每个 agent 需要: id, status, task, metrics, alertLevel, updatedAt
│
├── GET /v1/studio/events?limit=50
│   → 从 EventStore 拉取最近事件，映射为 StudioEvent[]
│
└── GET /v1/studio/summary
    → 聚合: account, environment, health, activeAgents, alertCount

src/api/studio_ws.py  (新文件, 可后期实现)
└── WS /v1/ws/studio
    → 连接时发送 snapshot
    → 模块状态变化时发送 agent_update
    → 新事件时发送 event_append
```

### 3.3 各模块 → StudioAgent 映射建议

| 后端模块 | agent.id | status 映射逻辑 |
|----------|----------|-----------------|
| `BackgroundIngestor` | `collector` | 线程 alive + 最近心跳 < 10s → `working`；MT5 断连 → `disconnected`；重连中 → `reconnecting` |
| `UnifiedIndicatorManager` | `analyst` | event_loop_running + 最近计算 < 30s → `working`；计算中 → `thinking`；异常 → `error` |
| `SignalModule` | `strategist` | 有活跃信号 → `working`；评估中 → `thinking`；无策略 → `idle` |
| `VotingEngine`（如有） | `voter` | 投票进行中 → `working`；等待信号 → `thinking` |
| `FilterChain + RiskService` | `risk_officer` | 审核中 → `reviewing`；通过 → `success`；拦截 → `blocked`；队列异常 → `alert` |
| `TradeExecutor` | `trader` | 执行中 → `working`；等待信号 → `idle`；被拦截 → `blocked` |
| `PositionManager` | `position_manager` | 有持仓 → `working`；SL 触发 → `alert`；无持仓 → `idle` |
| `TradingModule`（账户） | `accountant` | 正常 → `working`；保证金不足 → `alert` |
| `EconomicCalendarService` | `calendar_reporter` | 正常监控 → `working`；高影响事件临近 → `alert` |
| `MonitoringManager` | `inspector` | 全部健康 → `reviewing`；有异常组件 → `alert`；严重故障 → `error` |

### 3.4 协议类型参考

前端已定义完整类型（`src/types/protocol.ts`），后端按此实现即可：

```typescript
interface StudioAgent {
  id: string;              // 角色 ID (collector / analyst / ...)
  name: string;            // 显示名 (采集员 / 分析师 / ...)
  module: string;          // 后端模块名
  zone: string;            // 功能区域
  status: ActivityStatus;  // idle | working | thinking | reviewing | ...
  task: string;            // 当前任务描述
  symbol?: string;
  metrics?: Record<string, string | number | boolean | null>;
  alertLevel?: "none" | "info" | "warning" | "error";
  updatedAt: string;       // ISO 8601
}

interface StudioEvent {
  eventId: string;
  type: string;            // signal_generated | trade_executed | ...
  source: string;          // 来源角色 ID
  target?: string;         // 目标角色 ID
  symbol?: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
  createdAt: string;       // ISO 8601
}
```

### 3.5 WebSocket 消息协议

```jsonc
// 连接时推送完整快照
{ "type": "snapshot", "payload": { "agents": [...], "events": [...], "summary": {...} } }

// 单个角色状态变更
{ "type": "agent_update", "payload": { "id": "collector", "status": "working", "task": "...", ... } }

// 新事件追加
{ "type": "event_append", "payload": { "eventId": "...", "type": "...", "source": "...", ... } }

// 心跳
{ "type": "ping" }  →  { "type": "pong" }
```

### 3.6 实施优先级

| 优先级 | 内容 | 理由 |
|--------|------|------|
| **P0** | `GET /studio/agents` REST 端点 | 前端可立即替换 sync 推导，获得真实状态 |
| **P0** | `GET /studio/events` REST 端点 | 前端事件流目前完全依赖 mock |
| **P1** | `WS /ws/studio` WebSocket | 可将轮询延迟从 3-5s 降至 <100ms |
| **P2** | `GET /studio/summary` | 低优先，TopBar 已从 REST 数据自行计算 |

---

## 四、前端后续任务（当后端 Studio API 就绪后）

| 任务 | 说明 |
|------|------|
| 新增 Studio 轮询 | 在 `usePolling.ts` 中增加 `pollStudioAgents()` 和 `pollStudioEvents()`，直接写入 employee store |
| 降级 sync 引擎 | `engine/sync.ts` 改为 fallback — 只在 Studio API 不可用时才启用推导逻辑 |
| 启用 WebSocket | `useWebSocket.ts` 已实现完整的 `wsHandlers.ts` 路由，后端实现 `/ws/studio` 后直接可用 |
| 减少轮询频率 | WebSocket 就绪后，market/health/live 轮询可从 3-5s 放宽到 10-30s 作为 fallback |

---

## 五、后端已有但前端未使用的能力

以下接口前端目前没有用到，但对 3D 可视化有价值，可在未来阶段集成：

| 后端端点 | 潜在用途 |
|----------|----------|
| `GET /stream`（SSE） | 实时行情推送，可替代 quote 轮询 |
| `GET /signals/evaluate` | 可视化策略评估过程（策略师动画） |
| `GET /signals/conflicts` | 策略冲突可视化（投票员动画） |
| `GET /monitoring/startup` | 启动阶段可视化（角色逐个上线） |
| `GET /monitoring/components` | 巡检员详细组件状态 |
| `GET /economic/calendar/trade-guard` | 日历员风险窗口可视化 |
| `POST /trade/from-signal` | 交易链路端到端可视化 |
| `GET /monitoring/pending-entries` | 待确认入场可视化（交易员等待状态） |

---

## 六、总结

### 前端需要改的（小）

1. OHLC 参数 `count` → `limit`（1 行）
2. 信号字段 `timestamp` → `generated_at` 的 adapter 兼容（3 行）
3. 队列字段名与后端对齐（统一 `types.ts` 和 `usePolling.ts`）

### 后端需要改的（大）

1. **[P0]** 新增 Studio REST 端点（`/studio/agents`, `/studio/events`）
2. **[P0]** 各模块暴露运行时状态供 Studio 聚合
3. **[P1]** 新增 WebSocket `/ws/studio`
4. **[P1]** `/signals/recent` 返回 `signal_id` 和 `reason` 字段
5. **[P1]** `/signals/strategies` 返回完整 `StrategyInfo` 而非纯字符串
6. **[P2]** `/monitoring/health` 新增轻量 summary 端点
7. **[P2]** `/monitoring/queues` 返回结构化 list 而非嵌套 dict

### 双方需要对齐的

1. 约定队列字段命名规范
2. 约定 `StudioAgent` / `StudioEvent` 的字段协议（前端 `types/protocol.ts` 已有定义，后端按此实现即可）
