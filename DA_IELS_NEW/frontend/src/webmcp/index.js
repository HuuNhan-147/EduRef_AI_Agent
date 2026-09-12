// frontend/src/webmcp/index.js
// ============================================
// WEBMCP CLIENT RUNTIME — Entry point đăng ký capabilities trên trình duyệt
// ============================================

import { webMcpManager } from "./WebMCPManager.js";
import { equipmentMcpTools } from "./tools/equipmentMcpTools.js";

let isInitialized = false;

export function initWebMCP() {
  if (isInitialized) return webMcpManager;

  console.log("🚀 [WebMCP] Bắt đầu khởi tạo và đăng ký Equipment Capabilities trên trình duyệt...");

  // Đăng ký Equipment Tools
  equipmentMcpTools.forEach((tool) => webMcpManager.registerTool(tool));

  isInitialized = true;
  console.log(`✅ [WebMCP] Đã đăng ký thành công ${webMcpManager.getTools().length} tools trên trình duyệt!`);

  return webMcpManager;
}

// Tự động khởi tạo khi module được import trên client
if (typeof window !== "undefined") {
  initWebMCP();
}

export { webMcpManager };
