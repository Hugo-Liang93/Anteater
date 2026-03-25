/**
 * 像素风 2D 角色渲染器
 *
 * 每个角色由头部、身体、四肢、角色道具组成。
 * 支持 idle / working / alert 三种动画状态。
 * 完全通过 Canvas 2D API 程序化绘制，无需外部资源。
 */

import type { EmployeeRoleType } from "@/config/employees";
import type { ActivityStatus } from "@/store/employees";
import { CHARACTER_APPEARANCES, type HairStyle } from "@/config/assets";

/** 2D 角色外观（继承自 config，附加 drawProp） */
interface CharacterAppearance2D {
  skin: string;
  shirt: string;
  pants: string;
  hair: string;
  hairStyle: HairStyle;
  drawProp: (ctx: CanvasRenderingContext2D, x: number, y: number, t: number, working: boolean) => void;
}

const SCALE = 1.8;

// ─── 角色绘制基础 ───

function drawHead(ctx: CanvasRenderingContext2D, x: number, y: number, app: CharacterAppearance2D) {
  const s = SCALE;
  // 头部
  ctx.fillStyle = app.skin;
  roundRect(ctx, x - 6 * s, y - 22 * s, 12 * s, 12 * s, 3 * s);
  ctx.fill();

  // 头发
  ctx.fillStyle = app.hair;
  switch (app.hairStyle) {
    case "short":
      roundRect(ctx, x - 6.5 * s, y - 23 * s, 13 * s, 5 * s, 2 * s);
      ctx.fill();
      break;
    case "long":
      roundRect(ctx, x - 7 * s, y - 23 * s, 14 * s, 8 * s, 3 * s);
      ctx.fill();
      break;
    case "spiky":
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(x + i * 2.5 * s - 1 * s, y - 25 * s - Math.abs(i) * 1.5 * s, 2 * s, 4 * s);
      }
      break;
    case "ponytail":
      roundRect(ctx, x - 6.5 * s, y - 23 * s, 13 * s, 5 * s, 2 * s);
      ctx.fill();
      ctx.fillRect(x + 5 * s, y - 20 * s, 3 * s, 10 * s);
      break;
    case "bald":
      break;
  }

  // 眼睛
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(x - 3 * s, y - 17 * s, 2 * s, 2 * s);
  ctx.fillRect(x + 1.5 * s, y - 17 * s, 2 * s, 2 * s);
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  app: CharacterAppearance2D,
  t: number,
  working: boolean,
) {
  const s = SCALE;
  const breathe = Math.sin(t * 2) * 0.3 * s;

  // 身体
  ctx.fillStyle = app.shirt;
  roundRect(ctx, x - 5 * s, y - 10 * s + breathe, 10 * s, 12 * s, 2 * s);
  ctx.fill();

  // 手臂
  const armSwing = working ? Math.sin(t * 6) * 4 * s : Math.sin(t * 1.5) * 1 * s;
  ctx.fillStyle = app.skin;
  // 左臂
  ctx.fillRect(x - 8 * s, y - 8 * s + breathe, 3 * s, 8 * s + armSwing * 0.3);
  // 右臂
  ctx.fillRect(x + 5 * s, y - 8 * s + breathe, 3 * s, 8 * s - armSwing * 0.3);

  // 裤子
  ctx.fillStyle = app.pants;
  ctx.fillRect(x - 5 * s, y + 2 * s + breathe, 4.5 * s, 8 * s);
  ctx.fillRect(x + 0.5 * s, y + 2 * s + breathe, 4.5 * s, 8 * s);

  // 鞋子
  ctx.fillStyle = "#2d2d3d";
  ctx.fillRect(x - 5.5 * s, y + 10 * s + breathe, 5 * s, 2.5 * s);
  ctx.fillRect(x + 0.5 * s, y + 10 * s + breathe, 5 * s, 2.5 * s);
}

// ─── 角色道具 ───

function drawMonitor(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, working: boolean) {
  const s = SCALE;
  // 桌面显示器
  ctx.fillStyle = "#2a3f52";
  roundRect(ctx, x + 12 * s, y - 16 * s, 16 * s, 12 * s, 2 * s);
  ctx.fill();
  ctx.fillStyle = working ? "#00d4aa" : "#1a2634";
  ctx.fillRect(x + 14 * s, y - 14 * s, 12 * s, 8 * s);
  // 屏幕闪烁
  if (working) {
    const flicker = Math.sin(t * 8) > 0 ? 0.15 : 0;
    ctx.fillStyle = `rgba(0, 212, 170, ${flicker})`;
    ctx.fillRect(x + 14 * s, y - 14 * s, 12 * s, 8 * s);
    // 数据行
    ctx.fillStyle = "#00ffcc";
    for (let i = 0; i < 3; i++) {
      const w = 4 + Math.sin(t * 3 + i) * 3;
      ctx.fillRect(x + 15 * s, y - 13 * s + i * 3 * s, w * s, 1.5 * s);
    }
  }
  // 支架
  ctx.fillStyle = "#2a3f52";
  ctx.fillRect(x + 18 * s, y - 4 * s, 4 * s, 3 * s);
  ctx.fillRect(x + 16 * s, y - 1 * s, 8 * s, 1.5 * s);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function drawClipboard(ctx: CanvasRenderingContext2D, x: number, y: number, _t: number, _working: boolean) {
  const s = SCALE;
  ctx.fillStyle = "#8d6e63";
  roundRect(ctx, x + 10 * s, y - 10 * s, 8 * s, 11 * s, 1.5 * s);
  ctx.fill();
  ctx.fillStyle = "#e8edf2";
  ctx.fillRect(x + 11.5 * s, y - 8 * s, 5 * s, 7 * s);
  // 文字行
  ctx.fillStyle = "#5a6d7e";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + 12 * s, y - 7 * s + i * 2.5 * s, 4 * s, 1 * s);
  }
}

function drawShield(ctx: CanvasRenderingContext2D, x: number, y: number, _t: number, working: boolean) {
  const s = SCALE;
  ctx.fillStyle = working ? "#ef5350" : "#5a6d7e";
  // 盾牌形状
  ctx.beginPath();
  ctx.moveTo(x - 12 * s, y - 12 * s);
  ctx.lineTo(x - 6 * s, y - 14 * s);
  ctx.lineTo(x - 0 * s, y - 12 * s);
  ctx.lineTo(x - 0 * s, y - 3 * s);
  ctx.lineTo(x - 6 * s, y + 1 * s);
  ctx.lineTo(x - 12 * s, y - 3 * s);
  ctx.closePath();
  ctx.fill();
  // 对勾/叉号
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  if (working) {
    ctx.moveTo(x - 9 * s, y - 8 * s);
    ctx.lineTo(x - 6.5 * s, y - 5 * s);
    ctx.lineTo(x - 3 * s, y - 11 * s);
  } else {
    ctx.moveTo(x - 9 * s, y - 10 * s);
    ctx.lineTo(x - 3 * s, y - 5 * s);
    ctx.moveTo(x - 3 * s, y - 10 * s);
    ctx.lineTo(x - 9 * s, y - 5 * s);
  }
  ctx.stroke();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function drawBriefcase(ctx: CanvasRenderingContext2D, x: number, y: number, _t: number, _working: boolean) {
  const s = SCALE;
  ctx.fillStyle = "#66bb6a";
  roundRect(ctx, x + 8 * s, y - 2 * s, 10 * s, 7 * s, 1.5 * s);
  ctx.fill();
  ctx.fillStyle = "#43a047";
  ctx.fillRect(x + 11 * s, y - 4 * s, 4 * s, 2.5 * s);
  // 搭扣
  ctx.fillStyle = "#ffd54f";
  ctx.fillRect(x + 12 * s, y + 0.5 * s, 2 * s, 2 * s);
}

function drawCalendar(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, working: boolean) {
  const s = SCALE;
  ctx.fillStyle = "#7e57c2";
  roundRect(ctx, x + 10 * s, y - 12 * s, 12 * s, 13 * s, 1.5 * s);
  ctx.fill();
  // 日历头
  ctx.fillStyle = "#5e35b1";
  ctx.fillRect(x + 10 * s, y - 12 * s, 12 * s, 4 * s);
  // 日期格
  ctx.fillStyle = "#e8edf2";
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.fillRect(x + 11.5 * s + c * 3.5 * s, y - 7 * s + r * 4 * s, 2.5 * s, 2.5 * s);
    }
  }
  // 闪烁高亮
  if (working && Math.sin(t * 4) > 0) {
    ctx.fillStyle = "rgba(255, 167, 38, 0.6)";
    ctx.fillRect(x + 15 * s, y - 7 * s, 2.5 * s, 2.5 * s);
  }
}

function drawMagnifier(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, working: boolean) {
  const s = SCALE;
  const swing = working ? Math.sin(t * 3) * 3 * s : 0;
  // 手柄
  ctx.strokeStyle = "#8d6e63";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(x + 14 * s + swing, y - 2 * s);
  ctx.lineTo(x + 18 * s + swing, y + 4 * s);
  ctx.stroke();
  // 镜片
  ctx.beginPath();
  ctx.arc(x + 12 * s + swing, y - 5 * s, 4.5 * s, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(100, 200, 255, 0.2)";
  ctx.fill();
  ctx.strokeStyle = "#78909c";
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();
}

function drawGavel(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, working: boolean) {
  const s = SCALE;
  const angle = working ? Math.sin(t * 5) * 0.3 : 0;
  ctx.save();
  ctx.translate(x + 12 * s, y - 6 * s);
  ctx.rotate(angle);
  // 柄
  ctx.fillStyle = "#8d6e63";
  ctx.fillRect(-1 * s, -2 * s, 2 * s, 10 * s);
  // 锤头
  ctx.fillStyle = "#5d4037";
  roundRect(ctx, -3.5 * s, -5 * s, 7 * s, 4 * s, 1 * s);
  ctx.fill();
  ctx.restore();
}

function drawBox(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, working: boolean) {
  const s = SCALE;
  const bounce = working ? Math.abs(Math.sin(t * 4)) * 3 * s : 0;
  // 数据箱
  ctx.fillStyle = "#4fc3f7";
  roundRect(ctx, x + 9 * s, y - 10 * s - bounce, 8 * s, 7 * s, 1.5 * s);
  ctx.fill();
  // 数据流符号
  ctx.fillStyle = "#0288d1";
  ctx.fillRect(x + 10.5 * s, y - 9 * s - bounce, 5 * s, 1 * s);
  ctx.fillRect(x + 10.5 * s, y - 7 * s - bounce, 3.5 * s, 1 * s);
  ctx.fillRect(x + 10.5 * s, y - 5 * s - bounce, 4.5 * s, 1 * s);
}

function drawCalculator(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, working: boolean) {
  const s = SCALE;
  ctx.fillStyle = "#78909c";
  roundRect(ctx, x + 10 * s, y - 10 * s, 8 * s, 12 * s, 1.5 * s);
  ctx.fill();
  // 屏幕
  ctx.fillStyle = working ? "#a5d6a7" : "#455a64";
  ctx.fillRect(x + 11.5 * s, y - 9 * s, 5 * s, 3 * s);
  // 按钮
  ctx.fillStyle = "#b0bec5";
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.fillRect(x + 11 * s + c * 2 * s, y - 5 * s + r * 2.5 * s, 1.5 * s, 1.5 * s);
    }
  }
  // 按钮闪烁
  if (working && Math.sin(t * 6) > 0.3) {
    const bx = Math.floor((Math.sin(t * 7) + 1) * 1.5);
    const by = Math.floor((Math.cos(t * 5) + 1) * 1);
    ctx.fillStyle = "#ffd54f";
    ctx.fillRect(x + 11 * s + bx * 2 * s, y - 5 * s + by * 2.5 * s, 1.5 * s, 1.5 * s);
  }
}

// ─── 道具类型映射 ───

const PROP_DRAW_MAP: Record<string, (ctx: CanvasRenderingContext2D, x: number, y: number, t: number, working: boolean) => void> = {
  box: drawBox,
  monitor: drawMonitor,
  gavel: drawGavel,
  shield: drawShield,
  briefcase: drawBriefcase,
  clipboard: drawClipboard,
  calculator: drawCalculator,
  calendar: drawCalendar,
  magnifier: drawMagnifier,
};

// ─── 角色外观映射（从 config/assets.ts 派生，附加 drawProp） ───

const APPEARANCES: Record<EmployeeRoleType, CharacterAppearance2D> = Object.fromEntries(
  (Object.entries(CHARACTER_APPEARANCES) as [EmployeeRoleType, typeof CHARACTER_APPEARANCES[EmployeeRoleType]][]).map(
    ([role, cfg]) => [
      role,
      {
        skin: cfg.skin,
        shirt: cfg.shirt,
        pants: cfg.pants,
        hair: cfg.hair,
        hairStyle: cfg.hairStyle,
        drawProp: PROP_DRAW_MAP[cfg.propType] ?? drawBox,
      },
    ],
  ),
) as Record<EmployeeRoleType, CharacterAppearance2D>;

// ─── 主绘制函数 ───

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  role: EmployeeRoleType,
  status: ActivityStatus,
  t: number,
) {
  const app = APPEARANCES[role];
  if (!app) return;

  const working = status === "working" || status === "success";
  const isAlert = status === "alert" || status === "error";

  ctx.save();

  // 告警时全身闪红
  if (isAlert && Math.sin(t * 6) > 0) {
    ctx.globalAlpha = 0.7;
  }

  // 阴影
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(x, y + 13 * SCALE, 8 * SCALE, 2 * SCALE, 0, 0, Math.PI * 2);
  ctx.fill();

  // 道具（在角色后面或旁边）
  app.drawProp(ctx, x, y, t, working);

  // 身体
  drawBody(ctx, x, y, app, t, working);

  // 头部
  drawHead(ctx, x, y, app);

  ctx.restore();
}

/** 绘制角色头顶状态指示器 */
export function drawStatusIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  status: ActivityStatus,
  t: number,
) {
  const s = SCALE;
  const dotY = y - 28 * s + Math.sin(t * 3) * 1.5 * s;

  let color: string;
  switch (status) {
    case "working": color = "#00d4aa"; break;
    case "alert": color = "#ffa726"; break;
    case "error": color = "#ff4757"; break;
    case "success": color = "#00d4aa"; break;
    default: color = "#5a6d7e"; break;
  }

  // 外圈光晕
  if (status === "working" || status === "alert" || status === "error") {
    ctx.beginPath();
    ctx.arc(x, dotY, 5 * s, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.15 + Math.sin(t * 4) * 0.1;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 状态点
  ctx.beginPath();
  ctx.arc(x, dotY, 2.5 * s, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// ─── 工具函数 ───

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
