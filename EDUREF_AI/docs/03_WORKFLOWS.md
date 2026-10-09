# 03. Quy Trình Nghiệp Vụ Bản Chung Kết

> Quy trình duy nhất: `STUDENT_CONFIRMATION` — Cấp Giấy Xác Nhận Sinh Viên (5 Biểu Mẫu Chuẩn HUTECH).

## 1. Sơ đồ luồng thẩm định học vụ tự hành

```text
Sinh viên nhập yêu cầu / mở biểu mẫu
        |
        v
AI Agent trích xuất thực thể & nhận diện biểu mẫu
        |
        v
Đối soát chéo biểu mẫu (Cross-Form Mismatch Gate)
        |
        +--> Lệch biểu mẫu ---------> Dừng lại, hướng dẫn 2 cách: điền form trái HOẶC chat trực tiếp
        |
        v
Kiểm tra tính đầy đủ dữ kiện (Fact Completeness Gate)
        |
        +--> Thiếu cơ quan/môn nợ ---> ASK_CLARIFICATION (WAITING_STUDENT)
        |
        v
Deterministic Policy Engine (HUTECH Rules)
        |
        +--> Không có TKB / Thôi học / Bảo lưu ----> REJECTED_POLICY
        +--> Quá 4 năm đào tạo xin NVQS thường ------> REJECTED_POLICY (Điều hướng Form nợ môn)
        +--> Ngoài danh mục / Cấp lần 2 cùng kỳ -----> ESCALATE_TO_STAFF
        +--> Bỏ qua quy định / Vượt quyền -----------> ESCALATE_TO_STAFF
        +--> Đạt 100% điều kiện thường quy ----------> AUTO_APPROVED (< 1.0 giây)
        |
        v
Ghi nhận Sổ cái Kiểm toán SHA-256 + Cấp mã công văn XNSV-XXXXXX
Lưu lịch hẹn nhận bản cứng tại Phòng CTSV (A-01.01 Sài Gòn hoặc E1-01.08 Thủ Đức)
```

## 2. Điểm tương tác con người (Human-in-the-Loop)

- **Sinh viên:** Cung cấp thông tin theo 5 biểu mẫu chuyên biệt, có thể điền form nhanh bên thanh trái hoặc trò chuyện trực tiếp để AI điền giúp.
- **Tác tử AI:** Tư vấn quy chế, bóc tách thực thể, phát hiện lệch biểu mẫu và đề xuất lệnh xử lý an toàn.
- **Cán bộ PĐT / CTSV:** Xem xét các ca ngoại lệ được đóng gói trong Context Capsule, phê duyệt ngoại lệ (Override) hoặc từ chối có ghi chú.
- **Rollback:** Cán bộ có thể thu hồi đơn đã tự duyệt bất kỳ lúc nào nếu phát hiện sai sót, tạo ra một block kiểm toán mới mà không can thiệp lịch sử cũ.

## 3. Verify Harness

Endpoint `POST /api/agent/verify-90s` và `POST /api/agent/verify-custom-prompt` gọi trực tiếp Động cơ Quy chế, kiểm tra tính xác định tuyệt đối của các quyết định học vụ mà không bị ảnh hưởng bởi độ trễ hay ảo tưởng của LLM.
