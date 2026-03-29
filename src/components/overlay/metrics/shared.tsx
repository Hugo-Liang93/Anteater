import { cn } from "@/lib/utils";

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[13px] uppercase tracking-wider text-text-muted">{children}</span>
  );
}

export function KV({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div>
      <div className="text-text-muted">{k}</div>
      <div className={`font-mono ${color ?? "text-text-primary"}`}>{v}</div>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="text-[13px] text-text-muted">{text}</p>;
}

export function TugOfWarBar({
  buy,
  sell,
  total,
  small,
}: {
  buy: number;
  sell: number;
  total: number;
  small?: boolean;
}) {
  const buyPct = total > 0 ? (buy / total) * 100 : 50;
  const sellPct = total > 0 ? (sell / total) * 100 : 50;
  const h = small ? "h-1" : "h-1.5";

  return (
    <div className={cn("flex w-full overflow-hidden rounded-full", h, "bg-bg-secondary")}>
      {buyPct > 0 && (
        <div className={cn(h, "rounded-l-full bg-buy/70")} style={{ width: `${buyPct}%` }} />
      )}
      {sellPct > 0 && (
        <div className={cn(h, "ml-auto rounded-r-full bg-sell/70")} style={{ width: `${sellPct}%` }} />
      )}
    </div>
  );
}

export function MiniCandleChart({
  snapshots,
}: {
  snapshots: { o: number; h: number; l: number; c: number }[];
}) {
  if (snapshots.length === 0) return null;

  const allHigh = Math.max(...snapshots.map((s) => s.h));
  const allLow = Math.min(...snapshots.map((s) => s.l));
  const range = allHigh - allLow || 1;
  const h = 48;
  const w = 240;

  const points = snapshots
    .map((s, i) => {
      const x = snapshots.length > 1 ? (i / (snapshots.length - 1)) * w : w / 2;
      const y = h - ((s.c - allLow) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  const areaHigh = snapshots
    .map((s, i) => {
      const x = snapshots.length > 1 ? (i / (snapshots.length - 1)) * w : w / 2;
      return `${x},${h - ((s.h - allLow) / range) * h}`;
    })
    .join(" ");

  const areaLow = [...snapshots]
    .reverse()
    .map((s, i) => {
      const ri = snapshots.length - 1 - i;
      const x = snapshots.length > 1 ? (ri / (snapshots.length - 1)) * w : w / 2;
      return `${x},${h - ((s.l - allLow) / range) * h}`;
    })
    .join(" ");

  const last = snapshots[snapshots.length - 1]!;
  const first = snapshots[0]!;
  const isUp = last.c >= first.o;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      <polygon
        points={`${areaHigh} ${areaLow}`}
        fill={isUp ? "rgba(0,212,170,0.1)" : "rgba(255,71,87,0.1)"}
      />
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? "#00d4aa" : "#ff4757"}
        strokeWidth="1.5"
      />
      <line
        x1="0"
        y1={h - ((first.o - allLow) / range) * h}
        x2={w}
        y2={h - ((first.o - allLow) / range) * h}
        stroke="#5a6d7e"
        strokeWidth="0.5"
        strokeDasharray="4,3"
      />
    </svg>
  );
}
