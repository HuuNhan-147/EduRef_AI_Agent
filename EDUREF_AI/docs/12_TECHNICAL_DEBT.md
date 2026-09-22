# 12. NỢ KỸ THUẬT & KẾ HOẠCH HÀNH ĐỘNG SPRINT 2 (TECHNICAL DEBT & ACTION PLAN)
**Dự án:** EduRef AI — The Academic Escalation Referee  
**Kỳ đánh giá:** Sau Sprint 1 — Định hướng Sprint 2

---

## 1. DANH MỤC NỢ KỸ THUẬT (TECHNICAL DEBT REGISTRY)

| ID | Nhóm nợ | Mô tả chi tiết | Tác động kỹ thuật | Mức độ ưu tiên |
|---|---|---|---|---|
| **TD-01** | **Kiến trúc (Architectural)** | Trùng lặp 2 bộ máy Workflow: `PetitionWorkflowCore` và `AcademicWorkflowService` cùng tồn tại | Phải bảo trì và sửa quy chế ở 2 file riêng biệt | **Ưu tiên 1 (Cao)** |
| **TD-02** | **Bảo mật (Security)** | Lỗ hổng bypass auth qua demo fallback và route rollback không có middleware | Nguy cơ chiếm quyền và hủy đơn trái phép | **Ưu tiên 1 (Cao)** |
| **TD-03** | **Độ tin cậy (Reliability)** | Race condition ghi log SHA-256 đồng thời làm đứt chuỗi băm | Hỏng tính năng thẩm định chuỗi khối trước BGK | **Ưu tiên 1 (Cao)** |
| **TD-04** | **Trí tuệ nhân tạo (AI)** | Fallback mock của Gemini Vision tự động pass ảnh khi mất mạng | Thiếu tính chân thực khi mất kết nối mạng ngoài | **Ưu tiên 2 (Trung bình)** |
| **TD-05** | **Bộ nhớ (State Management)** | `ConversationMemory` lưu trữ trong RAM của tiến trình Node.js | Mất lịch sử chat và context đơn khi server restart | **Ưu tiên 2 (Trung bình)** |
| **TD-06** | **Trải nghiệm chấm thi (UX)** | Verify Harness chưa có form cho BGK tự nhập Custom Input | BGK chỉ test được 5 ca dựng sẵn, giảm tính linh hoạt | **Ưu tiên 2 (Trung bình)** |
| **TD-07** | **Mã nguồn (Code Quality)** | Sử dụng các chuỗi Magic Strings rải rác (`'APPROVED'`, `'CANCELLED'`) | Dễ gây lỗi chính tả khi mở rộng các thủ tục mới | **Ưu tiên 3 (Thấp)** |

---

## 2. KẾ HOẠCH HÀNH ĐỘNG SPRINT 2 (THE 5 SPRINT 2 PILLARS)

Theo đúng nguyên tắc Hackathon, Sprint 2 không tự ý thêm các tính năng lan man ngoài đề bài mà tập trung vào **5 TRỤ CỘT HÀNH ĐỘNG**:

```
                  ┌────────────────────────────────────────┐
                  │ 1. FIX VULNERABILITIES & RACE CONDITION│ (Vá bảo mật & chuỗi băm)
                  └──────────────────┬─────────────────────┘
                                     │
                  ┌──────────────────▼─────────────────────┐
                  │ 2. CONSOLIDATE DUAL WORKFLOW ENGINES   │ (Hợp nhất bộ máy workflow)
                  └──────────────────┬─────────────────────┘
                                     │
                  ┌──────────────────▼─────────────────────┐
                  │ 3. ADD CUSTOM INPUT VERIFY SANDBOX     │ (Thêm hộp cát test cho BGK)
                  └──────────────────┬─────────────────────┘
                                     │
                  ┌──────────────────▼─────────────────────┐
                  │ 4. GRACEFUL VISION DEGRADATION         │ (Xóa bỏ mock, xử lý lỗi thật)
                  └──────────────────┬─────────────────────┘
                                     │
                  ┌──────────────────▼─────────────────────┐
                  │ 5. AUTOMATED REGRESSION TEST SUITE     │ (Bộ test tự động 100% pass)
                  └────────────────────────────────────────┘
```

### Chi tiết 5 nhiệm vụ cho Sprint 2:

#### Nhiệm vụ 1: Khóa chặt Authentication & Bảo vệ Chuỗi băm (Fix Auth & Mutex)
- Xóa bỏ đoạn demo fallback trong `authMiddleware.js`.
- Bọc Mutex tuần tự hóa hoặc `prisma.$transaction` khi ghi `AuditLogService.recordLog()`.
- Gắn `authenticateToken` và `requireStaffOrDean` vào endpoint `/api/agent/rollback`.

#### Nhiệm vụ 2: Hợp nhất Workflow Engine (Unified Core)
- Chuyển `AcademicWorkflowService` thành Facade Service gọi trực tiếp vào `PetitionWorkflowCore`.
- Đảm bảo toàn bộ 11 công cụ của AI Agent và các API REST đều chạy qua cùng một nguồn chân lý duy nhất.

#### Nhiệm vụ 3: Bổ sung Custom Input Sandbox trên Verify Harness
- Trên trang `VerifyHarnessPage.jsx`, bổ sung một khối "Thử nghiệm Tình huống Tùy chỉnh (Sandbox)":
  - Cho phép BGK chọn sinh viên bất kỳ, nhập prompt tự do hoặc chọn tệp chứng chỉ bất kỳ.
  - Nhấn nút "Chạy Thẩm Định" $\rightarrow$ Hệ thống thực thi thật và hiển thị kết quả phán quyết ngay trên giao diện Cockpit.

#### Nhiệm vụ 4: Xóa bỏ Mock trong Gemini Vision (True Graceful Degradation)
- Loại bỏ hàm `getFallbackVerification()` hardcoded.
- Nếu gọi Gemini Vision lỗi: Tự động gắn cờ `REQUIRES_MANUAL_INSPECTION` và chuyển tiếp hồ sơ lên Cán bộ PĐT thẩm định thủ công (`ESCALATE_TO_STAFF`).

#### Nhiệm vụ 5: Chuẩn hóa Hằng số Học vụ (Constants Standardization)
- Tạo file `backend/constants/academicConstants.js` và `frontend/src/constants/academicConstants.js`.
- Gom toàn bộ mã trạng thái, mã thủ tục và mã quyền vào Enum chuẩn hóa (`REQUEST_STATUS`, `PETITION_TYPES`, `AUTHORITY_ROLES`).
