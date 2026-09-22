# BỘ TÀI LIỆU KỸ THUẬT TOÀN DIỆN HỆ THỐNG EDUREF AI
**Dự án:** EduRef AI — The Autonomous Student Petition & Academic Escalation Referee  
**Đề bài:** MLAI Hackathon — Track 2: Option A (Bounded Autonomy & Escalation Referee)  
**Thời điểm hoàn thành:** Post-Sprint 1 Technical Audit & Documentation Reconstruction

---

## 📚 MỤC LỤC TÀI LIỆU (DOCUMENTATION INDEX)

Bộ tài liệu được xây dựng hoàn toàn dựa trên **MÃ NGUỒN THỰC TẾ (Code là Single Source of Truth)** của hệ thống EduRef AI:

1. [**01_SYSTEM_OVERVIEW.md**](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/docs/01_SYSTEM_OVERVIEW.md): Tổng quan bài toán thực tế của đại học (HUTECH), mục tiêu Bounded Autonomy, kiến trúc 4 tầng và nguyên tắc ranh giới bảo mật `LLM ≠ Security Boundary`.
2. [**02_FEATURES.md**](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/docs/02_FEATURES.md): Danh mục đối soát chi tiết toàn bộ tính năng (Real vs Mock, Frontend, Backend, AI Model, Database) và 2 thủ tục chuẩn đã nạp dữ liệu.
3. [**03_WORKFLOWS.md**](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/docs/03_WORKFLOWS.md): Tái dựng 7 quy trình nghiệp vụ thực tế bằng biểu đồ Sequence Diagram (Routine Auto, Missing Info, Escalation HITL, Policy Reject, Human Override, Verify 90s, Cryptographic Verification).
4. [**04_AI_AGENT.md**](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/docs/04_AI_AGENT.md): Phân tích chuyên sâu AI Agent (Gemini 2.0 Flash Lite, ReAct Loop tối đa 8 bước, danh mục 11 Tools, Key Rotator, Bộ nhớ phiên và Chuẩn hóa tiếng lóng học vụ).
5. [**05_POLICY_AUTHORITY.md**](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/docs/05_POLICY_AUTHORITY.md): Ma trận phân định rạch ròi 4 khái niệm: Requirement vs Policy vs Authority vs Decision, cấu trúc Context Capsule khi chuyển tiếp.
6. [**06_AUDIT.md**](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/docs/06_AUDIT.md): Cơ chế Nhật ký kiểm toán bất biến (Tamper-Evident Hash-Chained Audit Log), chuẩn hóa Canonical JSON và thuật toán thẩm định toàn vẹn chuỗi băm SHA-256.
7. [**07_ROLLBACK.md**](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/docs/07_ROLLBACK.md): Phân tích bản chất cơ chế can thiệp dừng khẩn cấp và thu hồi chứng thực số (Revocation & Cancellation), tính bền vững khi server restart.
8. [**08_VERIFY.md**](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/docs/08_VERIFY.md): Bảng điều khiển Verify Harness Cockpit 90 giây phục vụ BGK, chi tiết 5 Test Cases thực thi thật qua Database và Live Terminal Console.
9. [**09_API.md**](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/docs/09_API.md): Tài liệu đặc tả kỹ thuật toàn bộ REST API endpoints (Auth, Petitions, Agent, Verify, Audit).
10. [**10_DATABASE.md**](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/docs/10_DATABASE.md): Lược đồ cơ sở dữ liệu PostgreSQL (Prisma ORM), sơ đồ thực thể quan hệ ERD và cấu trúc các cột JSONB.
11. [**11_SECURITY.md**](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/docs/11_SECURITY.md): Báo cáo an toàn và bảo mật, phân loại các lỗ hổng (Bypass auth, Race condition, Fallback mock) và phương án khắc phục.
12. [**12_TECHNICAL_DEBT.md**](file:///d:/MLAI_HACKATHON/equipment_agent/DA_CNPM/EDUREF_AI/docs/12_TECHNICAL_DEBT.md): Danh mục nợ kỹ thuật và kế hoạch hành động 5 trụ cột cho Sprint 2.
