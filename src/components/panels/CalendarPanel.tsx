/**
 * 经济日历面板 — 显示交易员最关心的核心维度
 *
 * - 事件倒计时
 * - 预测值 / 前值 / 实际值
 * - 影响程度
 * - 对黄金的历史方向影响（利多/利空）
 */

import { useSignalStore, selectCalendarEvents } from "@/store/signals";
import { cn } from "@/lib/utils";

/** 倒计时格式化 */
function formatCountdown(minutes: number): string {
  if (minutes <= 0) return "已过";
  if (minutes < 60) return `${Math.round(minutes)}分钟`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}小时`;
  return `${Math.round(minutes / 1440)}天`;
}

/** 影响程度标签 */
function ImportanceBadge({ level }: { level: number }) {
  return (
    <span className={cn(
      "inline-flex h-4 min-w-[16px] items-center justify-center rounded text-[10px] font-bold",
      level >= 3 ? "bg-danger/20 text-danger" :
      level >= 2 ? "bg-warning/20 text-warning" :
      "bg-text-muted/20 text-text-muted",
    )}>
      {"!".repeat(Math.min(level, 3))}
    </span>
  );
}

/** 黄金影响方向标签 */
function GoldImpact({ impact }: { impact: NonNullable<import("@/api/types").EnrichedCalendarEvent["gold_impact"]> }) {
  return (
    <div className="mt-1 flex gap-2 text-[10px]">
      <span className="text-text-muted">
        {">"} 预测:
        <span className={impact.above_forecast === "利多" ? "ml-0.5 text-success" : "ml-0.5 text-danger"}>
          {impact.above_forecast}
        </span>
      </span>
      <span className="text-text-muted">
        {"<"} 预测:
        <span className={impact.below_forecast === "利多" ? "ml-0.5 text-success" : "ml-0.5 text-danger"}>
          {impact.below_forecast}
        </span>
      </span>
      {impact.bullish_pct != null && (
        <span className="text-text-muted">
          利多率 <span className="text-text-secondary">{Math.round(impact.bullish_pct * 100)}%</span>
        </span>
      )}
    </div>
  );
}

/** 单个事件行 */
function EventRow({ event }: { event: import("@/api/types").EnrichedCalendarEvent }) {
  const isPast = event.countdown_minutes <= 0;
  const isUrgent = event.countdown_minutes > 0 && event.countdown_minutes < 60;
  const hasActual = event.actual != null && event.actual !== "" && event.actual !== "None";

  return (
    <div className={cn(
      "rounded-md border px-2.5 py-2",
      isPast ? "border-border/50 opacity-60" :
      isUrgent ? "border-warning/40 bg-warning/5" :
      "border-border",
    )}>
      {/* 第一行：影响程度 + 事件名 + 倒计时 */}
      <div className="flex items-center gap-1.5">
        <ImportanceBadge level={event.importance} />
        <span className="flex-1 truncate text-xs text-text-primary">{event.event_name}</span>
        <span className={cn(
          "shrink-0 text-[10px]",
          isUrgent ? "font-medium text-warning" : "text-text-muted",
        )}>
          {formatCountdown(event.countdown_minutes)}
        </span>
      </div>

      {/* 第二行：预测 / 前值 / 实际 */}
      <div className="mt-1 flex gap-3 text-[10px]">
        <span className="text-text-muted">
          预测 <span className="text-text-secondary">{event.forecast ?? "-"}</span>
        </span>
        <span className="text-text-muted">
          前值 <span className="text-text-secondary">{event.previous ?? "-"}</span>
        </span>
        {hasActual && (
          <span className="text-text-muted">
            实际 <span className="font-medium text-accent">{event.actual}</span>
          </span>
        )}
      </div>

      {/* 第三行：黄金影响方向（有历史统计时显示） */}
      {event.gold_impact && <GoldImpact impact={event.gold_impact} />}

      {/* 底部：时间 + 国家/货币 */}
      <div className="mt-1 flex items-center gap-2 text-[9px] text-text-muted">
        <span>{event.scheduled_at_local?.replace("T", " ").slice(5, 16) ?? ""}</span>
        <span>{event.country}</span>
        <span>{event.currency}</span>
        {event.status === "released" && <span className="text-success">已公布</span>}
      </div>
    </div>
  );
}

export function CalendarPanel() {
  const events = useSignalStore(selectCalendarEvents);

  const future = events.filter((e) => e.countdown_minutes > 0);
  const past = events.filter((e) => e.countdown_minutes <= 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-text-secondary">
        经济日历
        {events.length > 0 && (
          <span className="ml-1 text-text-muted">({future.length} 待公布)</span>
        )}
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {events.length === 0 && (
          <div className="py-8 text-center text-xs text-text-muted">暂无日历数据</div>
        )}
        {future.map((e) => <EventRow key={e.event_uid} event={e} />)}
        {past.length > 0 && (
          <>
            <div className="px-1 pt-2 text-[10px] text-text-muted">已过/已公布</div>
            {past.map((e) => <EventRow key={e.event_uid} event={e} />)}
          </>
        )}
      </div>
    </div>
  );
}
