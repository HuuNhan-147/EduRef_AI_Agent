# 03. CÁC QUY TRÌNH NGHIỆP VỤ (BUSINESS WORKFLOWS)
**Dự án:** EduRef AI — The Academic Escalation Referee  
**Đối soát:** Mã nguồn thực tế tại `PetitionWorkflowCore.js`, `AcademicWorkflowService.js`, `verifyTools.js`

---

## 1. FLOW 1: ROUTINE AUTO-APPROVAL (THƯỜNG QUY TỰ ĐỘNG DUYỆT)

Áp dụng cho các thủ tục thường quy nằm trong thẩm quyền tự chủ của AI (ví dụ: Giấy xác nhận sinh viên hợp lệ).

```mermaid
sequenceDiagram
    autonumber
    actor SinhVien as Sinh viên
    participant Frontend as Frontend (Chat / Form)
    participant Core as PetitionWorkflowCore
    participant Handler as StudentConfirmationHandler
    participant DB as PostgreSQL
    participant Audit as AuditLogService

    SinhVien->>Frontend: Nộp yêu cầu cấp Giấy XNSV (Làm vé xe buýt)
    Frontend->>Core: processPetitionWorkflow({ studentCode, requestTypeCode, inputData })
    Core->>DB: Lấy hồ sơ sinh viên & loại thủ tục
    Core->>Handler: validateRequirements(inputData)
    Handler-->>Core: complete = true (Đủ mục đích)
    Core->>Handler: evaluatePolicies(student, request)
    Handler-->>Core: passed = true (ACTIVE, nợ phí <= 10M)
    Core->>Handler: checkAuthority(request, student)
    Handler-->>Core: role = AI_AGENT, action = AUTO_APPROVE
    Core->>Handler: onApproved(request)
    Handler-->>Core: Cấp mã ST-XXXXXX & mã QR
    Core->>DB: Cập nhật status = APPROVED, qrCodeUrl
    Core->>Audit: recordLog('WORKFLOW_AUTO_APPROVE', 'APPROVED')
    Audit->>DB: Lưu Block mới có mã băm SHA-256
    Core-->>Frontend: Trả về kết quả phê duyệt + Mã QR (< 100ms)
    Frontend-->>SinhVien: Hiển thị chứng thực số thành công
```

---

## 2. FLOW 2: MISSING INFORMATION CLARIFICATION (CHỦ ĐỘNG LÀM RÕ DỮ KIỆN)

Áp dụng khi sinh viên đưa ra yêu cầu chưa đầy đủ dữ kiện bắt buộc.

```mermaid
sequenceDiagram
    autonumber
    actor SinhVien as Sinh viên
    participant Frontend as Frontend (Chat / Modal)
    participant Core as PetitionWorkflowCore
    participant Handler as StudentConfirmationHandler
    participant DB as PostgreSQL
    participant Audit as AuditLogService

    SinhVien->>Frontend: "Cho em xin cái giấy xác nhận với ạ" (Không nêu mục đích)
    Frontend->>Core: processPetitionWorkflow(inputData: { purpose: null })
    Core->>Handler: validateRequirements(inputData)
    Handler-->>Core: complete = false, missing = ['REQ_PURPOSE']
    Core->>Handler: getClarificationQuestion(['REQ_PURPOSE'])
    Handler-->>Core: "Bạn cần giấy xác nhận cho mục đích nào: vay vốn, nghĩa vụ quân sự hay làm vé xe buýt?"
    Core->>DB: Cập nhật status = WAITING_STUDENT, decision = ASK_CLARIFICATION
    Core->>Audit: recordLog('REQUIREMENT_CHECK_INCOMPLETE', 'ASK_CLARIFICATION')
    Core-->>Frontend: Trả về câu hỏi làm rõ trực diện (DỪNG LẠI tại đây)
    Frontend-->>SinhVien: Hiển thị câu hỏi yêu cầu bổ sung
    Note over SinhVien,Frontend: Sinh viên trả lời hoặc bổ sung thông tin
    SinhVien->>Frontend: "Em xin làm vé tháng xe buýt"
    Frontend->>Core: resumePetitionWorkflow({ requestId, additionalData: { purpose: "Làm vé xe buýt" } })
    Core->>Core: Tái kích hoạt quy trình thẩm định từ Bước 1
```

---

## 3. FLOW 3: HIGH-AUTHORITY ESCALATION & STAFF HITL (VƯỢT THẨM QUYỀN & CÁN BỘ DUYỆT)

Áp dụng cho các thủ tục vượt thẩm quyền tự quyền của AI (Đơn xét tốt nghiệp, Hoãn thi, Cứu xét).

```mermaid
sequenceDiagram
    autonumber
    actor SinhVien as Sinh viên
    actor CanBo as Trưởng khoa / Cán bộ PĐT
    participant Frontend as Frontend
    participant Core as PetitionWorkflowCore
    participant Handler as GraduationAssessmentHandler
    participant DB as PostgreSQL
    participant Audit as AuditLogService

    SinhVien->>Frontend: Nộp Đơn xét tốt nghiệp kèm 2 chứng chỉ HUTECH
    Frontend->>Core: processPetitionWorkflow(GRADUATION_ASSESSMENT)
    Core->>Handler: validateRequirements (Đủ SĐT, nơi sinh, lý do, format chứng chỉ) -> PASSED
    Core->>Handler: evaluatePolicies (ACTIVE, nợ phí = 0đ, GPA = 3.52) -> PASSED
    Core->>Handler: checkAuthority()
    Handler-->>Core: role = DEAN, action = DEAN_APPROVAL (Vượt thẩm quyền AI)
    Core->>Handler: buildContextCapsule()
    Handler-->>Core: Đóng gói Context Capsule + Actionable Question
    Core->>DB: Cập nhật status = ESCALATED, decision = ESCALATE_TO_DEAN, contextCapsule
    Core->>Audit: recordLog('ESCALATE_AUTHORITY_TRANSFER', 'ESCALATED')
    Core-->>Frontend: Báo sinh viên: Đơn đã chuyển tiếp lên Trưởng phòng Đào tạo thẩm định
    
    Note over CanBo,Frontend: Trưởng khoa mở Staff Escalation Hub
    CanBo->>Frontend: Chọn đơn ST-XXXXXX, đọc Context Capsule & Actionable Question
    CanBo->>Frontend: Bấm "Phê duyệt đơn", nhập ghi chú chỉ đạo
    Frontend->>DB: POST /api/petitions/:id/approve
    Note over DB: Bảo toàn escalationReason cũ của AI, lưu reviewerNote vào contextCapsule
    DB->>Audit: recordLog('STAFF_APPROVE_REQUEST', 'APPROVED')
    Frontend-->>CanBo: Cấp mã QR có chữ ký điện tử cán bộ thành công
```

---

## 4. FLOW 4: HARD POLICY REJECTION (TỪ CHỐI DỨT KHOÁT DO SAI QUY CHẾ)

Áp dụng khi sinh viên vi phạm các quy chế đào tạo cứng (Thôi học, Nợ phí quá hạn).

```mermaid
sequenceDiagram
    autonumber
    actor SinhVien as Sinh viên (DROPPED)
    participant Frontend as Frontend
    participant Core as PetitionWorkflowCore
    participant Handler as StudentConfirmationHandler
    participant DB as PostgreSQL
    participant Audit as AuditLogService

    SinhVien->>Frontend: Xin cấp giấy xác nhận sinh viên
    Frontend->>Core: processPetitionWorkflow()
    Core->>Handler: validateRequirements() -> PASSED
    Core->>Handler: evaluatePolicies()
    Handler-->>Core: passed = false (Vi phạm POL_STUDENT_ACTIVE: Trạng thái DROPPED)
    Core->>DB: Cập nhật status = REJECTED, decision = REJECTED_POLICY
    Core->>Audit: recordLog('POLICY_VIOLATION_REJECT', 'REJECTED')
    Core-->>Frontend: Từ chối tiếp nhận: "Sinh viên đã có quyết định buộc thôi học..."
    Frontend-->>SinhVien: Hiển thị thông báo từ chối dứt khoát kèm điều khoản quy chế
```

---

## 5. FLOW 5: HUMAN OVERRIDE & REVOCATION (CAN THIỆP DỪNG & THU HỒI CHỨNG THỰC)

Áp dụng khi phát hiện sai sót, khiếu nại hoặc gian lận sau khi đơn đã được cấp mã QR.

```mermaid
sequenceDiagram
    autonumber
    actor QuanLy as Cán bộ Quản lý / Giám khảo
    participant Frontend as Frontend
    participant Service as AcademicWorkflowService
    participant DB as PostgreSQL
    participant Audit as AuditLogService

    QuanLy->>Frontend: Bấm "Can thiệp Dừng Khẩn Cấp (Rollback)" trên đơn ST-XXXXXX
    QuanLy->>Frontend: Nhập lý do: "Phát hiện khai báo sai lệch số hiệu chứng chỉ"
    Frontend->>Service: POST /api/petitions/:id/rollback
    Service->>DB: Lấy beforeState = { status: APPROVED, qrCodeUrl }
    Service->>DB: Cập nhật status = CANCELLED, qrCodeUrl = null, decision = HUMAN_OVERRIDE_CANCELLED
    Service->>Audit: recordLog('HUMAN_OVERRIDE_ROLLBACK', 'CANCELLED', reason, beforeState, afterState)
    Audit->>DB: Ghi nhận Block băm mới
    Service-->>Frontend: Vô hiệu hóa mã QR và chứng thực số thành công
```

---

## 6. FLOW 6: VERIFY HARNESS 90S (BỘ CHẠY KIỂM THỬ TỰ HÀNH)

Áp dụng cho Ban Giám Khảo kiểm chứng năng lực Bounded Autonomy của hệ thống trong 90 giây.

```mermaid
sequenceDiagram
    autonumber
    actor BGK as Ban Giám Khảo
    participant UI as Verify Harness Cockpit
    participant Verify as verifyTools.run_verify_90s()
    participant Core as PetitionWorkflowCore
    participant DB as PostgreSQL & AuditLog
    participant Socket as Socket.IO (Live Terminal)

    BGK->>UI: Bấm "⚡ Chạy Kiểm Thử 90s"
    UI->>Verify: POST /api/agent/verify-90s
    loop Tuần tự 5 Test Cases (TC-01 -> TC-05)
        Verify->>Socket: Broadcast log bước bắt đầu kiểm thử
        Verify->>Core: processPetitionWorkflow(TC_data)
        Core->>DB: Thực thi thật qua Handlers, kiểm tra điều kiện & lưu AuditLog thật
        Core-->>Verify: Trả về actualDecision thật
        Verify->>Verify: So sánh actualDecision === expectedDecision
        Verify->>Socket: Broadcast log kết quả phán quyết & thời gian thực thi (ms)
    end
    Verify-->>UI: Trả về bảng tổng hợp 5/5 ĐẠT, thời gian tổng, chi tiết từng ca
    UI-->>BGK: Hiển thị bảng điều khiển trực quan 1 màn hình không cuộn
```

---

## 7. FLOW 7: CRYPTOGRAPHIC AUDIT VERIFICATION (THẨM ĐỊNH CHUỖI KHỐI TOÀN VẸN)

Áp dụng khi thanh tra đào tạo hoặc kiểm toán viên kiểm tra tính bất biến của hồ sơ.

```mermaid
sequenceDiagram
    autonumber
    actor Auditor as Kiểm toán viên / Thanh tra
    participant UI as Audit Explorer Page
    participant Service as AuditLogService.verifyEntireChain()
    participant DB as PostgreSQL (AuditLog)

    Auditor->>UI: Bấm "Thẩm định toàn bộ chuỗi khối"
    UI->>Service: GET /api/audit/verify-chain
    Service->>DB: Lấy tất cả AuditLog ORDER BY createdAt ASC
    loop Quét từ Genesis Block đến Khối cuối cùng
        Service->>Service: Kiểm tra previousHash có khớp với hash của khối trước không?
        Service->>Service: Tính lại SHA-256 từ Canonical JSON của khối hiện tại
        Service->>Service: So sánh recalculatedHash === block.sha256Hash
    end
    alt Chuỗi hoàn toàn bất biến
        Service-->>UI: chainValid = true, totalBlocks, latestHash, verifiedAt
        UI-->>Auditor: Hiển thị huy hiệu xanh: "Chuỗi khối toàn vẹn 100%"
    else Phát hiện có khối bị sửa đổi trái phép
        Service-->>UI: chainValid = false, brokenBlockIndex, brokenBlockId, reason
        UI-->>Auditor: Báo động đỏ: Chỉ đích danh vị trí bị can thiệp
    end
```
