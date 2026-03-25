/**
 * 2D 工作室主画布
 *
 * 使用 Canvas 2D 绘制像素风办公室场景：
 * - 程序化绘制的 2D 数字员工（带 idle/working/alert 动画）
 * - 工位/桌椅场景元素
 * - 数据流粒子动画
 * - 角色状态气泡
 * - 点击交互
 */

import { useRef, useEffect, useCallback } from "react";
import { employeeConfigs } from "@/config/employees";
import { useEmployeeStore, type ActivityStatus } from "@/store/employees";
import { drawCharacter, drawStatusIndicator } from "@/engine/character";

/** 角色在画布中的位置（比例 0~1） */
const ZONE_POSITIONS: Record<string, { x: number; y: number }> = {
  collector: { x: 0.10, y: 0.28 },
  analyst: { x: 0.32, y: 0.28 },
  strategist: { x: 0.56, y: 0.22 },
  voter: { x: 0.56, y: 0.42 },
  risk_officer: { x: 0.80, y: 0.28 },
  trader: { x: 0.80, y: 0.52 },
  position_manager: { x: 0.56, y: 0.72 },
  accountant: { x: 0.16, y: 0.72 },
  calendar_reporter: { x: 0.10, y: 0.52 },
  inspector: { x: 0.36, y: 0.72 },
};

/** 数据流连接（从 → 到） */
const DATA_FLOWS: [string, string][] = [
  ["collector", "analyst"],
  ["analyst", "strategist"],
  ["strategist", "voter"],
  ["voter", "risk_officer"],
  ["risk_officer", "trader"],
  ["trader", "position_manager"],
];

/** 区域标签 */
const ZONE_LABELS = [
  { label: "采 集 区", x: 0.10, y: 0.12 },
  { label: "分 析 区", x: 0.32, y: 0.12 },
  { label: "策 略 室", x: 0.56, y: 0.09 },
  { label: "风 控 台", x: 0.80, y: 0.14 },
  { label: "交 易 台", x: 0.80, y: 0.42 },
  { label: "持 仓 区", x: 0.56, y: 0.60 },
  { label: "支 持 区", x: 0.20, y: 0.58 },
];

const HIT_RADIUS = 30;

// ─── 粒子系统 ───

interface Particle {
  fromX: number; fromY: number;
  toX: number; toY: number;
  progress: number;
  speed: number;
  size: number;
  color: string;
}

function createFlowParticles(
  flows: [string, string][],
  employees: Record<string, { status: ActivityStatus }>,
  W: number, H: number,
): Particle[] {
  const particles: Particle[] = [];
  for (const [from, to] of flows) {
    const emp = employees[from];
    if (!emp || emp.status !== "working") continue;
    const pFrom = ZONE_POSITIONS[from];
    const pTo = ZONE_POSITIONS[to];
    if (!pFrom || !pTo) continue;

    // 每条流上生成 2 个粒子（错开相位）
    for (let i = 0; i < 2; i++) {
      particles.push({
        fromX: pFrom.x * W, fromY: pFrom.y * H,
        toX: pTo.x * W, toY: pTo.y * H,
        progress: i * 0.5,
        speed: 0.25 + Math.random() * 0.1,
        size: 3 + Math.random() * 2,
        color: "#00d4aa",
      });
    }
  }
  return particles;
}

// ─── 场景绘制 ───

function drawGrid(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.strokeStyle = "#141e28";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(W, y);
    ctx.stroke();
  }
}

function drawZoneAreas(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // 半透明区域背景
  const zones = [
    { x: 0.01, y: 0.14, w: 0.22, h: 0.28, color: "rgba(79,195,247,0.04)" },  // 采集
    { x: 0.23, y: 0.14, w: 0.22, h: 0.28, color: "rgba(171,71,188,0.04)" },   // 分析
    { x: 0.46, y: 0.08, w: 0.22, h: 0.46, color: "rgba(255,183,77,0.04)" },   // 策略
    { x: 0.70, y: 0.14, w: 0.22, h: 0.50, color: "rgba(239,83,80,0.04)" },    // 风控+交易
    { x: 0.01, y: 0.56, w: 0.68, h: 0.28, color: "rgba(120,144,156,0.04)" },  // 支持
  ];

  for (const z of zones) {
    ctx.fillStyle = z.color;
    ctx.fillRect(z.x * W, z.y * H, z.w * W, z.h * H);
    ctx.strokeStyle = "rgba(42,63,82,0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(z.x * W, z.y * H, z.w * W, z.h * H);
    ctx.setLineDash([]);
  }
}

function drawZoneLabels(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.font = "11px 'JetBrains Mono', 'Consolas', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#2a3f52";
  for (const z of ZONE_LABELS) {
    ctx.fillText(z.label, z.x * W, z.y * H);
  }
}

function drawFlowLines(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
) {
  for (const [from, to] of DATA_FLOWS) {
    const pFrom = ZONE_POSITIONS[from];
    const pTo = ZONE_POSITIONS[to];
    if (!pFrom || !pTo) continue;

    ctx.beginPath();
    ctx.strokeStyle = "rgba(42,63,82,0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.moveTo(pFrom.x * W, pFrom.y * H);
    ctx.lineTo(pTo.x * W, pTo.y * H);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  t: number,
) {
  for (const p of particles) {
    const prog = ((t * p.speed + p.progress) % 1);
    const px = p.fromX + (p.toX - p.fromX) * prog;
    const py = p.fromY + (p.toY - p.fromY) * prog;

    // 光晕
    ctx.beginPath();
    ctx.arc(px, py, p.size * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 212, 170, 0.08)";
    ctx.fill();

    // 主体
    ctx.beginPath();
    ctx.arc(px, py, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    // 拖尾
    const trail = ((t * p.speed + p.progress) - 0.04) % 1;
    if (trail > 0) {
      const tx = p.fromX + (p.toX - p.fromX) * trail;
      const ty = p.fromY + (p.toY - p.fromY) * trail;
      ctx.beginPath();
      ctx.arc(tx, ty, p.size * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 212, 170, 0.3)";
      ctx.fill();
    }
  }
}

function drawNameTag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  task: string,
  color: string,
  status: ActivityStatus,
) {
  const tagY = y + 22;

  // 名称
  ctx.font = "bold 11px 'JetBrains Mono', 'Consolas', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.fillText(name, x, tagY);

  // 当前任务（截断）
  ctx.font = "9px 'JetBrains Mono', 'Consolas', monospace";
  ctx.fillStyle = status === "error" ? "#ff4757" : "#5a6d7e";
  const display = task.length > 18 ? task.slice(0, 17) + "…" : task;
  ctx.fillText(display, x, tagY + 14);
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  status: ActivityStatus,
  t: number,
) {
  if (status === "idle") return;

  const bubbleY = y - 55 + Math.sin(t * 2.5) * 2;
  let emoji: string;
  switch (status) {
    case "working": emoji = "⚡"; break;
    case "alert": emoji = "⚠"; break;
    case "error": emoji = "❌"; break;
    case "success": emoji = "✅"; break;
    default: return;
  }

  // 气泡背景
  ctx.fillStyle = "rgba(21, 32, 40, 0.85)";
  ctx.beginPath();
  ctx.arc(x, bubbleY, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(42, 63, 82, 0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 小三角
  ctx.fillStyle = "rgba(21, 32, 40, 0.85)";
  ctx.beginPath();
  ctx.moveTo(x - 3, bubbleY + 10);
  ctx.lineTo(x + 3, bubbleY + 10);
  ctx.lineTo(x, bubbleY + 15);
  ctx.closePath();
  ctx.fill();

  // 表情
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(emoji, x, bubbleY);
  ctx.textBaseline = "alphabetic";
}

// ─── 主组件 ───

export function StudioCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef(0);
  const cachedRectRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const setSelected = useEmployeeStore((s) => s.setSelectedEmployee);

  const updateCachedRect = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    cachedRectRef.current = { width: rect.width, height: rect.height };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = cachedRectRef.current;
    if (width === 0 || height === 0) {
      updateCachedRect();
      animFrameRef.current = requestAnimationFrame(draw);
      return;
    }
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const W = width;
    const H = height;
    const t = Date.now() / 1000;

    const employees = useEmployeeStore.getState().employees;

    // ─── 背景 ───
    ctx.fillStyle = "#0f1923";
    ctx.fillRect(0, 0, W, H);

    drawGrid(ctx, W, H);
    drawZoneAreas(ctx, W, H);
    drawZoneLabels(ctx, W, H);

    // ─── 数据流 ───
    drawFlowLines(ctx, W, H);
    const particles = createFlowParticles(DATA_FLOWS, employees, W, H);
    drawParticles(ctx, particles, t);

    // ─── 角色 ───
    for (const cfg of employeeConfigs) {
      const pos = ZONE_POSITIONS[cfg.id];
      const emp = employees[cfg.id];
      if (!pos || !emp) continue;

      const cx = pos.x * W;
      const cy = pos.y * H;

      // 气泡（角色后面）
      drawBubble(ctx, cx, cy, emp.status, t);

      // 角色
      drawCharacter(ctx, cx, cy, cfg.id, emp.status, t);

      // 状态指示器
      drawStatusIndicator(ctx, cx, cy, emp.status, t);

      // 名牌
      drawNameTag(ctx, cx, cy, cfg.name, emp.currentTask, cfg.color, emp.status);
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [updateCachedRect]);

  useEffect(() => {
    updateCachedRect();
    animFrameRef.current = requestAnimationFrame(draw);

    const onResize = () => {
      updateCachedRect();
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(draw);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [draw, updateCachedRect]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const W = rect.width;
    const H = rect.height;

    for (const cfg of employeeConfigs) {
      const pos = ZONE_POSITIONS[cfg.id];
      if (!pos) continue;
      const cx = pos.x * W;
      const cy = pos.y * H;
      const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
      if (dist <= HIT_RADIUS) {
        setSelected(cfg.id);
        return;
      }
    }
    setSelected(null);
  };

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="absolute inset-0 cursor-pointer"
      />
    </div>
  );
}
