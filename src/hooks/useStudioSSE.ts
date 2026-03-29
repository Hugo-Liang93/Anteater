/**
 * Studio SSE Hook — 消费后端 /studio/stream SSE 端点
 *
 * 协议完全复用 wsHandlers.ts 的消息分发逻辑（snapshot / agent_update /
 * event_append / heartbeat），只是传输层从 WebSocket 换成 SSE。
 *
 * 特性：
 * - 浏览器 EventSource 原生自动重连
 * - Mock 模式下跳过连接
 * - 组件卸载时自动关闭
 */

import { useEffect, useRef } from "react";
import { config } from "@/config";
import { handleWsMessage } from "@/api/wsHandlers";
import { useMarketStore } from "@/store/market";
import { setStudioSSEActive } from "@/engine/sync";

function resolveSseUrl(): string {
  if (!config.apiKey) {
    return config.sseEndpoint;
  }

  const base =
    typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(config.sseEndpoint, base);
  url.searchParams.set("api_key", config.apiKey);
  return url.origin === base ? `${url.pathname}${url.search}` : url.toString();
}

export function useStudioSSE() {
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (config.mockMode) return;

    const source = new EventSource(resolveSseUrl());
    sourceRef.current = source;

    // ── 按 SSE event type 分发（对应后端 _format_sse 的 event: 字段）──

    source.addEventListener("snapshot", (e: MessageEvent) => {
      handleWsMessage({ type: "snapshot", payload: safeParse(e.data) });
    });

    source.addEventListener("agent_update", (e: MessageEvent) => {
      handleWsMessage({ type: "agent_update", payload: safeParse(e.data) });
    });

    source.addEventListener("event_append", (e: MessageEvent) => {
      handleWsMessage({ type: "event_append", payload: safeParse(e.data) });
    });

    source.addEventListener("heartbeat", () => {
      // Heartbeat: 仅保活，无需处理
    });

    // ── 连接状态 ──

    source.onopen = () => {
      setStudioSSEActive(true);
      useMarketStore.getState().setConnected(true);
    };

    source.onerror = () => {
      // EventSource 会自动重连，这里先回退到推导模式
      setStudioSSEActive(false);
      if (source.readyState === EventSource.CLOSED) {
        useMarketStore.getState().setConnected(false);
      }
    };

    return () => {
      setStudioSSEActive(false);
      source.close();
      sourceRef.current = null;
    };
  }, []);
}

/** 安全 JSON 解析，失败返回 null */
function safeParse(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
