import { useMemo } from "react";
import { useSignalStore } from "@/store/signals";
import { useUIStore } from "@/store/ui";
import { getWorkflowByRole } from "@/config/workflows";

export function CalendarWidget() {
  const events = useSignalStore((s) => s.calendarEvents);
  const riskWindows = useSignalStore((s) => s.riskWindows);
  const openRightPanel = useUIStore((s) => s.openRightPanel);

  const activeGuardCount = riskWindows.filter((window) => window.guard_active).length;

  const upcoming = useMemo(() => {
    if (events.length > 0) {
      return [...events]
        .filter((event) => event.countdown_minutes > -30)
        .sort((a, b) => a.countdown_minutes - b.countdown_minutes)
        .slice(0, 5);
    }

    if (riskWindows.length > 0) {
      const now = Date.now();
      return [...riskWindows]
        .map((window) => ({
          event_name: window.event_name,
          importance: window.importance,
          countdown_minutes: Math.round(
            (new Date(window.scheduled_at || window.datetime).getTime() - now) / 60_000,
          ),
          country: window.country,
          guard_active: window.guard_active,
        }))
        .filter((window) => window.countdown_minutes > -30)
        .sort((a, b) => a.countdown_minutes - b.countdown_minutes)
        .slice(0, 5);
    }

    return [];
  }, [events, riskWindows]);

  const openCalendarEvidence = () => {
    openRightPanel({
      kind: "employee",
      workflowId: getWorkflowByRole("calendar_reporter") ?? "support",
      employeeId: "calendar_reporter",
    });
  };

  return (
    <div
      className="w-[260px] rounded-xl border border-white/8 backdrop-blur-sm"
      style={{ background: "rgba(20,33,50,0.88)" }}
    >
      <button
        onClick={openCalendarEvidence}
        className="flex w-full items-start justify-between border-b border-white/6 px-3 py-2 transition-colors hover:bg-white/4"
      >
        <div className="flex items-start gap-2">
          <span className="mt-0.5" style={{ color: "#7e57c2" }}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <div className="min-w-0 text-left">
            <div className="text-[11px] font-semibold" style={{ color: "#7e57c2" }}>
              日历证据
            </div>
            <div className="text-[9px] text-white/38">
              提供风险窗口与保护期依据
            </div>
          </div>
        </div>
        {activeGuardCount > 0 ? (
          <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[9px] font-semibold text-warning">
            {activeGuardCount} 保护中
          </span>
        ) : (
          <span className="rounded border border-white/8 px-1.5 py-0.5 text-[9px] text-white/38">
            日历平稳
          </span>
        )}
      </button>

      <div className="flex flex-col gap-0.5 p-1.5">
        {upcoming.length > 0 ? (
          upcoming.map((event, index) => {
            const importance =
              event.importance >= 3 ? "high" : event.importance >= 2 ? "medium" : "low";
            const importanceColor =
              importance === "high" ? "#ff5252" : importance === "medium" ? "#ffa726" : "#607080";
            const countdown = event.countdown_minutes;
            const timeLabel =
              countdown < 0
                ? `${Math.abs(countdown)}m 前`
                : countdown < 60
                  ? `${countdown}m`
                  : `${Math.round(countdown / 60)}h`;
            const isImminent = countdown >= 0 && countdown < 30;
            const guardActive = "guard_active" in event && event.guard_active;

            return (
              <div
                key={`${event.event_name}-${index}`}
                className="flex items-start gap-2 rounded-lg px-2 py-1.5"
                style={{
                  background: guardActive
                    ? "rgba(255,80,30,0.06)"
                    : isImminent
                      ? "rgba(255,167,38,0.05)"
                      : undefined,
                }}
              >
                <span
                  className="mt-0.5 text-[10px] font-bold"
                  style={{ color: importanceColor, minWidth: 16 }}
                >
                  {importance === "high" ? "!!!" : importance === "medium" ? "!!" : "!"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] text-text-secondary">
                    {event.event_name}
                  </div>
                  <div className="text-[9px] text-text-muted">
                    {event.country}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className="font-mono text-[10px] font-semibold"
                    style={{ color: isImminent ? "#ffa726" : "#607080" }}
                  >
                    {timeLabel}
                  </span>
                  {guardActive && (
                    <span className="rounded bg-danger/10 px-1 py-0.5 text-[9px] text-danger">
                      保护期
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-2 py-3 text-center text-[11px] text-text-muted">
            当前没有需要关注的日历风险窗口
          </div>
        )}
      </div>
    </div>
  );
}
