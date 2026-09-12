// backend/modules/ai-agent/tools/adapters/LocalServiceAdapter.js
// Thực thi tool nội bộ tại máy chủ

export class LocalServiceAdapter {
  async execute(tool, args, context) {
    return await tool.execute(args, context);
  }
}

export const localServiceAdapter = new LocalServiceAdapter();
