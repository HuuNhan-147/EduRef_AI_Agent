# 06. NHẬT KÝ KIỂM TOÁN BẤT BIẾN (TAMPER-EVIDENT HASH-CHAINED AUDIT LOG)
**Dự án:** EduRef AI — The Academic Escalation Referee  
**Module:** `backend/services/AuditLogService.js`, `backend/routes/auditRoutes.js`

---

## 1. NGUYÊN LÝ BẢO MẬT & BẢN CHẤT MẬT MÃ HỌC

Hệ thống EduRef AI triển khai cơ chế **Tamper-Evident Hash-Chained Audit Log** (Nhật ký kiểm toán mắt xích băm chống can thiệp).

### Nguyên tắc liên kết chuỗi băm (Hash-Chain Principle):
- Mỗi một sự kiện học vụ (Tạo đơn, Kiểm tra điều kiện, Thẩm định quy chế, Phê duyệt, Chuyển tiếp, Từ chối, Hoàn tác) đều được ghi nhận thành một bản ghi (Block) trong bảng `AuditLog`.
- Mã băm của bản ghi hiện tại (`sha256Hash`) được tính toán dựa trên nội dung sự kiện và **mã băm của bản ghi liền trước (`previousHash`)**.
- Bản ghi đầu tiên của toàn hệ thống liên kết với khối khởi tạo: `GENESIS_HASH_EDUREF_2026`.

```
┌───────────────────────────┐      ┌───────────────────────────┐
│ BLOCK #1 (Genesis)        │      │ BLOCK #2                  │
│ previousHash:             │      │ previousHash:             │
│ "GENESIS_HASH_EDUREF_2026"│ ───► │ "e4b1c8a...3f90" (Hash 1) │
│ action: "CREATE_REQUEST"  │      │ action: "AUTO_APPROVE"    │
│ sha256Hash: "e4b1c8a..."  │      │ sha256Hash: "7a8d29f..."  │
└───────────────────────────┘      └─────────────┬─────────────┘
                                                 │
                                                 ▼
                                   ┌───────────────────────────┐
                                   │ BLOCK #3                  │
                                   │ previousHash:             │
                                   │ "7a8d29f...c421" (Hash 2) │
                                   │ action: "HUMAN_OVERRIDE"  │
                                   │ sha256Hash: "b2c941a..."  │
                                   └───────────────────────────┘
```

> **Định danh chính xác:** Đây là mô hình **Hash-Chaining Audit Log** (tương tự git commits tree hoặc certificate transparency log), không gọi là Blockchain vì không sử dụng cơ chế đồng thuận phân tán (Consensus / Proof-of-Work).

---

## 2. CHUẨN HÓA DỮ LIỆU BẰNG CANONICAL JSON

Một thách thức lớn khi băm dữ liệu trong cơ sở dữ liệu PostgreSQL là cột `inputSnapshot` dạng `JSONB`. PostgreSQL không bảo toàn thứ tự các key trong đối tượng JSON khi lưu trữ, dẫn đến việc tính lại mã băm có thể bị sai lệch.

EduRef AI giải quyết triệt để vấn đề này bằng hàm `canonicalStringify()` tại [AuditLogService.js:9-18](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/backend/services/AuditLogService.js#L9-L18):
```javascript
static canonicalStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => this.canonicalStringify(item)).join(',') + ']';
  }
  const keys = Object.keys(obj).sort(); // Sắp xếp keys theo thứ tự từ điển alphabet
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + this.canonicalStringify(obj[k])).join(',') + '}';
}
```

---

## 3. CÔNG THỨC TÍNH TOÁN SHA-256 CHO MỖI SỰ KIỆN

Mỗi mã băm được sinh ra bằng thuật toán SHA-256 với chuỗi payload thô gồm 7 thành phần bất biến:

```javascript
const rawPayload = [
  previousHash || 'GENESIS_HASH_EDUREF_2026',
  actorType || 'AI_AGENT',
  action || '',
  decision || '',
  reason || '',
  this.canonicalStringify(inputSnapshot || {}),
  timeStr, // ISO 8601 String chuẩn UTC
].join('|');

return crypto.createHash('sha256').update(rawPayload).digest('hex');
```

### Các trường dữ liệu lưu trữ trong bảng `AuditLog`:
- `id`: Định danh duy nhất CUID.
- `requestId`: ID hồ sơ đơn sinh viên liên quan.
- `actorType`: Vai trò người thực hiện (`AI_AGENT`, `STUDENT`, `STAFF`, `DEAN`, `ADMIN`).
- `action`: Mã hành động chuẩn (`CREATE_REQUEST`, `CHECK_REQUIREMENTS`, `EVALUATE_POLICY`, `WORKFLOW_AUTO_APPROVE`, `STAFF_APPROVE_REQUEST`, `HUMAN_OVERRIDE_ROLLBACK`...).
- `decision`: Quyết định đưa ra (`APPROVED`, `REJECTED`, `ESCALATED`, `WAITING_STUDENT`, `CANCELLED`).
- `reason`: Căn cứ pháp lý hoặc lý do của quyết định.
- `inputSnapshot`: Dữ liệu đầu vào tại thời điểm ra quyết định (JSONB).
- `beforeState`: Trạng thái của đơn trước khi thực thi.
- `afterState`: Trạng thái của đơn sau khi thực thi.
- `sha256Hash`: Chữ ký số băm của bản ghi hiện tại.
- `previousHash`: Mã băm của bản ghi liền trước.
- `createdAt`: Thời gian ghi nhận bất biến.

---

## 4. THẨM ĐỊNH TÍNH TOÀN VẸN TOÀN BỘ CHUỖI (VERIFY ENTIRE CHAIN)

Hệ thống cung cấp API `GET /api/audit/verify-chain` cho phép kiểm toán viên và Ban Giám Khảo kiểm chứng tính toàn vẹn của hệ thống trong 1 thao tác:

```javascript
// Quét từ Genesis Block đến khối mới nhất:
for (let i = 0; i < logs.length; i++) {
  const log = logs[i];

  // 1. Kiểm tra liên kết chuỗi (Chain Link)
  if (log.previousHash !== previousExpectedHash) {
    return {
      chainValid: false,
      brokenBlockIndex: i,
      reason: `Đứt gãy liên kết chuỗi tại Block #${i + 1}: previousHash không khớp!`,
    };
  }

  // 2. Kiểm tra tính toàn vẹn nội dung của khối
  const recalculatedHash = calculateHash(log);
  if (recalculatedHash !== log.sha256Hash) {
    return {
      chainValid: false,
      brokenBlockIndex: i,
      reason: `Dữ liệu tại Block #${i + 1} đã bị sửa đổi trái phép!`,
    };
  }

  previousExpectedHash = log.sha256Hash;
}
```

### Khả năng phát hiện gian lận:
1. **Nếu ai đó mở database sửa điểm GPA hoặc sửa quyết định từ REJECTED sang APPROVED:** $\rightarrow$ `recalculatedHash !== log.sha256Hash` $\rightarrow$ Báo lỗi ngay lập tức.
2. **Nếu ai đó xóa bớt 1 dòng log trong cơ sở dữ liệu:** $\rightarrow$ Khối tiếp theo sẽ có `previousHash` không khớp với khối đứng trước nó $\rightarrow$ Phát hiện đứt gãy chuỗi ngay lập tức.
