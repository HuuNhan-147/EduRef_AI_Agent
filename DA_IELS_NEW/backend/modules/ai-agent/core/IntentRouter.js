// backend/modules/ai-agent/core/IntentRouter.js
// Phân loại ý định người dùng và lọc tool declarations

export class IntentRouter {
  static detectIntent(message) {
    const text = (message || "").toLowerCase();

    // 1. Ý định chạy kiểm thử 90 giây của Giám khảo
    if (text.includes("verify") || text.includes("kiểm thử") || text.includes("90s") || text.includes("test")) {
      return {
        domain: "VERIFY_HARNESS",
        toolSet: ["run_verify_90s", "search_equipment"],
      };
    }

    // 2. Ý định giải thích lý do phán quyết
    if (text.includes("tại sao") || text.includes("vì sao") || text.includes("quy định") || text.includes("giải thích")) {
      return {
        domain: "EXPLAIN_POLICY",
        toolSet: ["explain_decision", "get_my_loans"],
      };
    }

    // 3. Ý định tra cứu kho thiết bị
    if (text.includes("tìm") || text.includes("có") || text.includes("xem") || text.includes("kho") || text.includes("danh mục") || text.includes("còn")) {
      return {
        domain: "INVENTORY",
        toolSet: ["search_equipment", "get_equipment_detail"],
      };
    }

    // 4. Mặc định: Yêu cầu mượn thiết bị và điều phối thẩm quyền
    return {
      domain: "LOAN_ESCALATION",
      toolSet: [
        "search_equipment",
        "get_equipment_detail",
        "create_auto_loan",
        "escalate_to_manager",
        "get_my_loans",
        "rollback_loan",
      ],
    };
  }

  static filterToolDeclarations(toolSet, allDeclarations) {
    if (!toolSet || toolSet.length === 0) return allDeclarations;
    return allDeclarations.filter((decl) => toolSet.includes(decl.name));
  }
}

export const detectIntent = (message) => IntentRouter.detectIntent(message);
export const filterToolDeclarations = (toolSet, allDeclarations) => IntentRouter.filterToolDeclarations(toolSet, allDeclarations);


