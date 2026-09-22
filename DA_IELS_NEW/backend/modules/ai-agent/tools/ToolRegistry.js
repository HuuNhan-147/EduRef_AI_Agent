// modules/ai-agent/tools/ToolRegistry.js
// ============================================
// TOOL REGISTRY — Quản lý Danh mục AgentTool & Tích hợp ToolResolver
// ============================================

import { AgentTool } from "./AgentTool.js";
import { toolResolver } from "./ToolResolver.js";
import { searchEquipment, getEquipmentDetail } from "./actions/equipmentTools.js";
import {
  createAutoLoan,
  escalateToManager,
  getMyLoans,
  explainDecision,
  rollbackLoan,
} from "./actions/loanTools.js";
import { runVerify90s } from "./actions/verifyTools.js";

// Khởi tạo các AgentTool instances phục vụ The Escalation Referee
export const toolInstances = [
  new AgentTool({
    name: "search_equipment",
    description:
      "🔍 BẮT BUỘC GỌI TOOL NÀY để tra cứu kho thiết bị theo từ khóa (tên máy, thương hiệu như Micro, MacBook, Máy chiếu, Bàn phím, Chuột, Bộ đàm...), theo khoảng giá hoặc theo phân định thẩm quyền. Trigger: 'kho có mic không', 'tìm máy chiếu', 'cho mượn bàn phím', 'còn bộ đàm không'.",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "Từ khóa cốt lõi của thiết bị cần tìm (ví dụ: 'micro', 'máy chiếu', 'laptop', 'bàn phím', 'chuột', 'macbook', 'sony'...). Trích xuất tên thiết bị khi người dùng hỏi đồ cụ thể." },
        category: { type: "string", description: "Danh mục thiết bị (không bắt buộc, CHỈ truyền khi người dùng nêu rõ tên danh mục)" },
        minPrice: { type: "number", description: "Giá tối thiểu (VNĐ)" },
        maxPrice: { type: "number", description: "Giá tối đa (VNĐ)" },
        isHighValue: { type: "boolean", description: "true nếu tìm thiết bị giá trị cao > 20.000.000 VNĐ cần Quản lý duyệt; false nếu tìm thiết bị thường quy <= 20.000.000 VNĐ tự duyệt" },
      },
      required: [],
    },
    execute: (args, context) => searchEquipment({ ...args, ...context }),
  }),


  new AgentTool({
    name: "get_equipment_detail",
    description: "Lấy thông tin chi tiết một thiết bị theo ID hoặc Mã tài sản (assetCode).",
    inputSchema: {
      type: "object",
      properties: {
        equipmentId: { type: "string", description: "ID của thiết bị trong cơ sở dữ liệu" },
        assetCode: { type: "string", description: "Mã tài sản (VD: EQ-001, CAM-002...)" },
      },
    },
    execute: (args, context) => getEquipmentDetail({ ...args, ...context }),
  }),

  new AgentTool({
    name: "create_auto_loan",
    description:
      "⚡ TỰ ĐỘNG PHÊ DUYỆT & CẤP PHÁT (Deterministic Policy Gate). Dành cho yêu cầu THƯỜNG QUY: Thiết bị giá trị ≤ 20.000.000 VNĐ VÀ thời gian mượn ≤ 7 ngày. BẮT BUỘC PHẢI CÓ thời hạn mượn (durationDays) VÀ mục đích sử dụng rõ ràng (purpose) do người dùng cung cấp. TUYỆT ĐỐI KHÔNG tự bịa số ngày hoặc mục đích nếu người dùng chưa cung cấp (như câu 'cho mượn cái máy chiếu') mà phải dừng lại hỏi người dùng.",
    inputSchema: {
      type: "object",
      properties: {
        equipmentId: { type: "string", description: "ID thiết bị cần mượn" },
        equipmentName: { type: "string", description: "Tên thiết bị (nếu chưa có ID)" },
        durationDays: { type: "number", description: "Số ngày mượn (phải <= 7)" },
        purpose: { type: "string", description: "Mục đích sử dụng thiết bị do người dùng nêu (BẮT BUỘC, tối thiểu 3 ký tự)" },
        locationOfUse: { type: "string", description: "Địa điểm hoặc phòng sử dụng thiết bị" },
        startDate: { type: "string", description: "Ngày bắt đầu mượn (YYYY-MM-DD)" },
        endDate: { type: "string", description: "Ngày kết thúc mượn (YYYY-MM-DD)" },
      },
      required: ["durationDays", "purpose"],
    },
    execute: (args, context) => createAutoLoan({ ...args, ...context }),
  }),

  new AgentTool({
    name: "escalate_to_manager",
    description:
      "🛡️ CHUYỂN TIẾP QUẢN LÝ (Escalation Referee). Gọi tool này khi yêu cầu VƯỢT THẨM QUYỀN hoặc CÓ BẤT THƯỜNG: Thiết bị giá trị cao > 20.000.000 VNĐ, hoặc thời gian mượn > 7 ngày, hoặc mục đích sử dụng nhạy cảm cần Quản lý Lab/Bộ môn phê duyệt trước.",
    inputSchema: {
      type: "object",
      properties: {
        equipmentId: { type: "string", description: "ID thiết bị" },
        equipmentName: { type: "string", description: "Tên thiết bị cần mượn" },
        durationDays: { type: "number", description: "Số ngày mượn" },
        purpose: { type: "string", description: "Mục đích mượn thiết bị" },
        escalationCategory: {
          type: "string",
          enum: ["HIGH_VALUE", "LONG_DURATION", "POLICY_EXCEPTION", "TIME_CONFLICT", "SECURITY_SENSITIVE"],
          description: "Phân loại lý do chuyển tiếp",
        },
        reason: { type: "string", description: "Lý do chi tiết cần Quản lý thẩm định" },
        specificQuestion: { type: "string", description: "Câu hỏi hoặc điểm Quản lý cần làm rõ với nhân viên" },
        startDate: { type: "string", description: "Ngày bắt đầu (YYYY-MM-DD)" },
        endDate: { type: "string", description: "Ngày trả (YYYY-MM-DD)" },
      },
      required: ["reason"],
    },
    execute: (args, context) => escalateToManager({ ...args, ...context }),
  }),

  new AgentTool({
    name: "get_my_loans",
    description: "Lấy danh sách các phiếu mượn thiết bị của người dùng hiện tại, bao gồm trạng thái và mã PIN lấy đồ.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Lọc trạng thái (PENDING, APPROVED, IN_PROGRESS, RETURNED...)" },
      },
    },
    execute: (args, context) => getMyLoans({ ...args, ...context }),
  }),

  new AgentTool({
    name: "explain_decision",
    description:
      "📖 Cung cấp giải trình chi tiết về căn cứ thẩm quyền, điều khoản quy chế mượn trả và lý do tại sao một quyết định (Tự duyệt hoặc Chuyển tiếp) được đưa ra.",
    inputSchema: {
      type: "object",
      properties: {
        decisionType: {
          type: "string",
          enum: ["AUTO_APPROVED", "ESCALATED", "REJECTED"],
          description: "Loại quyết định",
        },
        loanId: { type: "string", description: "Mã phiếu mượn (nếu có)" },
      },
      required: ["decisionType"],
    },
    execute: (args, context) => explainDecision({ ...args, ...context }),
  }),

  new AgentTool({
    name: "rollback_loan",
    description:
      "🔄 HOÀN TÁC THỰC TẾ (Real Compensating Rollback). Hoàn tác phiếu mượn (chỉ áp dụng khi phiếu chưa xuất kho DISPATCHED/IN_PROGRESS) và khôi phục ngay trạng thái thiết bị về AVAILABLE, ghi nhật ký Audit Trail.",
    inputSchema: {
      type: "object",
      properties: {
        loanId: { type: "string", description: "ID của phiếu mượn cần hoàn tác" },
        reason: { type: "string", description: "Lý do hoàn tác" },
      },
      required: ["loanId"],
    },
    execute: (args, context) => rollbackLoan({ ...args, ...context }),
  }),

  new AgentTool({
    name: "run_verify_90s",
    description:
      "⚡ BỘ KIỂM THỬ TỰ ĐỘNG 90 GIÂY (Verify Harness 90s - 12 Điểm Barem). Chạy tự động chuỗi 5 Scenarios kiểm thử toàn diện: Tự duyệt thường quy, Chuyển tiếp giá trị cao, Chuyển tiếp dài hạn, Yêu cầu làm rõ, và Hoàn tác bù trừ.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: (args, context) => runVerify90s({ ...args, ...context }),
  }),
];

// Map lookup nhanh theo name
const toolMap = new Map();
toolInstances.forEach((tool) => toolMap.set(tool.name, tool));

// Object mapping tương thích ngược
export const tools = {};
toolInstances.forEach((tool) => {
  tools[tool.name] = (args, context) => tool.execute(args, context);
});

export function getToolDeclarations() {
  return toolInstances.map((tool) => tool.getDeclaration());
}

export class ToolRegistry {
  static getTools() {
    return tools;
  }

  static getTool(name) {
    return toolMap.get(name) || null;
  }

  static getDeclarations() {
    return getToolDeclarations();
  }

  /**
   * Thực thi tool qua ToolResolver (hỗ trợ Dual-Path: WebMCP / Local Service)
   */
  static async executeTool(name, params = {}, context = {}) {
    const tool = toolMap.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" không tồn tại trong ToolRegistry.`);
    }
    return await toolResolver.resolveAndExecute(tool, params, context);
  }
}
