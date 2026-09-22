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
    console.log(`  🌐 [WebMCPAdapter] Args:`, JSON.stringify(args));
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
      console.log(`  ✅ [WebMCPAdapter] Trình duyệt phản hồi [${tool.name}] (${duration}ms):`, JSON.stringify(clientResult));

      // Nếu client thực thi thất bại (hoặc tool chưa được đăng ký trên trình duyệt) -> Kích hoạt Server Fallback
      if (clientResult?.success === false || clientResult?.error) {
        console.warn(`  ⚠️ [WebMCPAdapter] Client không thực thi được [${tool.name}] (${clientResult.error}). Kích hoạt Server Fallback!`);
        return await localServiceAdapter.execute(tool, args, context);
      }

      // Kiểm tra nếu clientResult không hợp lệ hoặc rỗng (đối với search_equipment) -> Fallback Server
      const hasValidItems = Array.isArray(clientResult?.equipments) && clientResult.equipments.length > 0
        || Array.isArray(clientResult?.data) && clientResult.data.length > 0;

      if (!hasValidItems && tool.name === "search_equipment") {
        console.warn(`  ⚠️ [WebMCPAdapter] Trình duyệt không tìm thấy đồ, kích hoạt Server Fallback để kiểm tra trực tiếp DB...`);
        const serverResult = await localServiceAdapter.execute(tool, args, context);
        if ((serverResult?.equipments?.length || serverResult?.data?.length || 0) > 0) {
          console.log(`  🎉 [WebMCPAdapter] Server Fallback tìm thấy ${serverResult.equipments?.length || serverResult.data?.length} thiết bị! Ưu tiên dữ liệu Server.`);
          return serverResult;
        }
      }

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
