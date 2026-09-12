// backend/modules/ai-agent/tools/AgentTool.js
// Định nghĩa công cụ tương tác cho AI Agent (Chuẩn Function Declaration của Gemini)

export class AgentTool {
  constructor({ name, description, inputSchema, execute }) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
    this.execute = execute;
  }

  getDeclaration() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: "OBJECT",
        properties: this._convertToGeminiSchema(this.inputSchema?.properties || {}),
        required: this.inputSchema?.required || [],
      },
    };
  }

  _convertToGeminiSchema(properties) {
    const geminiProps = {};
    for (const [key, prop] of Object.entries(properties)) {
      geminiProps[key] = {
        type: (prop.type || "STRING").toUpperCase(),
        description: prop.description || "",
      };
      if (prop.enum) {
        geminiProps[key].enum = prop.enum;
      }
    }
    return geminiProps;
  }
}
