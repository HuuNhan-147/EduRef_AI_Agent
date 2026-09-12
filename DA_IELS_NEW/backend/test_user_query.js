import 'dotenv/config';
import mongoose from 'mongoose';
import { AgentOrchestrator } from './modules/ai-agent/core/AgentOrchestrator.js';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const orchestrator = new AgentOrchestrator();
  const sessionId = "test_user_" + Date.now();

  console.log("\n--- QUERY 1: cho mượn cái mic đi bạn ---");
  const res1 = await orchestrator.processRequest("cho mượn cái mic đi bạn", [], null, null, sessionId);
  console.log("Q1 Function Calls:", res1.functionCalls?.map(fc => ({ name: fc.name, args: fc.args })));
  console.log("Q1 Reply:\n", res1.reply);

  console.log("\n--- QUERY 2: máy chiếu thì sao ---");
  const res2 = await orchestrator.processRequest("máy chiếu thì sao", [], null, null, sessionId);
  console.log("Q2 Function Calls:", res2.functionCalls?.map(fc => ({ name: fc.name, args: fc.args })));
  console.log("Q2 Reply:\n", res2.reply);

  await mongoose.disconnect();
}

main().catch(console.error);
