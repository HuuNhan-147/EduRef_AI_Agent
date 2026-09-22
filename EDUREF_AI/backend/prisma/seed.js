import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 [EduRef Seed] Bắt đầu nạp dữ liệu chuẩn cho EduRef AI (Chỉ 2 thủ tục thực tế)...');

  // 1. Xóa dữ liệu cũ theo thứ tự phụ thuộc
  await prisma.auditLog.deleteMany();
  await prisma.requestDocument.deleteMany();
  await prisma.studentRequest.deleteMany();
  await prisma.authorityRule.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.requirement.deleteMany();
  await prisma.requestType.deleteMany();
  await prisma.student.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  // 2. Tạo Khoa / Viện (Khớp với thông tin thực tế của trường)
  const cntt = await prisma.department.create({
    data: {
      code: 'CNTT',
      name: 'Khoa Công Nghệ Thông Tin',
    },
  });

  const ddt = await prisma.department.create({
    data: {
      code: 'DDT',
      name: 'Khoa Điện - Điện tử',
    },
  });

  console.log('✅ Đã tạo 2 Khoa đào tạo (Khoa CNTT & Khoa Điện - Điện tử).');

  // 3. Tạo Sinh viên mẫu (Khớp với ảnh thực tế: Cao Hữu Nhân - 2280602154)
  const studentMain = await prisma.student.create({
    data: {
      studentCode: '2280602154',
      fullName: 'Cao Hữu Nhân',
      email: 'nhan.cao@edu.vn',
      phone: '0901234567',
      status: 'ACTIVE',
      tuitionDebt: 0,
      gpa: 3.52,
      departmentId: cntt.id,
    },
  });

  // Giữ thêm alias mã 2110001 để tương thích với các bài test cũ nếu có
  const studentAlias = await prisma.student.create({
    data: {
      studentCode: '2110001',
      fullName: 'Nguyễn Văn An',
      email: 'an.nguyen@edu.vn',
      phone: '0901234568',
      status: 'ACTIVE',
      tuitionDebt: 0,
      gpa: 3.45,
      departmentId: cntt.id,
    },
  });

  const studentDropped = await prisma.student.create({
    data: {
      studentCode: '2110002',
      fullName: 'Trần Thị Bình',
      email: 'binh.tran@edu.vn',
      phone: '0902345678',
      status: 'DROPPED', // Đã thôi học -> Dành cho test case sai quy chế
      tuitionDebt: 0,
      gpa: 2.10,
      departmentId: ddt.id,
    },
  });

  const studentDebt = await prisma.student.create({
    data: {
      studentCode: '2110003',
      fullName: 'Lê Hoàng Cường',
      email: 'cuong.le@edu.vn',
      phone: '0903456789',
      status: 'ACTIVE',
      tuitionDebt: 15000000, // Nợ học phí 15 triệu -> Test case chặn nợ phí
      gpa: 2.85,
      departmentId: cntt.id,
    },
  });

  console.log('✅ Đã tạo 4 sinh viên mẫu (2280602154: Cao Hữu Nhân [Chính], 2110001: Active, 2110002: Thôi học, 2110003: Nợ phí).');

  // 4. Tạo Tài khoản Cán bộ & Lãnh đạo
  const defaultPassword = await bcrypt.hash('123456', 10);

  const staff = await prisma.user.create({
    data: {
      username: 'staff_daotao',
      fullName: 'Thầy Trần Hữu Nghĩa (Chuyên viên PĐT)',
      email: 'nghia.tran@pdt.edu.vn',
      passwordHash: defaultPassword,
      role: 'STAFF',
    },
  });

  const dean = await prisma.user.create({
    data: {
      username: 'dean_daotao',
      fullName: 'PGS.TS Nguyễn Văn Dũng (Trưởng Phòng Đào Tạo)',
      email: 'dung.nguyen@pdt.edu.vn',
      passwordHash: defaultPassword,
      role: 'DEAN',
    },
  });

  console.log('✅ Đã tạo tài khoản Cán bộ PĐT & Trưởng phòng Đào tạo.');

  // 5. CHỈ TẠO 2 THỦ TỤC HỌC VỤ THỰC TẾ
  // Thủ tục 1: Giấy xác nhận sinh viên (Ảnh 1) -> Cổng AUTO
  const typeConfirm = await prisma.requestType.create({
    data: {
      code: 'STUDENT_CONFIRMATION',
      name: 'Giấy Xác Nhận Sinh Viên',
      description: 'Xác nhận sinh viên để bổ sung hồ sơ, xin visa, học bổng, vay vốn, tạm hoãn nghĩa vụ quân sự...',
      requirements: {
        create: [
          {
            code: 'REQ_ID_CARD',
            name: 'Số CMND/CCCD',
            isRequired: true,
            description: 'Số căn cước công dân hoặc CMND 12 số của sinh viên.',
          },
          {
            code: 'REQ_ID_DATE',
            name: 'Ngày cấp CMND/CCCD',
            isRequired: true,
            description: 'Ngày cấp ghi trên thẻ CCCD.',
          },
          {
            code: 'REQ_ID_PLACE',
            name: 'Nơi cấp CMND/CCCD',
            isRequired: true,
            description: 'Cơ quan cấp (ví dụ: Cục Cảnh sát QLHC về TTXH).',
          },
          {
            code: 'REQ_PHONE',
            name: 'Điện thoại liên hệ',
            isRequired: true,
            description: 'Số điện thoại di động đang hoạt động.',
          },
          {
            code: 'REQ_PURPOSE',
            name: 'Lý do xác nhận',
            isRequired: true,
            description: 'Bổ sung hồ sơ, xin visa, học bổng, vay vốn, làm vé xe buýt...',
          },
          {
            code: 'REQ_CAMPUS',
            name: 'Chọn cơ sở nhận giấy',
            isRequired: true,
            description: 'Trụ sở chính (A-01.01) hoặc Cơ sở E (E1-01.08).',
          },
        ],
      },
      policies: {
        create: [
          {
            code: 'POL_STUDENT_ACTIVE',
            name: 'Điều kiện trạng thái học vụ',
            ruleDefinition: {
              field: 'student.status',
              operator: 'EQUALS',
              value: 'ACTIVE',
              errorMessage: 'Chỉ cấp giấy xác nhận cho sinh viên có trạng thái học tập hợp lệ (ACTIVE).',
            },
            priority: 1,
          },
          {
            code: 'POL_NO_TUITION_DEBT',
            name: 'Quy định nợ học phí',
            ruleDefinition: {
              field: 'student.tuitionDebt',
              operator: 'LTE',
              value: 10000000,
              errorMessage: 'Sinh viên nợ học phí quá 10.000.000 VNĐ cần hoàn thành nghĩa vụ tài chính trước khi xin giấy.',
            },
            priority: 2,
          },
        ],
      },
      authorityRules: {
        create: [
          {
            role: 'AI_AGENT',
            action: 'AUTO_APPROVE',
            condition: {
              isRoutine: true,
              maxProcessingTimeSeconds: 2,
            },
          },
        ],
      },
    },
  });

  // Thủ tục 2: Đơn đề nghị xét tốt nghiệp (Ảnh 2) -> Cổng ESCALATE / ASK
  const typeGraduation = await prisma.requestType.create({
    data: {
      code: 'GRADUATION_ASSESSMENT',
      name: 'Đơn Đề Nghị Xét Tốt Nghiệp',
      description: 'Xét tốt nghiệp đợt chính khóa cho sinh viên đã hoàn thành số tín chỉ và nộp đủ chứng chỉ chuẩn đầu ra.',
      requirements: {
        create: [
          {
            code: 'REQ_PHONE',
            name: 'Số điện thoại liên hệ',
            isRequired: true,
            description: 'Số điện thoại của sinh viên để Hội đồng liên hệ.',
          },
          {
            code: 'REQ_BIRTH_PLACE',
            name: 'Nơi sinh',
            isRequired: true,
            description: 'Tỉnh / Thành phố nơi sinh theo giấy khai sinh.',
          },
          {
            code: 'REQ_REASON',
            name: 'Lý do xin đề nghị xét tốt nghiệp',
            isRequired: true,
            description: 'Giải trình quá trình hoàn thành chương trình đào tạo.',
          },
          {
            code: 'REQ_CERTIFICATES',
            name: 'Danh sách chứng chỉ nộp đơn xét tốt nghiệp',
            isRequired: true,
            description: 'Bảng chứng chỉ chuẩn đầu ra (Ngoại ngữ, Tin học, GDQP, GDTC) gồm Số hiệu và Số vào sổ.',
          },
        ],
      },
      policies: {
        create: [
          {
            code: 'POL_GRAD_STUDENT_ACTIVE',
            name: 'Điều kiện sinh viên hợp lệ',
            ruleDefinition: {
              field: 'student.status',
              operator: 'EQUALS',
              value: 'ACTIVE',
              errorMessage: 'Chỉ nhận đơn xét tốt nghiệp của sinh viên đang theo học.',
            },
            priority: 1,
          },
          {
            code: 'POL_GRAD_NO_DEBT',
            name: 'Hoàn thành nghĩa vụ học phí',
            ruleDefinition: {
              field: 'student.tuitionDebt',
              operator: 'EQUALS',
              value: 0,
              errorMessage: 'Sinh viên phải hoàn tất 100% học phí (nợ phí = 0đ) trước khi đề nghị xét tốt nghiệp.',
            },
            priority: 2,
          },
          {
            code: 'POL_GRAD_REQUIRED_CERTS',
            name: 'Quy định nộp tối thiểu chứng chỉ chuẩn đầu ra',
            ruleDefinition: {
              requiredCertTypes: ['NGOAI_NGU', 'TIN_HOC'],
              errorMessage: 'Bắt buộc phải có Chứng chỉ Ngoại ngữ và Chứng chỉ Tin học hợp lệ có cả Số hiệu và Số vào sổ.',
            },
            priority: 3,
          },
        ],
      },
      authorityRules: {
        create: [
          {
            role: 'AI_AGENT',
            action: 'ASK_CLARIFICATION',
            condition: {
              missingCertificates: true,
            },
          },
          {
            role: 'DEAN',
            action: 'DEAN_APPROVAL',
            condition: {
              requiresCouncilApproval: true,
            },
          },
        ],
      },
    },
  });

  console.log('✅ Đã nạp thành công 2 thủ tục thực tế:');
  console.log('   1. [STUDENT_CONFIRMATION] - Giấy Xác Nhận Sinh Viên (AUTO_APPROVE)');
  console.log('   2. [GRADUATION_ASSESSMENT] - Đơn Đề Nghị Xét Tốt Nghiệp (ESCALATE_TO_DEAN)');
  console.log('🎉 [EduRef Seed] Hoàn tất nạp dữ liệu chuẩn thành công 100%!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi chạy seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
