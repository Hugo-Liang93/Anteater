# MT5 3D 虚拟办公室项目开发任务拆解（TASKS）

## 0. 使用说明

本文档用于把《MT5 3D 虚拟办公室项目实施计划（Plan）》进一步拆解为可执行开发任务。  
拆解原则：

- 先做骨架，再做联动，再做美术升级
- 每个阶段都要求“可运行、可演示、可验收”
- 优先保证主链路：接入 → 行情 → 指标 → 信号 → 风控 → 执行
- 前端先使用 mock 数据驱动，再接入真实后端
- 正式角色模型和高级动画放在后续阶段

---

# 1. 总任务视图

## 阶段 A：项目基础整理
目标：让现有 React + TypeScript + Vite 项目具备承载 3D 办公室的基础条件

## 阶段 B：3D 场景骨架
目标：搭出可运行的 3D 工作室基础空间

## 阶段 C：角色系统
目标：把核心模块映射成 6 个基础员工角色

## 阶段 D：状态驱动与 Mock 联动
目标：角色能根据状态变化而变化

## 阶段 E：2D UI 联动
目标：形成“3D 场景 + 业务 UI”一体化页面

## 阶段 F：主链路可视化
目标：把系统流程和模块协作表现出来

## 阶段 G：真实后端接入
目标：从 mock 升级到真实 MT5 后端状态

## 阶段 H：美术升级
目标：从占位角色升级为统一风格的卡通员工

## 阶段 I：扩展能力
目标：加入实验室、巡检、更多交互与更高完成度

---

# 2. 阶段 A：项目基础整理

## A1. 确认当前工程依赖
### 任务
- 检查 `package.json`
- 确认已有：
  - react
  - react-dom
  - typescript
  - vite
- 确认是否已使用 Tailwind CSS
- 确认当前主布局组件与页面入口

### 验收标准
- 能明确当前项目技术栈
- 能确认 `AppShell` / `Studio3D` / `Sidebar` / `TopBar` 等组件所在位置

---

## A2. 安装 3D 与状态管理依赖
### 任务
安装以下依赖：
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `zustand`
- `framer-motion`

开发依赖：
- `@types/three`

### 验收标准
- 本地 `npm install` / `pnpm install` 成功
- 无依赖冲突
- 项目可继续正常启动

---

## A3. 建立前端目录骨架
### 任务
在现有工程中补充以下目录：

```text
src/
├─ components/
│  ├─ layout/
│  ├─ overlay/
│  └─ studio/
├─ store/
├─ services/
├─ types/
```

继续在 `studio/` 下拆分：
```text
studio/
├─ Studio3D.tsx
├─ StudioScene.tsx
├─ StudioCamera.tsx
├─ StudioLights.tsx
├─ zones/
├─ agents/
└─ flows/
```

### 验收标准
- 目录创建完成
- 命名清晰
- 不影响现有项目启动

---

## A4. 定义基础类型文件
### 任务
创建：
- `src/types/agent.ts`
- `src/types/event.ts`
- `src/types/ui.ts`

### 至少定义
- `AgentStatus`
- `StudioAgent`
- `StudioEvent`
- 选中角色状态类型
- 告警级别类型

### 验收标准
- 类型文件可被全局引用
- 无循环依赖
- 类型命名统一

---

# 3. 阶段 B：3D 场景骨架

## B1. 建立最小可运行的 Studio3D
### 任务
在 `Studio3D.tsx` 中创建最小可运行 Canvas：

- `<Canvas>`
- 基础相机
- 基础光照
- 简单地面

### 验收标准
- 页面中间区域可显示 3D 画布
- 无黑屏
- 无明显渲染报错
- 浏览器控制台无关键错误

---

## B2. 搭建场景基础组件
### 任务
创建并接入：
- `StudioScene.tsx`
- `StudioCamera.tsx`
- `StudioLights.tsx`

### 建议内容
- 相机固定斜俯视角
- 环境光 + 主光源
- 场景背景色
- 地板平面

### 验收标准
- 相机角度稳定
- 光线可正常照亮对象
- 场景有明确空间感

---

## B3. 实现功能区域占位
### 任务
建立 6 个基础区域组件：
- `Mt5Zone.tsx`
- `MarketZone.tsx`
- `IndicatorZone.tsx`
- `SignalZone.tsx`
- `RiskZone.tsx`
- `ExecutionZone.tsx`

### 首版实现方式
- 使用基础几何体做区域底座
- 用颜色区分区域
- 可加简单标签

### 验收标准
- 用户一眼可看出 6 个不同区域
- 区域空间布局合理
- 角色有明确站位位置

---

## B4. 场景布局微调
### 任务
- 调整区域位置、尺寸和间距
- 调整相机距离
- 调整顶部 UI 与 3D 画布之间的空间关系
- 确保右侧详情面板不会压到主可视区域

### 验收标准
- 主区域不拥挤
- 画面构图清晰
- 后续能自然加入角色和连线

---

# 4. 阶段 C：角色系统

## C1. 创建角色基础类型与配置
### 任务
在 `agents/` 中定义：
- 角色 ID
- 模块名
- 区域名
- 默认位置
- 默认颜色
- 默认标签名称

### 建议创建
- `agent.config.ts`
- `agent.types.ts`

### 验收标准
- 角色配置集中管理
- 每个角色有唯一 ID
- 配置可被场景直接消费

---

## C2. 创建基础角色组件
### 任务
创建：
- `AgentAvatar.tsx`
- `AgentLabel.tsx`
- `AgentEffects.tsx`

### 首版实现方式
- 角色先用简化几何体占位
- 标签显示角色名
- 颜色反映角色类型

### 验收标准
- 场景中可见 6 个角色
- 每个角色有名字
- 每个角色能被点击或悬停

---

## C3. 布置 6 个核心角色
### 任务
创建并布置：
1. MT5 接入员
2. 行情采集员
3. 指标工程师
4. 信号策略员
5. 风控官
6. 执行员

### 验收标准
- 角色与区域一一对应
- 名称清晰
- 首版站位符合流程顺序

---

## C4. 实现角色基础交互
### 任务
- hover 高亮
- click 选中
- 被选中角色添加边框/光圈/抬高效果

### 验收标准
- 用户可以选中任一角色
- 被选中状态清晰可见
- 交互反馈自然

---

# 5. 阶段 D：状态驱动与 Mock 联动

## D1. 创建全局 store
### 任务
建立 Zustand store：
- `agent.store.ts`
- `event.store.ts`
- `ui.store.ts`

### agent.store 至少管理
- 所有角色状态
- 当前选中角色
- 角色更新方法

### event.store 至少管理
- 事件流列表
- 追加事件方法
- 清理旧事件方法

### ui.store 至少管理
- 右侧面板开关
- 告警面板状态
- 当前场景模式

### 验收标准
- store 可被页面和场景同时使用
- 状态更新后 UI 可同步变化

---

## D2. 编写 mock 数据
### 任务
创建 mock 数据文件：
- `mock.agents.ts`
- `mock.events.ts`

### 内容建议
让 6 个角色分别处于不同状态：
- 接入员：working
- 行情员：working
- 指标员：working
- 信号员：judging
- 风控官：reviewing
- 执行员：idle

### 验收标准
- 页面首次渲染就能看到角色状态
- mock 数据结构与未来真实接口一致

---

## D3. 角色状态映射到视觉表现
### 任务
根据状态实现不同视觉表现：

- `idle`：轻微待机
- `working`：轻微上下浮动 / 动作图标
- `judging`：思考图标
- `reviewing`：审核图标
- `warning`：黄灯/黄环
- `error`：红灯/红环/轻微抖动
- `success`：绿光短闪

### 验收标准
- 用户不用看详情也能感知角色状态
- 不同状态区分明显

---

## D4. 添加简单时间驱动动画
### 任务
- 使用 R3F `useFrame` 或动画状态驱动角色轻微动态
- 加呼吸感、悬浮感或状态抖动

### 验收标准
- 角色不是“死的”
- 动画不过度抢戏
- 不影响后续替换正式模型

---

# 6. 阶段 E：2D UI 联动

## E1. 顶部总览栏
### 任务
创建或补充 `TopBar` / `GlobalStatus`

### 建议展示
- 当前账户
- 当前 symbol
- 系统健康度
- 告警数
- 活跃模块数

### 验收标准
- 顶部信息简洁清晰
- 与场景状态联动

---

## E2. 右侧角色详情面板
### 任务
实现 `EmployeeDetail.tsx`

### 展示内容
- 角色名
- 模块名
- 当前状态
- 当前任务
- symbol
- 核心 metrics
- 最近更新时间
- 最近错误
- 最近 3 条事件

### 验收标准
- 点击角色后能展示正确详情
- 没选中角色时显示空状态或引导态
- 面板信息层次清楚

---

## E3. 底部事件流
### 任务
实现 `BottomEventFeed.tsx`

### 展示内容
- 时间
- 事件级别
- 事件消息
- 来源/目标模块

### 验收标准
- 事件按时间排序
- 新事件能滚动进入
- 不会无限膨胀导致性能问题

---

## E4. 悬停提示
### 任务
给角色实现悬停浮层，显示：
- 名称
- 当前状态
- 当前任务

### 验收标准
- 不需要点击也能快速知道角色在做什么
- 浮层不会闪烁或位置错乱

---

# 7. 阶段 F：主链路可视化

## F1. 实现主链路线条
### 任务
创建 `FlowLine.tsx`

### 链路包括
- MT5 接入员 → 行情采集员
- 行情采集员 → 指标工程师
- 指标工程师 → 信号策略员
- 信号策略员 → 风控官
- 风控官 → 执行员

### 验收标准
- 场景中可直观看到主要流程
- 线条不遮挡角色主体

---

## F2. 加入流动粒子/光点
### 任务
创建 `FlowParticle.tsx`

### 表现建议
- 沿线路移动的小光点
- 不同状态可改变颜色或密度

### 验收标准
- 流程具有“正在运转”的感觉
- 效果不过重，不影响阅读

---

## F3. 链路事件演出
### 任务
在特定事件下触发视觉效果：
- 信号产生时：信号员区域闪光
- 风控拒绝时：风控区红色拦截效果
- 执行成功时：执行区绿色确认光效
- 模块异常时：对应角色区红灯闪烁

### 验收标准
- 关键事件有明显反馈
- 用户能快速定位发生点

---

# 8. 阶段 G：真实后端接入

## G1. 设计状态聚合接口
### 任务
和后端约定至少两个统一入口：

1. 模块状态接口
2. 事件流接口

### 模块状态接口至少包含
- agentId
- module
- status
- task
- symbol
- metrics
- updatedAt

### 验收标准
- 前后端协议明确
- mock 与真实数据结构一致

---

## G2. 实现 WebSocket 客户端
### 任务
创建：
- `ws.client.ts`
- `ws.handlers.ts`

### 功能
- 建立连接
- 接收消息
- 解析消息
- 更新 store
- 断线重连
- 基本错误处理

### 验收标准
- 能接收后端推送
- 断线场景可被正确显示
- 无明显内存泄漏

---

## G3. 实现 mapper
### 任务
创建：
- `backend-to-agent.mapper.ts`
- `backend-to-event.mapper.ts`

### 原则
后端原始状态 → 统一前端状态协议

### 验收标准
- 前端场景不依赖后端内部命名
- mapper 层职责清晰

---

## G4. 接入真实数据并替换 mock
### 任务
- 初期保留 mock fallback
- 确认真实数据接入后切换为 live 模式
- 验证所有角色状态切换是否正常

### 验收标准
- 角色状态和真实系统一致
- 事件流与真实事件一致
- 告警表现可信

---

# 9. 阶段 H：美术升级

## H1. 制定角色视觉规范
### 任务
定义统一风格：
- 头身比例
- 面部风格
- 服装风格
- 颜色分工
- 材质质感
- 是否使用描边/卡通渲染

### 验收标准
- 有明确视觉规范文档
- 后续模型制作有统一标准

---

## H2. 确定角色资源方案
### 可选路线
1. 先用统一底模 + 颜色区分岗位
2. 再做岗位专属配件
3. 最后做更细的人物差异

### 验收标准
- 模型来源明确
- 风格统一
- 可导出为 GLB

---

## H3. 替换占位角色
### 任务
- 将简化几何体角色替换为 GLB 模型
- 调整位置、缩放、朝向
- 验证标签挂点位置

### 验收标准
- 模型能正常加载
- 不穿模、不严重变形
- 场景整体风格提升

---

## H4. 动作升级
### 任务
为角色加入更真实的岗位动作：
- 待机
- 行走
- 工作中
- 思考
- 警告
- 完成

### 验收标准
- 动作符合岗位语义
- 动作切换不突兀
- 不影响实时状态驱动

---

# 10. 阶段 I：扩展能力

## I1. 巡检员系统
### 任务
加入巡检角色，实现巡逻路径与异常定位

## I2. API 前台
### 任务
加入 FastAPI 请求入口的可视化角色与区域

## I3. 数据仓库区
### 任务
加入缓存/落盘/历史数据的可视化区域

## I4. 实验室
### 任务
加入回测与参数实验可视化空间

## I5. 多视图模式
### 任务
支持：
- 主工作室视图
- 监控视图
- 实验室视图

---

# 11. 文件级拆解建议

## 优先创建文件
### 布局/UI
- `src/components/layout/AppShell.tsx`
- `src/components/layout/TopBar.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/overlay/EmployeeDetail.tsx`
- `src/components/overlay/BottomEventFeed.tsx`
- `src/components/overlay/GlobalStatus.tsx`

### 场景
- `src/components/studio/Studio3D.tsx`
- `src/components/studio/StudioScene.tsx`
- `src/components/studio/StudioCamera.tsx`
- `src/components/studio/StudioLights.tsx`

### 区域
- `src/components/studio/zones/Mt5Zone.tsx`
- `src/components/studio/zones/MarketZone.tsx`
- `src/components/studio/zones/IndicatorZone.tsx`
- `src/components/studio/zones/SignalZone.tsx`
- `src/components/studio/zones/RiskZone.tsx`
- `src/components/studio/zones/ExecutionZone.tsx`

### 角色
- `src/components/studio/agents/AgentAvatar.tsx`
- `src/components/studio/agents/AgentLabel.tsx`
- `src/components/studio/agents/AgentEffects.tsx`
- `src/components/studio/agents/agent.config.ts`
- `src/components/studio/agents/agent.types.ts`

### 流程
- `src/components/studio/flows/FlowLine.tsx`
- `src/components/studio/flows/FlowParticle.tsx`

### 状态与通信
- `src/store/agent.store.ts`
- `src/store/event.store.ts`
- `src/store/ui.store.ts`
- `src/services/ws.client.ts`
- `src/services/ws.handlers.ts`
- `src/services/mapper/backend-to-agent.mapper.ts`
- `src/services/mapper/backend-to-event.mapper.ts`

### 类型
- `src/types/agent.ts`
- `src/types/event.ts`
- `src/types/metrics.ts`
- `src/types/ui.ts`

---

# 12. 验收里程碑

## 里程碑 M1：3D 办公室雏形
### 必须满足
- 3D Canvas 跑通
- 6 个区域可见
- 6 个角色可见
- 基本相机与灯光完成

## 里程碑 M2：角色活起来
### 必须满足
- Mock 数据联动
- 状态变化可见
- 角色可点击
- 详情面板可打开

## 里程碑 M3：主链路看得懂
### 必须满足
- 链路线条完成
- 事件流完成
- 顶部总览完成
- 主流程能够被观察理解

## 里程碑 M4：真实状态驱动
### 必须满足
- WebSocket 接入
- 真实状态更新
- 真实事件流更新
- 异常与告警可信

## 里程碑 M5：风格升级
### 必须满足
- 正式角色模型接入
- 风格统一
- 动作更自然
- 画面具备演示价值

---

# 13. 首轮建议工期顺序

## 第 1 周
- 阶段 A 完成
- 阶段 B 完成
- 阶段 C 基础完成

## 第 2 周
- 阶段 D 完成
- 阶段 E 完成

## 第 3 周
- 阶段 F 完成
- 阶段 G 开始接入

## 第 4 周
- 阶段 G 稳定
- 阶段 H 开始替换模型

---

# 14. 开发注意事项

## 14.1 不要过早陷入模型细节
首版一律用占位角色验证流程。

## 14.2 状态结构必须先稳定
前后端协议不稳，后面 UI 和场景都会反复返工。

## 14.3 3D 层不要塞业务逻辑
3D 只负责展示，业务状态由 store 和 mapper 驱动。

## 14.4 每一阶段都要有演示点
不要埋头做很久才看结果。

## 14.5 先固定视角，再考虑漫游
首版固定俯视斜角最适合业务观察。

---

# 15. 下一步建议

完成本文档后，最适合继续补的两份文档是：

1. **ARCHITECTURE.md**
   - 说明前端分层、通信关系、数据流转方式

2. **UI_SPEC.md**
   - 说明各面板字段、状态颜色、角色标签、交互规则

如果后面进入代码阶段，还可以继续补：

3. **API_CONTRACT.md**
4. **ANIMATION_SPEC.md**
5. **ASSET_GUIDE.md**

这样整个项目会越来越工程化，而不是停留在概念层。
