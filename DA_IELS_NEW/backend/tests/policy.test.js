import assert from 'assert';
import AuthorityEngine from '../services/AuthorityEngine.js';

console.log('🧪 BẮT ĐẦU KIỂM THỬ THẨM QUYỀN PHÁN QUYẾT (THE ESCALATION REFEREE)...');

// Case 1: DareU EK87 (850k, 2 ngày) -> AUTO_APPROVED
const res1 = AuthorityEngine.evaluate({
  estimatedValue: 850000,
  loanDays: 2,
  assetCode: 'TB-KEY-001',
  modelName: 'Bàn phím cơ DareU EK87'
});
assert.strictEqual(res1.decision, 'AUTO_APPROVED', 'Case 1 phải được AUTO_APPROVED');
assert.strictEqual(res1.autoApproved, true);
console.log('✅ Case 1 Passed: Bàn phím cơ 850k / 2 ngày -> Tự động phê duyệt');

// Case 2: Dell UltraSharp 27" (12.5M, 5 ngày) -> AUTO_APPROVED
const res2 = AuthorityEngine.evaluate({
  estimatedValue: 12500000,
  loanDays: 5,
  assetCode: 'TB-MON-001',
  modelName: 'Màn hình Dell UltraSharp U2723QE'
});
assert.strictEqual(res2.decision, 'AUTO_APPROVED', 'Case 2 phải được AUTO_APPROVED');
assert.strictEqual(res2.autoApproved, true);
console.log('✅ Case 2 Passed: Màn hình Dell 12.5M / 5 ngày -> Tự động phê duyệt');

// Case 3: Máy chiếu Panasonic (18M, 6 ngày) -> AUTO_APPROVED
const res3 = AuthorityEngine.evaluate({
  estimatedValue: 18000000,
  loanDays: 6,
  assetCode: 'TB-PRJ-001',
  modelName: 'Máy chiếu Panasonic PT-VMZ51'
});
assert.strictEqual(res3.decision, 'AUTO_APPROVED', 'Case 3 phải được AUTO_APPROVED');
assert.strictEqual(res3.autoApproved, true);
console.log('✅ Case 3 Passed: Máy chiếu 18M / 6 ngày -> Tự động phê duyệt');

// Case 4: MacBook Pro M3 Max (45M, 3 ngày) -> ESCALATED_MANAGER (Vượt 20M)
const res4 = AuthorityEngine.evaluate({
  estimatedValue: 45000000,
  loanDays: 3,
  assetCode: 'TB-LAP-001',
  modelName: 'MacBook Pro 16 inch M3 Max'
});
assert.strictEqual(res4.decision, 'ESCALATED_MANAGER', 'Case 4 phải bị ESCALATED_MANAGER');
assert.strictEqual(res4.requiresManagerReview, true);
assert.strictEqual(res4.primaryRuleId, 'POL-VAL-001');
console.log('✅ Case 4 Passed: MacBook Pro 45M (>20M) -> Bắt buộc chuyển cấp Quản lý');

// Case 5: Bộ đàm Motorola (2.5M, 14 ngày) -> ESCALATED_MANAGER (Vượt 7 ngày)
const res5 = AuthorityEngine.evaluate({
  estimatedValue: 2500000,
  loanDays: 14,
  assetCode: 'TB-RAD-001',
  modelName: 'Bộ đàm Motorola CP1300'
});
assert.strictEqual(res5.decision, 'ESCALATED_MANAGER', 'Case 5 phải bị ESCALATED_MANAGER');
assert.strictEqual(res5.requiresManagerReview, true);
assert.strictEqual(res5.primaryRuleId, 'POL-DUR-001');
console.log('✅ Case 5 Passed: Bộ đàm mượn 14 ngày (>7d) -> Bắt buộc chuyển cấp Quản lý');

console.log('🎉 TẤT CẢ 5/5 CA KIỂM THỬ THẨM QUYỀN ĐẠT ĐIỂM CHUẨN XÁC TUYỆT ĐỐI 100%!');
