# MT5 3D 虚拟办公室前后端接口约定（API_CONTRACT）

## 1. 文档目的

本文档用于定义前端与 MT5 后端之间的最小可用接口约定。  
目标是确保：

- 前后端字段一致
- mock 数据与真实接口一致
- WebSocket / REST 各自职责明确
- 前端只依赖统一协议，不依赖后端内部类结构

---

## 2. 设计原则

1. 首版接口优先稳定，不追求复杂
2. 返回字段尽量面向前端消费，而不是暴露后端内部实现
3. 所有时间字段统一使用 ISO 8601 字符串
4. 枚举值固定化，避免自由文本导致前端分支过多
5. 允许通过 mapper 做二次映射，但后端接口本身仍应尽量规范

---

## 3. 前端统一协议对象

## 3.1 StudioAgent
```ts
export interface StudioAgent {
  id: string;
  name: string;
  module: string;
  zone: string;
  status: string;
  task: string;
  symbol?: string;
  metrics?: Record<string, string | number | boolean | null>;
  alertLevel?: "none" | "info" | "warning" | "error";
  updatedAt: string;
}
```

## 3.2 StudioEvent
```ts
export interface StudioEvent {
  eventId: string;
  type: string;
  source: string;
  target?: string;
  symbol?: string;
  level: "info" | "warning" | "error";
  message: string;
  createdAt: string;
}
```

---

## 4. REST 接口建议

## 4.1 获取初始角色状态
### 请求
`GET /api/studio/agents`

### 响应示例
```json
{
  "agents": [
    {
      "id": "mt5_agent",
      "name": "MT5接入员",
      "module": "mt5_connector",
      "zone": "mt5",
      "status": "working",
      "task": "保持终端连接",
      "symbol": "XAUUSD",
      "metrics": {
        "connected": true,
        "account": "demo-001",
        "heartbeatAgeSec": 2
      },
      "alertLevel": "none",
      "updatedAt": "2026-03-25T10:00:00Z"
    }
  ]
}
```

---

## 4.2 获取最近事件
### 请求
`GET /api/studio/events?limit=50`

### 响应示例
```json
{
  "events": [
    {
      "eventId": "evt_001",
      "type": "signal_generated",
      "source": "signal_agent",
      "target": "risk_agent",
      "symbol": "XAUUSD",
      "level": "info",
      "message": "生成 BUY 信号，等待风控审核",
      "createdAt": "2026-03-25T10:00:05Z"
    }
  ]
}
```

---

## 4.3 获取全局总览
### 请求
`GET /api/studio/summary`

### 响应示例
```json
{
  "account": "demo-001",
  "symbol": "XAUUSD",
  "environment": "demo",
  "health": "good",
  "activeAgents": 5,
  "alertCount": 1,
  "wsConnected": true,
  "updatedAt": "2026-03-25T10:00:10Z"
}
```

---

## 4.4 获取单角色详情（可选）
### 请求
`GET /api/studio/agents/{agentId}`

### 响应示例
```json
{
  "id": "risk_agent",
  "name": "风控官",
  "module": "risk",
  "zone": "risk",
  "status": "reviewing",
  "task": "审核 BUY 0.2 lot",
  "symbol": "XAUUSD",
  "metrics": {
    "cooldownActive": false,
    "riskScore": 0.23,
    "maxPositionAllowed": true
  },
  "alertLevel": "none",
  "updatedAt": "2026-03-25T10:00:08Z",
  "lastError": null,
  "recentEvents": [
    {
      "eventId": "evt_010",
      "type": "risk_check_started",
      "source": "risk_agent",
      "level": "info",
      "message": "开始审核 BUY 请求",
      "createdAt": "2026-03-25T10:00:07Z"
    }
  ]
}
```

---

## 5. WebSocket 消息建议

## 5.1 连接地址
示例：
`ws://host/api/studio/ws`

---

## 5.2 消息类型一览
建议后端推送统一包结构：

```json
{
  "type": "agent_update",
  "payload": {}
}
```

支持的 `type` 建议包括：

- `snapshot`
- `agent_update`
- `event_append`
- `summary_update`
- `connection_status`
- `heartbeat`

---

## 5.3 snapshot
用于首次连接后返回全量状态。

```json
{
  "type": "snapshot",
  "payload": {
    "agents": [],
    "events": [],
    "summary": {}
  }
}
```

---

## 5.4 agent_update
用于单角色状态变更。

```json
{
  "type": "agent_update",
  "payload": {
    "id": "signal_agent",
    "name": "交易判断官",
    "module": "signal",
    "zone": "signal",
    "status": "judging",
    "task": "EMA + ATR 判定",
    "symbol": "XAUUSD",
    "metrics": {
      "confidence": 0.74,
      "output": "HOLD"
    },
    "alertLevel": "none",
    "updatedAt": "2026-03-25T10:00:12Z"
  }
}
```

---

## 5.5 event_append
用于追加单条新事件。

```json
{
  "type": "event_append",
  "payload": {
    "eventId": "evt_021",
    "type": "order_rejected",
    "source": "execution_agent",
    "target": "risk_agent",
    "symbol": "XAUUSD",
    "level": "warning",
    "message": "订单被拒绝，等待重试",
    "createdAt": "2026-03-25T10:00:14Z"
  }
}
```

---

## 5.6 summary_update
用于顶部全局概览更新。

```json
{
  "type": "summary_update",
  "payload": {
    "account": "demo-001",
    "symbol": "XAUUSD",
    "environment": "demo",
    "health": "warning",
    "activeAgents": 6,
    "alertCount": 2,
    "wsConnected": true,
    "updatedAt": "2026-03-25T10:00:15Z"
  }
}
```

---

## 5.7 connection_status
用于明确连接相关状态。

```json
{
  "type": "connection_status",
  "payload": {
    "backendConnected": true,
    "mt5Connected": false,
    "status": "reconnecting",
    "updatedAt": "2026-03-25T10:00:18Z"
  }
}
```

---

## 6. 状态枚举建议

## 6.1 agent status
后端返回建议只使用约定好的枚举之一：

- idle
- working
- walking
- thinking
- waiting
- warning
- error
- success
- disconnected
- reconnecting
- reviewing
- blocked
- approved
- submitting
- executed
- rejected
- judging
- signal_ready

---

## 6.2 alert level
只允许：
- none
- info
- warning
- error

---

## 6.3 event level
只允许：
- info
- warning
- error

---

## 7. mapper 建议

前端允许 mapper 做以下处理：
- 后端字段重命名
- 后端模块名映射为前端角色名
- 缺省 alertLevel 填 `none`
- 非法 status 回退到 `warning` 或 `idle`
- 时间空值使用当前时间或丢弃消息

但不建议 mapper 做业务逻辑判断。

---

## 8. 容错与降级

## 8.1 REST 容错
- 某个 agent 缺字段时，前端填默认值
- agents 接口失败时，页面进入“空载 + 重试”状态

## 8.2 WebSocket 容错
- 消息 JSON 解析失败时记录错误并忽略
- 未知 `type` 消息直接跳过
- payload 缺关键字段时不更新 store

---

## 9. mock 与真实接口一致性要求

前端开发阶段的 mock 数据必须遵循本文件字段结构。  
不得出现：
- mock 与 live 字段名不同
- mock status 值不在枚举中
- mock 时间格式与真实接口不一致

---

## 10. 最小必需接口清单

首版最少应提供：

### REST
- `/api/studio/agents`
- `/api/studio/events`
- `/api/studio/summary`

### WebSocket
- `snapshot`
- `agent_update`
- `event_append`
- `summary_update`

只要这套齐全，首版虚拟办公室就可以用真实数据驱动。
