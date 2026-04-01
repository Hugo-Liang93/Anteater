# CLAUDE.md - Anteater 前端工作说明

## 项目定位

Anteater 不是纯数据看板，也不是装饰性的 3D 页面。
它的目标是把 MT5Services 的后端交易链路转成一个可阅读、可调度、可辅助决策的前端工作台。

当前产品分成三层：

- 业务事实层：展示行情、账户、持仓、指标、信号、风险窗口、系统健康等真实数据
- 流程调度层：把散点数据整理成交易链路、交接关系、阻塞、风险和机会
- AI 决策层：汇总上下文，输出建议、证据、风险和下一步动作，但不直接执行交易

## 技术栈

- React 19
- TypeScript 5.8 strict
- Vite 6
- Tailwind CSS 4
- Zustand 5
- Three.js + @react-three/fiber + @react-three/drei

## 常用命令

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## 当前核心结构

```text
src/
├─ api/                  # REST / SSE / 协议适配
├─ components/
│  ├─ layout/            # 顶栏、左栏、整体骨架
│  ├─ overlay/           # 详情面板、AI 决策区
│  ├─ panels/            # 左栏辅助数据面板
│  └─ studio/            # 3D 工作室场景
├─ config/               # 员工、流程、布局、API 配置
├─ hooks/                # 轮询、SSE、AI brief 等
├─ lib/                  # 纯计算逻辑，如 workflowPanel / decisionDesk
├─ store/                # Zustand 状态源
└─ types/                # 协议与视图类型
```

## 产品分层与展示职责

### 1. 员工

员工只代表主链路里的真实业务节点。
一个模块要想成为“员工”，必须同时满足：

- 在交易链路里承担明确的输入 -> 处理 -> 输出职责
- 会和上下游形成持续交接关系
- 当前状态变化会直接影响主流程推进
- 用户有必要把它当成“工位”来观察和定位

适合做员工的典型角色：

- 采集员
- 分析师 / 实时分析员
- 过滤员 / 市场研判
- 策略师 / 实时策略员
- 投票主席
- 风控官
- 交易员
- 仓管员

原则：

- 员工是主链路节点，不是信息来源标签
- 员工要能解释“我接了谁的输入，我把结果交给谁”
- 如果一个模块没有明确交接语义，就不应先做成员工

### 2. 支撑模块

支撑模块服务于主链路，但本身不是主链路工位。
一个模块符合以下特征时，应优先做成支撑模块：

- 主要职责是提供证据、约束、背景信息或验证结果
- 不直接推进主链路，只影响主链路的判断条件
- 更像能力服务，而不是流程节点
- 用户更关心它提供了什么事实，而不是它“站在场景里做事”

适合做支撑模块的典型能力：

- 账户与保证金
- 经济日历
- 系统巡检
- 回测与研究

原则：

- 支撑模块可以保留数据模型中的角色 id，但 UI 不必拟人化
- 支撑模块应通过“证据”或“约束”挂接到主链路角色
- 不要把账户、日历、回测这类信息源伪装成独立员工

当前明确结论：

- `accountant` 应作为账户状态与保证金支撑模块
- `calendar_reporter` 应作为风险日历支撑模块
- `backtester` 应作为研究与验证支撑模块
- `inspector` 可以保留一定工位表达，但本质仍是支撑能力

### 3. 数据面板

数据面板承载的是低层、通用、辅助性的原始信息浏览。
一个内容应放入数据面板而不是员工/支撑模块，当它符合以下条件：

- 主要用途是查数，而不是表达交接关系
- 内容是宽表、日志流、事件流、时间序列、明细列表
- 用户只需要浏览或过滤，不需要把它当作业务角色理解
- 它更适合作为辅助入口，而不是流程中的主导航对象

适合进入数据面板的内容：

- 原始数据流
- 日志
- 告警列表
- 日历明细
- 明细行情/信号列表

原则：

- 数据面板负责“看数据”
- 支撑模块负责“把数据变成某类业务证据”
- 员工负责“消费证据并推动流程”

## 模块化设计准则

后续新增模块时，必须先做分类，不要直接拟人化。

按下面顺序判断：

### 第一步：它是否直接推进交易主链路？

- 是：优先考虑员工
- 否：继续下一步

### 第二步：它是否主要提供证据、约束或背景条件？

- 是：优先做支撑模块
- 否：继续下一步

### 第三步：它是否主要承载原始明细浏览？

- 是：放数据面板
- 否：再评估是否需要独立模块页，而不是硬塞进员工体系

### 禁止的错误方向

- 不要因为后端有一个模块，就默认前端一定要新增一个员工
- 不要把信息源、明细表、日志流拟人化
- 不要让左栏沦为“另一个点员工入口”
- 不要让支撑模块和主链路角色抢同一层级叙事

## 新增模块评估模板

后续新增任何后端能力或前端模块时，必须先按下面模板评估，再决定归类和展示位置。

### 评估字段

1. 模块名称
2. 后端职责
3. 输入来源
4. 输出内容
5. 是否直接推进交易主链路
6. 是否存在明确上下游交接
7. 对决策的作用类型
8. 用户最需要的使用方式
9. 最终归类
10. 前端展示位置

### 推荐填写格式

```text
模块名称：
后端职责：
输入：
输出：
是否直接推进交易主链路：是 / 否
上下游交接：上游是谁，下游是谁；若没有则明确写无
对决策的作用类型：推进流程 / 提供证据 / 提供约束 / 提供背景 / 提供验证 / 提供明细浏览
用户最需要怎么使用它：看工位状态 / 看证据摘要 / 看原始明细 / 看跨流程总结
最终归类：员工 / 支撑模块 / 数据面板 / 独立模块
前端展示位置：左栏流程角色 / 左栏支撑模块 / 辅助数据面板 / 右侧证据区 / AI 决策区 / 独立页面
```

### 归类硬规则

- 如果它直接推进交易主链路，并且有明确输入、处理、输出和上下游交接，才允许归类为员工
- 如果它主要提供证据、约束、背景条件或验证结果，应归类为支撑模块
- 如果它主要提供原始明细、列表、日志、查数能力，应归类为数据面板
- 如果它跨多个流程工作，不适合挂到单个角色下面，应归类为独立模块

### 快速判断口诀

- 推流程的，才可能是员工
- 给证据的，优先做支撑模块
- 只查数的，放数据面板
- 跨流程总结的，做独立模块

### 当前典型样例

- `accountant`：支撑模块
- `calendar_reporter`：支撑模块
- `backtester`：支撑模块
- `risk_officer`：员工
- `AI decision`：独立模块

## 关键交互语义

- 左栏：看流程、看支撑关系、看待处理事项
- 主场景：看工位、看当前焦点角色
- 右侧详情：看流程详情、员工详情、支撑证据
- AI 决策区：看跨流程总结、建议、证据与风险

这四层语义必须保持分离，不要重新做成同一个入口。

## AI 决策层原则

AI 决策层不是新员工，不进入主场景工位链路。

它的职责是：

- 汇总当前上下文
- 给出结论与置信度
- 展示证据、冲突因素、风险提示、失效条件
- 给出建议动作
- 记录“采纳 / 暂缓 / 忽略”的反馈

实现原则：

- 先模块，后人格
- 先建议，后执行
- 先结构化输出，后自由对话

## 重要目录

- `src/config/employees.ts`：员工与支撑模块的定义边界
- `src/config/workflows.ts`：流程分段与流程角色归属
- `src/lib/workflowPanel.ts`：流程摘要、待处理事项、调度逻辑
- `src/components/layout/Sidebar.tsx`：左栏流程导航与支撑模块入口
- `src/components/overlay/EmployeeDetail.tsx`：流程详情、员工详情、支撑证据
- `src/components/overlay/AIDecisionDeck.tsx`：AI 决策摘要与工作台
- `src/lib/decisionDesk.ts`：AI 决策上下文与建议生成

## 员工 Metrics 组件与数据映射

每个员工在右侧详情面板有一个 Metrics 组件，数据来自后端 Studio mapper → `employee.stats`。

### 组件 → 后端数据源 映射表

| 组件文件 | 员工 ID | 后端 mapper | 关键 metrics 字段 |
|---------|---------|------------|------------------|
| `CollectorMetrics.tsx` | collector | `map_collector(queue_stats, is_backfilling)` | channels, full, critical |
| `AnalystMetrics.tsx` | analyst | `map_analyst(indicator_perf_stats)` | success_rate, computations, indicator_names |
| `LiveAnalystMetrics.tsx` | live_analyst | `map_live_analyst(perf_stats, bars_by_tf, ingest_stats)` | computations, bars_by_tf(迷你K线), ingest_polls |
| `StrategistMetrics.tsx` | strategist | `map_strategist(count, recent_signals, runtime_status)` | strategy_count, buy/sell_count, per_tf_eval_stats, per_tf_skips |
| `LiveStrategistMetrics.tsx` | live_strategist | `map_live_strategist(strategies, preview_signals, runtime)` | preview_signal_count, buy/sell, active_preview |
| `FilterGuardMetrics.tsx` | filter_guard | `map_filter_guard(runtime_status)` | by_scope passed/blocked, realtime_filters(各规则实时状态) |
| `RegimeGuardMetrics.tsx` | regime_guard | `map_regime_guard(runtime_status)` | regime_distribution, regime_details(per-TF), per_tf_skips, affinity_skipped |
| `VoterMetrics.tsx` | voter | `map_voter(runtime_status)` | voting_groups, processed_events + 前端从 signals 计算 vote 结果 |
| `RiskOfficerMetrics.tsx` | risk_officer | `map_risk_officer(executor_status, support_evidence)` | received/passed/blocked, skip_reasons, pnl_circuit_paused, after_eod_block |
| `TraderMetrics.tsx` | trader | `map_trader(executor_status, pending_status)` | execution_count, circuit_open, pending_entries, fill_rate |
| `SupportMetrics.tsx` | position_manager / accountant / calendar / inspector | 各自 mapper | tracked_positions, balance/equity, risk_windows, health |

### 数据流

```
后端 MT5Services:
  src/studio/runtime.py         → register_agent(id, provider_fn)
  src/studio/mappers.py         → map_*(data) → {status, task, metrics}
  src/studio/service.py         → SSE /studio/stream 推送

前端 Anteater:
  src/api/wsHandlers.ts         → handleAgentUpdate → employeeStore.updateEmployee
  src/hooks/usePolling.ts       → 轮询 /studio/agents + /signals/recent → employeeStore + liveStore
  src/store/employees.ts        → employees[role].stats = metrics
  src/components/overlay/metrics/*.tsx → 读取 employee.stats 渲染
```

### 信号数据流（策略师/投票员共用）

```
后端: /signals/recent?scope=all → 返回 signal_events 列表
前端: usePolling → setSignals(confirmed) + setPreviewSignals(intrabar)
      → liveStore.signals: LiveSignal[]
      → StrategistMetrics / VoterMetrics / DecisionSummaryBar 消费
      
LiveSignal 字段: signal_id, symbol, timeframe, strategy, direction, confidence, reason, scope, generated_at
前端过滤: 按 TF 差异化最大保留时长（M5=2h, M15=4h, H1=12h, D1=48h）
前端 cap: confidence = min(原始值, 0.95)
```

### 事件流

```
后端: StudioService.emit_event() → SSE 推送
前端: useEventStore.appendEvent() → 全局事件流
      employeeStore.addAction(role, log) → 角色级事件
      
事件隔离: collectRelatedEvents() 只展示 source=role 或 target=role 的事件
```

## 代码修改约束

- 保持中文统一，不新增英文业务标题
- 复杂判断优先下沉到 `src/lib/` 或 `src/config/`
- 组件负责展示，不要把大量业务判断散落在 JSX 中
- 新增模块前先判断它属于员工、支撑模块还是数据面板
- 若改动影响交互语义，必须同步更新对应文档说明

## 验证要求

前端改动完成后至少运行：

```bash
npm run lint
npm run build
```

如果无法运行，必须明确说明原因和影响面。

## AI 决策层环境变量

```bash
VITE_DECISION_PROVIDER=hybrid
VITE_DECISION_BRIEF_PATH=/decision/brief
VITE_DECISION_MODEL_LABEL=远程模型
VITE_DECISION_TIMEOUT_MS=12000
```
