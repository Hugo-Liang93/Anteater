/**
 * 2D 工作室主画布
 *
 * 使用纯 Canvas 2D 绘制（轻量、无 PixiJS 初始化开销）。
 * 后续可平滑迁移到 PixiJS 以支持粒子效果和精灵动画。
 *
 * 布局分区：
 *   采集区(左上) → 分析区(中上) → 策略室(右上)
 *   风控台(右中) → 交易台(右下) → 仓位区(中下)
 *   支持区(左下): 会计 + 日历员 + 巡检员
 */

import { useRef, useEffect, useCallback } from "react";
import { employeeConfigs, type EmployeeConfig } from "@/config/employees";
import { useEmployeeStore, type ActivityStatus } from "@/store/employees";

/** 每个角色在画布中的位置（相对于画布宽高的比例 0~1） */
const ZONE_POSITIONS: Record<string, { x: number; y: number }> = {
  collector: { x: 0.12, y: 0.22 },
  analyst: { x: 0.38, y: 0.22 },
  strategist: { x: 0.62, y: 0.18 },
  voter: { x: 0.62, y: 0.35 },
  risk_officer: { x: 0.85, y: 0.30 },
  trader: { x: 0.85, y: 0.55 },
  position_manager: { x: 0.55, y: 0.72 },
  accountant: { x: 0.15, y: 0.72 },
  calendar_reporter: { x: 0.15, y: 0.52 },
  inspector: { x: 0.35, y: 0.72 },
};

/** 数据流连接线（从 → 到） */
const DATA_FLOWS: [string, string][] = [
  ["collector", "analyst"],
  ["analyst", "strategist"],
  ["strategist", "voter"],
  ["voter", "risk_officer"],
  ["risk_officer", "trader"],
  ["trader", "position_manager"],
];

const AVATAR_RADIUS = 24;
const LABEL_OFFSET = 38;

function getStatusColor(status: ActivityStatus): string {
  switch (status) {
    case "working":
      return "#00d4aa";
    case "alert":
      return "#ffa726";
    case "error":
      return "#ff4757";
    case "success":
      return "#00d4aa";
    default:
      return "#5a6d7e";
  }
}

export function StudioCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef(0);
  const setSelected = useEmployeeStore((s) => s.setSelectedEmployee);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    const employees = useEmployeeStore.getState().employees;
    const t = Date.now() / 1000;

    // ─── 背景 ───
    ctx.fillStyle = "#0f1923";
    ctx.fillRect(0, 0, W, H);

    // 网格
    ctx.strokeStyle = "#1a2634";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // ─── 区域标签 ───
    const zones = [
      { label: "采集区", x: 0.12, y: 0.08 },
      { label: "分析区", x: 0.38, y: 0.08 },
      { label: "策略室", x: 0.62, y: 0.06 },
      { label: "风控台", x: 0.85, y: 0.16 },
      { label: "交易台", x: 0.85, y: 0.44 },
      { label: "仓位区", x: 0.55, y: 0.60 },
      { label: "支持区", x: 0.20, y: 0.60 },
    ];
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    zones.forEach((z) => {
      ctx.fillStyle = "#2a3f52";
      ctx.fillText(z.label, z.x * W, z.y * H);
    });

    // ─── 数据流连接线 ───
    DATA_FLOWS.forEach(([from, to]) => {
      const pFrom = ZONE_POSITIONS[from];
      const pTo = ZONE_POSITIONS[to];
      if (!pFrom || !pTo) return;

      const x1 = pFrom.x * W;
      const y1 = pFrom.y * H;
      const x2 = pTo.x * W;
      const y2 = pTo.y * H;

      // 底线
      ctx.beginPath();
      ctx.strokeStyle = "#1e3044";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 流动粒子
      const fromEmp = employees[from as keyof typeof employees];
      if (fromEmp?.status === "working") {
        const progress = (t * 0.3) % 1;
        const px = x1 + (x2 - x1) * progress;
        const py = y1 + (y2 - y1) * progress;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#00d4aa";
        ctx.fill();

        // 拖尾
        const trail = ((t * 0.3) - 0.05) % 1;
        if (trail > 0) {
          const tx = x1 + (x2 - x1) * trail;
          const ty = y1 + (y2 - y1) * trail;
          ctx.beginPath();
          ctx.arc(tx, ty, 2, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0, 212, 170, 0.4)";
          ctx.fill();
        }
      }
    });

    // ─── 员工角色 ───
    employeeConfigs.forEach((cfg: EmployeeConfig) => {
      const pos = ZONE_POSITIONS[cfg.id];
      const emp = employees[cfg.id];
      if (!pos || !emp) return;

      const cx = pos.x * W;
      const cy = pos.y * H;

      // 工位背景圆
      ctx.beginPath();
      ctx.arc(cx, cy, AVATAR_RADIUS + 6, 0, Math.PI * 2);
      ctx.fillStyle = "#152028";
      ctx.fill();
      ctx.strokeStyle = "#2a3f52";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 头像圆
      ctx.beginPath();
      ctx.arc(cx, cy, AVATAR_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = cfg.color;
      ctx.fill();

      // 头像文字
      ctx.fillStyle = "#0f1923";
      ctx.font = "bold 16px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cfg.name[0]!, cx, cy);

      // 状态呼吸环
      if (emp.status === "working" || emp.status === "alert") {
        const pulse = Math.sin(t * 3) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(cx, cy, AVATAR_RADIUS + 10, 0, Math.PI * 2);
        ctx.strokeStyle = getStatusColor(emp.status);
        ctx.lineWidth = 2;
        ctx.globalAlpha = pulse;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 状态小圆点
      const dotX = cx + AVATAR_RADIUS * 0.7;
      const dotY = cy - AVATAR_RADIUS * 0.7;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
      ctx.fillStyle = getStatusColor(emp.status);
      ctx.fill();
      ctx.strokeStyle = "#0f1923";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 名称标签
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#e8edf2";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(cfg.name, cx, cy + LABEL_OFFSET);

      // 当前任务（截断）
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#5a6d7e";
      const task =
        emp.currentTask.length > 16
          ? emp.currentTask.slice(0, 15) + "…"
          : emp.currentTask;
      ctx.fillText(task, cx, cy + LABEL_OFFSET + 16);
    });

    animFrameRef.current = requestAnimationFrame(draw);
  }, []);

  // 初始化 & resize
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);

    const onResize = () => {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(draw);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [draw]);

  // 点击检测
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
      if (dist <= AVATAR_RADIUS + 10) {
        setSelected(cfg.id);
        return;
      }
    }
    // 点击空白关闭
    setSelected(null);
  };

  return (
    <div ref={containerRef} className="h-full w-full">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="cursor-pointer"
      />
    </div>
  );
}
