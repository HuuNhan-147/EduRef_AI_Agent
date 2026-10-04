# Sprint 2 Final Plan - EduRef AI

> **Phạm vi đã chốt:** Track A - The Escalation Referee.
> **Quy trình duy nhất:** Cấp Giấy Xác Nhận Sinh Viên (`STUDENT_CONFIRMATION`).
> **Mục tiêu:** Một demo trực tiếp, dễ kiểm chứng, biết tự xử lý ca thường quy và dừng đúng lúc khi cần con người.

## 1. Quyết định phạm vi

EduRef AI không mở rộng thêm các workflow xét tốt nghiệp, vay vốn, hoãn nghĩa vụ hoặc các thủ tục độc lập. Các nội dung này chỉ là **mục đích sử dụng** của cùng một giấy xác nhận sinh viên.

Quyết định nghiệp vụ chỉ đi qua policy deterministic `STUDENT_CONFIRMATION_V1.0.0`; mô hình ngôn ngữ chỉ hỗ trợ hiểu yêu cầu và diễn đạt kết quả.

## 2. Trải nghiệm chấm thi

Sau khi phiên demo khởi tạo, **Verify Track A là màn hình đầu tiên**. Ban Giám Khảo không cần đi qua các màn hình trợ lý, hồ sơ hay quản trị để kiểm thử.

Trên một màn hình duy nhất, BGK có thể:

1. Chạy 5 ca chuẩn bằng một nút.
2. Xem expected/actual decision, classification, thời gian và bằng chứng audit.
3. Nhập một ca mới bằng ngôn ngữ tự nhiên.
4. Quan sát trực tiếp một ca auto-approve, một ca hỏi bổ sung, một ca ngoài policy và một ca chống bypass.

## 3. Hợp đồng bounded autonomy

| Tình huống | Phân loại | Hành động |
|---|---|---|
| Đủ dữ kiện, đúng policy | `ROUTINE` | Tự động phê duyệt |
| Thiếu dữ kiện | `UNKNOWN_FACT` | Hỏi đúng một câu cụ thể |
| Vi phạm điều kiện rõ ràng | `ROUTINE_POLICY_DENY` | Từ chối, nêu căn cứ |
| Mục đích ngoài danh mục | `OUTSIDE_POLICY` | Chuyển cán bộ |
| Ép duyệt, ngoại lệ, vượt quyền | `BEYOND_AUTHORITY` | Chặn bypass, chuyển cán bộ |
| Vòng suy luận chạm giới hạn | `MAX_STEPS_EXCEEDED` | Escalate an toàn |

`AgentOrchestrator` sử dụng hard cap `MAX_AGENT_STEPS = 5`. Khi chạm trần, hệ thống không đoán kết quả và trả về escalation có `actionableQuestion`.

## 4. Việc phải hoàn thành trước khi nộp

### P0 - Tính đúng và khả năng demo

- Chạy 5 ca Track A và 15 ca policy trên database demo thật.
- Đảm bảo `npm test` có kết quả rõ ràng trên môi trường sạch.
- Chuẩn hóa README, RUNBOOK và UI theo đúng một workflow.
- Kiểm tra Live URL, health check, socket và Verify Harness liên tiếp trước khi quay video.

### P1 - Human-in-the-loop và an toàn

- Test các câu lách luật: phê duyệt miệng, ép duyệt, prompt injection và yêu cầu bỏ qua policy.
- Đảm bảo mọi ca escalation có câu hỏi cán bộ trả lời được ngay.
- Kiểm tra quyền: sinh viên chỉ xem hồ sơ của mình; cán bộ xử lý hàng đợi được phân quyền.
- Kiểm tra rollback và chuỗi audit sau approve/reject/escalate.

### P2 - Bằng chứng người dùng và đo lường

- Thử nghiệm với tối thiểu 3 nhân sự thực tế.
- Ghi chức danh, phản hồi nguyên văn, một bất cập và một thay đổi code bắt nguồn từ phản hồi.
- Chạy tối thiểu 30 ca độc lập có người gán nhãn.
- Báo cáo `missed escalation`, `false escalation`, automation rate, median và p95.

## 5. Những nội dung không thuộc phạm vi bản nộp

- Không quảng bá RAG, VectorDB, embedding hoặc FAQ retrieval như tính năng đã triển khai.
- Không quảng bá Redis hoặc session phân tán khi source hiện tại chưa dùng chúng.
- Không dùng similarity để quyết định duyệt hoặc từ chối hồ sơ.
- Không công bố số liệu tác động, độ chính xác hoặc latency nếu chưa có log đo được.
- Không mô tả các handler đã xóa như tính năng đang vận hành.

## 6. Tiêu chí hoàn tất

Bản Sprint 2 chỉ được coi là hoàn tất khi:

- BGK mở URL và thấy ngay Verify Track A.
- Nút chạy 5 ca trả kết quả thật, có timestamp.
- Hai ca cần chuyển tiếp được phân loại khác nhau và có câu hỏi hành động.
- Hai ca mới do BGK nhập được xử lý hợp lý, không đoán bừa.
- Một người dùng thực tế xác nhận được thay đổi sản phẩm; tốt nhất là đủ ba người theo rubric.
- Slide, video, RUNBOOK và source không mâu thuẫn về phạm vi.
