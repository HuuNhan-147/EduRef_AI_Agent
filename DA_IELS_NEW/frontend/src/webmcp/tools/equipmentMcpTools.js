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
      console.log("🌐 [WebMCP Client] Bắt đầu gọi /equipment/search với args:", args);
      const params = new URLSearchParams();
      if (args.keyword) params.append("keyword", args.keyword);
      if (args.category) params.append("category", args.category);
      if (args.minPrice) params.append("minPrice", args.minPrice);
      if (args.maxPrice) params.append("maxPrice", args.maxPrice);
      if (args.isHighValue !== undefined && args.isHighValue !== null) params.append("isHighValue", args.isHighValue);

      const response = await api.get(`/equipment/search?${params.toString()}`);
      console.log("🌐 [WebMCP Client] Kết quả từ Backend:", response.data);
      return response.data;
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
