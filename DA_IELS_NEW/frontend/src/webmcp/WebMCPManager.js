// frontend/src/webmcp/WebMCPManager.js
// ============================================
// WEBMCP MANAGER — Quản lý Runtime & Polyfill WebMCP trên Trình duyệt
// ============================================

export class WebMCPManager {
  constructor() {
    this.tools = new Map();
    this.isNative = false;
    this.initModelContext();
  }

  /**
   * Khởi tạo ModelContext trên document/window (Native hoặc Polyfill)
   */
  initModelContext() {
    if (typeof document !== "undefined") {
      if (document.modelContext && typeof document.modelContext.registerTool === "function") {
        console.log("🌐 [WebMCP] Phát hiện Native document.modelContext được hỗ trợ bởi trình duyệt.");
        this.isNative = true;
      } else {
        console.log("🌐 [WebMCP] Trình duyệt chưa có Native modelContext -> Khởi chạy WebMCP Compliant Polyfill.");
        const polyfillContext = {
          registerTool: this.registerTool.bind(this),
          getTools: this.getTools.bind(this),
          executeTool: this.executeTool.bind(this),
        };

        try {
          document.modelContext = polyfillContext;
          window.modelContext = polyfillContext;
        } catch (e) {
          console.warn("⚠️ [WebMCP] Không thể gán modelContext vào document:", e);
        }
      }
    }
  }

  /**
   * Đăng ký một Capability Tool mới lên WebMCP
   */
  registerTool(tool) {
    if (!tool.name || typeof tool.execute !== "function") {
      throw new Error(`WebMCP: Tool không hợp lệ`);
    }

    this.tools.set(tool.name, tool);
    console.log(`🛠️ [WebMCP] Đã đăng ký tool: [${tool.name}]`);

    // Nếu có native modelContext, đăng ký đồng thời vào native context
    if (this.isNative && document.modelContext && document.modelContext !== this) {
      try {
        document.modelContext.registerTool(tool);
      } catch (e) {
        console.warn(`⚠️ [WebMCP] Lỗi đăng ký native tool [${tool.name}]:`, e);
      }
    }
  }

  /**
   * Lấy danh sách tất cả các tools đã đăng ký
   */
  getTools() {
    return Array.from(this.tools.values());
  }

  /**
   * Lấy danh sách khai báo Schema cho Agent / LLM
   */
  getDeclarations() {
    return this.getTools().map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    }));
  }

  /**
   * Thực thi một tool theo tên với tham số đầu vào trên trình duyệt
   */
  async executeTool(name, input = {}) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`WebMCP: Tool "${name}" không tồn tại hoặc chưa được đăng ký trên trình duyệt.`);
    }

    console.log(`🚀 [WebMCP] Thực thi client tool [${name}] với args:`, input);
    try {
      const result = await tool.execute(input);
      console.log(`✅ [WebMCP] Tool [${name}] thực thi thành công:`, result);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error(`❌ [WebMCP] Tool [${name}] gặp lỗi:`, error.message);
      return {
        success: false,
        error: error.message || "Lỗi khi thực thi WebMCP tool trên trình duyệt",
      };
    }
  }

  isSupported() {
    return typeof window !== "undefined";
  }
}

export const webMcpManager = new WebMCPManager();
