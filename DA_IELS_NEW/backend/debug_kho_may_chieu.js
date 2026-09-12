import 'dotenv/config';
import mongoose from 'mongoose';
import { AgentOrchestrator } from './modules/ai-agent/core/AgentOrchestrator.js';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const orchestrator = new AgentOrchestrator();

  const msg = "kho có máy chiếu không bạn";
  console.log("INPUT:", msg);

  const res = await orchestrator.processRequest(msg);
  console.log("\nRESULT SUCCESS:", res.success);
  console.log("FUNCTION CALLS:", JSON.stringify(res.functionCalls, null, 2));
  console.log("EQUIPMENTS COUNT:", res.payload?.equipments?.length || 0);
  console.log("REPLY:\n", res.reply);

  await mongoose.disconnect();
}

main().catch(console.error);
