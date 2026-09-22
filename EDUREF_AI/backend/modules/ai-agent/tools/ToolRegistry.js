export class ToolRegistry {
  static getDeclarations() {
    return [
      // A. Student Context
      {
        name: 'get_student_profile',
        description: 'Lấy hồ sơ học vụ chi tiết của sinh viên theo MSSV (trạng thái ACTIVE/DROPPED, khoa, GPA, nợ học phí).',
        parameters: {
          type: 'OBJECT',
          properties: {
            studentCode: {
              type: 'STRING',
              description: 'Mã số sinh viên, ví dụ: 2110001',
            },
          },
          required: ['studentCode'],
        },
      },
      {
        name: 'get_student_requests',
        description: 'Lấy danh sách các đơn sinh viên đã nộp gần đây để kiểm tra trùng lặp hoặc lách luật.',
        parameters: {
          type: 'OBJECT',
          properties: {
            studentCode: {
              type: 'STRING',
              description: 'Mã số sinh viên cần tra cứu',
            },
          },
          required: ['studentCode'],
        },
      },

      // B. Request Context
      {
        name: 'create_request',
        description: 'Khởi tạo hồ sơ đơn mới ở trạng thái PENDING để bắt đầu quy trình thẩm định.',
        parameters: {
          type: 'OBJECT',
          properties: {
            studentCode: {
              type: 'STRING',
              description: 'Mã số sinh viên nộp đơn (mặc định lấy theo phiên chat)',
            },
            requestTypeCode: {
              type: 'STRING',
              description:
                'Mã thủ tục: STUDENT_CONFIRMATION (Giấy XNSV), GRADUATION_ASSESSMENT (Đơn xét tốt nghiệp)',
            },
            purpose: {
              type: 'STRING',
              description: 'Mục đích sử dụng: Vay vốn ngân hàng chính sách, Tạm hoãn nghĩa vụ quân sự, Làm vé xe buýt...',
            },
            inputData: {
              type: 'OBJECT',
              description: 'Các dữ liệu khác: courseCode (mã môn), hasAttachment (có file viện), userClaimedOverride (cờ ép quyền)',
            },
          },
          required: ['studentCode', 'requestTypeCode'],
        },
      },
      {
        name: 'get_request',
        description: 'Context Aggregator: Lấy toàn bộ trạng thái chi tiết của đơn (hồ sơ, chứng từ, các yêu cầu còn thiếu).',
        parameters: {
          type: 'OBJECT',
          properties: {
            requestId: {
              type: 'STRING',
              description: 'ID của đơn hoặc mã đơn (ST-XXXXXX)',
            },
          },
          required: ['requestId'],
        },
      },

      // C. Requirement & Document
      {
        name: 'check_requirements',
        description: 'Kiểm tra xem hồ sơ đơn đã đủ các thông tin và chứng từ bắt buộc chưa (Ví dụ: mục đích, mã môn, giấy viện).',
        parameters: {
          type: 'OBJECT',
          properties: {
            requestId: {
              type: 'STRING',
              description: 'ID của đơn cần kiểm tra',
            },
          },
          required: ['requestId'],
        },
      },

      // D. Policy & Authority
      {
        name: 'evaluate_policy',
        description: 'Thẩm định hồ sơ theo Quy chế Đào tạo (sinh viên phải ACTIVE, nợ phí dưới 10M, phúc khảo trong 7 ngày).',
        parameters: {
          type: 'OBJECT',
          properties: {
            requestId: {
              type: 'STRING',
              description: 'ID của đơn cần thẩm định quy chế',
            },
          },
          required: ['requestId'],
        },
      },
      {
        name: 'check_authority',
        description: 'Kiểm tra ranh giới thẩm quyền của Tác tử AI (Chứng minh AI không tự ý cấp quyền cho mình).',
        parameters: {
          type: 'OBJECT',
          properties: {
            requestId: {
              type: 'STRING',
              description: 'ID của đơn cần kiểm tra thẩm quyền',
            },
            action: {
              type: 'STRING',
              description: 'Hành động muốn thực hiện (mặc định AUTO_APPROVE)',
            },
          },
          required: ['requestId'],
        },
      },

      // E. Action & HITL
      {
        name: 'process_request',
        description:
          'Thực thi phê duyệt tự động đối với đơn thường quy hợp lệ (Backend tự động re-check 100% trước khi cấp QR Code).',
        parameters: {
          type: 'OBJECT',
          properties: {
            requestId: {
              type: 'STRING',
              description: 'ID của đơn cần phê duyệt',
            },
          },
          required: ['requestId'],
        },
      },
      {
        name: 'ask_student',
        description: 'Chuyển đơn sang trạng thái WAITING_STUDENT và gửi câu hỏi cụ thể để sinh viên bổ sung thông tin còn thiếu.',
        parameters: {
          type: 'OBJECT',
          properties: {
            requestId: {
              type: 'STRING',
              description: 'ID của đơn',
            },
            question: {
              type: 'STRING',
              description: 'Câu hỏi cụ thể, trực diện hướng dẫn sinh viên bổ sung đúng phần còn thiếu',
            },
          },
          required: ['requestId', 'question'],
        },
      },
      {
        name: 'escalate_request',
        description: 'Chuyển tiếp đơn lên Cán bộ PĐT (STAFF) hoặc Trưởng khoa (DEAN) kèm Context Capsule và câu hỏi hành động.',
        parameters: {
          type: 'OBJECT',
          properties: {
            requestId: {
              type: 'STRING',
              description: 'ID của đơn',
            },
            reason: {
              type: 'STRING',
              description: 'Lý do chuyển tiếp (vượt thẩm quyền, yêu cầu ngoại lệ, cần thẩm định bệnh án)',
            },
            actionableQuestion: {
              type: 'STRING',
              description: 'Câu hỏi hành động trực diện để Cán bộ duyệt ngay trong 1 thao tác',
            },
            requiredRole: {
              type: 'STRING',
              description: 'Vai trò người có thẩm quyền duyệt: STAFF hoặc DEAN',
            },
          },
          required: ['requestId', 'reason', 'actionableQuestion'],
        },
      },

      // F. Observability & Self-Testing
      {
        name: 'run_verify_90s',
        description: 'Chạy kiểm thử tự hành 5 Test Cases chuẩn Track 2 Option A trong 90 giây phục vụ Ban Giám Khảo.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
    ];
  }
}

export default ToolRegistry;
