# 10. MÔ HÌNH DỮ LIỆU & LƯỢC ĐỒ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)
**Dự án:** EduRef AI — The Academic Escalation Referee

**Hệ quản trị CSDL:** Supabase PostgreSQL (kết nối qua Prisma ORM và Supavisor)
**File định nghĩa:** `backend/prisma/schema.prisma`

Runtime dùng `DATABASE_URL` từ Transaction pooler; migration dùng `DIRECT_URL` từ Session pooler qua script `npm run db:deploy`. Không đưa hai URL này vào frontend hoặc Git.

---

## 1. SƠ ĐỒ THỰC THỂ QUAN HỆ (ERD - ENTITY RELATIONSHIP DIAGRAM)

```mermaid
erDiagram
    Department ||--o{ Student : "thuộc về"
    Student ||--o{ StudentRequest : "nộp đơn"
    RequestType ||--o{ StudentRequest : "phân loại"
    RequestType ||--o{ Requirement : "yêu cầu"
    RequestType ||--o{ Policy : "quy chế"
    RequestType ||--o{ AuthorityRule : "phân quyền"
    StudentRequest ||--o{ RequestDocument : "đính kèm"
    StudentRequest ||--o{ AuditLog : "lịch sử kiểm toán"
    User ||--o{ StudentRequest : "phụ trách duyệt"
    User ||--o{ AuditLog : "người thực hiện"

    Department {
        string id PK
        string code UK "CSE, IT..."
        string name
    }

    Student {
        string id PK
        string studentCode UK "2280602154"
        string fullName
        string email UK
        enum status "ACTIVE, DROPPED, SUSPENDED"
        decimal tuitionDebt "Nợ học phí VNĐ"
        decimal gpa "Điểm trung bình tích lũy"
        string departmentId FK
    }

    User {
        string id PK
        string username UK
        string passwordHash
        string fullName
        enum role "STAFF, DEAN, ADMIN"
    }

    RequestType {
        string id PK
        string code UK "STUDENT_CONFIRMATION, GRADUATION_ASSESSMENT"
        string name
        string description
    }

    Requirement {
        string id PK
        string requestTypeId FK
        string code "REQ_PURPOSE, REQ_PHONE"
        string name
        boolean isRequired
    }

    Policy {
        string id PK
        string requestTypeId FK
        string code UK "POL_STUDENT_ACTIVE, POL_NO_DEBT"
        string name
        json ruleDefinition "Quy chế kiểm tra JSONB"
    }

    AuthorityRule {
        string id PK
        string requestTypeId FK
        enum role "AI_AGENT, STAFF, DEAN"
        enum action "AUTO_APPROVE, STAFF_REVIEW, DEAN_APPROVAL"
        json condition "Ranh giới thẩm quyền JSONB"
    }

    StudentRequest {
        string id PK
        string requestCode UK "ST-XXXXXX"
        string studentId FK
        string requestTypeId FK
        enum status "PENDING, PROCESSING, WAITING_STUDENT, APPROVED, ESCALATED, REJECTED, CANCELLED"
        json inputData "Dữ liệu sinh viên kê khai JSONB"
        string decision "ROUTINE_AUTO_APPROVED, ESCALATE_TO_DEAN..."
        string escalationReason "Lý do vượt quyền của AI"
        json contextCapsule "Đóng gói bối cảnh & Ghi chú cán bộ"
        string qrCodeUrl "Đường dẫn mã QR chứng thực"
        string assignedStaffId FK
    }

    RequestDocument {
        string id PK
        string requestId FK
        string documentType "B1_ENGLISH_CERT, TEAMWORK_CERT"
        string fileName
        string fileUrl
        string verificationStatus "VERIFIED, REJECTED"
        json extractedData "Dữ liệu bóc tách từ ảnh"
    }

    AuditLog {
        string id PK
        string requestId FK
        enum actorType "AI_AGENT, STUDENT, STAFF, DEAN"
        string action "CREATE_REQUEST, WORKFLOW_AUTO_APPROVE..."
        string decision "APPROVED, REJECTED, ESCALATED..."
        string reason "Căn cứ pháp lý của quyết định"
        json inputSnapshot "Snapshot dữ liệu tại thời điểm ra quyết định"
        json beforeState "Trạng thái trước"
        json afterState "Trạng thái sau"
        string sha256Hash "Mã băm hiện tại (SHA-256)"
        string previousHash "Mã băm khối liền trước"
        datetime createdAt "Thời điểm bất biến"
    }
```

---

## 2. CÁC CỘT DỮ LIỆU ĐẶC BIỆT CẦN LƯU Ý

1. **`StudentRequest.contextCapsule` (JSONB):**
   - Lưu trữ toàn bộ bức tranh bối cảnh khi chuyển tiếp đơn lên Cán bộ (`reason`, `actionableQuestion`, `academicSnapshot`).
   - Sau khi Cán bộ duyệt: Lưu trữ thêm `reviewerNote`, `reviewedBy`, `reviewedAt` mà không làm mất đi các dữ kiện ban đầu.
2. **`StudentRequest.escalationReason` (String):**
   - **Bảo toàn 100% nguyên nhân ban đầu của Tác tử AI** (Tại sao AI không tự duyệt mà phải chuyển tiếp). Không bị ghi đè bởi ý kiến của người duyệt.
3. **`AuditLog.sha256Hash` & `AuditLog.previousHash` (String):**
   - Mắt xích hình thành chuỗi băm bất biến (Tamper-evident Hash Chain).
