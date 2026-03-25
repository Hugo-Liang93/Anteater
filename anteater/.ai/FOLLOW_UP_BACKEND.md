# 后端 Follow-Up 需求清单

> 前端动画系统已按 ANIMATION_SPEC.md 完整实现所有状态动画，但部分状态目前由前端 sync 引擎根据现有数据推断。
> 以下列出需要后端支持的能力，以实现更精确的状态驱动。

---

## 1. 新增状态字段推送

### 1.1 组件级状态枚举扩展

前端已支持的 `ActivityStatus` 完整集合：

```
idle | working | thinking | reviewing | success | alert | error | blocked | disconnected | reconnecting
```

**需要后端做的：**

- [ ] 在 `/api/studio/agents` 和 WebSocket `agent_update` 消息中，为每个 agent 推送精确的 `status` 字段
- [ ] 后端各模块应在关键状态转换时发出对应状态：
  - `SignalModule` → 信号评估时发送 `thinking`，评估完成发送 `working`
  - `VotingEngine` → 投票汇总时发送 `thinking`，有结果时发送 `working`
  - `FilterChain / RiskService` → 审核中发送 `reviewing`，通过发送 `success`，拦截发送 `blocked`
  - `TradeExecutor` → 准备执行时发送 `thinking`，执行成功发送 `success`，被拒发送 `blocked`
  - 所有模块 → 连接断开时发送 `disconnected`，重连中发送 `reconnecting`

### 1.2 推荐的后端状态映射表

| 后端组件 | 前端角色 | 推荐状态映射 |
|----------|----------|-------------|
| BackgroundIngestor | collector | `working` (数据流入中) / `disconnected` (MT5断连) / `reconnecting` (重连中) |
| UnifiedIndicatorManager | analyst | `working` (计算完成) / `thinking` (计算中) / `error` (计算失败) |
| SignalModule | strategist | `working` (有信号) / `thinking` (评估中) / `error` (策略异常) |
| VotingEngine | voter | `working` (投票完成) / `thinking` (汇总中) |
| FilterChain + RiskService | risk_officer | `reviewing` (审核中) / `success` (通过) / `blocked` (拦截) / `alert` (队列异常) |
| TradeExecutor | trader | `working` (持仓中) / `thinking` (准备执行) / `success` (执行成功) / `blocked` (执行被拒) |
| PositionManager | position_manager | `working` (有仓位) / `alert` (止损触发) |
| TradingModule | accountant | `working` (正常) / `alert` (保证金不足) |
| EconomicCalendarService | calendar_reporter | `working` (监控中) / `alert` (高影响事件临近) |
| MonitoringManager | inspector | `reviewing` (巡检中) / `alert` (组件异常) / `error` (严重故障) |

---

## 2. WebSocket 实时推送

前端已创建 WebSocket 管理器 (`src/api/ws.ts`)，支持以下消息类型：

```typescript
type WsMessageType =
  | "snapshot"        // 全量快照
  | "agent_update"    // 单个 agent 状态变更
  | "event_append"    // 新事件
  | "summary_update"  // 汇总数据更新
  | "connection_status" // 连接状态
  | "pong";           // 心跳响应
```

**需要后端做的：**

- [ ] 实现 WebSocket 端点 `ws://host:port/ws/studio`
- [ ] 连接建立时发送 `snapshot` 消息（全量 agent 状态 + 最近事件）
- [ ] 状态变更时发送 `agent_update`（增量更新单个 agent）
- [ ] 新事件发生时发送 `event_append`（信号生成、交易执行、风控拦截等）
- [ ] 响应 `ping` 消息返回 `pong`（心跳保活）

### 2.1 推荐的消息格式

```json
// snapshot
{
  "type": "snapshot",
  "payload": {
    "agents": [
      { "role": "collector", "status": "working", "task": "XAUUSD 2350.12 / 2350.45", "stats": {...} },
      ...
    ],
    "events": [
      { "id": "evt-001", "type": "signal", "source": "strategist", "message": "...", "timestamp": "..." },
      ...
    ]
  },
  "timestamp": "2026-03-25T12:00:00Z"
}

// agent_update
{
  "type": "agent_update",
  "payload": {
    "role": "risk_officer",
    "status": "blocked",
    "task": "风控拦截：保证金不足",
    "stats": { "reason": "margin_insufficient" }
  },
  "timestamp": "2026-03-25T12:00:01Z"
}

// event_append
{
  "type": "event_append",
  "payload": {
    "id": "evt-002",
    "type": "trade_blocked",
    "source": "risk_officer",
    "target": "trader",
    "message": "风控拦截：XAUUSD BUY 0.1 手被拒绝",
    "severity": "warning",
    "timestamp": "2026-03-25T12:00:01Z"
  }
}
```

---

## 3. 事件编排支持

前端已实现事件演出动画（链路增亮、粒子颜色变化等），但需要后端在关键事件发生时发送结构化的事件数据。

**需要后端做的：**

- [ ] 信号生成事件：`SignalModule` 产生信号时发送 `event_append`，包含 `source: "strategist"`, `target: "voter"`
- [ ] 风控审核事件：`FilterChain` 审核完成时发送 `event_append`，包含审核结果 (`approved` / `rejected`)，`source: "risk_officer"`, `target: "trader"`
- [ ] 交易执行事件：`TradeExecutor` 执行完成时发送 `event_append`，包含执行结果 (`executed` / `rejected`)
- [ ] 模块异常事件：任何模块发生异常时发送 `event_append`，`severity: "error"`

### 3.1 事件类型枚举建议

```python
class StudioEventType(str, Enum):
    SIGNAL_GENERATED = "signal_generated"      # 信号产生
    VOTE_COMPLETED = "vote_completed"          # 投票完成
    RISK_APPROVED = "risk_approved"            # 风控通过
    RISK_REJECTED = "risk_rejected"            # 风控拦截
    TRADE_SUBMITTED = "trade_submitted"        # 交易提交
    TRADE_EXECUTED = "trade_executed"           # 交易执行成功
    TRADE_REJECTED = "trade_rejected"          # 交易被拒
    POSITION_OPENED = "position_opened"        # 开仓
    POSITION_CLOSED = "position_closed"        # 平仓
    MODULE_ERROR = "module_error"              # 模块异常
    MODULE_RECOVERED = "module_recovered"      # 模块恢复
    CONNECTION_LOST = "connection_lost"        # 连接断开
    CONNECTION_RESTORED = "connection_restored" # 连接恢复
    CALENDAR_ALERT = "calendar_alert"          # 经济日历高影响事件
```

---

## 4. REST API 扩展

当前前端通过 HTTP 轮询获取数据。以下是建议扩展的端点：

- [ ] `GET /api/studio/agents` — 返回所有 agent 的当前状态（包含上述精确 status 字段）
- [ ] `GET /api/studio/events?limit=50` — 返回最近事件列表
- [ ] `GET /api/studio/summary` — 返回系统汇总（在线 agent 数、告警数、待处理信号数等）

---

## 5. 优先级建议

| 优先级 | 项目 | 影响 |
|--------|------|------|
| **P0** | agent_update 中添加精确 status 字段 | 前端所有动画状态区分依赖此字段 |
| **P0** | disconnected/reconnecting 状态推送 | MT5 连接中断是最常见的异常场景 |
| **P1** | WebSocket 端点实现 | 将轮询延迟从 3-5s 降低到 <100ms |
| **P1** | 事件编排 event_append | 启用链路增亮、风控拦截动画等高级视觉效果 |
| **P2** | REST /api/studio/* 端点 | 提供统一的 Studio 协议层 |

---

## 当前前端临时映射逻辑

在后端支持精确状态推送之前，前端 `sync.ts` 根据以下逻辑推断状态：

| 推断条件 | 映射状态 | 说明 |
|----------|----------|------|
| `connected === false` | `disconnected` | 后端不可达 |
| 分析师无指标但已连接 | `thinking` | 推断为计算中 |
| 策略师有策略但无信号 | `thinking` | 推断为评估中 |
| 风控官队列正常 | `reviewing` | 推断为审核中 |
| 风控官队列丢弃 > 10 | `blocked` | 推断为严重拦截 |
| 交易员有信号无仓位 | `thinking` | 推断为准备执行 |
| 巡检员无异常 | `reviewing` | 推断为巡检中 |

> 后端实现精确状态推送后，这些推断逻辑将被替换为直接使用后端状态。
