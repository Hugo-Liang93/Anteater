/**
 * WebSocket 连接管理器
 *
 * 按 API_CONTRACT.md 定义的消息类型提供实时数据通道。
 * 支持自动重连、心跳检测。当前作为可选增强通道，
 * 主数据流仍通过 HTTP polling 保证。
 */

import { config } from "@/config";
import type { WsMessage } from "@/types/protocol";

export type { WsMessage };

type MessageHandler = (msg: WsMessage) => void;

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000];
const HEARTBEAT_INTERVAL = 30_000;

export class StudioWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;

  constructor(url?: string) {
    this.url = url ?? config.wsEndpoint;
  }

  /** 注册消息处理回调 */
  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /** 建立连接 */
  connect() {
    if (this.disposed) return;
    this.cleanup();

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log("[WS] connected");
      this.reconnectAttempt = 0;
      this.startHeartbeat();
      this.emit({ type: "connection_status", payload: { connected: true } });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WsMessage;
        if (msg.type === "pong") return;
        this.emit(msg);
      } catch {
        console.warn("[WS] invalid message:", event.data);
      }
    };

    this.ws.onclose = () => {
      console.log("[WS] disconnected");
      this.emit({ type: "connection_status", payload: { connected: false } });
      this.stopHeartbeat();
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  /** 断开并清理 */
  dispose() {
    this.disposed = true;
    this.cleanup();
    this.handlers.clear();
  }

  /** 连接是否打开 */
  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private emit(msg: WsMessage) {
    for (const handler of this.handlers) {
      try {
        handler(msg);
      } catch (err) {
        console.error("[WS] handler error:", err);
      }
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.disposed) return;
    // 先清除任何残留的重连定时器，防止快速重连时定时器泄漏
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    this.reconnectAttempt++;
    console.log(`[WS] reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private cleanup() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }
}

/** 全局单例（懒初始化，可选启用） */
let _instance: StudioWebSocket | null = null;

export function getStudioWs(): StudioWebSocket {
  if (!_instance) {
    _instance = new StudioWebSocket();
  }
  return _instance;
}
