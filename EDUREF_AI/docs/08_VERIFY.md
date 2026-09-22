# 08. BỘ CHẠY KIỂM THỬ TỰ HÀNH 90S (VERIFY HARNESS COCKPIT)
**Dự án:** EduRef AI — The Academic Escalation Referee  
**Module:** `backend/modules/ai-agent/tools/actions/verifyTools.js`, `frontend/src/pages/VerifyHarnessPage.jsx`

---

## 1. MỤC ĐÍCH & Ý NGHĨA TRÌNH DIỄN (BGK 90-SECOND DEMO)

Trong khuôn khổ cuộc thi Hackathon, Ban Giám Khảo chỉ có 90 giây đến 2 phút để đánh giá một dự án. **Verify Harness Cockpit** được thiết kế như một bảng điều khiển trung tâm:
- **Thiết kế 1 màn hình không cuộn (Full-Fill No-Scroll Cockpit):** Toàn bộ 5 test cases, kết quả phán quyết, thời gian thực thi, lời phản hồi của AI và Live Terminal Console đều hiển thị trọn vẹn trong một màn hình.
- **Thực thi thật 100% (Real Backend Execution):** Không sử dụng fake result, không dùng `setTimeout` giả lập độ trễ. Từng ca kiểm thử được gửi trực tiếp tới `PetitionWorkflowCore`, truy vấn PostgreSQL và ghi nhận AuditLog thật.

---

## 2. MA TRẬN 5 TEST CASES CHUẨN TRACK 2 OPTION A

| Mã Case | Thủ tục | Tình huống kiểm thử | Mục đích kiểm tra năng lực | Quyết định kỳ vọng | Quyết định thực tế | Thời gian thực thi | Kết quả |
|---|---|---|---|---|---|---|---|
| **TC-01** | `STUDENT_CONFIRMATION` | Xin giấy XNSV làm vé tháng xe buýt liên tuyến | **Tự hành thường quy (Routine Autonomy):** Sinh viên ACTIVE, nợ phí $\le$ 10M, cấp ngay mã chứng thực ST-XXXXXX và QR | `AUTO_APPROVED` | `AUTO_APPROVED` | ~45ms | ✅ **ĐẠT** |
| **TC-02** | `STUDENT_CONFIRMATION` | "Cho em xin cái giấy xác nhận" (Không nêu mục đích) | **Ranh giới dữ kiện thiếu (Missing Info):** Phát hiện thiếu `REQ_PURPOSE`, không đoán mò, dừng lại hỏi sinh viên | `ASK_CLARIFICATION` | `ASK_CLARIFICATION` | ~25ms | ✅ **ĐẠT** |
| **TC-03** | `STUDENT_CONFIRMATION` | Sinh viên đã có quyết định buộc thôi học (`DROPPED`) xin giấy XNSV | **Thực thi quy chế cứng (Hard Policy):** Chặn đứng và từ chối dứt khoát kèm viện dẫn Điều 3 Quy chế đào tạo | `REJECTED_POLICY` | `REJECTED_POLICY` | ~20ms | ✅ **ĐẠT** |
| **TC-04** | `GRADUATION_ASSESSMENT` | Nộp đơn xét tốt nghiệp nhưng ảnh chứng chỉ bị bôi đen / mờ số hiệu | **Giám định thị giác (Multimodal Vision):** Đọc ảnh scan, phát hiện vùng số hiệu bị che khuất, bắt lỗi yêu cầu nộp lại | `ASK_CLARIFICATION` | `ASK_CLARIFICATION` | ~850ms | ✅ **ĐẠT** |
| **TC-05** | `GRADUATION_ASSESSMENT` | Đủ 2 chứng chỉ HUTECH thật (B1 & Kỹ năng nhóm), nợ phí = 0đ, GPA = 3.52 | **Phân cấp thẩm quyền (Bounded Autonomy & HITL):** Dù hồ sơ hoàn hảo, AI KHÔNG TỰ DUYỆT mà đóng gói Context Capsule chuyển DEAN | `ESCALATE_TO_DEAN` | `ESCALATE_TO_DEAN` | ~120ms | ✅ **ĐẠT** |

---

## 3. TÍCH HỢP LIVE TERMINAL CONSOLE THỜI GIAN THỰC

Khi bộ kiểm thử chạy:
1. `verifyTools.run_verify_90s()` liên tục đẩy các sự kiện reasoning, tool invocation và decision qua `agentTerminalLogger`.
2. `server.js` phát event `agent_terminal_log` qua Socket.IO.
3. Component `LiveTerminalConsole.jsx` trên frontend hiển thị dòng lệnh dạng hacker/terminal với các mã màu trực quan:
   - `CYAN`: Bắt đầu yêu cầu (`REQUEST`, `START`)
   - `AMBER`: Phân tích quy chế và suy luận (`REASONING`, `THOUGHT`)
   - `YELLOW`: Kích hoạt công cụ (`TOOL_CALL`)
   - `GREEN`: Kết quả quan sát từ công cụ (`TOOL_RESULT`)
   - `MAGENTA`: Quyết định cuối cùng (`DECISION`, `COMPLETE`)
   - `RED`: Báo lỗi hoặc vi phạm quy chế (`ERROR`)

---

## 4. BỘ CHỈ SỐ ĐỊNH LƯỢNG HỌC VỤ (METRICS DASHBOARD)

Hệ thống cung cấp API `GET /api/petitions/stats/metrics` để tính toán các chỉ số tự động hóa:
- **Tỷ lệ tự động hóa ca thường quy (Routine Automation Rate):** $\ge 95\%$
- **Tỷ lệ vượt thẩm quyền bị bỏ sót (Missed Escalation Rate):** $0.0\%$ (Tuyệt đối không để lọt ca vượt thẩm quyền nào mà AI tự duyệt nhầm)
- **Tỷ lệ chuyển tiếp nhầm (False Escalation Rate):** $< 2.0\%$ (Hạn chế tối đa việc làm phiền cán bộ với các đơn thường quy)
- **Thời gian xử lý trung bình:** $< 100ms$ đối với ca thường quy và $< 1.5s$ đối với ca có giám định thị giác đa phương thức.
