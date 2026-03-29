/**
 * 面板共享组件
 *
 * 提取自 MarketPanel / RiskPanel / PositionsPanel / SystemPanel 中重复的布局组件。
 */

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/35">{title}</h4>
      {children}
    </section>
  );
}

export function PanelShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-3 py-2.5">
        <span className="text-[13px] font-medium text-white/80">{title}</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">{children}</div>
    </div>
  );
}
