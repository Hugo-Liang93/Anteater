/**
 * 3D 温暖卡通工作室场景
 *
 * 矩形办公室（三面墙，前面开放）+ 暖色卡通风格：
 * - 后墙贴大屏（账户 + 趋势 + 日历面板）
 * - 左右墙带窗户 + 窗外树木
 * - 圆角木质工位面向大屏
 * - 暖色台灯 + 天花板灯
 * - 盆栽、书架、咖啡杯、角色专属道具
 */

import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Text, Html } from "@react-three/drei";
import type { DayNightParams } from "@/engine/daynight";
import { useEmployeeStore } from "@/store/employees";
import { useMarketStore } from "@/store/market";
import { useSignalStore } from "@/store/signals";
import { useLiveStore } from "@/store/live";
import { AGENT_POSITIONS } from "@/config/layout";
import { OfficeGeo, OfficeMat, getWindowGlassMat } from "@/engine/shared3d";

// ─── 场景常量 ───

const ROOM_W = 12;
const ROOM_D = 12;
const WALL_H = 3.5;
const BIG_SCREEN_Y = 1.7;   // 屏幕中心 Y（底边离地 0.2）
const SCREEN_Z = -(ROOM_D / 2);  // 大屏 / 后墙 Z
const HW = ROOM_W / 2 + 0.5;     // 墙面半宽偏移
const HD = ROOM_D / 2 + 0.5;

// ─── 工位角色列表（排除大屏展示和机器人角色） ───

const DESK_ROLES = [
  "collector", "analyst", "live_analyst",
  "filter_guard", "strategist", "live_strategist",
  "regime_guard", "voter", "risk_officer",
  "trader", "position_manager",
] as const;

interface DeskConfig { pos: [number, number, number]; rotY: number }

const DESK_POSITIONS: DeskConfig[] = DESK_ROLES.map((role) => {
  const [x, , z] = AGENT_POSITIONS[role];
  const dx = -x, dz = SCREEN_Z - z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  return {
    pos: [x + (dx / dist) * 0.65, 0, z + (dz / dist) * 0.65] as [number, number, number],
    rotY: Math.atan2(dx, dz),
  };
});

// ─── 装饰布局 ───

const CEILING_LIGHTS: [number, number, number][] = [
  [-3, 3.5, -3], [0, 3.5, -3], [3, 3.5, -3],
  [-3, 3.5, 0],  [0, 3.5, 0],  [3, 3.5, 0],
  [-2, 3.5, 3],  [2, 3.5, 3],
];

const PLANT_POSITIONS: { pos: [number, number, number]; scale: number }[] = [
  { pos: [-(ROOM_W / 2 - 0.3), 0, -(ROOM_D / 2 - 0.3)], scale: 1.2 },
  { pos: [ROOM_W / 2 - 0.3, 0, -(ROOM_D / 2 - 0.3)], scale: 1.1 },
  { pos: [-(ROOM_W / 2 - 0.3), 0, ROOM_D / 2 - 0.3], scale: 1.3 },
  { pos: [ROOM_W / 2 - 0.3, 0, ROOM_D / 2 - 0.3], scale: 1.0 },
  { pos: [-(ROOM_W / 2 - 0.3), 0, 0], scale: 0.9 },
  { pos: [ROOM_W / 2 - 0.3, 0, 0], scale: 1.0 },
  { pos: [0, 0, ROOM_D / 2 - 0.3], scale: 1.4 },
];

const LAMP_POSITIONS: [number, number, number][] = [
  [-2.7, 0.53, -1.8], [2.7, 0.53, -1.8],
  [-3.7, 0.53, -0.3], [3.7, 0.53, -0.3],
  [0.5, 0.53, 1.5],
];

const CUP_POSITIONS: [number, number, number][] = [
  [0.4, 0.54, -3.5], [-3.2, 0.54, 1.5],
  [3.2, 0.54, 1.5],  [-1.5, 0.54, 3.3],
];

// ─── 桌面道具几何体/材质（模块级共享） ───

const _shieldGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.15, 6);
const _shieldMat = new THREE.MeshStandardMaterial({ color: "#ef5350", emissive: "#ef5350", emissiveIntensity: 0.2, metalness: 0.5 });
const _coinGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16);
const _coinMat = new THREE.MeshStandardMaterial({ color: "#ffd700", emissive: "#ffa000", emissiveIntensity: 0.3, metalness: 0.8 });
const _chartPadGeo = new THREE.BoxGeometry(0.2, 0.01, 0.15);
const _chartPadMat = new THREE.MeshStandardMaterial({ color: "#e8e0d0" });
const _gavelGeo = new THREE.CapsuleGeometry(0.02, 0.1, 4, 6);
const _gavelMat = new THREE.MeshStandardMaterial({ color: "#8d6e53" });
const _gavelHeadGeo = new THREE.BoxGeometry(0.06, 0.04, 0.04);

// ═══════════════════════════════════════════════════════════════
//  场 景 子 组 件
// ═══════════════════════════════════════════════════════════════

function WarmFloor() {
  const geo = useMemo(() => new THREE.PlaneGeometry(ROOM_W + 1, ROOM_D + 1), []);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow geometry={geo} material={OfficeMat.warmFloor} />;
}

function Wall({ position, size, rotation = [0, 0, 0] as [number, number, number] }: {
  position: [number, number, number]; size: [number, number]; rotation?: [number, number, number];
}) {
  const geo = useMemo(() => new THREE.PlaneGeometry(size[0], size[1]), [size]);
  return <mesh position={position} rotation={rotation} receiveShadow geometry={geo} material={OfficeMat.curvedWall} />;
}

function Window({ position, rotation = [0, 0, 0] as [number, number, number], dayNight }: {
  position: [number, number, number]; rotation?: [number, number, number]; dayNight: DayNightParams;
}) {
  const glassMat = getWindowGlassMat(dayNight.windowGlassColor, dayNight.isNight);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={OfficeGeo.windowFrame} material={OfficeMat.windowFrame} />
      <mesh position={[0, 0, 0.02]} geometry={OfficeGeo.windowGlass} material={glassMat} />
      <mesh position={[0, 0, 0.05]} geometry={OfficeGeo.windowBarV} material={OfficeMat.windowFrame} />
      <mesh position={[0, 0, 0.05]} geometry={OfficeGeo.windowBarH} material={OfficeMat.windowFrame} />
      <pointLight position={[0, 0, 1.5]} intensity={dayNight.windowLightIntensity} distance={5}
        color={dayNight.isNight ? "#2a3060" : "#ffe4b5"} />
    </group>
  );
}

function OutdoorTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]} geometry={OfficeGeo.treeTrunk} material={OfficeMat.treeTrunk} />
      <mesh position={[0, 1.0, 0]} geometry={OfficeGeo.treeCrown1} material={OfficeMat.treeCrown[0]} />
      <mesh position={[-0.2, 1.3, 0.1]} geometry={OfficeGeo.treeCrown2} material={OfficeMat.treeCrown[1]} />
      <mesh position={[0.15, 1.4, -0.1]} geometry={OfficeGeo.treeCrown3} material={OfficeMat.treeCrown[2]} />
    </group>
  );
}

function RoundDesk({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  const screenMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0a1510", emissive: "#003a28", emissiveIntensity: 0.35 }), []);
  const screenGeo = useMemo(() => new THREE.PlaneGeometry(0.36, 0.22), []);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.5, 0]} receiveShadow castShadow geometry={OfficeGeo.roundDeskTop} material={OfficeMat.roundDesk} />
      {([[-0.4, 0.25, -0.4], [0.4, 0.25, -0.4], [-0.4, 0.25, 0.4], [0.4, 0.25, 0.4]] as [number, number, number][]).map((p, i) => (
        <mesh key={i} position={p} castShadow geometry={OfficeGeo.roundDeskLeg} material={OfficeMat.roundDeskLeg} />
      ))}
      <group position={[0, 0.53, -0.2]}>
        <mesh position={[0, 0.22, 0]} geometry={OfficeGeo.monitorShell} material={OfficeMat.monitorShell} />
        <mesh position={[0, 0.22, 0.014]} geometry={screenGeo} material={screenMat} />
        <mesh position={[0, 0.07, 0]} geometry={OfficeGeo.monitorStand} material={OfficeMat.monitorStand} />
        <mesh position={[0, 0.01, 0.05]} geometry={OfficeGeo.monitorBase} material={OfficeMat.monitorStand} />
      </group>
      <mesh position={[0, 0.53, 0.15]} geometry={OfficeGeo.keyboard} material={OfficeMat.keyboard} />
    </group>
  );
}

function DeskLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh geometry={OfficeGeo.lampBase} material={OfficeMat.lampBase} />
      <mesh position={[0, 0.19, 0]} geometry={OfficeGeo.lampPole} material={OfficeMat.lampBase} />
      <mesh position={[0, 0.4, 0]} rotation={[Math.PI, 0, 0]} geometry={OfficeGeo.lampShade} material={OfficeMat.lampShade} />
      <pointLight position={[0, 0.35, 0]} intensity={0.3} distance={2.5} color="#ffe0b0" />
    </group>
  );
}

function CartoonPlant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.12, 0]} geometry={OfficeGeo.potBody} material={OfficeMat.potBody} />
      <mesh position={[0, 0.25, 0]} geometry={OfficeGeo.potSoil} material={OfficeMat.potSoil} />
      <mesh position={[0, 0.45, 0]} geometry={OfficeGeo.potLeaf1} material={OfficeMat.potLeaf[0]} />
      <mesh position={[0.08, 0.55, 0.05]} geometry={OfficeGeo.potLeaf2} material={OfficeMat.potLeaf[1]} />
      <mesh position={[-0.06, 0.52, -0.04]} geometry={OfficeGeo.potLeaf2} material={OfficeMat.potLeaf[0]} />
    </group>
  );
}

function MiniBookshelf({ position, rotation = [0, 0, 0] as [number, number, number] }: {
  position: [number, number, number]; rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[-0.4, 0.35, 0]} geometry={OfficeGeo.shelfSide} material={OfficeMat.shelf} />
      <mesh position={[0.4, 0.35, 0]} geometry={OfficeGeo.shelfSide} material={OfficeMat.shelf} />
      {[0.15, 0.38, 0.61].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} geometry={OfficeGeo.shelfBoard} material={OfficeMat.shelf} />
      ))}
      {[0.20, 0.43].map((shelfY, si) => (
        <group key={si}>
          {Array.from({ length: 5 }).map((_, bi) => (
            <mesh key={bi}
              position={[-0.28 + bi * 0.14, shelfY + 0.09, 0]}
              rotation={[0, 0, (bi % 3 === 1) ? 0.05 : 0]}
              geometry={OfficeGeo.book}
              material={OfficeMat.books[(si * 5 + bi) % OfficeMat.books.length]}
            />
          ))}
        </group>
      ))}
    </group>
  );
}

function CoffeeCup({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh geometry={OfficeGeo.cupBody} material={OfficeMat.cup} />
      <mesh position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]} geometry={OfficeGeo.cupHandle} material={OfficeMat.cup} />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
//  大 屏 面 板 组 件
// ═══════════════════════════════════════════════════════════════

/** 与 .font-data 一致的等宽字体栈（替代浏览器默认 monospace） */
const PANEL_FONT = '"JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace';

/** 通用面板行 */
function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
      <span style={{ color: "#8090a0" }}>{label}</span>
      <span style={{ color: valueColor ?? "#c8d0e0", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

/** 左：账户状态 */
function AccountPanel() {
  const acctStatus = useEmployeeStore((s) => s.employees.accountant?.status ?? "idle");
  const acctTask = useEmployeeStore((s) => s.employees.accountant?.currentTask ?? "");
  const acctStats = useEmployeeStore((s) => s.employees.accountant?.stats ?? {});
  const account = useMarketStore((s) => s.account);
  const positions = useMarketStore((s) => s.positions);

  const balance = account?.balance ?? Number(acctStats.balance ?? 0);
  const equity = account?.equity ?? Number(acctStats.equity ?? 0);
  const margin = account?.margin ?? Number(acctStats.margin ?? 0);
  const freeMargin = account?.free_margin ?? Number(acctStats.free_margin ?? 0);
  const pnl = equity - balance;
  const pnlColor = pnl >= 0 ? "#26a69a" : "#ef5350";
  const isConnected = acctStatus !== "idle" && acctStatus !== "disconnected";

  return (
    <Html position={[-2.2, 0.25, 0.3]} center distanceFactor={1.83} transform occlude="blending" zIndexRange={[10, 0]}>
      <div style={{
        width: 720, padding: "24px 36px",
        background: "rgba(8,12,24,0.92)", border: "3px solid #26a69a",
        borderRadius: 24, color: "#c8d0e0", fontFamily: PANEL_FONT, fontSize: 33,
        pointerEvents: "none", userSelect: "none",
      }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: "#26a69a", letterSpacing: 6, marginBottom: 24, textAlign: "center" }}>
          ACCOUNT STATUS
        </div>
        {isConnected && balance > 0 ? (
          <>
            <Row label="Balance" value={`$${balance.toFixed(2)}`} />
            <Row label="Equity" value={`$${equity.toFixed(2)}`} valueColor={pnlColor} />
            <Row label="P&L" value={`${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`} valueColor={pnlColor} />
            <div style={{ borderTop: "2px solid #1a2a3a", margin: "15px 0" }} />
            <Row label="Margin" value={`$${margin.toFixed(2)}`} />
            <Row label="Free Margin" value={`$${freeMargin.toFixed(2)}`} />
            <Row label="Positions" value={String(positions.length)} valueColor={positions.length > 0 ? "#ffa726" : "#607080"} />
          </>
        ) : (
          <div style={{ color: "#506070", fontSize: 30, textAlign: "center" }}>
            {acctTask || "Waiting for account data..."}
          </div>
        )}
      </div>
    </Html>
  );
}

/** 右上：H1 多空趋势 */
function TrendPanel() {
  const h1 = useLiveStore((s) => s.indicators["H1"]);
  const stDir = h1?.indicators?.["supertrend14"]?.["direction"] ?? null;
  const label = stDir == null ? "\u2014" : stDir > 0 ? "LONG" : "SHORT";
  const color = stDir == null ? "#78909c" : stDir > 0 ? "#26a69a" : "#ef5350";
  const arrow = stDir == null ? "" : stDir > 0 ? " \u25B2" : " \u25BC";

  return (
    <Html position={[2.2, 0.9, 0.3]} center distanceFactor={1.83} transform occlude="blending" zIndexRange={[10, 0]}>
      <div style={{
        padding: "12px 42px", background: "rgba(8,12,24,0.90)",
        border: `3px solid ${color}`, borderRadius: 18,
        fontFamily: PANEL_FONT, pointerEvents: "none", userSelect: "none", textAlign: "center",
      }}>
        <div style={{ fontSize: 24, color: "#607080", letterSpacing: 3 }}>H1 BIAS</div>
        <div style={{ fontSize: 42, fontWeight: 800, color }}>{label}{arrow}</div>
      </div>
    </Html>
  );
}

/** 右下：经济日历（未来 3 条事件） */
function CalendarPanel() {
  const events = useSignalStore((s) => s.calendarEvents);
  const riskWindows = useSignalStore((s) => s.riskWindows);
  const calTask = useEmployeeStore((s) => s.employees.calendar_reporter?.currentTask ?? "");

  const upcoming = useMemo(() => {
    if (events.length > 0) {
      return [...events].filter((e) => e.countdown_minutes > 0)
        .sort((a, b) => a.countdown_minutes - b.countdown_minutes).slice(0, 3);
    }
    if (riskWindows.length > 0) {
      const now = Date.now();
      return [...riskWindows]
        .map((w) => ({ ...w, _ms: new Date(w.scheduled_at || w.datetime).getTime() - now }))
        .filter((w) => w._ms > 0).sort((a, b) => a._ms - b._ms).slice(0, 3);
    }
    return [];
  }, [events, riskWindows]);

  const hasGuard = riskWindows.some((w) => w.guard_active);

  return (
    <Html position={[2.2, -0.25, 0.3]} center distanceFactor={1.83} transform occlude="blending" zIndexRange={[10, 0]}>
      <div style={{
        width: 660, padding: "18px 30px",
        background: "rgba(8,12,24,0.92)", border: `3px solid ${hasGuard ? "#ff6b35" : "#7e57c2"}`,
        borderRadius: 24, color: "#c8d0e0", fontFamily: PANEL_FONT, fontSize: 30,
        pointerEvents: "none", userSelect: "none",
      }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: "#7e57c2", letterSpacing: 6, marginBottom: 15, textAlign: "center" }}>
          ECONOMIC CALENDAR
        </div>
        {hasGuard && (
          <div style={{ padding: "6px 18px", borderRadius: 12, background: "rgba(255,80,30,0.15)", color: "#ff6b35", fontSize: 27, textAlign: "center", marginBottom: 12 }}>
            TRADE GUARD ACTIVE
          </div>
        )}
        {upcoming.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {upcoming.map((ev, i) => {
              const isEnriched = "countdown_minutes" in ev;
              const impact = isEnriched ? (ev.importance >= 3 ? "high" : ev.importance >= 2 ? "med" : "low") : ("impact" in ev ? ev.impact : "low");
              const countdown = isEnriched ? ev.countdown_minutes : ("_ms" in ev ? Math.round((ev as { _ms: number })._ms / 60_000) : 0);
              const impactColor = impact === "high" ? "#ff5252" : impact === "med" ? "#ffa726" : "#607080";
              const timeStr = countdown < 60 ? `${countdown}m` : `${Math.round(countdown / 60)}h`;
              const goldHint = isEnriched && ev.gold_impact ? `Au: ${ev.gold_impact.above_forecast}` : "";
              return (
                <div key={i} style={{ display: "flex", gap: 18, alignItems: "flex-start", lineHeight: 1.3 }}>
                  <span style={{ color: impactColor, fontWeight: 700, fontSize: 27, minWidth: 60, flexShrink: 0 }}>
                    {impact === "high" ? "!!!" : impact === "med" ? "!!" : "!"}
                  </span>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ color: "#c0c8d0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 30 }}>
                      {ev.event_name}
                    </div>
                    {goldHint && <div style={{ color: "#ffd54f", fontSize: 24 }}>{goldHint}</div>}
                  </div>
                  <span style={{ color: countdown < 60 ? "#ffa726" : "#607080", fontWeight: 600, fontSize: 27, flexShrink: 0 }}>
                    {timeStr}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: "#506070", fontSize: 30, textAlign: "center" }}>
            {calTask || "No upcoming events"}
          </div>
        )}
      </div>
    </Html>
  );
}

/** LED 波浪滚动条 */
function LEDTicker({ position, width }: { position: [number, number, number]; width: number }) {
  const segCount = 30;
  const segW = width / segCount;
  const geos = useMemo(() => Array.from({ length: segCount }, () => new THREE.PlaneGeometry(segW * 0.85, 0.06)), [segW]);
  const mats = useMemo(() => Array.from({ length: segCount }, () =>
    new THREE.MeshStandardMaterial({ color: "#001100", emissive: "#00d4aa", emissiveIntensity: 0.2 })), []);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => () => {
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
  }, [geos, mats]);

  useFrame(() => {
    const t = performance.now() / 1000;
    for (let i = 0; i < segCount; i++) {
      const m = mats[i];
      if (m) m.emissiveIntensity = 0.1 + (Math.sin(t * 3 - i * 0.4) * 0.5 + 0.5) * 0.6;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {geos.map((geo, i) => (
        <mesh key={i} position={[(i - (segCount - 1) / 2) * segW, 0, 0]} geometry={geo} material={mats[i]} />
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
//  大 屏
// ═══════════════════════════════════════════════════════════════

function BigScreen({ dayNight }: { dayNight: DayNightParams }) {
  const W = 8.0, H = 3.0;
  const frameGeo = useMemo(() => new THREE.BoxGeometry(W + 0.3, H + 0.3, 0.1), []);
  const screenGeo = useMemo(() => new THREE.PlaneGeometry(W, H), []);
  const edgeHGeo = useMemo(() => new THREE.BoxGeometry(W + 0.4, 0.04, 0.02), []);
  const edgeVGeo = useMemo(() => new THREE.BoxGeometry(0.04, H + 0.4, 0.02), []);
  const edgeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#00d4aa", emissive: "#00d4aa", emissiveIntensity: 0.8, transparent: true, opacity: 0.6,
  }), []);

  useEffect(() => () => {
    frameGeo.dispose(); screenGeo.dispose(); edgeHGeo.dispose(); edgeVGeo.dispose(); edgeMat.dispose();
  }, [frameGeo, screenGeo, edgeHGeo, edgeVGeo, edgeMat]);

  return (
    <group position={[0, BIG_SCREEN_Y, SCREEN_Z + 0.15]}>
      <mesh geometry={frameGeo} material={OfficeMat.bigScreenFrame} castShadow />
      <mesh position={[0, 0, 0.055]} geometry={screenGeo} material={OfficeMat.bigScreen} />

      {/* 边缘发光条 */}
      <mesh position={[0, H / 2 + 0.17, 0.05]} geometry={edgeHGeo} material={edgeMat} />
      <mesh position={[0, -(H / 2 + 0.17), 0.05]} geometry={edgeHGeo} material={edgeMat} />
      <mesh position={[-(W / 2 + 0.17), 0, 0.05]} geometry={edgeVGeo} material={edgeMat} />
      <mesh position={[W / 2 + 0.17, 0, 0.05]} geometry={edgeVGeo} material={edgeMat} />

      <AccountPanel />
      <TrendPanel />
      <CalendarPanel />

      <LEDTicker position={[0, -(H / 2 + 0.08), 0.06]} width={W - 0.4} />

      <Text position={[0, H / 2 + 0.28, 0.06]} fontSize={0.18} color="#ffe4b5" anchorX="center" font={undefined}>
        XAUUSD TRADING STUDIO
      </Text>

      {/* 屏幕灯光 */}
      <spotLight position={[0, 0, 3]} intensity={dayNight.isNight ? 1.2 : 0.5}
        distance={10} angle={0.8} penumbra={0.6} color={dayNight.isNight ? "#3060a0" : "#ffe8d0"} />
      <pointLight position={[-2, 0, 2]} intensity={0.2} distance={5} color="#4080c0" />
      <pointLight position={[2, 0, 2]} intensity={0.2} distance={5} color="#4080c0" />
      <pointLight position={[0, -2, 3]} intensity={0.2} distance={5} color="#ffe4b5" />
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
//  主 导 出
// ═══════════════════════════════════════════════════════════════

export function Office3D({ dayNight }: { dayNight: DayNightParams }) {
  return (
    <>
      <WarmFloor />

      {/* 三面墙（前面开放） */}
      <Wall position={[0, WALL_H / 2, -HD]} size={[ROOM_W + 1, WALL_H]} />
      <Wall position={[-HW, WALL_H / 2, 0]} size={[ROOM_D + 1, WALL_H]} rotation={[0, Math.PI / 2, 0]} />
      <Wall position={[HW, WALL_H / 2, 0]} size={[ROOM_D + 1, WALL_H]} rotation={[0, -Math.PI / 2, 0]} />

      {/* 窗户（左右各 2 扇） */}
      <Window position={[-HW + 0.05, 1.5, -2.5]} rotation={[0, Math.PI / 2, 0]} dayNight={dayNight} />
      <Window position={[-HW + 0.05, 1.5, 2.0]} rotation={[0, Math.PI / 2, 0]} dayNight={dayNight} />
      <Window position={[HW - 0.05, 1.5, -2.5]} rotation={[0, -Math.PI / 2, 0]} dayNight={dayNight} />
      <Window position={[HW - 0.05, 1.5, 2.0]} rotation={[0, -Math.PI / 2, 0]} dayNight={dayNight} />

      {/* 窗外树木 */}
      <OutdoorTree position={[-(HW + 2), 0, -2.5]} />
      <OutdoorTree position={[-(HW + 2.5), 0, 1.5]} />
      <OutdoorTree position={[HW + 2, 0, -1.5]} />
      <OutdoorTree position={[HW + 2.5, 0, 2.0]} />

      <BigScreen dayNight={dayNight} />

      {/* 工位 */}
      {DESK_POSITIONS.map((d, i) => <RoundDesk key={i} position={d.pos} rotY={d.rotY} />)}

      {/* 桌面道具 */}
      <mesh position={[3.1, 0.56, 1.6]} geometry={_shieldGeo} material={_shieldMat} />
      <group position={[-2.2, 0.54, 3.5]}>
        <mesh geometry={_coinGeo} material={_coinMat} />
        <mesh position={[0.06, 0.02, 0.02]} geometry={_coinGeo} material={_coinMat} rotation={[0.2, 0, 0.1]} />
        <mesh position={[-0.04, 0.01, -0.03]} geometry={_coinGeo} material={_coinMat} rotation={[-0.1, 0, -0.15]} />
      </group>
      <mesh position={[-2.5, 0.54, -1.8]} geometry={_chartPadGeo} material={_chartPadMat} />
      <group position={[0.3, 0.54, 1.7]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} geometry={_gavelGeo} material={_gavelMat} />
        <mesh position={[0.08, 0.05, 0]} geometry={_gavelHeadGeo} material={_gavelMat} />
      </group>

      {/* 台灯 */}
      {LAMP_POSITIONS.map((pos, i) => <DeskLamp key={i} position={pos} />)}

      {/* 天花板灯 */}
      {CEILING_LIGHTS.map((pos, i) => (
        <pointLight key={i} position={pos} intensity={dayNight.isNight ? 0.5 : 0.25}
          distance={8} color={dayNight.isNight ? "#ffd080" : "#ffe4b5"} castShadow={i < 3} />
      ))}

      {/* 盆栽 */}
      {PLANT_POSITIONS.map((p, i) => <CartoonPlant key={i} position={p.pos} scale={p.scale} />)}

      {/* 书架 */}
      <MiniBookshelf position={[-(HW - 0.5), 0, -1]} rotation={[0, Math.PI / 2, 0]} />
      <MiniBookshelf position={[HW - 0.5, 0, -1]} rotation={[0, -Math.PI / 2, 0]} />

      {/* 咖啡杯 */}
      {CUP_POSITIONS.map((pos, i) => <CoffeeCup key={i} position={pos} />)}

      {/* 外部光照 */}
      <directionalLight position={[-8, dayNight.sunY, 0]} intensity={dayNight.windowLightIntensity * 0.7}
        color={dayNight.sunColor} castShadow shadow-mapSize-width={512} shadow-mapSize-height={512} />
      <directionalLight position={[8, dayNight.sunY, 0]} intensity={dayNight.windowLightIntensity * 0.4} color={dayNight.sunColor} />
      <pointLight position={[0, 0.3, 0]} intensity={0.15} distance={12} color="#ffe4b5" />
    </>
  );
}
