// frontend/src/webmcp/tools/equipmentMcpTools.js
// ============================================
// WEBMCP EQUIPMENT TOOLS — Client-side Capabilities
// ============================================

import api from "../../api";

export const equipmentMcpTools = [
  {
    name: "search_equipment",
    description: "Tìm kiếm thiết bị thông qua WebMCP Client fetch API trên trình duyệt.",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "Từ khóa tìm kiếm" },
      },
      required: ["keyword"],
    },
    execute: async (args) => {
      const response = await api.get(`/equipment?keyword=${encodeURIComponent(args.keyword || "")}`);
      return response.data?.data || response.data;
    },
  },
  {
    name: "get_client_context",
    description: "Lấy ngữ cảnh thiết bị của client từ trình duyệt (độ phân giải màn hình, múi giờ, trạng thái online).",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      return {
        online: navigator.onLine,
        userAgent: navigator.userAgent,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: new Date().toISOString(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      };
    },
  },
];
