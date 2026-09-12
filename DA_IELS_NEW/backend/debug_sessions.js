import 'dotenv/config';
import { conversationMemory } from './modules/ai-agent/memory/ConversationMemory.js';

console.log("Active sessions count:", conversationMemory.sessions.size);
for (const [id, sess] of conversationMemory.sessions.entries()) {
  console.log(`\n--- SESSION ${id} (${sess.messages.length} msgs) ---`);
  sess.messages.forEach(m => {
    console.log(`[${m.role}] ${m.content?.slice(0, 80)}`);
  });
}
