// backend/modules/ai-agent/tools/adapters/WebMCPAdapter.js
// Gửi yêu cầu thực thi Tool về phía Trình duyệt (Client WebMCP) qua Socket.IO, tự động fallback LocalService

import { localServiceAdapter } from "./LocalServiceAdapter.js";

export class WebMCPAdapter {
  constructor() {
    this.name = "webmcp_adapter";
    this.timeoutMs = 15000;
  }

  async execute(tool, args, context) {
    const { socket, clientSupportsWebMCP } = context;

    // Nếu client không có socket hoặc không hỗ trợ WebMCP -> Fallback Server
    if (!clientSupportsWebMCP || !socket) {
      return await localServiceAdapter.execute(tool, args, context);
    }

    console.log(`  🌐 [WebMCPAdapter] Gửi yêu cầu thực thi [${tool.name}] về trình duyệt qua WebMCP...`);
    const startTime = Date.now();

    try {
      const clientResult = await new Promise((resolve, reject) => {
        const executionId = `mcp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const eventName = `webmcp_tool_result_${executionId}`;
        const onResult = (response) => {
          clearTimeout(timer);
          resolve(response);
        };

        const timer = setTimeout(() => {
          if (typeof socket.off === "function") {
            try {
              socket.off(eventName, onResult);
            } catch (e) {
              if (typeof socket.removeAllListeners === "function") {
                socket.removeAllListeners(eventName);
              }
            }
          }
          reject(new Error(`WebMCP client execution timed out after ${this.timeoutMs}ms`));
        }, this.timeoutMs);

        socket.once(eventName, onResult);

        socket.emit("execute_webmcp_tool", {
          executionId,
          toolName: tool.name,
          args,
        });
      });

      const duration = Date.now() - startTime;
      console.log(`  ✅ [WebMCPAdapter] Trình duyệt phản hồi thành công [${tool.name}] (${duration}ms)`);

      return {
        success: clientResult.success !== false,
        source: "client_webmcp",
        ...clientResult,
      };
    } catch (error) {
      console.warn(`  ⚠️ [WebMCPAdapter] WebMCP timeout hoặc lỗi (${error.message}). Kích hoạt Dual-Path Fallback!`);
      return await localServiceAdapter.execute(tool, args, context);
    }
  }
}

export const webMCPAdapter = new WebMCPAdapter();
