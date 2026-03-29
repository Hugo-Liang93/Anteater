import {
  AlertTriangle,
  BarChart3,
  Brain,
  Crosshair,
  Settings,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore, selectActiveNav, type NavSection } from "@/store/ui";
import { useEmployeeStore } from "@/store/employees";
import { useSignalStore } from "@/store/signals";
import { employeeConfigs } from "@/config/employees";

interface NavItem {
  section: NavSection;
  icon: typeof BarChart3;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { section: "market",    icon: BarChart3,    label: "行情" },
  { section: "signals",   icon: Crosshair,    label: "信号" },
  { section: "risk",      icon: ShieldCheck,   label: "风控" },
  { section: "positions", icon: Wallet,        label: "持仓" },
  { section: "system",    icon: AlertTriangle, label: "系统" },
];

function useSystemAlertCount(): number {
  const empAlerts = useEmployeeStore((s) => {
    let n = 0;
    for (const cfg of employeeConfigs) {
      const e = s.employees[cfg.id];
      if (e && (e.status === "alert" || e.status === "error" || e.status === "blocked" || e.status === "disconnected")) n++;
    }
    return n;
  });
  const compIssues = useSignalStore((s) => {
    if (!s.health?.components) return 0;
    return Object.values(s.health.components).filter((c) => c.status !== "healthy").length;
  });
  return empAlerts + compIssues;
}

export function NavRail() {
  const activeNav = useUIStore(selectActiveNav);
  const setActiveNav = useUIStore((s) => s.setActiveNav);
  const alertCount = useSystemAlertCount();

  return (
    <nav className="flex w-14 shrink-0 flex-col items-center border-r border-white/6 bg-[#080e18] py-3">
      {/* Logo */}
      <div className="mb-5 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#23e0b3] to-[#1ba8e0]">
        <Brain size={16} className="text-[#080e18]" strokeWidth={2.4} />
      </div>

      {/* Nav */}
      <div className="flex flex-col items-center gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = activeNav === item.section;
          const Icon = item.icon;
          const showBadge = item.section === "system" && alertCount > 0;

          return (
            <button
              key={item.section}
              onClick={() => setActiveNav(item.section)}
              title={item.label}
              className={cn(
                "relative flex h-11 w-11 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors",
                active ? "bg-white/10 text-white" : "text-white/35 hover:bg-white/5 hover:text-white/60",
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
              )}
              <Icon size={17} strokeWidth={1.8} />
              <span className="text-[8px] leading-none">{item.label}</span>
              {showBadge && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white/15">
          <Settings size={17} strokeWidth={1.8} />
        </div>
      </div>
    </nav>
  );
}
