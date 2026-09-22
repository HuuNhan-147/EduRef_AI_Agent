// backend/modules/ai-agent/tools/adapters/LocalServiceAdapter.js
// Thực thi tool nội bộ tại máy chủ EduRef AI

import ToolResolver from '../ToolResolver.js';

export class LocalServiceAdapter {
  async execute(toolName, args, context = {}) {
    return await ToolResolver.resolve(toolName, args);
  }
}

export const localServiceAdapter = new LocalServiceAdapter();
export default localServiceAdapter;
