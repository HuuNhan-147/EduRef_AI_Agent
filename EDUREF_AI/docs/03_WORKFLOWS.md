# 03. Quy Trình Nghiệp Vụ Bản Chung Kết

> Quy trình chuẩn hóa: `STUDENT_CONFIRMATION` — Cấp Giấy Xác Nhận Sinh Viên (5 Biểu Mẫu Chuẩn HUTECH).  
> Nguồn chân lý kiến trúc: [`SoDoHeThong_EduRef_AI.mdj`](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/SoDoHeThong_EduRef_AI.mdj) và [`StudentConfirmationDecisionService.js`](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/backend/services/StudentConfirmationDecisionService.js).

---

## 1. Sơ đồ luồng thẩm định học vụ tự hành (Theo Sơ đồ Hệ thống `.mdj`)

```mermaid
flowchart TD
    %% SUBGRAPH 1: SINH VIÊN
    subgraph SV ["🧑‍🎓 1. SINH VIÊN (STUDENT)"]
        A(["Bắt đầu: Nhập yêu cầu chat / Mở biểu mẫu"])
        A --> B["Cung cấp dữ liệu đơn (5 Biểu mẫu HUTECH)"]
        CLARIFY_RES["Bổ sung thông tin thiếu / Giải trình lý do / Chọn đổi form"]
        CLARIFY_RES --> B
        RECEIVE_HARDCOPY(["Nhận bản cứng ký sống & mộc đỏ tại Phòng CTSV"])
    end

    %% SUBGRAPH 2: HỆ THỐNG EDUREF AI
    subgraph CORE ["🤖 2. HỆ THỐNG EDUREF AI (POLICY & WORKFLOW ENGINE)"]
        B --> G1{"[Chốt 1] Nhận diện & Đối soát biểu mẫu<br/>(Cross-Form Mismatch?)"}
        G1 -- "Lệch biểu mẫu chat vs form" --> OUT_CLARIFY_1["ASK_CLARIFICATION<br/>(Hướng dẫn đổi form hoặc chat xác nhận)"]
        
        G1 -- "Khớp biểu mẫu" --> G2{"[Chốt 2] Kiểm tra dữ kiện tối thiểu<br/>(Đủ SĐT, Nơi nhận, Địa chỉ, Môn nợ?)"}
        G2 -- "Thiếu trường bắt buộc" --> OUT_CLARIFY_2["ASK_CLARIFICATION<br/>(Yêu cầu bổ sung dữ kiện)"]
        
        G2 -- "Đầy đủ dữ kiện" --> G3{"[Chốt 3] Trạng thái học vụ đặc biệt<br/>(Bảo lưu SUSPENDED / Thôi học DROPPED?)"}
        G3 -- "Có (Bảo lưu hoặc Thôi học)" --> OUT_REJECT_1["REJECTED_POLICY<br/>(Từ chối ngay lập tức, tuyệt đối không bypass)"]
        
        G3 -- "Bình thường (ACTIVE)" --> G4{"[Chốt 4] Tiến độ đào tạo<br/>(Khóa học quá 4 năm chuẩn?)"}
        G4 -- "Quá 4 năm VÀ còn nợ môn (< 150 tc)" --> OUT_CLARIFY_3["ASK_CLARIFICATION<br/>(Điều hướng sang Biểu mẫu Nợ môn COURSE_DEBT)"]
        G4 -- "Quá 4 năm ĐÃ hoàn thành (>= 150 tc)" --> OUT_ESCALATE_1["ESCALATE_TO_STAFF<br/>(Vượt quyền AI: Chuyển Cán bộ PĐT xác minh)"]
        
        G4 -- "Trong hạn 4 năm" --> G5{"[Chốt 5] Hoạt động học tập kỳ hiện tại<br/>(Có TKB hoặc đăng ký tín chỉ kỳ này?)"}
        G5 -- "Chưa có TKB nhưng có lý do cần gấp" --> OUT_ESCALATE_2["ESCALATE_TO_STAFF<br/>(Đóng gói hồ sơ cần gấp chuyển Cán bộ)"]
        G5 -- "Chưa có TKB và không có lý do" --> OUT_REJECT_2["REJECTED_POLICY<br/>(Từ chối theo quy chế đào tạo)"]
        
        G5 -- "Có TKB / Có tín chỉ" --> G6{"[Chốt 6] Hạn ngạch cấp lại học kỳ<br/>(Đã cấp đơn cùng loại trong 150 ngày?)"}
        G6 -- "Cấp lần 2 CHƯA có lý do giải trình" --> OUT_CLARIFY_4["ASK_CLARIFICATION<br/>(Yêu cầu cung cấp lý do cấp lại)"]
        G6 -- "Cấp lần 2 ĐÃ CÓ lý do chính đáng" --> OUT_ESCALATE_3["ESCALATE_TO_STAFF<br/>(AI không tự duyệt cấp lại: Chuyển Cán bộ)"]
        
        G6 -- "Cấp lần đầu trong kỳ" --> G7{"[Chốt 7] Thẩm quyền & Ngoại lệ<br/>(Xin duyệt miệng / Ép quyền / Ngoài mục đích?)"}
        G7 -- "Viện dẫn duyệt miệng / Ép quyền" --> OUT_ESCALATE_4["ESCALATE_TO_STAFF<br/>(Cảnh báo vượt thẩm quyền AI)"]
        
        G7 -- "Hợp lệ thường quy 100%" --> OUT_AUTO["AUTO_APPROVED<br/>(Tự động phê duyệt trong < 1.0 giây)"]
        
        OUT_AUTO --> AUDIT_SIGN["Cấp mã công văn XNSV-XXXXXX<br/>+ Ghi Sổ cái Kiểm toán SHA-256 (Merkle Hash)"]
    end

    %% SUBGRAPH 3: CÁN BỘ CTSV / PĐT
    subgraph STAFF ["👨‍💼 3. CÁN BỘ CTSV / PĐT (STAFF / HUMAN-IN-THE-LOOP)"]
        OUT_ESCALATE_1 --> STAFF_QUEUE["Hàng đợi hồ sơ ngoại lệ (ESCALATED Queue)<br/>+ Kèm Context Capsule & Actionable Question"]
        OUT_ESCALATE_2 --> STAFF_QUEUE
        OUT_ESCALATE_3 --> STAFF_QUEUE
        OUT_ESCALATE_4 --> STAFF_QUEUE
        
        STAFF_QUEUE --> STAFF_DECISION{"Cán bộ thẩm định & Ra quyết định"}
        STAFF_DECISION -- "Đồng ý ngoại lệ" --> STAFF_APPROVE["Phê duyệt thủ công (Staff Override)"]
        STAFF_DECISION -- "Từ chối" --> STAFF_REJECT["Từ chối có lý do giải thích"]
        
        STAFF_APPROVE --> AUDIT_SIGN
        
        AUDIT_SIGN --> ROLLBACK_GATE{"Kiểm tra hậu kiểm<br/>(Rollback Guard)"}
        ROLLBACK_GATE -- "Phát hiện sai sót / gian lận" --> ROLLBACK_ACTION["Thu hồi đơn (Rollback)<br/>Tạo block kiểm toán mới"]
        ROLLBACK_GATE -- "Hợp lệ" --> PRINT_DISPATCH["In bản cứng, đóng dấu mộc đỏ CTSV"]
    end

    %% KẾT NỐI LIÊN PHÂN VÙNG
    OUT_CLARIFY_1 -.-> CLARIFY_RES
    OUT_CLARIFY_2 -.-> CLARIFY_RES
    OUT_CLARIFY_3 -.-> CLARIFY_RES
    OUT_CLARIFY_4 -.-> CLARIFY_RES
    
    OUT_REJECT_1 --> END_REJECT(["Kết thúc: Thông báo từ chối quy chế"])
    OUT_REJECT_2 --> END_REJECT
    STAFF_REJECT --> END_REJECT
    ROLLBACK_ACTION --> END_REJECT
    
    PRINT_DISPATCH --> RECEIVE_HARDCOPY
```

---

## 2. Bốn Kết Quả Đầu Ra Chuẩn Hóa (Track A Spec Stops)

| Kết quả đầu ra | Trạng thái kỹ thuật | Ý nghĩa nghiệp vụ | Hành vi hệ thống |
| :--- | :---: | :--- | :--- |
| 🟢 **AUTO_APPROVED** | `APPROVED` | Đạt 100% điều kiện thường quy, có TKB, không trùng hạn ngạch kỳ này. | Cấp mã công văn `XNSV-XXXXXX`, chốt sổ kiểm toán SHA-256, hẹn nhận bản cứng tại CTSV. |
| 🟡 **ASK_CLARIFICATION** | `WAITING_STUDENT` | Thiếu dữ kiện, phát hiện lệch form giữa chat và UI, hoặc xin cấp lần 2 chưa có lý do. | Giữ nguyên trạng thái đơn, hướng dẫn sinh viên bổ sung thông tin hoặc chuyển đổi form. |
| 🔴 **REJECTED_POLICY** | `REJECTED` | Vi phạm quy chế đào tạo (Bảo lưu, Thôi học, không có TKB học kỳ này). | Từ chối dứt khoát, nêu rõ căn cứ điều khoản quy chế, hướng dẫn liên hệ trực tiếp CTSV. |
| 🟠 **ESCALATE_TO_STAFF** | `ESCALATED` | Vượt thẩm quyền AI (Cấp lần 2 có lý do, khóa > 4 năm đã hoàn thành CTĐT, cần gấp khi chưa có TKB, duyệt miệng). | Đóng gói Context Capsule và gửi `actionableQuestion` cụ thể lên Hàng đợi Cán bộ xử lý. |

---

## 3. Điểm Tương Tác Con Người & Khắc Phục Sự Cố (Human-in-the-Loop & Rollback)

- **Sinh viên:** Cung cấp thông tin theo 5 biểu mẫu chuyên biệt, có thể điền form nhanh bên thanh trái hoặc trò chuyện trực tiếp để AI hỗ trợ bóc tách.
- **Tác tử AI:** Tư vấn quy chế, bóc tách thực thể, phát hiện lệch biểu mẫu, thẩm định 7 chốt chặn và đề xuất quyết định học vụ an toàn.
- **Cán bộ CTSV / PĐT:** Tiếp nhận hồ sơ tại Hàng đợi Ngoại lệ (`ESCALATED Queue`), xem xét ngữ cảnh đầy đủ, phê duyệt ngoại lệ (Staff Override) hoặc từ chối có giải thích.
- **Cơ chế Rollback an toàn:** Cán bộ có toàn quyền thu hồi đơn đã tự duyệt bất kỳ lúc nào nếu phát hiện sai sót, tạo ra một block kiểm toán đối ứng mới trong Sổ cái SHA-256 mà không ghi đè hay làm mất tính toàn vẹn của lịch sử cũ.

---

## 4. Verify Harness Độc Lập

Hệ thống cung cấp các endpoint kiểm chứng độc lập:
- `POST /api/agent/verify-90s`: Chạy tự động bộ 5 ca Track A Escalation Verify (đúng tỷ lệ 3 AUTO : 2 ESCALATE).
- `POST /api/agent/verify-general`: Chạy kiểm chứng 4 nhóm quyết định học vụ tổng quát.
- `POST /api/agent/verify-custom-prompt`: Kiểm chứng ca tự do do Giám khảo nhập vào theo thời gian thực.
Mọi ca test đều gọi trực tiếp Động cơ Quy chế [`StudentConfirmationDecisionService.js`](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/backend/services/StudentConfirmationDecisionService.js), đảm bảo tính xác định tuyệt đối (Deterministic) mà không phụ thuộc vào độ trễ hay ảo tưởng của LLM.
