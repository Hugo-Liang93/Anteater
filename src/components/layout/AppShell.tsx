import { usePolling } from "@/hooks/usePolling";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { StudioCanvas } from "../studio/StudioCanvas";
import { EmployeeDetail } from "../overlay/EmployeeDetail";

export function AppShell() {
  usePolling();

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="relative flex-1 overflow-hidden">
          <StudioCanvas />
          <EmployeeDetail />
        </main>
      </div>
    </div>
  );
}
