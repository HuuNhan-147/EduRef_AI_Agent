# 05. MA TRẬN ĐIỀU KIỆN, QUY CHẾ & PHÂN CẤP THẨM QUYỀN
**Dự án:** EduRef AI — The Academic Escalation Referee  
**Module:** `AcademicPolicyEngine.js`, `BasePetitionHandler.js`, `schema.prisma`

> **Nguyên tắc Sprint 2:** AI chỉ tiếp nhận, kiểm tra dữ kiện, gắn cờ quy chế và định tuyến. AI không tự phê duyệt hoặc từ chối hồ sơ. Quyết định cuối cùng luôn thuộc `STAFF`, `DEAN` hoặc `ADMIN` theo cấp thẩm quyền.

---

## 1. PHÂN BIỆT RẠCH RÒI 4 KHÁI NIỆM TRỌNG TÂM

Để đảm bảo tính chính xác khoa học và không bị nhầm lẫn, hệ thống phân định độc lập 4 tầng khái niệm:

```
                  ┌─────────────────────────────────────┐
                  │ 1. REQUIREMENT (Điều kiện đầu vào)  │
                  │ "Hồ sơ đã đủ thông tin chưa?"       │
                  └──────────────────┬──────────────────┘
                                     │ ĐỦ (complete = true)
                                     ▼
                  ┌─────────────────────────────────────┐
                  │ 2. POLICY (Quy chế đào tạo)         │
                  │ "Yêu cầu có được phép thực hiện?"   │
                  └──────────────────┬──────────────────┘
                                     │ HỢP LỆ (passed = true)
                                     ▼
                  ┌─────────────────────────────────────┐
                  │ 3. AUTHORITY (Phân cấp thẩm quyền)  │
                  │ "Ai có quyền phê duyệt yêu cầu này?" │
                  └──────────────────┬──────────────────┘
                                     │ ĐÃ PHÂN CẤP
                                     ▼
                  ┌─────────────────────────────────────┐
                  │ 4. DECISION (Quyết định hành động)  │
                  │ ASK | ROUTE | HUMAN DECISION        │
                  └─────────────────────────────────────┘
```

1. **REQUIREMENT (Dữ liệu bắt buộc):**
   - Trả lời câu hỏi: *Sinh viên đã điền đủ các trường bắt buộc và tải lên chứng từ cần thiết chưa?*
   - Kết quả: Đủ (`complete = true`) hoặc Thiếu (`missing = [...]`).
   - Nếu thiếu: Ra quyết định `ASK_CLARIFICATION`, chuyển trạng thái `WAITING_STUDENT`.

2. **POLICY (Quy chế đào tạo):**
   - Trả lời câu hỏi: *Dựa trên cơ sở dữ liệu học vụ của nhà trường, sinh viên có đáp ứng quy chế để được giải quyết đơn không?*
   - Kết quả: Thỏa mãn (`passed = true`) hoặc Vi phạm (`passed = false`).
   - Nếu có điều kiện chưa đạt: AI gắn cờ, viện dẫn điều khoản và chuyển cán bộ xem xét.

3. **AUTHORITY (Ranh giới thẩm quyền):**
   - Trả lời câu hỏi: *Hồ sơ này thuộc Chuyên viên PĐT hay Trưởng phòng Đào tạo?*
   - Kết quả: `STAFF` hoặc `DEAN`.
   - AI đóng gói `contextCapsule`, chuyển trạng thái `ESCALATED` và không giữ quyền quyết định.

4. **DECISION (Phán quyết cuối cùng):**
   - `ASK_CLARIFICATION`: Tạm dừng, yêu cầu sinh viên bổ sung.
   - `ESCALATE_TO_STAFF`: Đóng gói hồ sơ chuyển Chuyên viên PĐT.
   - `ESCALATE_TO_DEAN`: Chuyển cấp Trưởng Phòng đối với hồ sơ vượt thẩm quyền chuyên viên.
   - `APPROVED`/`REJECTED`: Chỉ được ghi sau thao tác của con người có thẩm quyền.

---

## 2. MA TRẬN QUY CHẾ VÀ THẨM QUYỀN ĐÀO TẠO

### Bảng đối chiếu các thủ tục học vụ chính:

| Mã thủ tục | Tên thủ tục | Yêu cầu bắt buộc (Requirements) | Quy chế đào tạo (Policies) | Cấp thẩm quyền (Authority) | Hành vi AI mặc định |
|---|---|---|---|---|---|
| `STUDENT_CONFIRMATION` | Giấy Xác Nhận Sinh Viên | Mục đích sử dụng (`REQ_PURPOSE`), SĐT, Nơi sinh | Sinh viên `ACTIVE`, Nợ phí $\le$ 10.000.000đ | `STAFF` | AI chuẩn bị hồ sơ và **chuyển Chuyên viên quyết định** (`ESCALATE_TO_STAFF`) |
| `GRADUATION_ASSESSMENT` | Đơn Đề Nghị Xét Tốt Nghiệp | SĐT, Nơi sinh, Lý do, 2 chứng chỉ chuẩn đầu ra (Số hiệu & Số vào sổ đúng quy cách) | Sinh viên `ACTIVE`, Nợ phí = 0đ, GPA $\ge$ 2.0 | `DEAN` (Hội đồng / Trưởng phòng Đào tạo) | **Không tự duyệt $\rightarrow$ Chuyển tiếp** (`ESCALATE_TO_DEAN`) |
| `EXAM_DEFERRAL` | Đơn Xin Hoãn Thi | Mã môn học (`REQ_COURSE_CODE`), Giấy viện/Bệnh án (`REQ_HOSPITAL_DOC`) | Sinh viên `ACTIVE`, Lý do bất khả kháng (sức khỏe/tang gia) | `STAFF` (Chuyên viên PĐT thẩm định bệnh án) | **Không tự duyệt $\rightarrow$ Chuyển tiếp** (`ESCALATE_TO_STAFF`) |
| `GRADE_APPEAL` | Đơn Xin Phúc Khảo | Mã môn học, Điểm số hiện tại, Lý do phúc khảo | Nộp trong vòng 7 ngày kể từ ngày công bố điểm | `STAFF` (Bộ phận Khảo thí) | Quá hạn $\rightarrow$ **gắn cờ và chuyển cán bộ quyết định** |
| `SPECIAL_PETITION` | Đơn Cứu Xét Ngoại Lệ | Bản giải trình lý do cá nhân (`REQ_EXPLANATION`) | Phải có sự phê duyệt của Ban Giám hiệu | `DEAN` (Lãnh đạo Phòng Đào tạo) | **Không tự duyệt $\rightarrow$ Chuyển tiếp** (`ESCALATE_TO_DEAN`) |

---

## 3. CẤU TRÚC CONTEXT CAPSULE KHI CHUYỂN TIẾP (ESCALATION)

Khi một hồ sơ bị vượt thẩm quyền, tác tử AI tự động đóng gói đối tượng `contextCapsule` lưu vào PostgreSQL:

```json
{
  "requestCode": "ST-340510",
  "studentCode": "2280602154",
  "studentName": "Cao Hữu Nhân",
  "requestTypeName": "Đơn Đề Nghị Xét Tốt Nghiệp",
  "requiredRole": "DEAN",
  "reason": "Loại thủ tục [Đơn Đề Nghị Xét Tốt Nghiệp] (ST-340510) yêu cầu cấp Trưởng Phòng Đào tạo theo quy chế trường.",
  "actionableQuestion": "Kính chuyển Thầy/Cô Trưởng Khoa Công nghệ Thông tin phê duyệt hồ sơ xét tốt nghiệp cho sinh viên Cao Hữu Nhân (GPA: 3.52, Nợ phí: 0 VNĐ) đã hoàn thành đầy đủ chứng chỉ ngoại ngữ và kỹ năng.",
  "escalatedAt": "2026-09-21T13:41:33.859Z",
  "academicSnapshot": {
    "gpa": 3.52,
    "tuitionDebt": 0,
    "department": "Khoa Công Nghệ Thông Tin",
    "certificatesCount": 2,
    "visionInspection": "PASSED_100%"
  }
}
```

### Nguyên tắc bất biến của Context Capsule:
1. **Lý do vượt quyền AI (`escalationReason`):** Phải được giữ nguyên vẹn, không được phép ghi đè khi Cán bộ duyệt đơn.
2. **Ghi chú của Người duyệt (`reviewerNote`):** Được lưu riêng biệt trong `contextCapsule.reviewerNote` và gắn kèm tên người duyệt (`reviewedBy`), thời gian duyệt (`reviewedAt`).
