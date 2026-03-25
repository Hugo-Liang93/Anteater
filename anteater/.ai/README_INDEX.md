# MT5 3D 虚拟办公室 — 设计文档索引

> 项目入口文档：`/CLAUDE.md`（项目概述、架构、开发规范、常用命令）

本目录保留仍在参考使用的设计文档。已完整落地到代码中的规划/规范文档已清理。

## 当前文档

| 文档 | 用途 | 何时需要 |
|------|------|----------|
| `ARCHITECTURE.md` | 分层架构、数据流、模块边界 | 开发时对照架构 |
| `API_CONTRACT.md` | REST / WebSocket 接口协议 | 后端对接、调试 |
| `CHARACTER_ROSTER.md` | 10 角色详细设计（外观/职责/动画/道具） | 美术升级 Phase H |
| `VISUAL_STYLE_GUIDE.md` | 视觉风格规范（暖色卡通 3D 工作室） | 美术升级 Phase H |
| `FOLLOW_UP_BACKEND.md` | 后端待实现的状态推送清单 | 后端开发、跨团队协作 |

## 已清理的文档（内容已落地）

- ~~PLAN_FULL.md~~ → 核心内容在 `/CLAUDE.md` 项目概述 + 当前进度
- ~~TASKS.md~~ → Phase A-G 已实现，待办在 `/CLAUDE.md` 待实现段落
- ~~UI_SPEC.md~~ → 100% 落地到 `src/components/` 组件代码
- ~~ANIMATION_SPEC.md~~ → 落地到 `Character3D.tsx` + `engine/sync.ts`
- ~~ASSET_GUIDE.md~~ → 落地到 `config/assets.ts` + `config/layout.ts`
