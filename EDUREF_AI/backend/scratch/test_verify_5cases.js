// scratch/test_verify_5cases.js
import dotenv from 'dotenv';
dotenv.config();

import verifyTools from '../modules/ai-agent/tools/actions/verifyTools.js';

async function test() {
  console.log('⚡ Đang thực thi bộ 5 Test Cases Sprint 1...');
  const res = await verifyTools.run_verify_90s();
  console.log('\n📊 KẾT QUẢ:');
  console.log(res.summary);
  res.results.forEach((r) => {
    console.log(`\n🔹 [${r.id}] ${r.title}`);
    console.log(`   - Loại thủ tục: ${r.petitionName}`);
    console.log(`   - Thể loại: ${r.category}`);
    console.log(`   - Kỳ vọng: ${r.expectedDecision} | Thực tế: ${r.actualDecision}`);
    console.log(`   - Kết quả: ${r.passed ? '✅ PASS' : '❌ FAIL'} (${r.durationMs}ms)`);
    console.log(`   - Ghi chú BGK: ${r.judgeNotes}`);
    console.log(`   - Căn cứ quy chế: ${r.policyRef}`);
  });
}

test().catch(console.error);
