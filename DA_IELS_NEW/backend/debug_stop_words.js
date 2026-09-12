import 'dotenv/config';
import mongoose from 'mongoose';
import { searchEquipment } from './modules/ai-agent/tools/actions/equipmentTools.js';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const tests = [
    "máy chiếu",
    "có máy chiếu",
    "kho có máy chiếu",
    "kho có máy chiếu không bạn",
    "máy chiếu không bạn",
    "mic",
    "cái mic",
    "cho mượn cái mic",
  ];

  for (const t of tests) {
    const res = await searchEquipment({ keyword: t });
    console.log(`Keyword: "${t}" ➔ Found: ${res.count} items`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
